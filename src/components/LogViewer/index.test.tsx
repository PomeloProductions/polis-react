import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import LogViewer from './index';
import type { LogLine, UseLogStreamResult } from './useLogStream';

// Mock the hook so the component test is deterministic and independent of
// fetch/streaming (that path is covered in useLogStream.test.tsx).
const hookState: {
  lines: LogLine[];
  status: UseLogStreamResult['status'];
  following: boolean;
  pause: jest.Mock;
  resume: jest.Mock;
  clear: jest.Mock;
  lastOpts: Record<string, unknown>;
} = {
  lines: [],
  status: 'open',
  following: true,
  pause: jest.fn(),
  resume: jest.fn(),
  clear: jest.fn(),
  lastOpts: {},
};

jest.mock('./useLogStream', () => ({
  __esModule: true,
  useLogStream: (_serviceId: string, opts: Record<string, unknown>) => {
    hookState.lastOpts = opts;
    return {
      lines: hookState.lines,
      status: hookState.status,
      following: hookState.following,
      reconnectAttempts: 0,
      error: null,
      pause: hookState.pause,
      resume: hookState.resume,
      reconnect: jest.fn(),
      clear: hookState.clear,
    };
  },
  parseLogLine: (id: number, text: string) => ({ id, text }),
}));

// jsdom reports zero geometry, which makes @tanstack/react-virtual emit zero
// virtual items. Give elements a non-zero measured size so rows render.
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
    configurable: true,
    value: 1000,
  });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    value: 480,
  });
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    value: 480,
  });
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    value: 800,
  });
  HTMLElement.prototype.scrollIntoView = function () {};
  HTMLElement.prototype.getBoundingClientRect = function () {
    return {
      width: 800,
      height: 480,
      top: 0,
      left: 0,
      bottom: 480,
      right: 800,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect;
  };
});

const renderViewer = (props?: Partial<React.ComponentProps<typeof LogViewer>>) =>
  render(
    <MantineProvider>
      <LogViewer
        serviceId="svc"
        containers={['laravel', 'sidecar']}
        pods={['pod-a', 'pod-b']}
        {...props}
      />
    </MantineProvider>,
  );

const mkLines = (texts: string[]): LogLine[] => texts.map((t, i) => ({ id: i, text: t }));

beforeEach(() => {
  hookState.lines = [];
  hookState.status = 'open';
  hookState.following = true;
  hookState.pause.mockReset();
  hookState.resume.mockReset();
  hookState.clear.mockReset();
});

describe('LogViewer', () => {
  test('renders log lines', () => {
    hookState.lines = mkLines(['alpha', 'beta', 'gamma']);
    renderViewer();
    const rendered = screen.getAllByTestId('log-line').map((n) => n.textContent);
    expect(rendered).toEqual(expect.arrayContaining(['alpha', 'beta', 'gamma']));
  });

  test('status indicator reflects stream status', () => {
    hookState.status = 'error';
    renderViewer();
    expect(screen.getByTestId('log-status')).toHaveTextContent('Error');
  });

  test('follow/pause toggle calls pause when following', () => {
    hookState.following = true;
    renderViewer();
    fireEvent.click(screen.getByLabelText('Pause log stream'));
    expect(hookState.pause).toHaveBeenCalled();
  });

  test('follow/pause toggle calls resume when paused', () => {
    hookState.following = false;
    renderViewer();
    fireEvent.click(screen.getByLabelText('Resume log stream'));
    expect(hookState.resume).toHaveBeenCalled();
  });

  test('filter narrows visible lines and highlights matches', () => {
    hookState.lines = mkLines(['error: boom', 'info: ok', 'error: again']);
    renderViewer();
    fireEvent.change(screen.getByLabelText('Filter logs'), { target: { value: 'error' } });

    const lines = screen.getAllByTestId('log-line');
    expect(lines).toHaveLength(2);
    expect(screen.getAllByTestId('log-highlight').length).toBeGreaterThan(0);
    expect(screen.getByTestId('log-match-count')).toHaveTextContent('2/3');
  });

  test('container selection flows into the hook options', async () => {
    const user = userEvent.setup();
    renderViewer();
    await user.click(screen.getByRole('textbox', { name: 'Container' }));
    await user.click(await screen.findByRole('option', { name: 'sidecar' }));
    expect(hookState.lastOpts.container).toBe('sidecar');
  });

  test('pod selection flows into the hook options (all = undefined)', async () => {
    const user = userEvent.setup();
    renderViewer();
    // Default pod = "All pods" -> undefined pod option.
    expect(hookState.lastOpts.pod).toBeUndefined();
    await user.click(screen.getByRole('textbox', { name: 'Pod' }));
    await user.click(await screen.findByRole('option', { name: 'pod-b' }));
    expect(hookState.lastOpts.pod).toBe('pod-b');
  });

  test('clear button calls clear', () => {
    renderViewer();
    fireEvent.click(screen.getByLabelText('Clear logs'));
    expect(hookState.clear).toHaveBeenCalled();
  });

  test('line-wrap toggle changes whitespace style', () => {
    hookState.lines = mkLines(['a very long line']);
    renderViewer();
    const before = screen.getByTestId('log-line').style.whiteSpace;
    expect(before).toBe('pre');
    fireEvent.click(screen.getByLabelText('Toggle line wrap'));
    expect(screen.getByTestId('log-line').style.whiteSpace).toBe('pre-wrap');
  });

  test('download visible builds a blob and clicks an anchor', () => {
    hookState.lines = mkLines(['one', 'two']);
    const createObjectURL = jest.fn(() => 'blob:x');
    const revokeObjectURL = jest.fn();
    (URL as unknown as { createObjectURL: unknown }).createObjectURL = createObjectURL;
    (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = revokeObjectURL;
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    renderViewer();
    fireEvent.click(screen.getByLabelText('Download visible logs'));

    expect(createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  test('controls region exposes tail + since inputs', () => {
    renderViewer();
    const viewer = screen.getByTestId('log-viewer');
    expect(within(viewer).getByLabelText('Tail lines')).toBeInTheDocument();
    expect(within(viewer).getByLabelText('Since seconds')).toBeInTheDocument();
  });
});
