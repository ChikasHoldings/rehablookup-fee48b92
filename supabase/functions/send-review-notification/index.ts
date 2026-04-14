import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";
import {
  getProviderPlan,
  emailStart,
  emailEnd,
  emailHeader,
  emailBodyStart,
  emailBodyEnd,
  emailFooter,
  emailGreeting,
  emailParagraph,
  proInsightsBox,
  ctaButton,
  type PlanType,
} from "../_shared/email-templates.ts";
import { sendEmailWithRetry } from "../_shared/resilient-email-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOG_PREFIX = "[SEND-REVIEW-NOTIFICATION]";

const logStep = (step: string, details?: unknown) => {
  console.log(`${LOG_PREFIX} ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

type NotificationType = 
  | "review_submitted"
  | "review_approved"
  | "review_rejected"
  | "review_response"
  | "review_disputed";

interface NotificationRequest {
  type: NotificationType;
  reviewId: string;
  facilityId?: string;
  providerId?: string;
  seekerId?: string;
  responseText?: string;
  rejectionReason?: string;
  disputeReason?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const resend = resendApiKey ? new Resend(resendApiKey) : null;
  const stripe = stripeKey ? new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" }) : null;

  try {
    logStep("Function started");

    const payload: NotificationRequest = await req.json();
    const { type, reviewId, facilityId, providerId, seekerId, responseText, rejectionReason, disputeReason } = payload;

    logStep("Processing notification", { type, reviewId });

    // Fetch review details
    const { data: review, error: reviewError } = await supabase
      .from("facility_reviews")
      .select("*")
      .eq("id", reviewId)
      .single();

    if (reviewError || !review) {
      logStep("Review not found", { reviewId, error: reviewError?.message });
      return new Response(
        JSON.stringify({ error: "Review not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch facility details
    const { data: facility } = await supabase
      .from("facilities")
      .select("id, name, slug, user_id, reply_email, email")
      .eq("id", facilityId || review.facility_id)
      .single();

    if (!facility) {
      logStep("Facility not found");
      return new Response(
        JSON.stringify({ error: "Facility not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch seeker details
    const { data: seekerProfile } = await supabase
      .from("seeker_profiles")
      .select("user_id, display_name, first_name")
      .eq("user_id", seekerId || review.user_id)
      .single();

    // Fetch seeker email from auth.users
    let seekerEmail: string | null = null;
    if (seekerProfile?.user_id) {
      const { data: seekerAuth } = await supabase.auth.admin.getUserById(seekerProfile.user_id);
      seekerEmail = seekerAuth?.user?.email || null;
    }

    // Fetch provider profile for email
    const { data: providerProfile } = await supabase
      .from("profiles")
      .select("user_id, email, first_name")
      .eq("user_id", facility.user_id)
      .single();

    const providerEmail = facility.reply_email || facility.email || providerProfile?.email;
    
    // Get provider plan for styling
    const planInfo = providerEmail ? await getProviderPlan(providerEmail, stripe) : { plan: 'free' as PlanType, planName: 'Free', locationLimit: 1, unlockDiscount: 0 };

    // Fetch admin emails for notifications
    // Exclude advisors as they only handle placements, not general admin tasks like review moderation
    const { data: adminProfiles } = await supabase
      .from("admin_user_profiles")
      .select("user_id, first_name, admin_role")
      .eq("status", "active")
      .neq("admin_role", "advisor"); // Advisors don't need review notifications

    const adminEmails: string[] = [];
    if (adminProfiles && adminProfiles.length > 0) {
      for (const admin of adminProfiles) {
        const { data: adminAuth } = await supabase.auth.admin.getUserById(admin.user_id);
        if (adminAuth?.user?.email) {
          adminEmails.push(adminAuth.user.email);
        }
      }
    }

    logStep("Fetched all parties", {
      facilityName: facility.name,
      providerEmail: providerEmail ? "found" : "not found",
      providerPlan: planInfo.plan,
      seekerEmail: seekerEmail ? "found" : "not found",
      adminCount: adminEmails.length,
    });

    // Handle different notification types
    switch (type) {
      case "review_submitted":
        await handleReviewSubmitted(supabase, resend, {
          review,
          facility,
          seekerProfile,
          adminEmails,
        });
        break;

      case "review_approved":
        await handleReviewApproved(supabase, resend, {
          review,
          facility,
          providerEmail,
          providerProfile,
          providerPlan: planInfo.plan,
          seekerEmail,
          seekerProfile,
        });
        break;

      case "review_rejected":
        await handleReviewRejected(supabase, resend, {
          review,
          facility,
          seekerEmail,
          seekerProfile,
          rejectionReason,
        });
        break;

      case "review_response":
        await handleReviewResponse(supabase, resend, {
          review,
          facility,
          seekerEmail,
          seekerProfile,
          responseText,
        });
        break;

      case "review_disputed":
        await handleReviewDisputed(supabase, resend, {
          review,
          facility,
          adminEmails,
          disputeReason,
        });
        break;

      default:
        logStep("Unknown notification type", { type });
    }

    logStep("Notification processing complete");

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

// Handler for review submitted - admin notification
async function handleReviewSubmitted(
  supabase: any,
  resend: Resend | null,
  data: { review: any; facility: any; seekerProfile: any; adminEmails: string[] }
) {
  const { review, facility, seekerProfile, adminEmails } = data;
  logStep("Handling review_submitted");

  // Create admin in-app notification
  await supabase.from("admin_notifications").insert({
    type: "new_review",
    title: "New Review Pending Moderation",
    message: `${seekerProfile?.display_name || "A user"} submitted a ${review.rating}-star review for ${facility.name}`,
    metadata: { review_id: review.id, facility_id: facility.id, facility_name: facility.name, rating: review.rating },
  });

  // Send email to admins
  if (resend && adminEmails.length > 0) {
    const emailHtml = `
${emailStart()}
${emailHeader('New Review Pending', 'free')}
${emailBodyStart()}
              ${emailParagraph(`A new ${review.rating}-star review has been submitted for <strong>${facility.name}</strong> and is awaiting moderation.`)}
              
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f9fafb; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">Submitted by: ${review.reviewer_display_name || seekerProfile?.display_name || "Unknown reviewer"}</p>
                    <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">Rating: ${'⭐'.repeat(review.rating)}</p>
                    ${review.review_text ? `<p style="margin: 0; font-size: 14px; color: #374151; font-style: italic;">"${review.review_text.substring(0, 200)}${review.review_text.length > 200 ? '...' : ''}"</p>` : ''}
                  </td>
                </tr>
              </table>
              
              ${ctaButton('Review in Admin', 'https://rehablookup.com/admin/reviews', 'free')}
${emailBodyEnd()}
${emailFooter({ includeNotificationSettings: false })}
${emailEnd()}
    `;

    await sendEmailWithRetry(supabase, resend, {
      from: "RehabLookup <no-reply@rehablookup.com>",
      to: adminEmails,
      subject: `New Review Pending: ${facility.name}`,
      html: emailHtml,
    });
    logStep("Admin email sent", { recipientCount: adminEmails.length });
  }
}

// Handler for review approved - notify provider and seeker
async function handleReviewApproved(
  supabase: any,
  resend: Resend | null,
  data: { review: any; facility: any; providerEmail: string | null; providerProfile: any; providerPlan: PlanType; seekerEmail: string | null; seekerProfile: any }
) {
  const { review, facility, providerEmail, providerProfile, providerPlan, seekerEmail, seekerProfile } = data;
  logStep("Handling review_approved");

  // Notify provider in-app
  await supabase.from("provider_notifications").insert({
    user_id: facility.user_id,
    facility_id: facility.id,
    type: "new_review",
    title: "New Review Published",
    message: `A ${review.rating}-star review has been published on your ${facility.name} profile.`,
    metadata: { review_id: review.id, rating: review.rating },
  });

  // Notify seeker in-app
  if (seekerProfile?.user_id) {
    await supabase.from("seeker_notifications").insert({
      user_id: seekerProfile.user_id,
      type: "review_approved",
      title: "Your Review is Live!",
      message: `Your review for ${facility.name} has been approved and is now visible.`,
      link: facility.slug ? `/center/${facility.slug}` : `/account/reviews`,
      metadata: { review_id: review.id, facility_id: facility.id },
    });
  }

  // Send email to provider with plan-aware styling
  if (resend && providerEmail) {
    const isPro = providerPlan === 'pro';
    const proTip = isPro 
      ? proInsightsBox('As a Pro member, responding to reviews helps maintain your premium visibility and builds trust with potential patients.')
      : '';

    const emailHtml = `
${emailStart()}
${emailHeader(`New ${review.rating}-Star Review`, providerPlan)}
${emailBodyStart()}
              ${emailGreeting(providerProfile?.first_name || 'there')}
              ${emailParagraph(`Great news! A new <strong>${review.rating}-star review</strong> has been published for <strong>${facility.name}</strong>.`)}
              
              ${proTip}
              
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f9fafb; border-left: 4px solid ${isPro ? '#7c3aed' : '#1B365D'}; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">Rating: ${'⭐'.repeat(review.rating)}</p>
                    ${review.review_text ? `<p style="margin: 0; font-size: 14px; color: #374151; font-style: italic;">"${review.review_text.substring(0, 300)}${review.review_text.length > 300 ? '...' : ''}"</p>` : ''}
                  </td>
                </tr>
              </table>
              
              ${ctaButton('View & Respond', `https://rehablookup.com/provider/reviews`, providerPlan)}
${emailBodyEnd()}
${emailFooter()}
${emailEnd()}
    `;

    const subjectPrefix = providerPlan === 'pro' ? '⭐ ' : '';
    await sendEmailWithRetry(supabase, resend, {
      from: "RehabLookup <no-reply@rehablookup.com>",
      to: [providerEmail],
      subject: `${subjectPrefix}New ${review.rating}-Star Review for ${facility.name}`,
      html: emailHtml,
    });
    logStep("Provider email sent");
  }

  // Send email to seeker
  if (resend && seekerEmail) {
    const emailHtml = `
${emailStart()}
${emailHeader('Your Review is Live!', 'free', { icon: '✅' })}
${emailBodyStart()}
              ${emailGreeting(seekerProfile?.first_name || seekerProfile?.display_name || 'there')}
              ${emailParagraph(`Thank you for sharing your experience! Your review for <strong>${facility.name}</strong> has been approved and is now visible to others.`)}
              ${emailParagraph('Your feedback helps others make informed decisions about their treatment options.')}
              ${ctaButton('View Your Review', facility.slug ? `https://rehablookup.com/center/${facility.slug}` : 'https://rehablookup.com/account/reviews', 'free')}
${emailBodyEnd()}
${emailFooter({ includeNotificationSettings: false })}
${emailEnd()}
    `;

    await sendEmailWithRetry(supabase, resend, {
      from: "RehabLookup <no-reply@rehablookup.com>",
      to: [seekerEmail],
      subject: "Your Review Has Been Published!",
      html: emailHtml,
    });
    logStep("Seeker approval email sent");
  }
}

// Handler for review rejected
async function handleReviewRejected(
  supabase: any,
  resend: Resend | null,
  data: { review: any; facility: any; seekerEmail: string | null; seekerProfile: any; rejectionReason?: string }
) {
  const { review, facility, seekerEmail, seekerProfile, rejectionReason } = data;
  logStep("Handling review_rejected");

  // Notify seeker in-app
  if (seekerProfile?.user_id) {
    await supabase.from("seeker_notifications").insert({
      user_id: seekerProfile.user_id,
      type: "review_rejected",
      title: "Review Not Published",
      message: `Your review for ${facility.name} was not published. ${rejectionReason || "Please review our community guidelines."}`,
      metadata: { review_id: review.id, facility_id: facility.id, reason: rejectionReason },
    });
  }

  // Send email to seeker
  if (resend && seekerEmail) {
    const emailHtml = `
${emailStart()}
${emailHeader('Update on Your Review', 'free')}
${emailBodyStart()}
              ${emailGreeting(seekerProfile?.first_name || seekerProfile?.display_name || 'there')}
              ${emailParagraph(`We were unable to publish your review for <strong>${facility.name}</strong>.`)}
              
              ${rejectionReason ? `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0; font-size: 14px; color: #92400e;">
                      <strong>Reason:</strong> ${rejectionReason}
                    </p>
                  </td>
                </tr>
              </table>
              ` : ''}
              
              ${emailParagraph('If you have questions, please contact our support team.')}
              ${ctaButton('Contact Support', 'mailto:support@rehablookup.com', 'free')}
${emailBodyEnd()}
${emailFooter({ includeNotificationSettings: false })}
${emailEnd()}
    `;

    await sendEmailWithRetry(supabase, resend, {
      from: "RehabLookup <no-reply@rehablookup.com>",
      to: [seekerEmail],
      subject: "Update on Your Review",
      html: emailHtml,
    });
    logStep("Seeker rejection email sent");
  }
}

// Handler for review response
async function handleReviewResponse(
  supabase: any,
  resend: Resend | null,
  data: { review: any; facility: any; seekerEmail: string | null; seekerProfile: any; responseText?: string }
) {
  const { review, facility, seekerEmail, seekerProfile, responseText } = data;
  logStep("Handling review_response");

  // Notify seeker in-app
  if (seekerProfile?.user_id) {
    await supabase.from("seeker_notifications").insert({
      user_id: seekerProfile.user_id,
      type: "review_response",
      title: `${facility.name} Responded to Your Review`,
      message: responseText?.substring(0, 100) + (responseText && responseText.length > 100 ? "..." : ""),
      link: facility.slug ? `/center/${facility.slug}` : `/account/reviews`,
      metadata: { review_id: review.id, facility_id: facility.id },
    });
  }

  // Send email to seeker
  if (resend && seekerEmail) {
    const emailHtml = `
${emailStart()}
${emailHeader(`${facility.name} Responded`, 'free', { icon: '💬' })}
${emailBodyStart()}
              ${emailGreeting(seekerProfile?.first_name || seekerProfile?.display_name || 'there')}
              ${emailParagraph(`<strong>${facility.name}</strong> has responded to your review.`)}
              
              ${responseText ? `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f0f9ff; border-left: 4px solid #0ea5e9; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0; font-size: 14px; color: #0369a1; font-style: italic;">"${responseText}"</p>
                  </td>
                </tr>
              </table>
              ` : ''}
              
              ${ctaButton('View Response', facility.slug ? `https://rehablookup.com/center/${facility.slug}` : 'https://rehablookup.com/account/reviews', 'free')}
${emailBodyEnd()}
${emailFooter({ includeNotificationSettings: false })}
${emailEnd()}
    `;

    await sendEmailWithRetry(supabase, resend, {
      from: "RehabLookup <no-reply@rehablookup.com>",
      to: [seekerEmail],
      subject: `${facility.name} Responded to Your Review`,
      html: emailHtml,
    });
    logStep("Seeker response notification email sent");
  }
}

// Handler for review disputed
async function handleReviewDisputed(
  supabase: any,
  resend: Resend | null,
  data: { review: any; facility: any; adminEmails: string[]; disputeReason?: string }
) {
  const { review, facility, adminEmails, disputeReason } = data;
  logStep("Handling review_disputed");

  // Create admin in-app notification
  await supabase.from("admin_notifications").insert({
    type: "review_disputed",
    title: "Review Dispute Filed",
    message: `${facility.name} has disputed a ${review.rating}-star review`,
    metadata: { review_id: review.id, facility_id: facility.id, facility_name: facility.name, rating: review.rating, reason: disputeReason },
  });

  // Send email to admins
  if (resend && adminEmails.length > 0) {
    const emailHtml = `
${emailStart()}
${emailHeader('Review Dispute Filed', 'free', { isUrgent: true })}
${emailBodyStart()}
              ${emailParagraph(`<strong>${facility.name}</strong> has disputed a ${review.rating}-star review.`)}
              
              ${disputeReason ? `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #991b1b;">Dispute Reason:</p>
                    <p style="margin: 0; font-size: 14px; color: #991b1b;">${disputeReason}</p>
                  </td>
                </tr>
              </table>
              ` : ''}
              
              ${ctaButton('Review Dispute', 'https://rehablookup.com/admin/reviews', 'free')}
${emailBodyEnd()}
${emailFooter({ includeNotificationSettings: false })}
${emailEnd()}
    `;

    await sendEmailWithRetry(supabase, resend, {
      from: "RehabLookup <no-reply@rehablookup.com>",
      to: adminEmails,
      subject: `⚠️ Review Dispute: ${facility.name}`,
      html: emailHtml,
    });
    logStep("Admin dispute email sent", { recipientCount: adminEmails.length });
  }
}
