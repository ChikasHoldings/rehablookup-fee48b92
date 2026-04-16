import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { sendEmailWithRetry } from "../_shared/resilient-email-sender.ts";

const VERSION = "1.2.0";
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const generateRequestId = () => crypto.randomUUID().slice(0, 8);

const log = (requestId: string, level: "INFO" | "WARN" | "ERROR", message: string, details?: unknown) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` | ${JSON.stringify(details)}` : "";
  console.log(`[${timestamp}] [${requestId}] [${level}] ${message}${detailsStr}`);
};

Deno.serve(async (req) => {
  const requestId = generateRequestId();
  
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    log(requestId, "INFO", `Starting marketing follow-up email job v${VERSION}`);
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Support manual trigger for a specific lead
    let manualLeadId: string | null = null;
    try {
      const body = await req.json();
      manualLeadId = body?.manualLeadId || null;
    } catch {
      // No body or invalid JSON — batch mode
    }

    let unengagedLeads: any[] = [];

    if (manualLeadId) {
      // Manual mode: send to a specific lead regardless of time window
      const { data: lead, error: fetchError } = await supabase
        .from("marketing_leads")
        .select("*")
        .eq("id", manualLeadId)
        .single();

      if (fetchError || !lead) {
        log(requestId, "ERROR", "Manual lead not found", { id: manualLeadId });
        return new Response(
          JSON.stringify({ error: "Lead not found" }),
          { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      if (lead.followup_email_sent) {
        return new Response(
          JSON.stringify({ error: "Follow-up already sent" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      unengagedLeads = [lead];
      log(requestId, "INFO", "Manual follow-up trigger", { leadId: manualLeadId });
    } else {
      // Batch mode: find leads 12-24 hours old with no engagement
      const cutoffStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const cutoffEnd = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();

      const { data: leads, error: fetchError } = await supabase
        .from("marketing_leads")
        .select("*")
        .eq("followup_email_sent", false)
        .gte("created_at", cutoffStart)
        .lte("created_at", cutoffEnd)
        .eq("converted_to_concierge", false)
        .limit(50);

      if (fetchError) {
        log(requestId, "ERROR", "Failed to fetch marketing leads", { error: fetchError.message });
        throw new Error("Failed to fetch leads");
      }

      // Filter to only leads with no facility requests
      unengagedLeads = (leads || []).filter(
        (lead: any) => !lead.facilities_requested || lead.facilities_requested.length === 0
      );
    }

    log(requestId, "INFO", "Found unengaged marketing leads", { count: unengagedLeads.length });

    // Check suppressed emails to avoid sending to bounced/complained/unsubscribed addresses
    const emails = unengagedLeads.map((l) => l.email);
    let suppressedSet = new Set<string>();
    if (emails.length > 0) {
      const { data: suppressed } = await supabase
        .from("suppressed_emails")
        .select("email")
        .in("email", emails);
      if (suppressed) {
        suppressedSet = new Set(suppressed.map((s: { email: string }) => s.email.toLowerCase()));
      }
    }

    let sent = 0;
    let failed = 0;
    let suppressed_count = 0;

    for (const lead of unengagedLeads) {
      // Skip suppressed emails
      if (suppressedSet.has(lead.email.toLowerCase())) {
        suppressed_count++;
        log(requestId, "INFO", "Skipping suppressed email", { leadId: lead.id, email: lead.email });
        // Mark as sent to avoid retrying
        await supabase
          .from("marketing_leads")
          .update({
            followup_email_sent: true,
            followup_email_sent_at: new Date().toISOString(),
          })
          .eq("id", lead.id);
        continue;
      }

      try {
        // Generate a simple unsubscribe token for this email
        const unsubToken = crypto.randomUUID();
        
        await sendEmailWithRetry(supabase, resend, {
          from: "RehabLookup <no-reply@rehablookup.com>",
          to: [lead.email],
          subject: "Still looking for treatment help? We can help.",
          html: getFollowUpEmail(lead.first_name, unsubToken),
          headers: {
            "List-Unsubscribe": `<https://rehablookup.com/unsubscribe?token=${unsubToken}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        }, { emailType: "marketing_followup" };

        // Mark as sent
        await supabase
          .from("marketing_leads")
          .update({
            followup_email_sent: true,
            followup_email_sent_at: new Date().toISOString(),
          })
          .eq("id", lead.id);

        sent++;
        log(requestId, "INFO", "Follow-up email sent", { leadId: lead.id, email: lead.email });
      } catch (emailError) {
        failed++;
        log(requestId, "WARN", "Failed to send follow-up email", { leadId: lead.id, error: String(emailError) });
      }
    }

    log(requestId, "INFO", "Marketing follow-up job complete", { sent, failed, suppressed: suppressed_count, total: unengagedLeads.length });

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: unengagedLeads.length,
        sent,
        failed,
        suppressed: suppressed_count,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    log(requestId, "ERROR", "Marketing follow-up job failed", { error: String(error) });
    return new Response(
      JSON.stringify({ error: "Job failed" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

function getFollowUpEmail(firstName: string, unsubToken: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <!-- Header -->
          <tr>
            <td style="background-color: #1B365D; background: #1B365D; padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 16px;">💜</div>
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #cbd5e1; font-family: Arial, Helvetica, sans-serif; text-transform: uppercase; letter-spacing: 1px;">REHABLOOKUP</p>
              <h1 style="margin: 0; font-size: 24px; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-weight: 600;">
                We're Here to Help
              </h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background: #ffffff; padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Hi ${firstName},
              </p>
              <p style="margin: 0 0 24px 0; color: #374151; font-size: 15px; line-height: 1.6;">
                We noticed you started looking for treatment options yesterday. Finding the right program can feel overwhelming — we understand.
              </p>
              <p style="margin: 0 0 24px 0; color: #374151; font-size: 15px; line-height: 1.6;">
                <strong>Did you find what you were looking for?</strong> If not, our Concierge team can help you personally.
              </p>
              
              <!-- Concierge Benefits Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0f9ff; background: #f0f9ff; border: 2px solid #0EA5E9; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 24px;">
                    <p style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #1B365D; text-align: center; font-family: Arial, Helvetica, sans-serif;">
                      ⭐ Concierge Placement Service
                    </p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 8px 0; color: #1B365D; font-size: 14px; font-family: Arial, Helvetica, sans-serif;">
                          ✅ Personal matching specialist assigned to your case
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #1B365D; font-size: 14px; font-family: Arial, Helvetica, sans-serif;">
                          ✅ Insurance verification & coverage assistance
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #1B365D; font-size: 14px; font-family: Arial, Helvetica, sans-serif;">
                          ✅ Direct introductions to matched programs
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #1B365D; font-size: 14px; font-family: Arial, Helvetica, sans-serif;">
                          ✅ Support throughout the admissions process
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 20px 0 0 0; text-align: center;">
                      <span style="background: #22c55e; color: #ffffff; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: 600;">
                        Just $29 — One-time fee
                      </span>
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 8px;">
                <tr>
                  <td align="center">
                    <a href="https://rehablookup.com/concierge" style="display: inline-block; background-color: #1B365D; background: #1B365D; color: #ffffff; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; font-family: Arial, Helvetica, sans-serif;">
                      Get Expert Help Now →
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 28px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6; text-align: center; font-family: Arial, Helvetica, sans-serif;">
                Or call us directly: <a href="tel:1-800-662-4357" style="color: #1B365D; text-decoration: none; font-weight: 600;">1-800-662-4357</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background: #1B365D; padding: 24px 32px; border-radius: 0 0 12px 12px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0 0 12px 0; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 600;">
                      RehabLookup
                    </p>
                    <p style="margin: 0 0 16px 0; color: #93c5fd; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px;">
                      Connecting families with quality care
                    </p>
                    <p style="margin: 0 0 12px 0; color: rgba(255,255,255,0.5); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px;">
                      You received this because you requested treatment information on RehabLookup.
                    </p>
                    <p style="margin: 0 0 8px 0;">
                      <a href="https://rehablookup.com/unsubscribe?token=${unsubToken}" style="color: #93c5fd; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; text-decoration: underline;">
                        Unsubscribe from these emails
                      </a>
                    </p>
                    <p style="margin: 0; color: rgba(255,255,255,0.5); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px;">
                      © ${new Date().getFullYear()} RehabLookup. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
