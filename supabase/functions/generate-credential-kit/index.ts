/**
 * generate-credential-kit
 *
 * On-demand generator for the Pro-verified Credential Kit. Produces:
 *
 *   - certificate.pdf          — RehabLookup listing-verification cert
 *   - badge.svg                — Verified badge (drop-in, single file)
 *   - email-signature.html     — One-block HTML for Gmail/Outlook
 *   - social-og.svg            — 1200 × 630 (Open Graph)
 *   - social-twitter.svg       — 1200 × 675 (X / Twitter card)
 *   - social-instagram.svg     — 1080 × 1080 (square)
 *   - social-linkedin.svg      — 1200 × 627
 *   - README.txt               — usage guide + clinical-accreditation disclaimer
 *
 * Bundles them as a ZIP, uploads to the credential-kits storage
 * bucket, and returns a 1-hour signed URL for the caller to download.
 *
 * GUARDRAILS — both must hold; either failure → 403:
 *   1. Caller owns the facility (user_owns_facility RPC).
 *   2. Facility is approved + verified + has_active_pro() = true.
 *
 * The certificate copy is intentionally narrow: it confirms LISTING
 * verification only and includes an explicit disclaimer that it is
 * NOT a clinical accreditation. RehabLookup does not grant JCAHO /
 * CARF / state-license status and the kit must never imply it does.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { PDFDocument, StandardFonts, rgb, LineCapStyle } from "https://esm.sh/pdf-lib@1.17.1?target=denonext";
import JSZip from "https://esm.sh/jszip@3.10.1?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeXml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeHtml(s: string): string {
  return escapeXml(s);
}

// pdf-lib font has widthOfTextAtSize(text, size): number.
type PdfFont = { widthOfTextAtSize: (t: string, s: number) => number };

/** Largest size in [min,max] at which `text` fits `maxWidth`, stepping by 1. */
function fitFontSize(
  text: string,
  font: PdfFont,
  maxWidth: number,
  max: number,
  min: number,
): number {
  let size = max;
  while (size > min && font.widthOfTextAtSize(text, size) > maxWidth) size -= 1;
  return size;
}

/** Trim with an ellipsis until `text` fits `maxWidth` at `size`. */
function ellipsizeToWidth(
  text: string,
  font: PdfFont,
  size: number,
  maxWidth: number,
): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && font.widthOfTextAtSize(t + "…", size) > maxWidth) {
    t = t.slice(0, -1);
  }
  return t.trimEnd() + "…";
}

/** Greedy word-wrap into at most `maxLines` lines of ~maxChars; ellipsize overflow. */
function wrapGreedy(text: string, maxChars: number, maxLines: number): string[] {
  const words = String(text ?? "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (let i = 0; i < words.length; i++) {
    const cand = cur ? cur + " " + words[i] : words[i];
    if (cand.length <= maxChars || !cur) {
      cur = cand;
    } else {
      lines.push(cur);
      if (lines.length === maxLines - 1) {
        cur = words.slice(i).join(" ");
        break;
      }
      cur = words[i];
    }
  }
  if (cur) lines.push(cur);
  const last = lines.length - 1;
  if (last >= 0 && lines[last].length > maxChars) {
    lines[last] = lines[last].slice(0, Math.max(1, maxChars - 1)).trimEnd() + "…";
  }
  return lines.slice(0, maxLines);
}

/** Single-line clamp with ellipsis for SVG text that must not overflow. */
function clampStr(s: string, maxChars: number): string {
  const str = String(s ?? "");
  if (str.length <= maxChars) return str;
  return str.slice(0, Math.max(1, maxChars - 1)).trimEnd() + "…";
}

/**
 * pdf-lib StandardFonts encode WinAnsi (CP1252) only — an unencodable glyph
 * throws and would crash the whole kit. Normalize smart punctuation to ASCII
 * and drop anything outside the encodable range so any facility name is safe.
 */
function pdfText(s: string): string {
  return String(s ?? "")
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "")
    .trim();
}

interface FacilityRow {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  verified: boolean | null;
  claimed_at: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SB_URL = Deno.env.get("SUPABASE_URL");
    const SB_ANON = Deno.env.get("SUPABASE_ANON_KEY");
    const SB_SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SB_URL || !SB_ANON || !SB_SVC) {
      return json({ error: "Server misconfigured" }, 500);
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const userClient = createClient(SB_URL, SB_ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    let body: { facility_id?: string };
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }
    const facilityId = body.facility_id?.trim();
    if (
      !facilityId ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        facilityId,
      )
    ) {
      return json({ error: "facility_id (uuid) required" }, 400);
    }

    const admin = createClient(SB_URL, SB_SVC);

    // ─── Guardrail 1: caller owns the facility ───────────────────────
    const { data: ownsRaw, error: ownErr } = await admin.rpc(
      "user_owns_facility",
      { _facility_id: facilityId, _user_id: user.id },
    );
    if (ownErr) {
      console.error("[generate-credential-kit] ownership check failed:", ownErr.message);
      return json({ error: "Authorization check failed" }, 500);
    }
    if (!ownsRaw) {
      return json({ error: "Forbidden — facility not owned by caller" }, 403);
    }

    // ─── Load facility row, then enforce verified + Pro ──────────────
    const { data: facility, error: facilityErr } = await admin
      .from("facilities")
      .select("id, name, slug, city, state, verified, claimed_at, suspended")
      .eq("id", facilityId)
      .eq("status", "approved")
      .maybeSingle();

    if (facilityErr || !facility) {
      return json({ error: "Facility not found" }, 404);
    }
    const row = facility as FacilityRow;

    // A suspended facility's verification is paused — don't mint a new
    // Verified certificate / badge that could be redistributed while the
    // listing is invisible.
    if ((row as { suspended?: boolean }).suspended === true) {
      return json(
        { error: "Facility is suspended.", reason: "suspended" },
        403,
      );
    }

    if (!row.verified) {
      return json(
        {
          error: "Facility is not verified.",
          reason: "verification_required",
        },
        403,
      );
    }

    // ─── Guardrail 2: has_active_pro server-side ─────────────────────
    const { data: isProRaw, error: proErr } = await admin.rpc(
      "has_active_pro",
      { p_facility_id: facilityId },
    );
    if (proErr) {
      console.error("[generate-credential-kit] pro check failed:", proErr.message);
      return json({ error: "Authorization check failed" }, 500);
    }
    if (!isProRaw) {
      return json(
        {
          error: "Pro subscription required to download the Credential Kit.",
          reason: "pro_required",
        },
        403,
      );
    }

    // ─── Compose dynamic facility context ───────────────────────────
    const facilityName = row.name || "RehabLookup Verified Facility";
    const locale = [row.city, row.state].filter(Boolean).join(", ");
    const profileUrl = `https://rehablookup.com/center/${row.slug}`;

    // Verification date: prefer claimed_at (when the provider became
    // owner) as the closest proxy to when the listing went verified.
    // Fall back to today if claimed_at is null (legacy rows).
    const verifiedSince = row.claimed_at
      ? new Date(row.claimed_at)
      : new Date();
    const verifiedSinceStr = verifiedSince.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const issuedAtStr = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // ─── Generate assets ─────────────────────────────────────────────
    const certPdfBytes = await buildCertificatePdf({
      facilityName,
      locale,
      profileUrl,
      verifiedSinceStr,
      issuedAtStr,
    });

    const badgeSvg = buildBadgeSvg({ facilityName, profileUrl });
    const emailSignatureHtml = buildEmailSignatureHtml({
      facilityName,
      profileUrl,
    });

    const socialOgSvg = buildSocialImage({
      width: 1200,
      height: 630,
      facilityName,
      locale,
      profileUrl,
    });
    const socialTwitterSvg = buildSocialImage({
      width: 1200,
      height: 675,
      facilityName,
      locale,
      profileUrl,
    });
    const socialInstagramSvg = buildSocialImage({
      width: 1080,
      height: 1080,
      facilityName,
      locale,
      profileUrl,
    });
    const socialLinkedinSvg = buildSocialImage({
      width: 1200,
      height: 627,
      facilityName,
      locale,
      profileUrl,
    });

    const readme = buildReadme({
      facilityName,
      locale,
      profileUrl,
      verifiedSinceStr,
      issuedAtStr,
    });

    // ─── Bundle into ZIP ────────────────────────────────────────────
    const zip = new JSZip();
    zip.file("README.txt", readme);
    zip.file("certificate.pdf", certPdfBytes);
    zip.file("badge.svg", badgeSvg);
    zip.file("email-signature.html", emailSignatureHtml);
    zip.file("social/og-1200x630.svg", socialOgSvg);
    zip.file("social/twitter-1200x675.svg", socialTwitterSvg);
    zip.file("social/instagram-1080x1080.svg", socialInstagramSvg);
    zip.file("social/linkedin-1200x627.svg", socialLinkedinSvg);
    const zipBytes: Uint8Array = await zip.generateAsync({
      type: "uint8array",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    // ─── Upload to storage ───────────────────────────────────────────
    const objectPath = `${facilityId}/kit-${Date.now()}.zip`;

    const { error: uploadErr } = await admin.storage
      .from("credential-kits")
      .upload(objectPath, zipBytes, {
        contentType: "application/zip",
        cacheControl: "no-store",
        upsert: true,
      });
    if (uploadErr) {
      console.error("[generate-credential-kit] upload failed:", uploadErr.message);
      return json({ error: "Could not save kit. Try again in a moment." }, 500);
    }

    // ─── Mint signed URL ─────────────────────────────────────────────
    const { data: signed, error: signErr } = await admin.storage
      .from("credential-kits")
      .createSignedUrl(objectPath, SIGNED_URL_TTL_SECONDS, {
        download: `rehablookup-credential-kit-${row.slug}.zip`,
      });
    if (signErr || !signed?.signedUrl) {
      console.error(
        "[generate-credential-kit] sign-url failed:",
        signErr?.message,
      );
      return json({ error: "Could not generate download link." }, 500);
    }

    return json({
      ok: true,
      download_url: signed.signedUrl,
      expires_in_seconds: SIGNED_URL_TTL_SECONDS,
      object_path: objectPath,
      generated_at: new Date().toISOString(),
      asset_count: 8,
    });
  } catch (err) {
    console.error("[generate-credential-kit] Unexpected:", err);
    return json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      500,
    );
  }
});

/* ──────────────────────── Asset builders ───────────────────────────── */

/**
 * One-page formal certificate. Plain text + simple decorative lines so
 * we don't ship a logo raster from the edge function. Copy is scoped
 * narrowly to LISTING verification and explicitly disclaims clinical
 * accreditation.
 */
async function buildCertificatePdf(opts: {
  facilityName: string;
  locale: string;
  profileUrl: string;
  verifiedSinceStr: string;
  issuedAtStr: string;
}): Promise<Uint8Array> {
  // Sanitize dynamic text to WinAnsi (the only encoding StandardFonts
  // support) so an exotic facility name can't crash PDF generation.
  const facilityName = pdfText(opts.facilityName) || "RehabLookup Verified Facility";
  const locale = pdfText(opts.locale);
  const profileUrl = pdfText(opts.profileUrl);
  const { verifiedSinceStr, issuedAtStr } = opts;

  const doc = await PDFDocument.create();
  const W = 612, H = 792; // US Letter portrait
  const page = doc.addPage([W, H]);
  const helv = await doc.embedFont(StandardFonts.Helvetica);
  const helvBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const navy = rgb(0.106, 0.212, 0.365); // #1B365D
  const slate600 = rgb(0.282, 0.337, 0.412); // #475569
  const slate500 = rgb(0.392, 0.455, 0.545); // #64748b
  const white = rgb(1, 1, 1);

  const center = (
    text: string,
    y: number,
    size: number,
    font: typeof helv,
    color = navy,
  ) => {
    const width = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: (W - width) / 2, y, size, font, color });
  };
  const hrule = (y: number, halfW: number, color: typeof navy, thickness = 1) => {
    page.drawLine({
      start: { x: W / 2 - halfW, y },
      end: { x: W / 2 + halfW, y },
      thickness,
      color,
    });
  };

  // ── Decorative double frame. Drawn as four lines per rect so it is
  //    never accidentally filled (border-only). ───────────────────────
  const frame = (inset: number, color: typeof navy, thickness: number) => {
    const a = inset, b = W - inset, c = H - inset;
    page.drawLine({ start: { x: a, y: inset }, end: { x: b, y: inset }, thickness, color });
    page.drawLine({ start: { x: b, y: inset }, end: { x: b, y: c }, thickness, color });
    page.drawLine({ start: { x: b, y: c }, end: { x: a, y: c }, thickness, color });
    page.drawLine({ start: { x: a, y: c }, end: { x: a, y: inset }, thickness, color });
  };
  frame(34, navy, 2);
  frame(42, slate500, 0.75);

  const maxW = 470; // safe text width inside the inner frame

  // ── Header wordmark ─────────────────────────────────────────────────
  center("REHABLOOKUP", 716, 12, helvBold, slate600);

  // ── Verified seal: navy disc + white checkmark (vector, no raster) ──
  const cx = W / 2, cy = 668, r = 26;
  page.drawCircle({ x: cx, y: cy, size: r, color: navy });
  page.drawLine({
    start: { x: cx - 11, y: cy + 1 }, end: { x: cx - 3, y: cy - 9 },
    thickness: 4.2, color: white, lineCap: LineCapStyle.Round,
  });
  page.drawLine({
    start: { x: cx - 3, y: cy - 9 }, end: { x: cx + 13, y: cy + 11 },
    thickness: 4.2, color: white, lineCap: LineCapStyle.Round,
  });

  // ── Title ───────────────────────────────────────────────────────────
  center("Certificate of Verification", 606, 22, helvBold, navy);
  hrule(590, 70, navy, 1.5);

  center("This certifies that", 556, 12, helv, slate600);

  // Facility name — auto-fit to width, ellipsize only as a last resort
  // so a long name can never run past the frame.
  const nameSize = fitFontSize(facilityName, helvBold, maxW, 30, 16);
  center(ellipsizeToWidth(facilityName, helvBold, nameSize, maxW), 518, nameSize, helvBold, navy);

  if (locale) center(ellipsizeToWidth(locale, helv, 13, maxW), 492, 13, helv, slate600);

  center("has earned RehabLookup Verified status.", 458, 13, helv, slate600);
  hrule(436, 110, slate500, 0.75);

  // ── Dates ───────────────────────────────────────────────────────────
  center(`RehabLookup Verified since:  ${verifiedSinceStr}`, 408, 12, helv, navy);
  center(`Issued:  ${issuedAtStr}`, 390, 12, helv, navy);

  // ── Profile link ────────────────────────────────────────────────────
  center("Verified profile", 352, 10.5, helv, slate600);
  center(ellipsizeToWidth(profileUrl, helvBold, 12, maxW), 334, 12, helvBold, navy);

  // ── Scope disclaimer (keeps the claim honest — listing, not clinical) ─
  const disclaimerLines = [
    "RehabLookup Verified confirms that this facility's contact information,",
    "location, and basic operational details have been reviewed and confirmed",
    "by RehabLookup. It is NOT a clinical accreditation, treatment license, or",
    "endorsement of outcomes — those remain with the respective accrediting",
    "bodies (JCAHO, CARF, state agencies, etc.).",
  ];
  let y = 288;
  for (const line of disclaimerLines) {
    center(line, y, 9.5, helv, slate500);
    y -= 14;
  }

  // ── Validity footer ─────────────────────────────────────────────────
  center("RehabLookup Verified status remains active as long as the facility", 178, 9.5, helv, slate500);
  center("maintains an active, verified RehabLookup Pro listing.", 164, 9.5, helv, slate500);

  // ── Bottom attribution ──────────────────────────────────────────────
  hrule(96, 90, slate500, 0.75);
  center("rehablookup.com", 74, 11, helvBold, navy);
  center("Issued by RehabLookup — Verified treatment directory", 60, 8.5, helv, slate500);

  const bytes = await doc.save();
  // pdf-lib returns a Uint8Array but its type comes through as
  // `Uint8Array<ArrayBufferLike>` from esm.sh; normalize explicitly
  // for the JSZip + storage upload type signatures.
  return new Uint8Array(bytes);
}

/**
 * Drop-in SVG badge. Generic design (single brand asset; the link is
 * what personalises). Square viewBox so consumers can size freely.
 */
function buildBadgeSvg(opts: {
  facilityName: string;
  profileUrl: string;
}): string {
  const { facilityName, profileUrl } = opts;
  const name = escapeXml(facilityName);
  const url = escapeXml(profileUrl);
  const fontStack = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" role="img" aria-label="${name} — RehabLookup Verified">
  <title>${name} — RehabLookup Verified</title>
  <desc>Link: ${url}</desc>
  <defs>
    <linearGradient id="rl-badge-bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1B365D"/>
      <stop offset="100%" stop-color="#142a4a"/>
    </linearGradient>
  </defs>
  <circle cx="128" cy="128" r="120" fill="url(#rl-badge-bg)"/>
  <circle cx="128" cy="128" r="120" fill="none" stroke="#ffffff" stroke-opacity="0.18" stroke-width="3"/>
  <path d="M78 124 L114 158 L178 90" fill="none" stroke="#ffffff" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="128" y="200" text-anchor="middle" fill="#ffffff" font-family="${fontStack}" font-size="17" font-weight="700" letter-spacing="0.8">REHABLOOKUP</text>
  <text x="128" y="222" text-anchor="middle" fill="#ffffff" fill-opacity="0.85" font-family="${fontStack}" font-size="13" font-weight="600" letter-spacing="2.5">VERIFIED</text>
</svg>`;
}

/**
 * Email-signature snippet. Inline styles only — Gmail / Outlook / Apple
 * Mail strip <style> blocks and most class attributes, so every visual
 * property has to be on the element itself.
 */
function buildEmailSignatureHtml(opts: {
  facilityName: string;
  profileUrl: string;
}): string {
  const { facilityName, profileUrl } = opts;
  const safeName = escapeHtml(facilityName);
  const safeUrl = escapeHtml(profileUrl);
  return `<!--
  RehabLookup email-signature snippet.

  Drop the inner <table> (lines marked PASTE-START → PASTE-END) into
  your email client's signature settings. Most clients (Gmail, Outlook,
  Apple Mail) strip <style> blocks — every visual attribute is inlined.
-->
<!DOCTYPE html>
<html><body>
<!-- PASTE-START -->
<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <tr>
    <td style="vertical-align:middle;padding-right:12px;">
      <a href="${safeUrl}?utm_source=email-signature&utm_medium=email&utm_campaign=verified-badge" target="_blank" style="text-decoration:none;">
        <table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background:#1B365D;border-radius:8px;">
          <tr>
            <td style="padding:8px 12px;color:#ffffff;font-size:11px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;line-height:1;white-space:nowrap;">
              ✓&nbsp;RehabLookup&nbsp;Verified
            </td>
          </tr>
        </table>
      </a>
    </td>
    <td style="vertical-align:middle;border-left:1px solid #e2e8f0;padding-left:12px;">
      <a href="${safeUrl}?utm_source=email-signature&utm_medium=email&utm_campaign=verified-badge" target="_blank" style="text-decoration:none;color:#0f172a;font-size:13px;font-weight:600;line-height:1.3;">
        ${safeName}
      </a><br/>
      <span style="color:#64748b;font-size:11px;line-height:1.3;">
        <a href="https://rehablookup.com" target="_blank" style="color:#1B365D;text-decoration:none;">RehabLookup Verified</a>
      </span>
    </td>
  </tr>
</table>
<!-- PASTE-END -->
</body></html>`;
}

/**
 * Social-image template at any width/height. SVG so the asset stays
 * sharp at any rasterization step the provider takes downstream
 * (export as PNG from Figma, screenshot via browser, etc.). Branded
 * navy gradient + checkmark + facility name + locale + profile URL.
 */
function buildSocialImage(opts: {
  width: number;
  height: number;
  facilityName: string;
  locale: string;
  profileUrl: string;
}): string {
  const { width, height, facilityName, locale, profileUrl } = opts;

  // Layout scales with the smaller dimension so square (IG) and wide (OG)
  // variants both look balanced.
  const minDim = Math.min(width, height);
  const fontStack = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
  const glyph = 0.56; // avg bold-glyph width / font-size, for fit estimates

  // ── Name: shrink to fit one line; wrap to 2 lines only when the
  //    one-line size would fall below a readable floor; ellipsize beyond.
  const maxNameW = width * 0.86;
  let nameSize = Math.round(minDim * 0.078);
  const floorSize = Math.round(minDim * 0.046);
  let nameLines = [facilityName];
  const oneLineSize = Math.floor(maxNameW / (glyph * Math.max(1, facilityName.length)));
  if (oneLineSize < nameSize) {
    if (oneLineSize >= floorSize) {
      nameSize = oneLineSize;
    } else {
      nameSize = floorSize;
      const maxChars = Math.max(6, Math.floor(maxNameW / (glyph * nameSize)));
      nameLines = wrapGreedy(facilityName, maxChars, 2);
    }
  }
  const lineH = Math.round(nameSize * 1.16);
  const nameMidY = Math.round(height * 0.54);
  const nameFirstBaseline =
    nameMidY - ((nameLines.length - 1) * lineH) / 2 + Math.round(nameSize * 0.33);
  const nameBlockBottom = nameFirstBaseline + (nameLines.length - 1) * lineH;

  const localeFontSize = Math.round(minDim * 0.034);
  const urlFontSize = Math.round(minDim * 0.026);
  const wordmarkFontSize = Math.round(minDim * 0.025);

  const localeY = nameBlockBottom + Math.round(minDim * 0.055);
  const trustY = Math.round(height * 0.79);
  const urlY = Math.round(height * 0.91);

  const checkR = Math.round(minDim * 0.085);
  const checkCx = Math.round(width * 0.5);
  const checkCy = Math.round(height * 0.31);
  const checkStroke = Math.max(3, Math.round(checkR * 0.2));

  const safeLocale = escapeXml(locale);
  const maxUrlChars = Math.max(10, Math.floor((width * 0.9) / (glyph * urlFontSize)));
  const safeUrl = escapeXml(clampStr(profileUrl, maxUrlChars));

  const nameEls = nameLines
    .map(
      (ln, i) =>
        `<text x="${width / 2}" y="${nameFirstBaseline + i * lineH}" text-anchor="middle" font-family="${fontStack}" fill="#ffffff" font-size="${nameSize}" font-weight="700">${escapeXml(ln)}</text>`,
    )
    .join("\n  ");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${escapeXml(facilityName)} — RehabLookup Verified">
  <title>${escapeXml(facilityName)} — RehabLookup Verified</title>
  <defs>
    <linearGradient id="rl-social-${width}-${height}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1B365D"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#rl-social-${width}-${height})"/>
  <g opacity="0.06" stroke="#ffffff" stroke-width="1">
    <line x1="0" y1="${Math.round(height * 0.18)}" x2="${width}" y2="${Math.round(height * 0.18)}"/>
    <line x1="0" y1="${Math.round(height * 0.82)}" x2="${width}" y2="${Math.round(height * 0.82)}"/>
  </g>
  <text x="${Math.round(minDim * 0.06)}" y="${Math.round(height * 0.11)}" font-family="${fontStack}" fill="#ffffff" fill-opacity="0.7" font-size="${wordmarkFontSize}" font-weight="600" letter-spacing="2">REHABLOOKUP</text>
  <circle cx="${checkCx}" cy="${checkCy}" r="${checkR}" fill="#ffffff"/>
  <path d="M ${checkCx - checkR * 0.42} ${checkCy + checkR * 0.02} L ${checkCx - checkR * 0.08} ${checkCy + checkR * 0.36} L ${checkCx + checkR * 0.46} ${checkCy - checkR * 0.34}" fill="none" stroke="#1B365D" stroke-width="${checkStroke}" stroke-linecap="round" stroke-linejoin="round"/>
  ${nameEls}
  ${safeLocale ? `<text x="${width / 2}" y="${localeY}" text-anchor="middle" font-family="${fontStack}" fill="#ffffff" fill-opacity="0.75" font-size="${localeFontSize}" font-weight="400">${safeLocale}</text>` : ""}
  <text x="${width / 2}" y="${trustY}" text-anchor="middle" font-family="${fontStack}" fill="#ffffff" fill-opacity="0.6" font-size="${urlFontSize}" font-weight="600" letter-spacing="1.5">REHABLOOKUP VERIFIED</text>
  <text x="${width / 2}" y="${urlY}" text-anchor="middle" font-family="${fontStack}" fill="#ffffff" fill-opacity="0.7" font-size="${urlFontSize}">${safeUrl}</text>
</svg>`;
}

function buildReadme(opts: {
  facilityName: string;
  locale: string;
  profileUrl: string;
  verifiedSinceStr: string;
  issuedAtStr: string;
}): string {
  const { facilityName, locale, profileUrl, verifiedSinceStr, issuedAtStr } = opts;
  return `RehabLookup Verified — Credential Kit
=====================================

Facility:                    ${facilityName}${locale ? `\nLocation:                    ${locale}` : ""}
Profile URL:                 ${profileUrl}
RehabLookup Verified since:  ${verifiedSinceStr}
Kit generated:               ${issuedAtStr}

What's in this kit
------------------

  certificate.pdf
    Formal RehabLookup Verified certificate for printing, framing,
    or attaching to outreach. See "What RehabLookup Verified means"
    below for the exact scope of what this confirms.

  badge.svg
    Drop-in "RehabLookup Verified" badge. Use it anywhere you'd link
    to your RehabLookup profile (website footer, blog author cards,
    intake confirmations). Scales cleanly from 24px to 512px.

  email-signature.html
    HTML snippet for Gmail, Outlook, Apple Mail signatures. Copy
    everything between the PASTE-START / PASTE-END comments into
    your client's signature editor.

  social/og-1200x630.svg
    Open Graph image (Facebook, LinkedIn link previews).
  social/twitter-1200x675.svg
    X / Twitter summary-large-image card.
  social/instagram-1080x1080.svg
    Instagram square post.
  social/linkedin-1200x627.svg
    LinkedIn shared image / banner.

  All social SVGs are vector. To export PNG/JPG, open in any modern
  browser, screenshot at native resolution, or import into Figma /
  Affinity / Sketch and export.

What RehabLookup Verified means
-------------------------------

"RehabLookup Verified" confirms that RehabLookup has reviewed and
confirmed your facility's contact information, location, and basic
operational details as part of its directory listing review. It is
NOT:

  * A clinical accreditation (JCAHO, CARF, etc.) — those remain
    with their respective accrediting bodies.
  * A state license — RehabLookup does not issue licenses.
  * An endorsement of treatment outcomes.

Please do not use these assets to imply any accreditation or
licensing that RehabLookup did not itself grant. Doing so would
violate the RehabLookup provider terms.

Regenerating the kit
--------------------

If your facility name, location, or verified-since date changes,
regenerate the kit at:

  https://rehablookup.com/provider/credential-kit

Questions?  providers@rehablookup.com
`;
}
