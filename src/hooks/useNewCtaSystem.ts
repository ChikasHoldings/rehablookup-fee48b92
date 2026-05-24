/**
 * Feature flag hook for the calm-CTA / conversion-system rebuild.
 *
 * Single source of truth so every gated component reads the same
 * value. Flag is env-driven via `VITE_NEW_CTA_SYSTEM`; default is
 * false so the new system ships behind a switch and the existing
 * popup-heavy behavior stays byte-identical until the flag is
 * flipped per-environment.
 */
export function useNewCtaSystem(): boolean {
   
  const raw = (typeof import.meta !== "undefined" && (import.meta as { env?: Record<string, string> }).env?.VITE_NEW_CTA_SYSTEM) ?? "";
  return raw === "1" || raw.toLowerCase() === "true";
}

/** Same value at module import time, for non-hook call sites. */
 
const moduleEnv = (typeof import.meta !== "undefined" && (import.meta as { env?: Record<string, string> }).env?.VITE_NEW_CTA_SYSTEM) ?? "";
export const NEW_CTA_SYSTEM = moduleEnv === "1" || moduleEnv.toLowerCase() === "true";
