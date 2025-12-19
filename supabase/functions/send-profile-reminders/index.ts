import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

function generateReminderEmail(firstName: string, facilityName: string, completion: CompletionStatus, dashboardUrl: string): string {
  const missingItemsHtml = completion.missingItems
    .slice(0, 3)
    .map(item => `<li style="margin-bottom: 8px; color: hsl(215, 19%, 35%); font-size: 14px; line-height: 1.5;">${item}</li>`)
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: hsl(210, 20%, 96%);">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: hsl(210, 20%, 96%); padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, hsl(217, 54%, 23%) 0%, hsl(217, 41%, 35%) 100%); padding: 32px; border-radius: 12px 12px 0 0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <p style="margin: 0 0 8px 0; font-size: 12px; color: hsla(0, 0%, 100%, 0.7); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; text-transform: uppercase; letter-spacing: 1px;">RehabLookup</p>
                    <h1 style="margin: 0; font-size: 24px; color: hsl(0, 0%, 100%); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-weight: 600;">
                      Complete Your Profile
                    </h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="background: hsl(0, 0%, 100%); padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; border-left: 1px solid hsl(220, 13%, 91%); border-right: 1px solid hsl(220, 13%, 91%);">
              
              <p style="margin: 0 0 20px 0; color: hsl(215, 19%, 35%); font-size: 16px; line-height: 1.6;">
                Hi ${firstName},
              </p>
              
              <p style="margin: 0 0 24px 0; color: hsl(215, 19%, 35%); font-size: 16px; line-height: 1.6;">
                Your listing for <strong>${facilityName}</strong> is ${completion.percentage}% complete. Finishing your profile helps families find and trust your facility.
              </p>
              
              <!-- Progress Section -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: hsl(210, 20%, 98%); border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="70" valign="top">
                          <table cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="background: hsl(217, 54%, 23%); color: hsl(0, 0%, 100%); border-radius: 50%; width: 56px; height: 56px; text-align: center; vertical-align: middle; font-weight: 700; font-size: 16px;">
                                ${completion.percentage}%
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td valign="top" style="padding-left: 16px;">
                          <p style="margin: 0 0 12px 0; font-weight: 600; color: hsl(217, 54%, 23%); font-size: 15px;">To improve your listing:</p>
                          <ul style="margin: 0; padding-left: 20px;">
                            ${missingItemsHtml}
                          </ul>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Tip -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: hsl(45, 93%, 95%); border: 1px solid hsl(45, 93%, 85%); border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0; color: hsl(32, 81%, 29%); font-size: 14px; line-height: 1.5;">
                      💡 <strong>Tip:</strong> Complete profiles receive up to 3x more leads from families seeking treatment.
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}/listing" style="display: inline-block; background: hsl(217, 54%, 23%); color: hsl(0, 0%, 100%); padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
                      Complete Your Profile
                    </a>
                  </td>
                </tr>
              </table>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: hsl(217, 54%, 23%); padding: 32px; border-radius: 0 0 12px 12px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: hsl(0, 0%, 100%); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">RehabLookup</p>
                    <p style="margin: 0 0 16px 0; font-size: 13px; color: hsla(0, 0%, 100%, 0.7); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">Connecting families with trusted treatment providers</p>
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding: 0 8px;">
                          <a href="${dashboardUrl}/settings" style="color: hsl(199, 89%, 78%); text-decoration: none; font-size: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">Notification Settings</a>
                        </td>
                        <td style="color: hsla(0, 0%, 100%, 0.4); font-size: 12px;">|</td>
                        <td style="padding: 0 8px;">
                          <a href="mailto:help@rehablookup.com" style="color: hsl(199, 89%, 78%); text-decoration: none; font-size: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">Contact Support</a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 16px 0 0 0; font-size: 11px; color: hsla(0, 0%, 100%, 0.5); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
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
</html>
  `;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("[PROFILE-REMINDERS] Function started");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

        console.log(`[PROFILE-REMINDERS] Sending reminder to ${profile.email} for ${facility.name} (${completion.percentage}% complete)`);

        const emailHtml = generateReminderEmail(
          profile.first_name || "there",
          facility.name,
          completion,
          dashboardUrl
        );

        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "RehabLookup <no-reply@rehablookup.com>",
            to: [profile.email],
            subject: `Your ${facility.name} profile is ${completion.percentage}% complete`,
            html: emailHtml,
          }),
        });

        if (!emailResponse.ok) {
          const errorData = await emailResponse.text();
          console.error(`[PROFILE-REMINDERS] Email error for ${facility.id}:`, errorData);
          errors.push(`Failed to send to ${profile.email}: ${errorData}`);
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
};

serve(handler);
