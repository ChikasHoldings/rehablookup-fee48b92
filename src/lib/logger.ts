/**
 * Centralized logger that respects build environment.
 *
 * - `debug` / `info` are stripped in production builds (silent no-ops).
 * - `warn` / `error` always pass through so Sentry / browser devtools still see them.
 *
 * Usage:
 *   import { logger } from "@/lib/logger";
 *   logger.debug("[Component] state", { foo });
 *   logger.error("[Component] failed", err);
 *
 * Prefix convention: always lead with `[ComponentOrHook]` for grep-ability.
 */

const isDev = import.meta.env.DEV;

type LogArgs = unknown[];

export const logger = {
  debug: (...args: LogArgs): void => {
    if (isDev) console.log(...args);
  },
  info: (...args: LogArgs): void => {
    if (isDev) console.info(...args);
  },
  warn: (...args: LogArgs): void => {
    console.warn(...args);
  },
  error: (...args: LogArgs): void => {
    console.error(...args);
  },
};
