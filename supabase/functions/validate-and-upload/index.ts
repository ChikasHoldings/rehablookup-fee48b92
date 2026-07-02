// ============================================================================
// validate-and-upload v1.0.0
// ----------------------------------------------------------------------------
// Server-side, content-verified upload for provider gallery images and
// credential documents. Clients POST the file as multipart/form-data; this
// function:
//   1. authenticates the caller (JWT) and confirms the target path is under
//      their own user-id folder,
//   2. reads the file's leading bytes and verifies the ACTUAL type via magic
//      bytes (not the client-declared MIME or extension),
//   3. enforces a per-kind MIME allowlist + max size,
//   4. uploads via the service role with the detected Content-Type.
//
// Nothing is written to storage unless validation passes, so a rejected
// upload leaves no partial/orphaned object behind. The caller only creates
// the DB record after this returns 200.
//
// Form fields:
//   file   : the binary (required)
//   kind   : "gallery" | "credential" (required)
//   path   : full object path, must start with "<caller-uid>/" (required)
//   upsert : "true" | "false" (optional, default false)
//
// Buckets are derived from `kind` server-side — the client cannot target an
// arbitrary bucket.
// ============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import {
  validateUpload,
  GALLERY_ALLOWED,
  CREDENTIAL_ALLOWED,
} from "../_shared/file-magic.ts";

// 1.1.0 (2026-07-02 entitlement audit): plan-aware object-count ceiling for
// gallery uploads — mirrors the facility_images_plan_object_cap RESTRICTIVE
// storage policy (this function uploads via service role, which bypasses
// storage RLS, so the ceiling must be enforced here too).
const VERSION = "1.1.0";
const MAX_BYTES = 10 * 1024 * 1024; // 10MB


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify({ ...body, _version: VERSION }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const BUCKET_BY_KIND: Record<string, { bucket: string; allowed: typeof GALLERY_ALLOWED; public: boolean }> = {
  gallery: { bucket: "facility-images", allowed: GALLERY_ALLOWED, public: true },
  credential: { bucket: "facility-credentials", allowed: CREDENTIAL_ALLOWED, public: false },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed", code: "METHOD_NOT_ALLOWED" });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_ANON || !SUPABASE_SRK) {
      return json(500, { error: "Server misconfigured", code: "SERVER_MISCONFIGURED" });
    }

    // ---- Auth ----
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "Authentication required", code: "AUTH_MISSING" });
    const anon = createClient(SUPABASE_URL, SUPABASE_ANON);
    const { data: u, error: uErr } = await anon.auth.getUser(authHeader.replace(/^Bearer\s+/i, ""));
    if (uErr || !u?.user?.id) return json(401, { error: "Invalid authentication", code: "AUTH_INVALID" });
    const uid = u.user.id;

    // ---- Parse multipart ----
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return json(400, { error: "Expected multipart/form-data", code: "BAD_FORM" });
    }
    const file = form.get("file");
    const kind = String(form.get("kind") ?? "");
    const path = String(form.get("path") ?? "");
    const upsert = String(form.get("upsert") ?? "false") === "true";

    if (!(file instanceof File)) {
      return json(400, { error: "Missing file", code: "NO_FILE" });
    }
    const cfg = BUCKET_BY_KIND[kind];
    if (!cfg) {
      return json(400, { error: "Invalid upload kind", code: "INVALID_KIND" });
    }

    // ---- Path ownership: the object must live under the caller's own folder.
    // This mirrors the storage RLS predicate (foldername[1] = auth.uid()).
    if (!path || path.split("/")[0] !== uid) {
      return json(403, { error: "Path must be under your own user folder", code: "PATH_FORBIDDEN" });
    }
    // Defense against traversal / absolute paths.
    if (path.includes("..") || path.startsWith("/")) {
      return json(400, { error: "Invalid path", code: "BAD_PATH" });
    }

    // ---- Read bytes + content-verify ----
    const buf = new Uint8Array(await file.arrayBuffer());
    const result = validateUpload({
      bytes: buf.subarray(0, 16),
      byteLength: buf.byteLength,
      allowed: cfg.allowed,
      maxBytes: MAX_BYTES,
    });
    if (!result.ok) {
      // Nothing uploaded — clean rejection.
      return json(415, { error: result.error ?? "File rejected", code: "FILE_REJECTED" });
    }

    // ---- Upload via service role with the DETECTED content type ----
    const svc = createClient(SUPABASE_URL, SUPABASE_SRK, { auth: { persistSession: false } });

    // ---- Plan-aware object ceiling for gallery uploads ----
    // Service-role uploads bypass the facility_images_plan_object_cap
    // RESTRICTIVE storage policy, so enforce the same ceiling here via the
    // same SQL helper (counts nested objects under the caller's folder;
    // Free=10 / Pro=60 — see migration 20260829004100). The gallery flow
    // always writes fresh timestamped paths, so every accepted upload grows
    // the count; upserts to an existing path are rare and the cap's slack
    // absorbs them.
    if (cfg.bucket === "facility-images") {
      const { data: withinCap, error: capErr } = await svc.rpc(
        "facility_images_upload_within_cap",
        { p_user: uid },
      );
      if (capErr) {
        console.error("[validate-and-upload] cap check failed", capErr.message);
        return json(502, { error: "Upload failed. Please try again.", code: "PLAN_CAP_CHECK_ERROR" });
      }
      if (withinCap !== true) {
        return json(403, {
          error:
            "Image storage limit reached for your plan. Remove unused images or upgrade to Pro for more space.",
          code: "PLAN_STORAGE_CAP",
        });
      }
    }
    const { error: upErr } = await svc.storage.from(cfg.bucket).upload(path, buf, {
      contentType: result.detectedMime!,
      upsert,
      cacheControl: "3600",
    });
    if (upErr) {
      console.error(`[validate-and-upload] storage upload failed`, upErr.message);
      // Storage rejected (e.g. bucket allowlist / size). Surface cleanly;
      // nothing partial persists on a failed upload.
      return json(502, { error: "Upload failed. Please try again.", code: "STORAGE_ERROR" });
    }

    const publicUrl = cfg.public
      ? svc.storage.from(cfg.bucket).getPublicUrl(path).data.publicUrl
      : null;

    return json(200, {
      ok: true,
      bucket: cfg.bucket,
      path,
      publicUrl,
      detectedMime: result.detectedMime,
    });
  } catch (error) {
    console.error("[validate-and-upload] unhandled", error instanceof Error ? error.message : String(error));
    return json(500, { error: "Something went wrong. Please try again.", code: "UNHANDLED" });
  }
});
