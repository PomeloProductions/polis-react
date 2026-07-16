import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Box,
  Group,
  NumberInput,
  Paper,
  ScrollArea,
  Select,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  IconDownload,
  IconPlayerPause,
  IconPlayerPlay,
  IconSearch,
  IconTextWrap,
  IconTrash,
} from '@tabler/icons-react';
import { LogLine, LogStreamStatus, useLogStream, UseLogStreamOptions } from './useLogStream';

export interface LogViewerProps {
  /** Service whose logs are streamed. */
  serviceId: string;
  /** Base URL of the API. Defaults to `VITE_API_URL`. */
  apiBase?: string;
  /** Containers to offer in the container selector. */
  containers?: string[];
  /** Pods to offer in the pod selector (an "all pods" option is added). */
  pods?: string[];
  /** Initial number of history lines to seed. Default 200. */
  defaultTailLines?: number;
  /** Ring-buffer cap. Default 5000. */
  maxLines?: number;
  /** Fixed pixel height of the log pane. Default 480. */
  height?: number;
}

const STATUS_COLOR: Record<LogStreamStatus, string> = {
  idle: 'gray',
  connecting: 'yellow',
  open: 'green',
  error: 'red',
  closed: 'gray',
};

const STATUS_LABEL: Record<LogStreamStatus, string> = {
  idle: 'Idle',
  connecting: 'Connecting',
  open: 'Streaming',
  error: 'Error',
  closed: 'Closed',
};

const ALL_PODS = '__all__';
const ROW_HEIGHT = 20;

/** Highlight the matched substring within a line using theme mark styling. */
function renderHighlighted(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const parts: React.ReactNode[] = [];
  let start = 0;
  let idx = lower.indexOf(q, start);
  let key = 0;
  while (idx !== -1) {
    if (idx > start) parts.push(text.slice(start, idx));
    parts.push(
      <mark key={key++} data-testid="log-highlight">
        {text.slice(idx, idx + q.length)}
      </mark>,
    );
    start = idx + q.length;
    idx = lower.indexOf(q, start);
  }
  if (start < text.length) parts.push(text.slice(start));
  return parts;
}

const LogViewer: React.FC<LogViewerProps> = ({
  serviceId,
  apiBase,
  containers = [],
  pods = [],
  defaultTailLines = 200,
  maxLines = 5000,
  height = 480,
}) => {
  const [container, setContainer] = useState<string | undefined>(undefined);
  const [pod, setPod] = useState<string>(ALL_PODS);
  const [tailLines, setTailLines] = useState<number>(defaultTailLines);
  const [sinceSeconds, setSinceSeconds] = useState<number | undefined>(undefined);
  const [filter, setFilter] = useState('');
  const [wrap, setWrap] = useState(false);
  const [stickToBottom, setStickToBottom] = useState(true);

  const streamOpts: UseLogStreamOptions = useMemo(
    () => ({
      apiBase,
      follow: true,
      container: container || undefined,
      pod: pod === ALL_PODS ? undefined : pod,
      tailLines,
      sinceSeconds,
      maxLines,
    }),
    [apiBase, container, pod, tailLines, sinceSeconds, maxLines],
  );

  const { lines, status, following, error, reconnectAttempts, pause, resume, clear } = useLogStream(
    serviceId,
    streamOpts,
  );

  const visibleLines = useMemo<LogLine[]>(() => {
    if (!filter) return lines;
    const q = filter.toLowerCase();
    return lines.filter((l) => l.text.toLowerCase().includes(q));
  }, [lines, filter]);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  const virtualizer = useVirtualizer({
    count: visibleLines.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 20,
  });

  // Stick-to-bottom while following; detaches when the user scrolls up.
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < ROW_HEIGHT * 2;
    setStickToBottom(atBottom);
  }, []);

  useEffect(() => {
    if (!stickToBottom || !following) return;
    const el = scrollRef.current;
    if (!el) return;
    // Defer to after the virtualizer has measured the new rows.
    el.scrollTop = el.scrollHeight;
  }, [visibleLines.length, stickToBottom, following]);

  const download = useCallback(() => {
    const blob = new Blob([visibleLines.map((l) => l.text).join('\n')], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${serviceId}-logs.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [visibleLines, serviceId]);

  const podOptions = useMemo(
    () => [{ value: ALL_PODS, label: 'All pods' }, ...pods.map((p) => ({ value: p, label: p }))],
    [pods],
  );

  return (
    <Stack gap="xs" data-testid="log-viewer">
      <Group justify="space-between" wrap="wrap" gap="xs">
        <Group gap="xs">
          <Tooltip label={following ? 'Pause' : 'Resume'}>
            <ActionIcon
              variant="light"
              color={following ? 'yellow' : 'green'}
              aria-label={following ? 'Pause log stream' : 'Resume log stream'}
              onClick={() => (following ? pause() : resume())}
            >
              {following ? <IconPlayerPause size={16} /> : <IconPlayerPlay size={16} />}
            </ActionIcon>
          </Tooltip>

          {containers.length > 0 && (
            <Select
              size="xs"
              placeholder="Select container"
              aria-label="Container"
              clearable
              w={160}
              data={containers}
              value={container ?? null}
              onChange={(v) => setContainer(v ?? undefined)}
            />
          )}

          <Select
            size="xs"
            aria-label="Pod"
            w={180}
            data={podOptions}
            value={pod}
            onChange={(v) => setPod(v ?? ALL_PODS)}
          />

          <NumberInput
            size="xs"
            w={110}
            min={1}
            aria-label="Tail lines"
            label={undefined}
            placeholder="Tail lines"
            value={tailLines}
            onChange={(v) => setTailLines(typeof v === 'number' ? v : defaultTailLines)}
          />

          <NumberInput
            size="xs"
            w={130}
            min={0}
            aria-label="Since seconds"
            placeholder="Since (s)"
            value={sinceSeconds ?? ''}
            onChange={(v) => setSinceSeconds(typeof v === 'number' ? v : undefined)}
          />
        </Group>

        <Group gap="xs">
          <Badge color={STATUS_COLOR[status]} variant="light" data-testid="log-status">
            {STATUS_LABEL[status]}
            {reconnectAttempts > 0 ? ` (retry ${reconnectAttempts})` : ''}
          </Badge>
          <Tooltip label="Line wrap">
            <ActionIcon
              variant={wrap ? 'filled' : 'light'}
              aria-label="Toggle line wrap"
              onClick={() => setWrap((w) => !w)}
            >
              <IconTextWrap size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Download visible">
            <ActionIcon variant="light" aria-label="Download visible logs" onClick={download}>
              <IconDownload size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Clear">
            <ActionIcon variant="light" color="red" aria-label="Clear logs" onClick={clear}>
              <IconTrash size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      <TextInput
        size="xs"
        placeholder="Filter / search…"
        aria-label="Filter logs"
        leftSection={<IconSearch size={14} />}
        value={filter}
        onChange={(e) => setFilter(e.currentTarget.value)}
        rightSectionWidth={80}
        rightSection={
          filter ? (
            <Text size="xs" c="dimmed" data-testid="log-match-count">
              {visibleLines.length}/{lines.length}
            </Text>
          ) : null
        }
      />

      {error && (
        <Text size="xs" c="red" data-testid="log-error">
          {error}
        </Text>
      )}

      <Paper withBorder radius="sm" p={0} bg="dark.8">
        <ScrollArea
          viewportRef={scrollRef}
          onScrollPositionChange={handleScroll}
          h={height}
          type="auto"
          data-testid="log-scroll"
        >
          <Box
            style={{
              height: virtualizer.getTotalSize(),
              position: 'relative',
              width: '100%',
            }}
          >
            {virtualizer.getVirtualItems().map((vi) => {
              const line = visibleLines[vi.index];
              return (
                <Text
                  key={line.id}
                  component="div"
                  ff="monospace"
                  size="xs"
                  c="gray.3"
                  data-testid="log-line"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${vi.start}px)`,
                    minHeight: ROW_HEIGHT,
                    padding: '0 8px',
                    whiteSpace: wrap ? 'pre-wrap' : 'pre',
                    overflowX: wrap ? 'visible' : 'hidden',
                    textOverflow: wrap ? 'clip' : 'ellipsis',
                  }}
                >
                  {renderHighlighted(line.text, filter)}
                </Text>
              );
            })}
          </Box>
        </ScrollArea>
      </Paper>

      {!stickToBottom && following && (
        <Text
          size="xs"
          c="dimmed"
          style={{ cursor: 'pointer' }}
          onClick={() => {
            setStickToBottom(true);
            const el = scrollRef.current;
            if (el) el.scrollTop = el.scrollHeight;
          }}
          data-testid="log-jump-bottom"
        >
          Scrolled up — click to jump to latest
        </Text>
      )}
    </Stack>
  );
};

export default LogViewer;
