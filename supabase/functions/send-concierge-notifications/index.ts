import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CONCIERGE-NOTIFICATIONS] ${step}${detailsStr}`);
};

type NotificationType =
  | 'intake_received'      // Seeker: Your request was received
  | 'matches_found'        // Seeker: We found facilities for you
  | 'provider_interested'  // Seeker: A provider wants to connect
  | 'seeker_confirmed'     // Provider: Seeker confirmed admission
  | 'provider_confirmed'   // Seeker: Provider confirmed your admission
  | 'placement_complete'   // Both: Congratulations on the placement!
  | 'invoice_issued'       // Provider: Your placement fee invoice
  | 'invoice_paid';        // Provider: Payment received

interface NotificationRequest {
  type: NotificationType;
  inquiryId: string;
  facilityId?: string;
  invoiceId?: string;
  metadata?: Record<string, unknown>;
}

interface InquiryData {
  id: string;
  user_name: string;
  user_email: string;
  user_phone: string;
  level_of_care: string | null;
  primary_concern: string | null;
  preferred_state: string | null;
  preferred_city: string | null;
  insurance_carrier: string | null;
  payment_type: string | null;
  match_count: number | null;
  placed_facility_id: string | null;
  user_id: string | null;
}

interface FacilityData {
  id: string;
  name: string;
  city: string;
  state: string;
  email: string | null;
  reply_email: string | null;
  concierge_admissions_email: string | null;
  concierge_admissions_contact: string | null;
  user_id: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const resend = new Resend(resendKey);

    const { type, inquiryId, facilityId, invoiceId, metadata }: NotificationRequest = await req.json();

    if (!type || !inquiryId) {
      throw new Error("Notification type and inquiryId are required");
    }

    logStep("Processing notification", { type, inquiryId, facilityId });

    // Fetch inquiry data
    const { data: inquiry, error: inquiryError } = await supabase
      .from("concierge_inquiries")
      .select("*")
      .eq("id", inquiryId)
      .single();

    if (inquiryError || !inquiry) {
      throw new Error("Inquiry not found: " + inquiryError?.message);
    }

    // Fetch facility if needed
    let facility: FacilityData | null = null;
    const targetFacilityId = facilityId || inquiry.placed_facility_id;
    if (targetFacilityId) {
      const { data: facilityData } = await supabase
        .from("facilities")
        .select("id, name, city, state, email, reply_email, concierge_admissions_email, concierge_admissions_contact, user_id")
        .eq("id", targetFacilityId)
        .single();
      facility = facilityData;
    }

    // Process based on notification type
    const results: Array<{ recipient: string; emailId?: string; notificationId?: string }> = [];

    switch (type) {
      case 'intake_received':
        await sendIntakeReceivedEmail(resend, inquiry, supabase, results);
        break;

      case 'matches_found':
        await sendMatchesFoundEmail(resend, inquiry, supabase, results);
        break;

      case 'provider_interested':
        if (facility) {
          await sendProviderInterestedEmail(resend, inquiry, facility, supabase, results);
        }
        break;

      case 'seeker_confirmed':
        if (facility) {
          await sendSeekerConfirmedEmail(resend, inquiry, facility, supabase, results);
        }
        break;

      case 'provider_confirmed':
        if (facility) {
          await sendProviderConfirmedEmail(resend, inquiry, facility, supabase, results);
        }
        break;

      case 'placement_complete':
        if (facility) {
          await sendPlacementCompleteEmails(resend, inquiry, facility, supabase, results);
        }
        break;

      case 'invoice_issued':
        if (facility && invoiceId) {
          await sendInvoiceIssuedEmail(resend, inquiry, facility, invoiceId, supabase, metadata, results);
        }
        break;

      case 'invoice_paid':
        if (facility && invoiceId) {
          await sendInvoicePaidEmail(resend, inquiry, facility, invoiceId, supabase, metadata, results);
        }
        break;
    }

    logStep("Notifications sent", { count: results.length, type });

    return new Response(JSON.stringify({
      success: true,
      type,
      results,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ============================================================================
// EMAIL TEMPLATE HELPERS
// ============================================================================

function emailWrapper(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f6f9;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          ${content}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function emailHeader(title: string, subtitle?: string, icon?: string): string {
  const iconHtml = icon ? `<div style="font-size: 48px; margin-bottom: 16px;">${icon}</div>` : '';
  const subtitleHtml = subtitle ? `<p style="margin: 12px 0 0 0; color: rgba(255,255,255,0.9); font-size: 15px;">${subtitle}</p>` : '';
  
  return `
<tr>
  <td style="background: linear-gradient(135deg, #1B365D 0%, #2C4A7F 100%); padding: 32px; text-align: center;">
    ${iconHtml}
    <h1 style="margin: 0; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 24px; font-weight: 700;">
      ${title}
    </h1>
    ${subtitleHtml}
  </td>
</tr>`;
}

function emailFooter(): string {
  return `
<tr>
  <td style="background: #1B365D; padding: 24px; text-align: center;">
    <p style="margin: 0 0 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 18px; font-weight: 700; color: #ffffff;">
      RehabLookup Concierge
    </p>
    <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: rgba(255,255,255,0.7);">
      © ${new Date().getFullYear()} RehabLookup. All rights reserved.
    </p>
  </td>
</tr>`;
}

function ctaButton(text: string, url: string): string {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
  <tr>
    <td align="center">
      <a href="${url}" style="display: inline-block; background: linear-gradient(135deg, #1B365D 0%, #2C4A7F 100%); color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">
        ${text}
      </a>
    </td>
  </tr>
</table>`;
}

function infoBox(content: string, bgColor = '#f0f9ff', borderColor = '#0ea5e9', textColor = '#0369a1'): string {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: ${bgColor}; border-left: 4px solid ${borderColor}; border-radius: 0 8px 8px 0; margin: 16px 0;">
  <tr>
    <td style="padding: 16px 20px;">
      <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: ${textColor}; line-height: 1.5;">
        ${content}
      </p>
    </td>
  </tr>
</table>`;
}

// ============================================================================
// NOTIFICATION HANDLERS
// ============================================================================

async function sendIntakeReceivedEmail(
  resend: Resend,
  inquiry: InquiryData,
  supabase: any,
  results: Array<{ recipient: string; emailId?: string; notificationId?: string }>
) {
  const firstName = inquiry.user_name.split(' ')[0];
  const caseId = inquiry.id.slice(0, 8).toUpperCase();
  
  const html = emailWrapper(`
    ${emailHeader('Your Request Has Been Received', `Case #${caseId}`, '✅')}
    <tr>
      <td style="padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <p style="margin: 0 0 20px 0; font-size: 16px; color: #1a1a1a;">
          Hi ${firstName},
        </p>
        <p style="margin: 0 0 24px 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
          Thank you for reaching out to RehabLookup's Concierge Service. We've received your request and our team is already working to find the best treatment options for your situation.
        </p>
        
        ${infoBox(`<strong>What happens next?</strong><br><br>
          1. Our specialists will review your information<br>
          2. We'll match you with 3 pre-screened facilities<br>
          3. You'll receive personalized introductions within 24-48 hours`)}
        
        <p style="margin: 24px 0 0 0; font-size: 14px; color: #6b7280;">
          Questions? Reply to this email or call us at <strong>1-800-XXX-XXXX</strong>
        </p>
      </td>
    </tr>
    ${emailFooter()}
  `);

  const { data: emailData, error: emailError } = await resend.emails.send({
    from: "RehabLookup Concierge <concierge@rehablookup.com>",
    to: [inquiry.user_email],
    subject: `We've Received Your Request - Case #${caseId}`,
    html,
  });

  if (!emailError) {
    results.push({ recipient: inquiry.user_email, emailId: emailData?.id });
  }

  // Create in-app notification
  if (inquiry.user_id) {
    const { data: notif } = await supabase.from('seeker_notifications').insert({
      user_id: inquiry.user_id,
      type: 'concierge_intake_received',
      title: 'Request Received',
      message: `Your concierge request (Case #${caseId}) has been received. We'll find matches within 24-48 hours.`,
      link: '/account/concierge',
      metadata: { inquiry_id: inquiry.id },
    }).select('id').single();
    
    if (notif) results.push({ recipient: inquiry.user_id, notificationId: notif.id });
  }
}

async function sendMatchesFoundEmail(
  resend: Resend,
  inquiry: InquiryData,
  supabase: any,
  results: Array<{ recipient: string; emailId?: string; notificationId?: string }>
) {
  const firstName = inquiry.user_name.split(' ')[0];
  const caseId = inquiry.id.slice(0, 8).toUpperCase();
  const matchCount = inquiry.match_count || 3;
  
  const html = emailWrapper(`
    ${emailHeader('We Found Your Matches!', `${matchCount} facilities selected for you`, '🎯')}
    <tr>
      <td style="padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <p style="margin: 0 0 20px 0; font-size: 16px; color: #1a1a1a;">
          Hi ${firstName},
        </p>
        <p style="margin: 0 0 24px 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
          Great news! Our team has identified <strong>${matchCount} treatment facilities</strong> that match your needs. We're now reaching out to them on your behalf.
        </p>
        
        ${infoBox(`<strong>🏥 ${matchCount} Facilities Matched</strong><br><br>
          Each facility has been pre-screened for:<br>
          • Level of care you need<br>
          • Insurance/payment compatibility<br>
          • Location preferences<br>
          • Specialized services`)}
        
        <p style="margin: 24px 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
          You'll receive introductions from interested facilities soon. Keep an eye on your inbox and phone for their outreach.
        </p>
        
        ${ctaButton('View Your Case', 'https://rehablookup.com/account/concierge')}
      </td>
    </tr>
    ${emailFooter()}
  `);

  const { data: emailData, error: emailError } = await resend.emails.send({
    from: "RehabLookup Concierge <concierge@rehablookup.com>",
    to: [inquiry.user_email],
    subject: `We Found ${matchCount} Matches for You - Case #${caseId}`,
    html,
  });

  if (!emailError) {
    results.push({ recipient: inquiry.user_email, emailId: emailData?.id });
  }

  if (inquiry.user_id) {
    const { data: notif } = await supabase.from('seeker_notifications').insert({
      user_id: inquiry.user_id,
      type: 'concierge_matches_found',
      title: 'Matches Found!',
      message: `We found ${matchCount} facilities that match your needs. Introductions coming soon.`,
      link: '/account/concierge',
      metadata: { inquiry_id: inquiry.id, match_count: matchCount },
    }).select('id').single();
    
    if (notif) results.push({ recipient: inquiry.user_id, notificationId: notif.id });
  }
}

async function sendProviderInterestedEmail(
  resend: Resend,
  inquiry: InquiryData,
  facility: FacilityData,
  supabase: any,
  results: Array<{ recipient: string; emailId?: string; notificationId?: string }>
) {
  const firstName = inquiry.user_name.split(' ')[0];
  const caseId = inquiry.id.slice(0, 8).toUpperCase();
  
  const html = emailWrapper(`
    ${emailHeader('A Facility Wants to Connect!', facility.name, '🤝')}
    <tr>
      <td style="padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <p style="margin: 0 0 20px 0; font-size: 16px; color: #1a1a1a;">
          Hi ${firstName},
        </p>
        <p style="margin: 0 0 24px 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
          Great news! <strong>${facility.name}</strong> in ${facility.city}, ${facility.state} has reviewed your case and is interested in helping you.
        </p>
        
        ${infoBox(`They should be reaching out to you soon at:<br>
          📧 ${inquiry.user_email}<br>
          📱 ${inquiry.user_phone}`)}
        
        <p style="margin: 24px 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
          If you don't hear from them within 24 hours, please let us know and we'll follow up.
        </p>
        
        ${ctaButton('View Your Case', 'https://rehablookup.com/account/concierge')}
      </td>
    </tr>
    ${emailFooter()}
  `);

  const { data: emailData, error: emailError } = await resend.emails.send({
    from: "RehabLookup Concierge <concierge@rehablookup.com>",
    to: [inquiry.user_email],
    subject: `${facility.name} Wants to Connect - Case #${caseId}`,
    html,
  });

  if (!emailError) {
    results.push({ recipient: inquiry.user_email, emailId: emailData?.id });
  }

  if (inquiry.user_id) {
    const { data: notif } = await supabase.from('seeker_notifications').insert({
      user_id: inquiry.user_id,
      type: 'concierge_provider_interested',
      title: 'Facility Interested',
      message: `${facility.name} has expressed interest and will be reaching out to you.`,
      link: '/account/concierge',
      metadata: { inquiry_id: inquiry.id, facility_id: facility.id },
    }).select('id').single();
    
    if (notif) results.push({ recipient: inquiry.user_id, notificationId: notif.id });
  }
}

async function sendSeekerConfirmedEmail(
  resend: Resend,
  inquiry: InquiryData,
  facility: FacilityData,
  supabase: any,
  results: Array<{ recipient: string; emailId?: string; notificationId?: string }>
) {
  const caseId = inquiry.id.slice(0, 8).toUpperCase();
  const recipientEmail = facility.concierge_admissions_email || facility.reply_email || facility.email;
  const contactName = facility.concierge_admissions_contact || "Admissions Team";
  
  if (!recipientEmail) return;
  
  const html = emailWrapper(`
    ${emailHeader('Client Confirmed Admission', `Case #${caseId}`, '✅')}
    <tr>
      <td style="padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <p style="margin: 0 0 20px 0; font-size: 16px; color: #1a1a1a;">
          Hi ${contactName},
        </p>
        <p style="margin: 0 0 24px 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
          Great news! <strong>${inquiry.user_name}</strong> has confirmed their admission to <strong>${facility.name}</strong>.
        </p>
        
        ${infoBox(`<strong>Action Required:</strong> Please confirm the placement on your end to complete the process and trigger the placement fee.`, '#fef3c7', '#f59e0b', '#92400e')}
        
        ${ctaButton('Confirm Placement', 'https://rehablookup.com/provider/concierge')}
        
        <p style="margin: 24px 0 0 0; font-size: 14px; color: #6b7280;">
          Once both parties confirm, the placement will be finalized.
        </p>
      </td>
    </tr>
    ${emailFooter()}
  `);

  const { data: emailData, error: emailError } = await resend.emails.send({
    from: "RehabLookup Concierge <concierge@rehablookup.com>",
    to: [recipientEmail],
    subject: `Client Confirmed Admission - Case #${caseId}`,
    html,
  });

  if (!emailError) {
    results.push({ recipient: recipientEmail, emailId: emailData?.id });
  }

  // Provider in-app notification
  const { data: notif } = await supabase.from('provider_notifications').insert({
    user_id: facility.user_id,
    type: 'concierge_seeker_confirmed',
    title: 'Client Confirmed Admission',
    message: `${inquiry.user_name} confirmed admission. Please confirm placement to complete the process.`,
    metadata: { inquiry_id: inquiry.id, facility_id: facility.id },
  }).select('id').single();
  
  if (notif) results.push({ recipient: facility.user_id, notificationId: notif.id });
}

async function sendProviderConfirmedEmail(
  resend: Resend,
  inquiry: InquiryData,
  facility: FacilityData,
  supabase: any,
  results: Array<{ recipient: string; emailId?: string; notificationId?: string }>
) {
  const firstName = inquiry.user_name.split(' ')[0];
  const caseId = inquiry.id.slice(0, 8).toUpperCase();
  
  const html = emailWrapper(`
    ${emailHeader('Facility Confirmed Your Placement', facility.name, '🎉')}
    <tr>
      <td style="padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <p style="margin: 0 0 20px 0; font-size: 16px; color: #1a1a1a;">
          Hi ${firstName},
        </p>
        <p style="margin: 0 0 24px 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
          Wonderful news! <strong>${facility.name}</strong> has confirmed your placement. Everything is set!
        </p>
        
        ${infoBox(`<strong>Next Steps:</strong><br><br>
          • The facility will contact you with admission details<br>
          • Prepare any required documents<br>
          • Reach out if you have any questions`)}
        
        <p style="margin: 24px 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
          We're so proud of you for taking this step. Your journey to recovery starts now.
        </p>
        
        ${ctaButton('View Case Details', 'https://rehablookup.com/account/concierge')}
      </td>
    </tr>
    ${emailFooter()}
  `);

  const { data: emailData, error: emailError } = await resend.emails.send({
    from: "RehabLookup Concierge <concierge@rehablookup.com>",
    to: [inquiry.user_email],
    subject: `${facility.name} Confirmed Your Placement - Case #${caseId}`,
    html,
  });

  if (!emailError) {
    results.push({ recipient: inquiry.user_email, emailId: emailData?.id });
  }

  if (inquiry.user_id) {
    const { data: notif } = await supabase.from('seeker_notifications').insert({
      user_id: inquiry.user_id,
      type: 'concierge_provider_confirmed',
      title: 'Placement Confirmed!',
      message: `${facility.name} has confirmed your placement. Congratulations on taking this important step!`,
      link: '/account/concierge',
      metadata: { inquiry_id: inquiry.id, facility_id: facility.id },
    }).select('id').single();
    
    if (notif) results.push({ recipient: inquiry.user_id, notificationId: notif.id });
  }
}

async function sendPlacementCompleteEmails(
  resend: Resend,
  inquiry: InquiryData,
  facility: FacilityData,
  supabase: any,
  results: Array<{ recipient: string; emailId?: string; notificationId?: string }>
) {
  const firstName = inquiry.user_name.split(' ')[0];
  const caseId = inquiry.id.slice(0, 8).toUpperCase();
  const recipientEmail = facility.concierge_admissions_email || facility.reply_email || facility.email;
  const contactName = facility.concierge_admissions_contact || "Admissions Team";

  // Email to seeker
  const seekerHtml = emailWrapper(`
    ${emailHeader('Congratulations on Your Placement!', 'Your journey to recovery begins', '🌟')}
    <tr>
      <td style="padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <p style="margin: 0 0 20px 0; font-size: 16px; color: #1a1a1a;">
          Hi ${firstName},
        </p>
        <p style="margin: 0 0 24px 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
          Your placement with <strong>${facility.name}</strong> is now complete! Both you and the facility have confirmed the admission.
        </p>
        
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius: 12px; margin: 24px 0;">
          <tr>
            <td style="padding: 24px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 48px;">🎉</p>
              <p style="margin: 0; font-size: 18px; font-weight: 600; color: #065f46;">
                You did it!
              </p>
              <p style="margin: 8px 0 0 0; font-size: 14px; color: #047857;">
                Taking this step takes courage. We're rooting for you.
              </p>
            </td>
          </tr>
        </table>
        
        <p style="margin: 0 0 24px 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
          The facility will be in touch with next steps. If you have any questions, don't hesitate to reach out to us.
        </p>
      </td>
    </tr>
    ${emailFooter()}
  `);

  const { data: seekerEmailData, error: seekerEmailError } = await resend.emails.send({
    from: "RehabLookup Concierge <concierge@rehablookup.com>",
    to: [inquiry.user_email],
    subject: `Congratulations! Your Placement is Complete - Case #${caseId}`,
    html: seekerHtml,
  });

  if (!seekerEmailError) {
    results.push({ recipient: inquiry.user_email, emailId: seekerEmailData?.id });
  }

  // Email to provider
  if (recipientEmail) {
    const providerHtml = emailWrapper(`
      ${emailHeader('Placement Confirmed', `Case #${caseId}`, '✅')}
      <tr>
        <td style="padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #1a1a1a;">
            Hi ${contactName},
          </p>
          <p style="margin: 0 0 24px 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
            The placement for <strong>${inquiry.user_name}</strong> at <strong>${facility.name}</strong> is now complete. Both parties have confirmed.
          </p>
          
          ${infoBox(`<strong>Billing Note:</strong> A placement fee invoice will be generated according to your agreement terms. You can view all invoices in your provider dashboard.`)}
          
          <p style="margin: 24px 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
            Thank you for being part of the RehabLookup Concierge network.
          </p>
          
          ${ctaButton('View Dashboard', 'https://rehablookup.com/provider/concierge')}
        </td>
      </tr>
      ${emailFooter()}
    `);

    const { data: providerEmailData, error: providerEmailError } = await resend.emails.send({
      from: "RehabLookup Concierge <concierge@rehablookup.com>",
      to: [recipientEmail],
      subject: `Placement Complete - Case #${caseId}`,
      html: providerHtml,
    });

    if (!providerEmailError) {
      results.push({ recipient: recipientEmail, emailId: providerEmailData?.id });
    }
  }

  // In-app notifications
  if (inquiry.user_id) {
    await supabase.from('seeker_notifications').insert({
      user_id: inquiry.user_id,
      type: 'concierge_placement_complete',
      title: 'Placement Complete!',
      message: `Your placement with ${facility.name} is confirmed. Congratulations!`,
      link: '/account/concierge',
      metadata: { inquiry_id: inquiry.id, facility_id: facility.id },
    });
  }

  await supabase.from('provider_notifications').insert({
    user_id: facility.user_id,
    type: 'concierge_placement_complete',
    title: 'Placement Complete',
    message: `Placement for ${inquiry.user_name} is confirmed. Invoice will be generated.`,
    metadata: { inquiry_id: inquiry.id, facility_id: facility.id },
  });
}

async function sendInvoiceIssuedEmail(
  resend: Resend,
  inquiry: InquiryData,
  facility: FacilityData,
  invoiceId: string,
  supabase: any,
  metadata: Record<string, unknown> | undefined,
  results: Array<{ recipient: string; emailId?: string; notificationId?: string }>
) {
  const caseId = inquiry.id.slice(0, 8).toUpperCase();
  const recipientEmail = facility.concierge_admissions_email || facility.reply_email || facility.email;
  const contactName = facility.concierge_admissions_contact || "Admissions Team";
  const amountCents = (metadata?.amount_cents as number) || 0;
  const amountFormatted = `$${(amountCents / 100).toFixed(2)}`;
  const feeType = (metadata?.fee_type as string) || 'flat_fee';
  const dueAt = metadata?.due_at ? new Date(metadata.due_at as string).toLocaleDateString() : 'Net 14';
  
  if (!recipientEmail) return;
  
  const html = emailWrapper(`
    ${emailHeader('Placement Fee Invoice', `Case #${caseId}`, '📄')}
    <tr>
      <td style="padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <p style="margin: 0 0 20px 0; font-size: 16px; color: #1a1a1a;">
          Hi ${contactName},
        </p>
        <p style="margin: 0 0 24px 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
          An invoice has been generated for the successful placement at <strong>${facility.name}</strong>.
        </p>
        
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f8fafc; border-radius: 12px; margin: 24px 0;">
          <tr>
            <td style="padding: 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Case ID:</td>
                  <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a; font-weight: 500; text-align: right;">#${caseId}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Fee Type:</td>
                  <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a; font-weight: 500; text-align: right;">${feeType === 'commission' ? 'Commission' : 'Flat Fee'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Due Date:</td>
                  <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a; font-weight: 500; text-align: right;">${dueAt}</td>
                </tr>
                <tr style="border-top: 2px solid #e5e7eb;">
                  <td style="padding: 16px 0 8px 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">Amount Due:</td>
                  <td style="padding: 16px 0 8px 0; font-size: 24px; font-weight: 700; color: #1B365D; text-align: right;">${amountFormatted}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        
        ${ctaButton('Pay Invoice', 'https://rehablookup.com/provider/billing-history')}
        
        <p style="margin: 24px 0 0 0; font-size: 13px; color: #6b7280; text-align: center;">
          Questions about this invoice? Contact us at billing@rehablookup.com
        </p>
      </td>
    </tr>
    ${emailFooter()}
  `);

  const { data: emailData, error: emailError } = await resend.emails.send({
    from: "RehabLookup Billing <billing@rehablookup.com>",
    to: [recipientEmail],
    subject: `Placement Fee Invoice - ${amountFormatted} - Case #${caseId}`,
    html,
  });

  if (!emailError) {
    results.push({ recipient: recipientEmail, emailId: emailData?.id });
  }

  // Provider notification
  const { data: notif } = await supabase.from('provider_notifications').insert({
    user_id: facility.user_id,
    type: 'concierge_invoice_issued',
    title: 'Invoice Issued',
    message: `Placement fee invoice for ${amountFormatted} has been issued. Due: ${dueAt}`,
    metadata: { inquiry_id: inquiry.id, invoice_id: invoiceId, amount_cents: amountCents },
  }).select('id').single();
  
  if (notif) results.push({ recipient: facility.user_id, notificationId: notif.id });
}

async function sendInvoicePaidEmail(
  resend: Resend,
  inquiry: InquiryData,
  facility: FacilityData,
  invoiceId: string,
  supabase: any,
  metadata: Record<string, unknown> | undefined,
  results: Array<{ recipient: string; emailId?: string; notificationId?: string }>
) {
  const caseId = inquiry.id.slice(0, 8).toUpperCase();
  const recipientEmail = facility.concierge_admissions_email || facility.reply_email || facility.email;
  const contactName = facility.concierge_admissions_contact || "Admissions Team";
  const amountCents = (metadata?.amount_cents as number) || 0;
  const amountFormatted = `$${(amountCents / 100).toFixed(2)}`;
  
  if (!recipientEmail) return;
  
  const html = emailWrapper(`
    ${emailHeader('Payment Received', `Thank you!`, '✅')}
    <tr>
      <td style="padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <p style="margin: 0 0 20px 0; font-size: 16px; color: #1a1a1a;">
          Hi ${contactName},
        </p>
        <p style="margin: 0 0 24px 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
          We've received your payment of <strong>${amountFormatted}</strong> for Case #${caseId}. Thank you!
        </p>
        
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius: 12px; margin: 24px 0;">
          <tr>
            <td style="padding: 24px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 36px;">💚</p>
              <p style="margin: 0; font-size: 18px; font-weight: 600; color: #065f46;">
                Payment Confirmed
              </p>
              <p style="margin: 8px 0 0 0; font-size: 24px; font-weight: 700; color: #047857;">
                ${amountFormatted}
              </p>
            </td>
          </tr>
        </table>
        
        <p style="margin: 0 0 24px 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
          A receipt has been added to your billing history. Thank you for being part of the RehabLookup Concierge network.
        </p>
        
        ${ctaButton('View Billing History', 'https://rehablookup.com/provider/billing-history')}
      </td>
    </tr>
    ${emailFooter()}
  `);

  const { data: emailData, error: emailError } = await resend.emails.send({
    from: "RehabLookup Billing <billing@rehablookup.com>",
    to: [recipientEmail],
    subject: `Payment Received - ${amountFormatted} - Case #${caseId}`,
    html,
  });

  if (!emailError) {
    results.push({ recipient: recipientEmail, emailId: emailData?.id });
  }

  // Provider notification
  const { data: notif } = await supabase.from('provider_notifications').insert({
    user_id: facility.user_id,
    type: 'concierge_invoice_paid',
    title: 'Payment Received',
    message: `Your payment of ${amountFormatted} for Case #${caseId} has been processed. Thank you!`,
    metadata: { inquiry_id: inquiry.id, invoice_id: invoiceId, amount_cents: amountCents },
  }).select('id').single();
  
  if (notif) results.push({ recipient: facility.user_id, notificationId: notif.id });
}
