import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import Stripe from "https://esm.sh/stripe@18.5.0";
import {
import { sendEmailWithRetry } from "../_shared/resilient-email-sender.ts";
  PLAN_CONFIG,
  getProviderPlan,
  emailStart,
  emailHeader,
  emailBodyStart,
  emailBodyEnd,
  emailGreeting,
  emailParagraph,
  alertBox,
  ctaButton,
  emailFooter,
  emailEnd,
  type PlanType,
} from "../_shared/email-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PaymentReminderRequest {
  invoiceId?: string;
  type?: "pending" | "overdue";
  // If not provided, will send reminders for all qualifying invoices
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

function generatePaymentReminderEmail(
  providerName: string,
  facilityName: string,
  invoiceDetails: {
    id: string;
    amountCents: number;
    caseName: string;
    createdAt: string;
    isOverdue: boolean;
    daysOverdue?: number;
    paymentLink?: string;
  },
  plan: PlanType
): string {
  const isOverdue = invoiceDetails.isOverdue;
  const amount = formatCurrency(invoiceDetails.amountCents);
  const paymentUrl = invoiceDetails.paymentLink || "https://rehablookup.com/provider/placement-network?tab=billing";
  
  let email = emailStart('#f4f6f9');
  
  // Header with urgency-aware styling
  email += emailHeader(
    isOverdue ? `Payment Overdue` : `Payment Reminder`,
    plan,
    {
      icon: isOverdue ? '⚠️' : '📋',
      subtitle: `Invoice for ${invoiceDetails.caseName}`,
      isUrgent: isOverdue,
    }
  );
  
  email += emailBodyStart();
  email += emailGreeting(providerName);
  
  if (isOverdue) {
    email += emailParagraph(
      `Your placement fee for <strong>${facilityName}</strong> is now <strong>${invoiceDetails.daysOverdue} days overdue</strong>. Please submit payment as soon as possible to maintain your good standing in the Placement Network.`
    );
    
    email += alertBox(
      `<strong>Invoice Amount:</strong> ${amount}<br/>
       <strong>Original Due Date:</strong> ${new Date(invoiceDetails.createdAt).toLocaleDateString()}<br/>
       <strong>Days Overdue:</strong> ${invoiceDetails.daysOverdue} days`,
      plan,
      { isUrgent: true }
    );
    
    email += emailParagraph(
      `<em>Note: Continued non-payment may result in suspension from the Placement Network and additional collection fees.</em>`
    );
  } else {
    email += emailParagraph(
      `This is a friendly reminder that you have a pending placement fee for <strong>${facilityName}</strong>. Please complete payment at your earliest convenience.`
    );
    
    email += `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f0f9ff; border: 1px solid #bfdbfe; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 12px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; font-weight: 600; color: #1e40af;">
                      Invoice Details
                    </p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 4px 0; font-size: 14px; color: #1e40af;">Case: ${invoiceDetails.caseName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; font-size: 14px; color: #1e40af;"><strong>Amount Due: ${amount}</strong></td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; font-size: 14px; color: #1e40af;">Invoice Date: ${new Date(invoiceDetails.createdAt).toLocaleDateString()}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
    `;
  }
  
  email += ctaButton(isOverdue ? "Pay Now" : "View Invoice", paymentUrl, plan);
  
  email += `
              <p style="margin: 24px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #64748b; text-align: center;">
                Questions about this invoice? <a href="mailto:billing@rehablookup.com" style="color: #1B365D; text-decoration: none;">Contact Billing Support</a>
              </p>
  `;
  
  email += emailBodyEnd();
  email += emailFooter({ includeNotificationSettings: false });
  email += emailEnd();
  
  return email;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const body: PaymentReminderRequest = await req.json().catch(() => ({}));
    const { invoiceId, type } = body;

    console.log("Processing payment reminders:", { invoiceId, type });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, { apiVersion: "2025-08-27.basil" }) : null;
    const resend = new Resend(resendApiKey);

    // Build query for invoices
    let query = supabase
      .from("placement_invoices")
      .select(`
        *,
        facilities!inner(id, name, user_id),
        placement_cases!inner(id, seeker_name)
      `)
      .in("status", ["pending", "sent"]);

    if (invoiceId) {
      query = query.eq("id", invoiceId);
    }

    const { data: invoices, error: invoicesError } = await query;

    if (invoicesError) {
      console.error("Error fetching invoices:", invoicesError);
      throw invoicesError;
    }

    if (!invoices || invoices.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No invoices to process", sent: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const results: { invoiceId: string; success: boolean; error?: string }[] = [];

    for (const invoice of invoices) {
      try {
        const facility = invoice.facilities;
        const placementCase = invoice.placement_cases;
        
        // Calculate if overdue based on due_at field or fallback to 7 days after creation
        const dueAt = invoice.due_at ? new Date(invoice.due_at) : new Date(new Date(invoice.created_at).getTime() + 7 * 24 * 60 * 60 * 1000);
        const now = new Date();
        const isOverdue = now > dueAt;
        const daysOverdue = isOverdue ? Math.floor((now.getTime() - dueAt.getTime()) / (1000 * 60 * 60 * 24)) : 0;
        
        // Skip if filtering by type
        if (type === "overdue" && !isOverdue) continue;
        if (type === "pending" && isOverdue) continue;

        // Get provider profile
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("first_name, last_name, email")
          .eq("user_id", facility.user_id)
          .maybeSingle();

        if (profileError || !profile) {
          console.error(`Profile not found for user ${facility.user_id}`);
          results.push({ invoiceId: invoice.id, success: false, error: "Profile not found" });
          continue;
        }

        // Get provider plan
        const planInfo = await getProviderPlan(profile.email, stripe);

        // Generate and send email
        const emailHtml = generatePaymentReminderEmail(
          profile.first_name || "there",
          facility.name,
          {
            id: invoice.id,
            amountCents: invoice.amount_cents,
            caseName: placementCase.seeker_name,
            createdAt: invoice.created_at,
            isOverdue,
            daysOverdue: daysOverdue > 0 ? daysOverdue : undefined,
            paymentLink: invoice.stripe_payment_link || undefined,
          },
          planInfo.plan
        );

        const subjectPrefix = isOverdue ? "⚠️ OVERDUE: " : "";
        const subject = isOverdue
          ? `${subjectPrefix}Payment overdue for ${facility.name}`
          : `Payment reminder: ${formatCurrency(invoice.amount_cents)} due for ${facility.name}`;

        const emailResponse = await resend.emails.send({
          from: "RehabLookup <no-reply@rehablookup.com>",
          to: [profile.email],
          subject,
          html: emailHtml,
        });

        console.log(`Payment reminder sent to ${profile.email}:`, emailResponse);

        // Update invoice sent_at and reminder tracking
        await supabase
          .from("placement_invoices")
          .update({ 
            sent_at: new Date().toISOString(), 
            status: "sent",
            reminder_sent_at: new Date().toISOString(),
            reminder_count: (invoice.reminder_count || 0) + 1,
          })
          .eq("id", invoice.id);

        results.push({ invoiceId: invoice.id, success: true });

      } catch (invoiceError: any) {
        console.error(`Error processing invoice ${invoice.id}:`, invoiceError);
        results.push({ invoiceId: invoice.id, success: false, error: invoiceError.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${successCount} reminders, ${failCount} failed`,
        sent: successCount,
        failed: failCount,
        results,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: unknown) {
    console.error("Error in send-payment-reminder function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
