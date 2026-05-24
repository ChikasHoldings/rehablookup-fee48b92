// Magic-byte (file-signature) sniffing for upload validation.
//
// The point of this module is to verify a file's ACTUAL content type
// from its leading bytes, independent of the client-declared MIME or
// the filename extension — both of which a malicious client controls.
//
// Used by the validate-and-upload edge function so that gallery images
// and credential documents are content-verified server-side, not just
// allowlisted by declared type.

export type DetectedMime =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/gif"
  | "application/pdf";

/**
 * Inspect the leading bytes of a file and return the canonical MIME it
 * actually is, or null if it matches none of the supported signatures.
 *
 * Needs at least the first 16 bytes (WebP's marker is at offset 8-11).
 */
export function sniffMime(bytes: Uint8Array): DetectedMime | null {
  if (bytes.length < 4) return null;

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  // GIF: "GIF87a" or "GIF89a"
  if (
    bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) && bytes[5] === 0x61
  ) {
    return "image/gif";
  }

  // WebP: "RIFF" (0-3) .... "WEBP" (8-11)
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  // PDF: "%PDF-" (25 50 44 46 2D). The "-" may follow a version; we only
  // require the %PDF magic, which is the spec-mandated header.
  if (
    bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46
  ) {
    return "application/pdf";
  }

  return null;
}

export interface ValidateResult {
  ok: boolean;
  detectedMime?: DetectedMime;
  error?: string;
}

/**
 * Full server-side upload validation:
 *   1. size ≤ maxBytes
 *   2. magic bytes resolve to a supported type
 *   3. that detected type is in the per-kind allowlist
 *
 * `declaredMime` is accepted for logging/telemetry only — it is NEVER
 * the basis of the decision (the requirement: client-declared MIME must
 * never be the only check).
 */
export function validateUpload(opts: {
  bytes: Uint8Array;
  byteLength: number;
  allowed: ReadonlyArray<DetectedMime>;
  maxBytes: number;
}): ValidateResult {
  const { bytes, byteLength, allowed, maxBytes } = opts;

  if (byteLength <= 0) {
    return { ok: false, error: "File is empty." };
  }
  if (byteLength > maxBytes) {
    const mb = (maxBytes / (1024 * 1024)).toFixed(0);
    return { ok: false, error: `File is too large. Maximum size is ${mb}MB.` };
  }

  const detected = sniffMime(bytes);
  if (!detected) {
    return {
      ok: false,
      error: "Unrecognized file. The file content doesn't match a supported format.",
    };
  }
  if (!allowed.includes(detected)) {
    return {
      ok: false,
      detectedMime: detected,
      error: `Files of type ${detected} aren't allowed here.`,
    };
  }

  return { ok: true, detectedMime: detected };
}

export const GALLERY_ALLOWED: ReadonlyArray<DetectedMime> = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export const CREDENTIAL_ALLOWED: ReadonlyArray<DetectedMime> = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];
