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
    addListener: (cb: (e: MediaQueryListEvent) => void) => listeners.add(cb),
    removeListener: (cb: (e: MediaQueryListEvent) => void) => listeners.delete(cb),
    addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => listeners.delete(cb),
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

// Tests that opt into `@vitest-environment node` (e.g. the PGlite-backed
// database regression suites) have no DOM. Everything below this point is
// jsdom-only stubbing, so skip it rather than throwing at setup time. jsdom
// runs are unaffected.
const HAS_DOM = typeof window !== "undefined";

if (HAS_DOM) {
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
(global as { IntersectionObserver?: typeof IntersectionObserverStub }).IntersectionObserver = IntersectionObserverStub;
(window as { IntersectionObserver?: typeof IntersectionObserverStub }).IntersectionObserver = IntersectionObserverStub;

// Stub ResizeObserver (used by Radix UI primitives)
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(global as { ResizeObserver?: typeof ResizeObserverStub }).ResizeObserver = ResizeObserverStub;
(window as { ResizeObserver?: typeof ResizeObserverStub }).ResizeObserver = ResizeObserverStub;

// Stub scrollTo (jsdom warns)
window.scrollTo = (() => {}) as typeof window.scrollTo;

// Stub scrollIntoView — jsdom does not implement it, but the lead-intake
// flow calls it on every step transition.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function () {};
}
}
