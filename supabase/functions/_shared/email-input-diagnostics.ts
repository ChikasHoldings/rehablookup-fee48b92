/**
 * Shared diagnostics helpers for email validation failures.
 *
 * Used to enrich `email_required` / `invalid_email` log lines with:
 *   - field         : the request field that failed (e.g. "seekerEmail")
 *   - inputType     : detected runtime type ("missing" | "string" | "number" | "object" | "array" | "null" | "boolean")
 *   - inputLength   : length of the trimmed string (when applicable)
 *   - whitespaceOnly: true when the input was a non-empty string of only whitespace
 *
 * The detected value itself is NEVER logged — only its shape — so we don't
 * leak PII into log aggregators.
 */

export type EmailInputType =
  | "missing"
  | "null"
  | "string"
  | "number"
  | "boolean"
  | "object"
  | "array";

export interface EmailInputDiagnostics {
  field: string;
  inputType: EmailInputType;
  inputLength?: number;
  whitespaceOnly?: boolean;
}

export function detectEmailInputType(value: unknown): EmailInputType {
  if (value === undefined) return "missing";
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  const t = typeof value;
  if (t === "string") return "string";
  if (t === "number") return "number";
  if (t === "boolean") return "boolean";
  return "object";
}

export function describeEmailInput(field: string, value: unknown): EmailInputDiagnostics {
  const inputType = detectEmailInputType(value);
  const diag: EmailInputDiagnostics = { field, inputType };
  if (inputType === "string") {
    const s = value as string;
    const trimmed = s.trim();
    diag.inputLength = trimmed.length;
    diag.whitespaceOnly = s.length > 0 && trimmed.length === 0;
  }
  return diag;
}
