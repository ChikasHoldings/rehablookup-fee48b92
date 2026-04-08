import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const resend = new Resend(resendApiKey);
    const timestamp = new Date().toISOString();
    const results: Record<string, unknown> = {};

    // Send to admin
    const adminResult = await resend.emails.send({
      from: "RehabLookup <no-reply@rehablookup.com>",
      to: ["chikasholdings@gmail.com"],
      subject: "✅ RehabLookup Email Test - Admin",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #1B365D; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: #fff; margin: 0;">RehabLookup Email Test</h1>
          </div>
          <div style="background: #fff; padding: 24px; border: 1px solid #e5e7eb; border-radius: 0 0 12px 12px;">
            <p style="color: #1a1a1a;">Hi Admin,</p>
            <p style="color: #555;">This is a <strong>test email</strong> confirming that Resend email delivery is working correctly.</p>
            <div style="background: #f0f9ff; padding: 16px; border-radius: 8px; border-left: 4px solid #1B365D; margin: 20px 0;">
              <p style="margin: 0; color: #1B365D;"><strong>Status:</strong> ✅ Resend Connected & Working</p>
              <p style="margin: 8px 0 0; color: #666;"><strong>Sent at:</strong> ${timestamp}</p>
              <p style="margin: 8px 0 0; color: #666;"><strong>From:</strong> no-reply@rehablookup.com</p>
            </div>
            <p style="color: #999; font-size: 12px;">This was a one-time test email from the RehabLookup platform.</p>
          </div>
        </div>
      `,
    });
    results.admin = adminResult;

    // Send to provider
    const providerResult = await resend.emails.send({
      from: "RehabLookup <no-reply@rehablookup.com>",
      to: ["ckabakwu@gmail.com"],
      subject: "✅ RehabLookup Email Test - Provider",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #1B365D; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: #fff; margin: 0;">RehabLookup Email Test</h1>
          </div>
          <div style="background: #fff; padding: 24px; border: 1px solid #e5e7eb; border-radius: 0 0 12px 12px;">
            <p style="color: #1a1a1a;">Hi Provider,</p>
            <p style="color: #555;">This is a <strong>test email</strong> confirming that Resend email delivery is working correctly for provider communications.</p>
            <div style="background: #f0f9ff; padding: 16px; border-radius: 8px; border-left: 4px solid #1B365D; margin: 20px 0;">
              <p style="margin: 0; color: #1B365D;"><strong>Status:</strong> ✅ Resend Connected & Working</p>
              <p style="margin: 8px 0 0; color: #666;"><strong>Sent at:</strong> ${timestamp}</p>
              <p style="margin: 8px 0 0; color: #666;"><strong>From:</strong> no-reply@rehablookup.com</p>
            </div>
            <p style="color: #999; font-size: 12px;">This was a one-time test email from the RehabLookup platform.</p>
          </div>
        </div>
      `,
    });
    results.provider = providerResult;

    console.log("[TEST-RESEND] Emails sent:", JSON.stringify(results));

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[TEST-RESEND] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
