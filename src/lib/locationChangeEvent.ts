/**
 * Cross-router location-change event.
 *
 * React Router uses `history.pushState` / `replaceState` for programmatic
 * navigation, which does NOT fire the browser's native `popstate` event.
 * That means top-level listeners (e.g. error boundaries living above the
 * Router that want to reset on route change) can't observe navigation.
 *
 * This helper monkey-patches `pushState` and `replaceState` once per app
 * load to emit a custom `rl:locationchange` event. It's safe to call
 * multiple times — the patch is idempotent.
 *
 * Subscribe via:
 *   window.addEventListener("popstate", handler);          // back/forward
 *   window.addEventListener("rl:locationchange", handler); // programmatic
 */

const PATCH_FLAG = "__rl_history_patched_v1";
const EVENT_NAME = "rl:locationchange";

export function ensureHistoryPatched(): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as Record<string, unknown>;
  if (w[PATCH_FLAG]) return;
  w[PATCH_FLAG] = true;

  const dispatch = () => {
    try {
      window.dispatchEvent(new Event(EVENT_NAME));
    } catch {
      /* SSR / hostile envs */
    }
  };

  const origPush = history.pushState;
  history.pushState = function pushStatePatched(...args: Parameters<typeof history.pushState>) {
    const r = origPush.apply(this, args);
    dispatch();
    return r;
  };

  const origReplace = history.replaceState;
  history.replaceState = function replaceStatePatched(...args: Parameters<typeof history.replaceState>) {
    const r = origReplace.apply(this, args);
    dispatch();
    return r;
  };
}

export const LOCATION_CHANGE_EVENT = EVENT_NAME;
