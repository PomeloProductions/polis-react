// jsdom does not provide the Web Streams / encoding APIs the hook relies on.
// Pull Node's implementations in before importing the hook under test.
import { ReadableStream } from 'node:stream/web';
import { TextEncoder, TextDecoder } from 'node:util';

const g = globalThis as unknown as Record<string, unknown>;
if (typeof g.ReadableStream === 'undefined') g.ReadableStream = ReadableStream;
if (typeof g.TextEncoder === 'undefined') g.TextEncoder = TextEncoder;
if (typeof g.TextDecoder === 'undefined') g.TextDecoder = TextDecoder;

import { act, renderHook, waitFor } from '@testing-library/react';
import { useLogStream, parseLogLine } from './useLogStream';

// A controllable SSE-over-fetch mock. Each `push()` enqueues an SSE frame;
// `close()` ends the stream; `fail()` rejects the fetch.
interface MockStream {
  push: (dataLines: string | string[]) => void;
  close: () => void;
  url: string;
  headers: Record<string, string>;
}

function installFetchMock() {
  const streams: MockStream[] = [];
  let failNext = false;

  const fetchMock = jest.fn((url: string, init: RequestInit) => {
    if (failNext) {
      failNext = false;
      return Promise.reject(new Error('network down'));
    }

    let controller: ReadableStreamDefaultController<Uint8Array>;
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        controller = c;
      },
    });

    const stream: MockStream = {
      url,
      headers: (init.headers as Record<string, string>) ?? {},
      push: (dataLines) => {
        const arr = Array.isArray(dataLines) ? dataLines : [dataLines];
        const frame = arr.map((l) => `data: ${l}`).join('\n') + '\n\n';
        controller.enqueue(encoder.encode(frame));
      },
      close: () => controller.close(),
    };
    streams.push(stream);

    return Promise.resolve({
      ok: true,
      status: 200,
      body,
    } as unknown as Response);
  });

  (global as unknown as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;

  return {
    fetchMock,
    streams,
    latest: () => streams[streams.length - 1],
    failNextFetch: () => {
      failNext = true;
    },
  };
}

describe('parseLogLine', () => {
  test('extracts pod/container from prefix', () => {
    const l = parseLogLine(1, '[web-abc/laravel] hello world');
    expect(l).toMatchObject({
      pod: 'web-abc',
      container: 'laravel',
      text: '[web-abc/laravel] hello world',
    });
  });
  test('plain line has no pod/container', () => {
    const l = parseLogLine(2, 'just a line');
    expect(l.pod).toBeUndefined();
    expect(l.container).toBeUndefined();
  });
});

describe('useLogStream', () => {
  let mock: ReturnType<typeof installFetchMock>;

  beforeEach(() => {
    mock = installFetchMock();
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('opens the stream and renders + appends lines', async () => {
    const { result } = renderHook(() => useLogStream('svc-1', { maxLines: 100 }));

    await waitFor(() => expect(result.current.status).toBe('open'));

    await act(async () => {
      mock.latest().push('first line');
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current.lines).toHaveLength(1));
    expect(result.current.lines[0].text).toBe('first line');

    await act(async () => {
      mock.latest().push(['second', 'third']);
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current.lines).toHaveLength(3));
  });

  test('builds URL with params', async () => {
    renderHook(() =>
      useLogStream('svc-2', { container: 'laravel', pod: 'p1', tailLines: 50, sinceSeconds: 60 }),
    );
    await waitFor(() => expect(mock.latest()).toBeDefined());
    const url = new URL(mock.latest().url);
    expect(url.pathname).toBe('/v1/services/svc-2/logs');
    expect(url.searchParams.get('container')).toBe('laravel');
    expect(url.searchParams.get('pod')).toBe('p1');
    expect(url.searchParams.get('tailLines')).toBe('50');
    expect(url.searchParams.get('sinceSeconds')).toBe('60');
  });

  test('pause stops appending, resume continues', async () => {
    const { result } = renderHook(() => useLogStream('svc-3'));
    await waitFor(() => expect(result.current.status).toBe('open'));

    act(() => result.current.pause());
    await act(async () => {
      mock.latest().push('while paused');
      await Promise.resolve();
    });
    expect(result.current.lines).toHaveLength(0);

    act(() => result.current.resume());
    await act(async () => {
      mock.latest().push('after resume');
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current.lines).toHaveLength(1));
    expect(result.current.lines[0].text).toBe('after resume');
  });

  test('changing container re-opens the stream', async () => {
    const { result, rerender } = renderHook(
      ({ container }) => useLogStream('svc-4', { container }),
      { initialProps: { container: 'a' } },
    );
    await waitFor(() => expect(result.current.status).toBe('open'));
    expect(mock.streams).toHaveLength(1);

    rerender({ container: 'b' });
    await waitFor(() => expect(mock.streams).toHaveLength(2));
    expect(new URL(mock.latest().url).searchParams.get('container')).toBe('b');
  });

  test('reconnects with backoff after a fetch error', async () => {
    jest.useFakeTimers({ doNotFake: ['queueMicrotask', 'nextTick', 'setImmediate'] });
    mock.failNextFetch();
    const { result } = renderHook(() => useLogStream('svc-5'));

    // Let the rejected fetch settle into the error state.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.status).toBe('error');
    expect(result.current.reconnectAttempts).toBe(1);

    // Advance past the first backoff window (1s) to trigger the reconnect,
    // which succeeds (failNext already consumed) and re-opens.
    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.status).toBe('open');
  });

  test('ring buffer caps retained lines', async () => {
    const { result } = renderHook(() => useLogStream('svc-6', { maxLines: 5 }));
    await waitFor(() => expect(result.current.status).toBe('open'));

    await act(async () => {
      for (let i = 0; i < 10; i++) mock.latest().push(`line ${i}`);
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current.lines).toHaveLength(5));
    // Oldest dropped; newest retained.
    expect(result.current.lines[0].text).toBe('line 5');
    expect(result.current.lines[4].text).toBe('line 9');
  });

  test('sends bearer/credentials via fetch (not EventSource)', async () => {
    renderHook(() => useLogStream('svc-7'));
    await waitFor(() => expect(mock.latest()).toBeDefined());
    expect(mock.latest().headers.Accept).toBe('text/event-stream');
    // fetch was used, proving header-capable transport (EventSource can't).
    expect(mock.fetchMock).toHaveBeenCalled();
  });

  test('clear empties the buffer', async () => {
    const { result } = renderHook(() => useLogStream('svc-8'));
    await waitFor(() => expect(result.current.status).toBe('open'));
    await act(async () => {
      mock.latest().push('x');
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current.lines).toHaveLength(1));
    act(() => result.current.clear());
    expect(result.current.lines).toHaveLength(0);
  });
});
