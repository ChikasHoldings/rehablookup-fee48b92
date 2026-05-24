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
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1?target=denonext";
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
      .select("id, name, slug, city, state, verified, claimed_at")
      .eq("id", facilityId)
      .eq("status", "approved")
      .maybeSingle();

    if (facilityErr || !facility) {
      return json({ error: "Facility not found" }, 404);
    }
    const row = facility as FacilityRow;

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
  const { facilityName, locale, profileUrl, verifiedSinceStr, issuedAtStr } = opts;

  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]); // US Letter portrait
  const helv = await doc.embedFont(StandardFonts.Helvetica);
  const helvBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const navy = rgb(0.106, 0.212, 0.365); // #1B365D
  const slate600 = rgb(0.282, 0.337, 0.412); // #475569
  const slate500 = rgb(0.392, 0.455, 0.545); // #64748b

  const drawCenter = (
    text: string,
    y: number,
    size: number,
    font: typeof helv,
    color = navy,
  ) => {
    const width = font.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: (612 - width) / 2,
      y,
      size,
      font,
      color,
    });
  };

  // Decorative top + bottom rule.
  page.drawRectangle({ x: 60, y: 758, width: 492, height: 2, color: navy });
  page.drawRectangle({ x: 60, y: 60, width: 492, height: 1, color: slate500 });

  // Header
  drawCenter("RehabLookup", 720, 11, helvBold, slate600);
  drawCenter("Certificate of Verification", 695, 22, helvBold, navy);

  drawCenter("This certifies that", 640, 12, helv, slate600);

  // Facility name — wrap if very long
  const nameSize = facilityName.length > 40 ? 22 : facilityName.length > 28 ? 26 : 30;
  drawCenter(facilityName, 600, nameSize, helvBold, navy);

  if (locale) drawCenter(locale, 570, 14, helv, slate600);

  drawCenter(
    "has earned RehabLookup Verified status.",
    525,
    13,
    helv,
    slate600,
  );

  // Dates block
  drawCenter(`RehabLookup Verified since: ${verifiedSinceStr}`, 480, 12, helv, navy);
  drawCenter(`Issued: ${issuedAtStr}`, 460, 12, helv, navy);

  // Profile link
  drawCenter("Verified profile:", 410, 11, helv, slate600);
  drawCenter(profileUrl, 392, 12, helvBold, navy);

  // Disclaimer block — small, slate, justified by being centered + wrapped.
  // "RehabLookup Verified" is the marketing term; the disclaimer
  // keeps the scope honest so providers can't represent this as a
  // clinical accreditation.
  const disclaimerLines = [
    "RehabLookup Verified confirms that this facility's contact",
    "information, location, and basic operational details have been",
    "reviewed and confirmed by RehabLookup. It is NOT a clinical",
    "accreditation, treatment license, or endorsement of outcomes",
    "— those remain with the respective accrediting bodies (JCAHO,",
    "CARF, state agencies, etc.).",
  ];
  let y = 320;
  for (const line of disclaimerLines) {
    drawCenter(line, y, 10, helv, slate500);
    y -= 14;
  }

  // Validity footer
  drawCenter(
    "RehabLookup Verified status is active as long as the facility",
    200,
    10,
    helv,
    slate500,
  );
  drawCenter(
    "maintains an active, verified RehabLookup Pro listing.",
    186,
    10,
    helv,
    slate500,
  );

  // Bottom attribution
  drawCenter("rehablookup.com", 78, 11, helvBold, navy);
  drawCenter(
    "Issued by RehabLookup — Verified treatment directory",
    63,
    9,
    helv,
    slate500,
  );

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
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" role="img"
     aria-label="${escapeXml(facilityName)} — RehabLookup Verified">
  <title>${escapeXml(facilityName)} — RehabLookup Verified</title>
  <desc>Link: ${escapeXml(profileUrl)}</desc>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1B365D"/>
      <stop offset="100%" stop-color="#142a4a"/>
    </linearGradient>
  </defs>
  <circle cx="128" cy="128" r="120" fill="url(#bg)"/>
  <circle cx="128" cy="128" r="120" fill="none" stroke="#ffffff" stroke-opacity="0.15" stroke-width="4"/>
  <!-- Checkmark -->
  <path d="M82 132 L118 168 L182 96"
        fill="none" stroke="#ffffff" stroke-width="18"
        stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Wordmark -->
  <text x="128" y="216" text-anchor="middle" fill="#ffffff"
        font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
        font-size="18" font-weight="700" letter-spacing="0.5">
    REHABLOOKUP
  </text>
  <text x="128" y="238" text-anchor="middle" fill="#ffffff" fill-opacity="0.85"
        font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
        font-size="14" font-weight="600" letter-spacing="1">
    VERIFIED
  </text>
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

  // Layout vars scale with the smaller dimension so square (IG) and
  // wide (OG) variants both look balanced.
  const minDim = Math.min(width, height);
  const safeName = escapeXml(facilityName);
  const safeLocale = escapeXml(locale);
  const safeUrl = escapeXml(profileUrl);

  const checkR = Math.round(minDim * 0.09);
  const checkCx = Math.round(width * 0.5);
  const checkCy = Math.round(height * 0.32);
  const nameFontSize = Math.round(minDim * (facilityName.length > 30 ? 0.055 : 0.075));
  const localeFontSize = Math.round(minDim * 0.034);
  const urlFontSize = Math.round(minDim * 0.026);
  const wordmarkFontSize = Math.round(minDim * 0.025);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"
     width="${width}" height="${height}" role="img"
     aria-label="${safeName} — RehabLookup Verified">
  <title>${safeName} — RehabLookup Verified</title>
  <defs>
    <linearGradient id="bg-${width}-${height}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1B365D"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg-${width}-${height})"/>
  <!-- decorative grid -->
  <g opacity="0.06" stroke="#ffffff" stroke-width="1">
    <line x1="0" y1="${Math.round(height * 0.18)}" x2="${width}" y2="${Math.round(height * 0.18)}"/>
    <line x1="0" y1="${Math.round(height * 0.82)}" x2="${width}" y2="${Math.round(height * 0.82)}"/>
  </g>

  <!-- Top-left wordmark -->
  <text x="${Math.round(minDim * 0.06)}" y="${Math.round(height * 0.11)}"
        font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
        fill="#ffffff" fill-opacity="0.7" font-size="${wordmarkFontSize}" font-weight="600"
        letter-spacing="2">REHABLOOKUP</text>

  <!-- Verified checkmark badge -->
  <circle cx="${checkCx}" cy="${checkCy}" r="${checkR}" fill="#ffffff"/>
  <path d="M ${checkCx - checkR * 0.4} ${checkCy + checkR * 0.05}
           L ${checkCx - checkR * 0.05} ${checkCy + checkR * 0.4}
           L ${checkCx + checkR * 0.5} ${checkCy - checkR * 0.35}"
        fill="none" stroke="#1B365D" stroke-width="${Math.round(checkR * 0.18)}"
        stroke-linecap="round" stroke-linejoin="round"/>

  <!-- Facility name -->
  <text x="${width / 2}" y="${Math.round(height * 0.55)}" text-anchor="middle"
        font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
        fill="#ffffff" font-size="${nameFontSize}" font-weight="700">
    ${safeName}
  </text>

  ${safeLocale
    ? `<text x="${width / 2}" y="${Math.round(height * 0.65)}" text-anchor="middle"
        font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
        fill="#ffffff" fill-opacity="0.75" font-size="${localeFontSize}" font-weight="400">
    ${safeLocale}
  </text>` : ""}

  <!-- Trust mark -->
  <text x="${width / 2}" y="${Math.round(height * 0.78)}" text-anchor="middle"
        font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
        fill="#ffffff" fill-opacity="0.6" font-size="${urlFontSize}" font-weight="600"
        letter-spacing="1.5">REHABLOOKUP VERIFIED</text>

  <!-- Profile URL footer -->
  <text x="${width / 2}" y="${Math.round(height * 0.92)}" text-anchor="middle"
        font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
        fill="#ffffff" fill-opacity="0.7" font-size="${urlFontSize}">
    ${safeUrl}
  </text>
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
