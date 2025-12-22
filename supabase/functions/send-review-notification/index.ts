import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOG_PREFIX = "[SEND-REVIEW-NOTIFICATION]";

const logStep = (step: string, details?: unknown) => {
  console.log(`${LOG_PREFIX} ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

// Plan configuration
const PLAN_CONFIG: Record<string, { product_ids: string[]; name: string }> = {
  basic: { product_ids: [], name: "Basic" },
  professional: { product_ids: ["prod_TbalLOPujTIoUe", "prod_Tbyz1bf6iYyzYd"], name: "Professional" },
  featured: { product_ids: ["prod_TbalOeJZA2ZoJl", "prod_TbyzJVNOQL71NN"], name: "Featured" },
};

type NotificationType = 
  | "review_submitted"      // Seeker submitted a review -> notify admins
  | "review_approved"       // Admin approved review -> notify provider + seeker
  | "review_rejected"       // Admin rejected review -> notify seeker
  | "review_response"       // Provider responded to review -> notify seeker
  | "review_disputed";      // Provider disputed review -> notify admins

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

async function getProviderPlan(email: string): Promise<string> {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) return "basic";

  try {
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email, limit: 1 });
    
    if (customers.data.length === 0) return "basic";

    const subscriptions = await stripe.subscriptions.list({
      customer: customers.data[0].id,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) return "basic";

    const productId = subscriptions.data[0].items.data[0].price.product as string;
    
    if (PLAN_CONFIG.professional.product_ids.includes(productId)) return "professional";
    if (PLAN_CONFIG.featured.product_ids.includes(productId)) return "featured";
    
    return "basic";
  } catch (error) {
    console.error("Error getting plan:", error);
    return "basic";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const resend = resendApiKey ? new Resend(resendApiKey) : null;

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
      .select("id, name, user_id, reply_email, email")
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
    const providerPlan = providerEmail ? await getProviderPlan(providerEmail) : "basic";

    // Fetch admin emails for notifications
    const { data: adminProfiles } = await supabase
      .from("admin_user_profiles")
      .select("user_id, first_name")
      .eq("status", "active")
      .eq("notify_new_leads", true);

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
      providerPlan,
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
          providerPlan,
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

// Handler for review submitted
async function handleReviewSubmitted(
  supabase: any,
  resend: Resend | null,
  data: {
    review: any;
    facility: any;
    seekerProfile: any;
    adminEmails: string[];
  }
) {
  const { review, facility, seekerProfile, adminEmails } = data;
  logStep("Handling review_submitted");

  // Create admin in-app notification
  const { error: adminNotifError } = await supabase
    .from("admin_notifications")
    .insert({
      type: "new_review",
      title: "New Review Pending Moderation",
      message: `${seekerProfile?.display_name || "A user"} submitted a ${review.rating}-star review for ${facility.name}`,
      metadata: {
        review_id: review.id,
        facility_id: facility.id,
        facility_name: facility.name,
        rating: review.rating,
      },
    });

  if (adminNotifError) {
    logStep("Failed to create admin in-app notification", { error: adminNotifError.message });
  } else {
    logStep("Admin in-app notification created");
  }

  // Send email to admins
  if (resend && adminEmails.length > 0) {
    try {
      await resend.emails.send({
        from: "RehabLookup <no-reply@rehablookup.com>",
        to: adminEmails,
        subject: `New Review Pending: ${facility.name}`,
        html: generateAdminReviewEmail(review, facility, seekerProfile),
      });
      logStep("Admin email sent", { recipientCount: adminEmails.length });
    } catch (emailError) {
      logStep("Failed to send admin email", { error: emailError });
    }
  }
}

// Handler for review approved
async function handleReviewApproved(
  supabase: any,
  resend: Resend | null,
  data: {
    review: any;
    facility: any;
    providerEmail: string | null;
    providerProfile: any;
    providerPlan: string;
    seekerEmail: string | null;
    seekerProfile: any;
  }
) {
  const { review, facility, providerEmail, providerProfile, providerPlan, seekerEmail, seekerProfile } = data;
  logStep("Handling review_approved");

  // Notify provider in-app
  const { error: providerNotifError } = await supabase
    .from("provider_notifications")
    .insert({
      user_id: facility.user_id,
      facility_id: facility.id,
      type: "new_review",
      title: "New Review Published",
      message: `A ${review.rating}-star review has been published on your ${facility.name} profile.`,
      metadata: {
        review_id: review.id,
        rating: review.rating,
      },
    });

  if (providerNotifError) {
    logStep("Failed to create provider notification", { error: providerNotifError.message });
  } else {
    logStep("Provider in-app notification created");
  }

  // Notify seeker in-app
  if (seekerProfile?.user_id) {
    const { error: seekerNotifError } = await supabase
      .from("seeker_notifications")
      .insert({
        user_id: seekerProfile.user_id,
        type: "review_approved",
        title: "Your Review is Live!",
        message: `Your review for ${facility.name} has been approved and is now visible.`,
        link: `/facility/${facility.id}`,
        metadata: {
          review_id: review.id,
          facility_id: facility.id,
        },
      });

    if (seekerNotifError) {
      logStep("Failed to create seeker notification", { error: seekerNotifError.message });
    } else {
      logStep("Seeker in-app notification created");
    }
  }

  // Send email to provider with plan-aware styling
  if (resend && providerEmail) {
    try {
      const subjectPrefix = providerPlan === "featured" ? "⭐ " : "";
      await resend.emails.send({
        from: "RehabLookup <no-reply@rehablookup.com>",
        to: [providerEmail],
        subject: `${subjectPrefix}New ${review.rating}-Star Review for ${facility.name}`,
        html: generateProviderReviewEmail(review, facility, seekerProfile, providerProfile, providerPlan),
      });
      logStep("Provider email sent");
    } catch (emailError) {
      logStep("Failed to send provider email", { error: emailError });
    }
  }

  // Send email to seeker
  if (resend && seekerEmail) {
    try {
      await resend.emails.send({
        from: "RehabLookup <no-reply@rehablookup.com>",
        to: [seekerEmail],
        subject: "Your Review Has Been Published!",
        html: generateSeekerApprovalEmail(review, facility, seekerProfile),
      });
      logStep("Seeker approval email sent");
    } catch (emailError) {
      logStep("Failed to send seeker email", { error: emailError });
    }
  }
}

// Handler for review rejected
async function handleReviewRejected(
  supabase: any,
  resend: Resend | null,
  data: {
    review: any;
    facility: any;
    seekerEmail: string | null;
    seekerProfile: any;
    rejectionReason?: string;
  }
) {
  const { review, facility, seekerEmail, seekerProfile, rejectionReason } = data;
  logStep("Handling review_rejected");

  // Notify seeker in-app
  if (seekerProfile?.user_id) {
    const { error: seekerNotifError } = await supabase
      .from("seeker_notifications")
      .insert({
        user_id: seekerProfile.user_id,
        type: "review_rejected",
        title: "Review Not Published",
        message: `Your review for ${facility.name} was not published. ${rejectionReason || "Please review our community guidelines."}`,
        metadata: {
          review_id: review.id,
          facility_id: facility.id,
          reason: rejectionReason,
        },
      });

    if (seekerNotifError) {
      logStep("Failed to create seeker rejection notification", { error: seekerNotifError.message });
    } else {
      logStep("Seeker rejection notification created");
    }
  }

  // Send email to seeker
  if (resend && seekerEmail) {
    try {
      await resend.emails.send({
        from: "RehabLookup <no-reply@rehablookup.com>",
        to: [seekerEmail],
        subject: "Update on Your Review",
        html: generateSeekerRejectionEmail(review, facility, seekerProfile, rejectionReason),
      });
      logStep("Seeker rejection email sent");
    } catch (emailError) {
      logStep("Failed to send rejection email", { error: emailError });
    }
  }
}

// Handler for review response
async function handleReviewResponse(
  supabase: any,
  resend: Resend | null,
  data: {
    review: any;
    facility: any;
    seekerEmail: string | null;
    seekerProfile: any;
    responseText?: string;
  }
) {
  const { review, facility, seekerEmail, seekerProfile, responseText } = data;
  logStep("Handling review_response");

  // Notify seeker in-app
  if (seekerProfile?.user_id) {
    const { error: seekerNotifError } = await supabase
      .from("seeker_notifications")
      .insert({
        user_id: seekerProfile.user_id,
        type: "review_response",
        title: `${facility.name} Responded to Your Review`,
        message: responseText?.substring(0, 100) + (responseText && responseText.length > 100 ? "..." : ""),
        link: `/facility/${facility.id}`,
        metadata: {
          review_id: review.id,
          facility_id: facility.id,
        },
      });

    if (seekerNotifError) {
      logStep("Failed to create response notification", { error: seekerNotifError.message });
    } else {
      logStep("Response notification created");
    }
  }

  // Send email to seeker
  if (resend && seekerEmail) {
    try {
      await resend.emails.send({
        from: "RehabLookup <no-reply@rehablookup.com>",
        to: [seekerEmail],
        subject: `${facility.name} Responded to Your Review`,
        html: generateResponseEmail(review, facility, seekerProfile, responseText),
      });
      logStep("Response email sent");
    } catch (emailError) {
      logStep("Failed to send response email", { error: emailError });
    }
  }
}

// Handler for review disputed
async function handleReviewDisputed(
  supabase: any,
  resend: Resend | null,
  data: {
    review: any;
    facility: any;
    adminEmails: string[];
    disputeReason?: string;
  }
) {
  const { review, facility, adminEmails, disputeReason } = data;
  logStep("Handling review_disputed");

  // Create admin notification
  const { error: adminNotifError } = await supabase
    .from("admin_notifications")
    .insert({
      type: "review_dispute",
      title: "Review Dispute Filed",
      message: `${facility.name} has disputed a ${review.rating}-star review: ${disputeReason?.substring(0, 100) || "No reason provided"}`,
      metadata: {
        review_id: review.id,
        facility_id: facility.id,
        facility_name: facility.name,
        dispute_reason: disputeReason,
      },
    });

  if (adminNotifError) {
    logStep("Failed to create dispute notification", { error: adminNotifError.message });
  } else {
    logStep("Dispute notification created");
  }

  // Send email to admins
  if (resend && adminEmails.length > 0) {
    try {
      await resend.emails.send({
        from: "RehabLookup <no-reply@rehablookup.com>",
        to: adminEmails,
        subject: `Review Dispute: ${facility.name}`,
        html: generateDisputeEmail(review, facility, disputeReason),
      });
      logStep("Dispute email sent to admins");
    } catch (emailError) {
      logStep("Failed to send dispute email", { error: emailError });
    }
  }
}

// Email template generators
function generateAdminReviewEmail(review: any, facility: any, seekerProfile: any): string {
  return `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; margin: 0; padding: 0; background-color: #f6f8fb;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1B365D 0%, #2a4a7a 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">New Review Pending</h1>
          </div>
          <div style="background: #ffffff; padding: 30px; border-radius: 0 0 12px 12px;">
            <p>A new review has been submitted and requires moderation.</p>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Facility:</strong> ${facility.name}</p>
              <p><strong>Rating:</strong> ${"⭐".repeat(review.rating)} (${review.rating}/5)</p>
              <p><strong>Reviewer:</strong> ${seekerProfile?.display_name || "Anonymous"}</p>
              ${review.review_text ? `<p><strong>Review:</strong><br>${review.review_text}</p>` : ""}
            </div>
            <p style="margin-top: 20px;">
              <a href="https://rehablookup.com/admin/reviews" style="background: #1B365D; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Review Now</a>
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}

function generateProviderReviewEmail(review: any, facility: any, seekerProfile: any, providerProfile: any, plan: string): string {
  const isFeatured = plan === "featured";
  const isProfessional = plan === "professional";
  
  const headerGradient = isFeatured 
    ? "linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)" 
    : "linear-gradient(135deg, #1B365D 0%, #2a4a7a 100%)";
  
  const planBadge = isFeatured 
    ? `<span style="display: inline-block; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: #78350f; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; margin-left: 8px;">⭐ FEATURED</span>`
    : isProfessional 
    ? `<span style="display: inline-block; background: rgba(255,255,255,0.2); color: #fff; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 500; margin-left: 8px;">Professional</span>`
    : '';

  const reviewTip = isFeatured || isProfessional
    ? `<p style="margin-top: 16px; padding: 12px; background: #f0f9ff; border-radius: 6px; font-size: 14px; color: #0369a1;">
        💡 <strong>Tip:</strong> Responding to reviews helps build trust with families searching for treatment.
      </p>`
    : `<p style="margin-top: 16px; padding: 12px; background: #f0f9ff; border-radius: 6px; font-size: 14px; color: #0369a1;">
        💡 <strong>Tip:</strong> Upgrade to Professional or Featured to respond to reviews and build trust with families.
      </p>`;

  return `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; margin: 0; padding: 0; background-color: #f6f8fb;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: ${headerGradient}; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">New Review Published!${planBadge}</h1>
          </div>
          <div style="background: #ffffff; padding: 30px; border-radius: 0 0 12px 12px;">
            ${providerProfile?.first_name ? `<p>Hi ${providerProfile.first_name},</p>` : "<p>Hello,</p>"}
            <p>Great news! A new review has been published for <strong>${facility.name}</strong>.</p>
            <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0;"><strong>${"⭐".repeat(review.rating)} ${review.rating}/5 Stars</strong></p>
              ${review.review_text ? `<p style="margin: 0; font-style: italic;">"${review.review_text}"</p>` : ""}
              <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">— ${seekerProfile?.display_name || "Anonymous"}</p>
            </div>
            ${reviewTip}
            <p style="margin-top: 20px;">
              <a href="https://rehablookup.com/provider/reviews" style="background: ${isFeatured ? '#7c3aed' : '#1B365D'}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Review</a>
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}

function generateSeekerApprovalEmail(review: any, facility: any, seekerProfile: any): string {
  return `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; margin: 0; padding: 0; background-color: #f6f8fb;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Your Review is Live! ✓</h1>
          </div>
          <div style="background: #ffffff; padding: 30px; border-radius: 0 0 12px 12px;">
            <p>Hi ${seekerProfile?.first_name || seekerProfile?.display_name || "there"},</p>
            <p>Thank you for sharing your experience! Your review for <strong>${facility.name}</strong> has been approved and is now visible to others.</p>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Your Rating:</strong> ${"⭐".repeat(review.rating)} (${review.rating}/5)</p>
              ${review.review_text ? `<p><strong>Your Review:</strong><br>${review.review_text}</p>` : ""}
            </div>
            <p>Your feedback helps others make informed decisions about their care.</p>
            <p style="margin-top: 20px;">
              <a href="https://rehablookup.com/facility/${facility.id}" style="background: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Your Review</a>
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}

function generateSeekerRejectionEmail(review: any, facility: any, seekerProfile: any, reason?: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; margin: 0; padding: 0; background-color: #f6f8fb;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Update on Your Review</h1>
          </div>
          <div style="background: #ffffff; padding: 30px; border-radius: 0 0 12px 12px;">
            <p>Hi ${seekerProfile?.first_name || seekerProfile?.display_name || "there"},</p>
            <p>Thank you for taking the time to share your experience with <strong>${facility.name}</strong>.</p>
            <p>Unfortunately, we weren't able to publish your review at this time.</p>
            ${reason ? `
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0;"><strong>Reason:</strong> ${reason}</p>
              </div>
            ` : ""}
            <p>We encourage you to review our <a href="https://rehablookup.com/community-guidelines">community guidelines</a> and consider submitting a revised review.</p>
            <p>If you believe this was an error, please contact our support team.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

function generateResponseEmail(review: any, facility: any, seekerProfile: any, responseText?: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; margin: 0; padding: 0; background-color: #f6f8fb;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1B365D 0%, #2a4a7a 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">${facility.name} Responded</h1>
          </div>
          <div style="background: #ffffff; padding: 30px; border-radius: 0 0 12px 12px;">
            <p>Hi ${seekerProfile?.first_name || seekerProfile?.display_name || "there"},</p>
            <p><strong>${facility.name}</strong> has responded to your review!</p>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0 0 15px 0; font-weight: bold;">Your Review:</p>
              <p style="margin: 0; color: #666;">${review.review_text || `${review.rating}-star rating`}</p>
            </div>
            <div style="background: #eff6ff; border-left: 4px solid #1B365D; padding: 20px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0 0 10px 0; font-weight: bold;">Response from ${facility.name}:</p>
              <p style="margin: 0;">${responseText || "Thank you for your feedback."}</p>
            </div>
            <p style="margin-top: 20px;">
              <a href="https://rehablookup.com/facility/${facility.id}" style="background: #1B365D; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Full Review</a>
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}

function generateDisputeEmail(review: any, facility: any, disputeReason?: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; margin: 0; padding: 0; background-color: #f6f8fb;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">⚠️ Review Dispute Filed</h1>
          </div>
          <div style="background: #ffffff; padding: 30px; border-radius: 0 0 12px 12px;">
            <p>A provider has disputed a review and requires your attention.</p>
            <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Facility:</strong> ${facility.name}</p>
              <p><strong>Review Rating:</strong> ${"⭐".repeat(review.rating)} (${review.rating}/5)</p>
              ${review.review_text ? `<p><strong>Review Text:</strong><br>${review.review_text}</p>` : ""}
              ${disputeReason ? `<p><strong>Dispute Reason:</strong><br>${disputeReason}</p>` : ""}
            </div>
            <p style="margin-top: 20px;">
              <a href="https://rehablookup.com/admin/reviews" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Review Dispute</a>
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}
