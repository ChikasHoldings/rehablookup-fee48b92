import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";
import {
  getProviderPlan,
  emailStart,
  emailHeader,
  emailBodyStart,
  emailBodyEnd,
  emailGreeting,
  emailParagraph,
  proInsightsBox,
  tipBox,
  ctaButton,
  emailFooter,
  emailEnd,
  getPlanStyles,
  type PlanType,
} from "../_shared/email-templates.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { sendEmailWithRetry, sleep, BULK_SEND_DELAY_MS } from "../_shared/resilient-email-sender.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface FacilityWithProfile {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  gallery_urls: string[] | null;
  website: string | null;
  profile_reminder_count: number;
  user_id: string;
  profile: { email: string; first_name: string } | null;
  services_count: number;
  insurance_count: number;
}

interface CompletionStatus {
  completedCount: number;
  totalCount: number;
  percentage: number;
  missingItems: string[];
}

function calculateCompletion(facility: FacilityWithProfile): CompletionStatus {
  const checks = {
    hasDescription: !!(facility.description && facility.description.length >= 50),
    hasLogo: !!facility.logo_url,
    hasGallery: !!(facility.gallery_urls && facility.gallery_urls.length >= 1),
    hasWebsite: !!facility.website,
    hasServices: facility.services_count >= 3,
    hasInsurance: facility.insurance_count >= 1,
  };

  const missingItems: string[] = [];
  if (!checks.hasDescription) missingItems.push("Add a description");
  if (!checks.hasLogo) missingItems.push("Upload your logo");
  if (!checks.hasGallery) missingItems.push("Add facility photos");
  if (!checks.hasWebsite) missingItems.push("Add your website");
  if (!checks.hasServices) missingItems.push("List your services");
  if (!checks.hasInsurance) missingItems.push("Add insurance info");

  const completedCount = Object.values(checks).filter(Boolean).length;
  const totalCount = Object.keys(checks).length;

  return {
    completedCount,
    totalCount,
    percentage: Math.round((completedCount / totalCount) * 100),
    missingItems,
  };
}

function generateReminderEmail(
  firstName: string,
  facilityName: string,
  completion: CompletionStatus,
  dashboardUrl: string,
  plan: PlanType
): string {
  const isPro = plan === 'pro';
  const styles = getPlanStyles(plan);

  const missingItemsHtml = completion.missingItems
    .slice(0, 3)
    .map(item => `<li style="margin-bottom: 8px; color: #374151; font-size: 14px; line-height: 1.5;">${item}</li>`)
    .join("");

  let email = emailStart();
  email += emailHeader("Complete Your Profile", plan);
  email += emailBodyStart();
  email += emailGreeting(firstName);
  email += emailParagraph(`Your listing for <strong>${facilityName}</strong> is ${completion.percentage}% complete. Finishing your profile helps families find and trust your facility.`);

  // Plan-specific insights
  if (isPro) {
    email += proInsightsBox("Complete profiles receive priority placement in search results. Your Pro status is amplified with a complete profile.");
  }

  // Progress section
  email += `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f9fafb; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="70" valign="top">
                          <table cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="background: ${styles.accentColor}; color: #fff; border-radius: 50%; width: 56px; height: 56px; text-align: center; vertical-align: middle; font-weight: 700; font-size: 16px;">
                                ${completion.percentage}%
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td valign="top" style="padding-left: 16px;">
                          <p style="margin: 0 0 12px 0; font-weight: 600; color: ${styles.accentColor}; font-size: 15px;">To improve your listing:</p>
                          <ul style="margin: 0; padding-left: 20px;">
                            ${missingItemsHtml}
                          </ul>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
  `;

  // Tip
  const tipContent = isPro 
    ? "Your Pro status combined with a complete profile maximizes your visibility and lead conversion potential." 
    : "Complete profiles receive up to 3x more leads from families seeking treatment.";
  email += tipBox(tipContent, plan);

  email += ctaButton("Complete Your Profile", `${dashboardUrl}/listing`, plan);
  email += emailBodyEnd();
  email += emailFooter({ settingsUrl: `${dashboardUrl}/settings` });
  email += emailEnd();

  return email;
}

Deno.serve(async (req: Request): Promise<Response> => {
  console.log("[PROFILE-REMINDERS] Function started");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(RESEND_API_KEY);
    const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, { apiVersion: "2025-08-27.basil" }) : null;

    const dashboardUrl = Deno.env.get("DASHBOARD_URL") || "https://rehablookup.com/provider";

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    console.log("[PROFILE-REMINDERS] Fetching incomplete facilities...");

    const { data: facilities, error: facilitiesError } = await supabase
      .from("facilities")
      .select(`id, name, description, logo_url, gallery_urls, website, profile_reminder_count, user_id, created_at`)
      .in("status", ["pending", "approved"])
      .lt("profile_reminder_count", 3)
      .lt("created_at", threeDaysAgo.toISOString())
      .or(`profile_reminder_sent_at.is.null,profile_reminder_sent_at.lt.${sevenDaysAgo.toISOString()}`);

    if (facilitiesError) {
      console.error("[PROFILE-REMINDERS] Error fetching facilities:", facilitiesError);
      throw facilitiesError;
    }

    console.log(`[PROFILE-REMINDERS] Found ${facilities?.length || 0} facilities to check`);

    if (!facilities || facilities.length === 0) {
      return new Response(
        JSON.stringify({ message: "No facilities need reminders", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let sentCount = 0;
    const errors: string[] = [];

    for (const facility of facilities) {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, first_name")
          .eq("user_id", facility.user_id)
          .maybeSingle();

        if (!profile?.email) {
          console.log(`[PROFILE-REMINDERS] No profile/email for facility ${facility.id}`);
          continue;
        }

        const { data: preferences } = await supabase
          .from("notification_preferences")
          .select("email_product_updates")
          .eq("user_id", facility.user_id)
          .maybeSingle();

        if (preferences?.email_product_updates === false) {
          console.log(`[PROFILE-REMINDERS] User opted out for facility ${facility.id}`);
          continue;
        }

        const { count: servicesCount } = await supabase
          .from("facility_services")
          .select("*", { count: "exact", head: true })
          .eq("facility_id", facility.id);

        const { count: insuranceCount } = await supabase
          .from("facility_insurance")
          .select("*", { count: "exact", head: true })
          .eq("facility_id", facility.id);

        const facilityWithCounts: FacilityWithProfile = {
          ...facility,
          profile,
          services_count: servicesCount || 0,
          insurance_count: insuranceCount || 0,
        };

        const completion = calculateCompletion(facilityWithCounts);

        if (completion.percentage >= 100) {
          console.log(`[PROFILE-REMINDERS] Facility ${facility.id} is complete, skipping`);
          continue;
        }

        // Get provider plan for styling
        const planInfo = await getProviderPlan(profile.email, stripe);
        console.log(`[PROFILE-REMINDERS] Provider ${profile.email} is on ${planInfo.plan} plan`);

        console.log(`[PROFILE-REMINDERS] Sending reminder to ${profile.email} for ${facility.name} (${completion.percentage}% complete)`);

        const emailHtml = generateReminderEmail(
          profile.first_name || "there",
          facility.name,
          completion,
          dashboardUrl,
          planInfo.plan
        );

        const emailResult = await sendEmailWithRetry(supabase, resend, {
          from: "RehabLookup <no-reply@rehablookup.com>",
          to: [profile.email],
          subject: `Your ${facility.name} profile is ${completion.percentage}% complete`,
          html: emailHtml,
        }, {
          emailType: "profile_reminder",
          idempotencyKey: `profile-reminder-${facility.id}-${new Date().toISOString().slice(0, 10)}`,
        });

        if (!emailResult.success) {
          console.error(`[PROFILE-REMINDERS] Email error for ${facility.id}:`, emailResult.error);
          errors.push(`Failed to send to ${profile.email}: ${emailResult.error}`);
          continue;
        }

        await supabase
          .from("facilities")
          .update({
            profile_reminder_sent_at: new Date().toISOString(),
            profile_reminder_count: (facility.profile_reminder_count || 0) + 1,
          })
          .eq("id", facility.id);

        sentCount++;
        console.log(`[PROFILE-REMINDERS] Sent reminder for facility ${facility.id}`);
        await sleep(BULK_SEND_DELAY_MS);

      } catch (facilityError: unknown) {
        const errorMessage = facilityError instanceof Error ? facilityError.message : String(facilityError);
        console.error(`[PROFILE-REMINDERS] Error processing facility ${facility.id}:`, facilityError);
        errors.push(`Error processing ${facility.id}: ${errorMessage}`);
      }
    }

    console.log(`[PROFILE-REMINDERS] Completed - sent ${sentCount} reminders`);

    return new Response(
      JSON.stringify({ 
        message: `Sent ${sentCount} profile reminder emails`,
        sent: sentCount,
        checked: facilities.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[PROFILE-REMINDERS] Fatal error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
