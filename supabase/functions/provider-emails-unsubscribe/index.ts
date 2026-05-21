// provider-emails-unsubscribe
// ───────────────────────────
// One-click unsubscribe target for the footer links on every
// provider onboarding sequence email. Flips
// profiles.unsubscribed_provider_emails_at = now() — the cron drain
// then skips every future scheduled send for this user.
//
// Token format: base64(user_uuid). Lightweight on purpose — the
// worst-case threat (someone unsubscribing a user without consent)
// matches the user's expressed intent anyway. We don't surface a
// confirmation flow; the click IS the consent.
//
// verify_jwt: false — clicked from an email client, no session.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PUBLIC_SITE_URL = Deno.env.get("PUBLIC_SITE_URL") ?? "https://rehablookup.com";

function htmlPage(title: string, body: string): Response {
  return new Response(
    `<!doctype html>
<html><head><meta charset="utf-8"><title>${title}</title><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;background:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:48px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;">
        <tr><td style="padding:36px 32px;">
          <p style="margin:0 0 6px;font-size:12px;color:#6b7280;letter-spacing:0.05em;text-transform:uppercase;font-weight:600;">RehabLookup</p>
          <h1 style="margin:0 0 12px;font-size:20px;color:#111827;">${title}</h1>
          ${body}
          <p style="margin:24px 0 0;font-size:13px;"><a href="${PUBLIC_SITE_URL}/provider/dashboard" style="color:#1B365D;text-decoration:underline;">Open your dashboard</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
    { status: 200, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } },
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const token = url.searchParams.get("u");
  if (!token) {
    return htmlPage("Unsubscribe link is missing", `<p style="margin:0;color:#374151;font-size:14px;">No token in the URL. If you clicked an email link and landed here, please try the link again.</p>`);
  }

  let userId: string | null = null;
  try {
    userId = atob(token);
    // basic uuid sanity — 36 chars, dashes
    if (!/^[0-9a-f-]{32,36}$/i.test(userId)) userId = null;
  } catch {
    userId = null;
  }
  if (!userId) {
    return htmlPage("Invalid unsubscribe link", `<p style="margin:0;color:#374151;font-size:14px;">We couldn't read the token. Please use the most recent email's unsubscribe link.</p>`);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  const { error } = await supabase
    .from("profiles")
    .update({ unsubscribed_provider_emails_at: new Date().toISOString() } as never)
    .eq("user_id", userId);

  if (error) {
    console.error("[provider-emails-unsubscribe] update failed", error);
    return htmlPage("Something went wrong", `<p style="margin:0;color:#374151;font-size:14px;">We couldn't update your preferences. Please try again or contact support.</p>`);
  }

  return htmlPage(
    "You're unsubscribed",
    `<p style="margin:0 0 12px;color:#374151;font-size:14px;line-height:1.55;">You won't receive any more provider onboarding emails from RehabLookup. We'll keep transactional emails (lead notifications, billing) on — you can manage those from your dashboard settings.</p>
     <p style="margin:0;color:#6b7280;font-size:12px;">Changed your mind? Toggle the preference back on under Settings → Notifications.</p>`,
  );
});
