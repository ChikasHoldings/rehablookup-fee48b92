/**
 * Thin wrapper around useAuthReady for backward compatibility.
 * All seeker pages import this — it delegates to the single auth hook.
 */
export { useAuthReady as useSeekerSession } from './useAuthReady';
