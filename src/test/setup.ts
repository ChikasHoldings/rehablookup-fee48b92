import "@testing-library/jest-dom";

// jsdom does not implement matchMedia — Tailwind's responsive utilities and
// the useIsMobile hook depend on it. We stub it so we can drive the matches
// state per test by monkey-patching window.innerWidth + dispatching resize.
const listeners = new Set<(e: MediaQueryListEvent) => void>();

function makeMediaQuery(query: string): MediaQueryList {
  const mq: MediaQueryList = {
    media: query,
    matches: matchMediaSync(query),
    onchange: null,
    addListener: (cb: any) => listeners.add(cb),
    removeListener: (cb: any) => listeners.delete(cb),
    addEventListener: (_: string, cb: any) => listeners.add(cb),
    removeEventListener: (_: string, cb: any) => listeners.delete(cb),
    dispatchEvent: () => true,
  } as MediaQueryList;
  return mq;
}

function matchMediaSync(query: string): boolean {
  const w = window.innerWidth;
  // Parse simple "(min-width: NNNpx)" / "(max-width: NNNpx)" queries
  const min = /\(min-width:\s*(\d+)px\)/.exec(query);
  const max = /\(max-width:\s*(\d+)px\)/.exec(query);
  if (min && w < Number(min[1])) return false;
  if (max && w > Number(max[1])) return false;
  return true;
}

Object.defineProperty(window, "matchMedia", {
  writable: true,
  configurable: true,
  value: (query: string) => makeMediaQuery(query),
});

// Stub IntersectionObserver (used by sticky CTA bar, lazy images)
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
  root = null;
  rootMargin = "";
  thresholds: number[] = [];
}
(global as any).IntersectionObserver = IntersectionObserverStub;
(window as any).IntersectionObserver = IntersectionObserverStub;

// Stub ResizeObserver (used by Radix UI primitives)
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(global as any).ResizeObserver = ResizeObserverStub;
(window as any).ResizeObserver = ResizeObserverStub;

// Stub scrollTo (jsdom warns)
window.scrollTo = (() => {}) as any;
