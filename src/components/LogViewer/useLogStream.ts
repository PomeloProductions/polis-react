import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { appState } from '../../data/AppContext';

/**
 * Live log streaming over Server-Sent Events (SSE).
 *
 * ## Why fetch + ReadableStream instead of `EventSource`
 *
 * The Polis API authenticates every request with a `Bearer` JWT injected from
 * Redux state (see `services/api.ts`). The browser `EventSource` API cannot
 * set request headers, so it can't carry that token. We therefore open the
 * stream with `fetch()` (which _can_ send `Authorization`) and parse the
 * `text/event-stream` body manually off the `ReadableStream` reader. This
 * mirrors how the rest of the toolkit authenticates while still consuming the
 * exact SSE contract the backend produces.
 *
 * Endpoint contract (built in parallel):
 *   GET {apiBase}/v1/services/{serviceId}/logs  ->  text/event-stream
 *   query: follow, container, pod, tailLines, sinceSeconds
 *   Each SSE `data:` event is one log line. When multiple pods are followed,
 *   lines are prefixed `[pod/container] `.
 */

export type LogStreamStatus = 'idle' | 'connecting' | 'open' | 'error' | 'closed';

export interface LogLine {
  /** Monotonic id, unique within a hook instance. Stable across re-renders. */
  id: number;
  /** Raw line text as received (including any `[pod/container] ` prefix). */
  text: string;
  /** Parsed pod name when the line carries a `[pod/container] ` prefix. */
  pod?: string;
  /** Parsed container name when the line carries a `[pod/container] ` prefix. */
  container?: string;
}

export interface UseLogStreamOptions {
  /** Base URL of the API. Defaults to `VITE_API_URL` (matches services/api.ts). */
  apiBase?: string;
  /** Follow the log (tail -f style). Default true. */
  follow?: boolean;
  /** Restrict to a single container. */
  container?: string;
  /** Restrict to a single pod. Omit / undefined = all pods. */
  pod?: string;
  /** Number of historical lines to seed with. Default 200. */
  tailLines?: number;
  /** Only return lines newer than this many seconds ago. */
  sinceSeconds?: number;
  /** Max lines retained in the ring buffer. Default 5000. */
  maxLines?: number;
  /** Start streaming immediately on mount. Default true. */
  enabled?: boolean;
  /** Max auto-reconnect attempts before giving up. Default 8. */
  maxReconnectAttempts?: number;
}

export interface UseLogStreamResult {
  lines: LogLine[];
  status: LogStreamStatus;
  /** True while a follow stream is actively appending (not paused). */
  following: boolean;
  /** Number of reconnect attempts made since the last clean open. */
  reconnectAttempts: number;
  error: string | null;
  /** Pause appending without closing the connection. */
  pause: () => void;
  /** Resume appending (reconnects if the stream had closed). */
  resume: () => void;
  /** Force a fresh reconnect now. */
  reconnect: () => void;
  /** Drop all buffered lines. */
  clear: () => void;
}

const DEFAULT_MAX_LINES = 5000;
const DEFAULT_TAIL_LINES = 200;
const DEFAULT_MAX_RECONNECTS = 8;
const BASE_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30000;

/** Read the current bearer token the same way services/api.ts does. */
function currentToken(): string | undefined {
  return appState?.state?.persistent?.tokenData?.token;
}

function resolveApiBase(explicit?: string): string {
  if (explicit) return explicit;
  // Access the Vite env defensively so Jest (which polyfills it) and the
  // browser both work. Mirrors services/api.ts's `VITE_API_URL` default.
  try {
    const env = (import.meta as unknown as { env?: Record<string, string> }).env;
    if (env?.VITE_API_URL) return env.VITE_API_URL;
  } catch {
    // import.meta not available in this context
  }
  return 'http://localhost:3000';
}

function buildUrl(apiBase: string, serviceId: string, opts: UseLogStreamOptions): string {
  const base = apiBase.replace(/\/$/, '');
  const url = new URL(`${base}/v1/services/${encodeURIComponent(serviceId)}/logs`);
  url.searchParams.set('follow', String(opts.follow ?? true));
  url.searchParams.set('tailLines', String(opts.tailLines ?? DEFAULT_TAIL_LINES));
  if (opts.container) url.searchParams.set('container', opts.container);
  if (opts.pod) url.searchParams.set('pod', opts.pod);
  if (opts.sinceSeconds != null) url.searchParams.set('sinceSeconds', String(opts.sinceSeconds));
  return url.toString();
}

const PREFIX_RE = /^\[([^/\]]+)\/([^\]]+)\]\s?(.*)$/;

/** Split a raw line into pod/container/text when the `[pod/container] ` prefix is present. */
export function parseLogLine(id: number, raw: string): LogLine {
  const m = PREFIX_RE.exec(raw);
  if (m) {
    return { id, text: raw, pod: m[1], container: m[2] };
  }
  return { id, text: raw };
}

export function useLogStream(
  serviceId: string,
  opts: UseLogStreamOptions = {},
): UseLogStreamResult {
  const {
    apiBase,
    follow = true,
    container,
    pod,
    tailLines = DEFAULT_TAIL_LINES,
    sinceSeconds,
    maxLines = DEFAULT_MAX_LINES,
    enabled = true,
    maxReconnectAttempts = DEFAULT_MAX_RECONNECTS,
  } = opts;

  const [lines, setLines] = useState<LogLine[]>([]);
  const [status, setStatus] = useState<LogStreamStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  // `following` is the user-facing pause switch; independent of connection.
  const [following, setFollowing] = useState(enabled);

  // Refs that the async reader loop reads without triggering re-subscribes.
  const abortRef = useRef<AbortController | null>(null);
  const lineIdRef = useRef(0);
  const followingRef = useRef(following);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptsRef = useRef(0);
  // Incremented every time we want to (re)establish a connection. Changing it
  // is what actually drives the effect below.
  const [connectNonce, setConnectNonce] = useState(0);

  followingRef.current = following;

  const appendLines = useCallback(
    (raws: string[]) => {
      if (raws.length === 0) return;
      setLines((prev) => {
        const next = prev.slice();
        for (const raw of raws) {
          next.push(parseLogLine(lineIdRef.current++, raw));
        }
        // Ring-buffer cap: drop from the front once we exceed maxLines.
        if (next.length > maxLines) {
          return next.slice(next.length - maxLines);
        }
        return next;
      });
    },
    [maxLines],
  );

  const clear = useCallback(() => {
    setLines([]);
  }, []);

  const pause = useCallback(() => {
    setFollowing(false);
  }, []);

  const resume = useCallback(() => {
    setFollowing(true);
    // If the connection had closed/errored, kick a fresh connect.
    setStatus((s) => {
      if (s === 'closed' || s === 'error' || s === 'idle') {
        attemptsRef.current = 0;
        setReconnectAttempts(0);
        setConnectNonce((n) => n + 1);
      }
      return s;
    });
  }, []);

  const reconnect = useCallback(() => {
    attemptsRef.current = 0;
    setReconnectAttempts(0);
    setConnectNonce((n) => n + 1);
  }, []);

  // Establish (and re-establish) the stream. Re-runs whenever any param that
  // changes the URL changes, or when connectNonce is bumped.
  useEffect(() => {
    if (!enabled || !serviceId) {
      setStatus('idle');
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    abortRef.current = controller;

    const scheduleReconnect = () => {
      if (cancelled) return;
      if (attemptsRef.current >= maxReconnectAttempts) {
        setStatus('error');
        setError((e) => e ?? 'Exceeded max reconnect attempts');
        return;
      }
      const attempt = attemptsRef.current;
      const delay = Math.min(BASE_BACKOFF_MS * 2 ** attempt, MAX_BACKOFF_MS);
      attemptsRef.current = attempt + 1;
      setReconnectAttempts(attemptsRef.current);
      reconnectTimerRef.current = setTimeout(() => {
        if (!cancelled) setConnectNonce((n) => n + 1);
      }, delay);
    };

    const run = async () => {
      setStatus('connecting');
      setError(null);

      const base = resolveApiBase(apiBase);
      const url = buildUrl(base, serviceId, {
        follow,
        container,
        pod,
        tailLines,
        sinceSeconds,
      });

      const headers: Record<string, string> = { Accept: 'text/event-stream' };
      const token = currentToken();
      if (token) headers.Authorization = `Bearer ${token}`;

      try {
        const res = await fetch(url, {
          method: 'GET',
          headers,
          credentials: 'include',
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          throw new Error(`Log stream failed: HTTP ${res.status}`);
        }

        setStatus('open');
        // Successful open resets the backoff counter.
        attemptsRef.current = 0;
        setReconnectAttempts(0);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        // Parse the SSE frame stream. Events are separated by a blank line;
        // each `data:` field within an event is one log line.
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let sepIndex: number;
          // Split on event boundaries (\n\n), tolerating \r\n.
          while ((sepIndex = buffer.search(/\r?\n\r?\n/)) !== -1) {
            const rawEvent = buffer.slice(0, sepIndex);
            buffer = buffer.slice(sepIndex + rawEvent.length);
            buffer = buffer.replace(/^\r?\n\r?\n/, '');

            const dataLines: string[] = [];
            for (const field of rawEvent.split(/\r?\n/)) {
              if (field.startsWith('data:')) {
                dataLines.push(field.slice(5).replace(/^ /, ''));
              }
            }
            if (dataLines.length && followingRef.current) {
              appendLines(dataLines);
            }
          }
        }

        // Stream ended cleanly. If we were following, try to reconnect (the
        // server may have rotated / the pod restarted); otherwise close.
        if (!cancelled) {
          if (followingRef.current && (follow ?? true)) {
            setStatus('connecting');
            scheduleReconnect();
          } else {
            setStatus('closed');
          }
        }
      } catch (err) {
        if (cancelled || controller.signal.aborted) return;
        const message = err instanceof Error ? err.message : 'Log stream error';
        setError(message);
        setStatus('error');
        scheduleReconnect();
      }
    };

    run();

    return () => {
      cancelled = true;
      controller.abort();
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [
    serviceId,
    apiBase,
    follow,
    container,
    pod,
    tailLines,
    sinceSeconds,
    enabled,
    maxReconnectAttempts,
    appendLines,
    connectNonce,
  ]);

  return useMemo(
    () => ({
      lines,
      status,
      following,
      reconnectAttempts,
      error,
      pause,
      resume,
      reconnect,
      clear,
    }),
    [lines, status, following, reconnectAttempts, error, pause, resume, reconnect, clear],
  );
}

export default useLogStream;
