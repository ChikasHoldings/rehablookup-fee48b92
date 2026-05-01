/**
 * Structured logger for edge functions.
 *
 * Emits single-line JSON entries with stable fields:
 *   - fn       : function name (e.g. "notify-admin-provider-signup")
 *   - shortId  : 8-char request correlation id (auto-generated per request)
 *   - step     : human-readable step label
 *   - code     : machine-readable code (success / failure taxonomy)
 *   - reason   : optional human-readable reason describing the outcome
 *   - level    : "info" | "warn" | "error"
 *   - ts       : ISO timestamp
 *   - ...rest  : any additional structured fields
 *
 * Usage:
 *   const log = createLogger("notify-admin-provider-signup");
 *   log.info("started", { code: "request_received" });
 *   log.error("validation_failed", { code: "validation_error", reason: "missing facilityId" });
 *
 * The same `shortId` should be returned to clients in error responses so
 * support can grep production logs by id.
 */

export type LogLevel = "info" | "warn" | "error";

export interface LogFields {
  code?: string;
  reason?: string;
  [key: string]: unknown;
}

export interface StructuredLogger {
  shortId: string;
  info: (step: string, fields?: LogFields) => void;
  warn: (step: string, fields?: LogFields) => void;
  error: (step: string, fields?: LogFields) => void;
}

function generateShortId(): string {
  // 8 lowercase hex chars — enough for human-grep correlation
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function createLogger(fn: string, shortId?: string): StructuredLogger {
  const id = shortId ?? generateShortId();

  const emit = (level: LogLevel, step: string, fields?: LogFields) => {
    const entry = {
      level,
      fn,
      shortId: id,
      step,
      code: fields?.code,
      reason: fields?.reason,
      ts: new Date().toISOString(),
      ...(fields ?? {}),
    };
    // Re-pin known fields so they appear first even if `...fields` overrides them
    entry.level = level;
    entry.fn = fn;
    entry.shortId = id;
    entry.step = step;

    const line = JSON.stringify(entry);
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  };

  return {
    shortId: id,
    info: (step, fields) => emit("info", step, fields),
    warn: (step, fields) => emit("warn", step, fields),
    error: (step, fields) => emit("error", step, fields),
  };
}
