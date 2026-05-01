// supabase/functions/request-concierge-sms-callback/index.ts
//
// Optional SMS-callback path for the Concierge intake.
// A client who has completed steps 1–5 (so a draft already exists in
// `concierge_inquiries` via save-placement-draft) can opt to receive help by
// SMS instead of completing email verification + Stripe checkout.
//
// We do NOT charge for SMS-callback: the Concierge fee is collected later by
// the placement team when the lead converts. This route exists purely to
// remove the email-verification / payment friction for high-intent users who
// would otherwise drop off.
//
// POST { draftId, firstName, lastName, phone, email, smsConsent: true, notes? }
// - Finds the existing concierge_inquiries row by draft_id
// - Sets sms_consent=true, contact_channel='sms', sms_callback_requested_at=now()
// - Updates contact info if missing
// - Returns { ok: true, inquiryId } so the client can navigate to thank-you

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BodySchema = z.object({
  draftId: z.string().min(1).max(100),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  phone: z
    .string()
    .trim()
    .min(7)
    .max(20)
    .refine((p) => p.replace(/\D/g, "").length >= 10, "phone_too_short"),
  email: z.string().trim().email().max(254).optional().or(z.literal("")),
  smsConsent: z.literal(true),
  notes: z.string().max(1000).optional(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "method_not_allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "invalid_json" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const parsed = BodySchema.safeParse(payload);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "validation_failed", details: parsed.error.flatten() }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const { draftId, firstName, lastName, phone, email, notes } = parsed.data;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  // Find the existing draft. SMS-callback requires a step-5 draft to exist so
  // the placement team has the clinical context to act on the callback.
  const { data: existing, error: findErr } = await supabase
    .from("concierge_inquiries")
    .select("id, status")
    .eq("draft_id", draftId)
    .maybeSingle();

  if (findErr) {
    console.error("[request-concierge-sms-callback] lookup failed", findErr);
    return new Response(
      JSON.stringify({ error: "lookup_failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  if (!existing) {
    return new Response(
      JSON.stringify({ error: "draft_not_found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const now = new Date().toISOString();
  const { error: updateErr } = await supabase
    .from("concierge_inquiries")
    .update({
      user_name: `${firstName} ${lastName}`.trim().slice(0, 200),
      user_phone: phone,
      user_email: email || null,
      sms_consent: true,
      contact_channel: "sms",
      sms_callback_requested_at: now,
      // Fall back from "draft" to "new" so this case is visible to the
      // placement queue without going through Stripe checkout.
      status: existing.status === "draft" ? "new" : existing.status,
      notes: notes ? notes.slice(0, 1000) : undefined,
      intake_submitted_at: now,
      form_completed_at: now,
    })
    .eq("id", existing.id);

  if (updateErr) {
    console.error("[request-concierge-sms-callback] update failed", updateErr);
    return new Response(
      JSON.stringify({ error: "update_failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({ ok: true, inquiryId: existing.id }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
