import '@testing-library/jest-dom';

// jsdom doesn't implement IntersectionObserver, but several components
// (e.g. DataList) instantiate one at mount time. Provide a no-op stub.
class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [];
  constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {}
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}
(globalThis as any).IntersectionObserver = MockIntersectionObserver;
(window as any).IntersectionObserver = MockIntersectionObserver;

// jsdom doesn't implement ResizeObserver either; Mantine's components need it.
class MockResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
(globalThis as any).ResizeObserver = MockResizeObserver;
(window as any).ResizeObserver = MockResizeObserver;

// matchMedia is also missing in jsdom and is consulted by Mantine theming.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}

// Polyfill Vite-style `import.meta.env` access used by src/services/api.ts.
// The custom transform in jest-transform.cjs rewrites `import.meta.env`
// references to read from globalThis.__VITE_ENV__.
(globalThis as any).__VITE_ENV__ = {
  VITE_API_URL: 'http://localhost:3000',
  MODE: 'test',
  BASE_URL: '/',
  DEV: false,
  PROD: false,
};
