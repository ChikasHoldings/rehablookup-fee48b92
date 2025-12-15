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
  profile: {
    email: string;
    first_name: string;
  } | null;
  services_count: number;
  insurance_count: number;
}

interface CompletionStatus {
  hasDescription: boolean;
  hasLogo: boolean;
  hasGallery: boolean;
  hasWebsite: boolean;
  hasServices: boolean;
  hasInsurance: boolean;
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
  if (!checks.hasDescription) missingItems.push("Add a detailed description (50+ characters)");
  if (!checks.hasLogo) missingItems.push("Upload your facility logo");
  if (!checks.hasGallery) missingItems.push("Add facility photos");
  if (!checks.hasWebsite) missingItems.push("Add your website URL");
  if (!checks.hasServices) missingItems.push("List at least 3 services you offer");
  if (!checks.hasInsurance) missingItems.push("Add accepted insurance providers");

  const completedCount = Object.values(checks).filter(Boolean).length;
  const totalCount = Object.keys(checks).length;

  return {
    ...checks,
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
  dashboardUrl: string
): string {
  const missingItemsHtml = completion.missingItems
    .slice(0, 4)
    .map(item => `<li style="margin-bottom: 8px; color: #4a5568;">${item}</li>`)
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #1B365D 0%, #2a4a7a 100%); padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Complete Your Profile</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">RehabLookup.com</p>
      </div>
      
      <div style="background: #ffffff; padding: 32px; border: 1px solid #e2e8f0; border-top: none;">
        <p style="margin-top: 0;">Hi ${firstName},</p>
        
        <p>Your listing for <strong>${facilityName}</strong> is ${completion.percentage}% complete. A complete profile helps families find and trust your facility.</p>
        
        <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <div style="display: flex; align-items: center; margin-bottom: 16px;">
            <div style="background: #1B365D; color: white; border-radius: 50%; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px;">
              ${completion.percentage}%
            </div>
            <div style="margin-left: 16px;">
              <strong style="color: #1B365D;">Profile Completion</strong>
              <p style="margin: 0; font-size: 14px; color: #64748b;">${completion.completedCount} of ${completion.totalCount} items completed</p>
            </div>
          </div>
          
          <p style="margin: 0 0 12px 0; font-weight: 600; color: #1B365D;">To improve your listing:</p>
          <ul style="margin: 0; padding-left: 20px;">
            ${missingItemsHtml}
          </ul>
        </div>
        
        <div style="text-align: center; margin: 32px 0;">
          <a href="${dashboardUrl}" style="display: inline-block; background: #1B365D; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
            Complete Your Profile
          </a>
        </div>
        
        <p style="color: #64748b; font-size: 14px;">
          Facilities with complete profiles receive <strong>up to 3x more inquiries</strong> from families seeking treatment.
        </p>
      </div>
      
      <div style="background: #f8fafc; padding: 20px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none; text-align: center;">
        <p style="margin: 0; color: #64748b; font-size: 12px;">
          You're receiving this because you have a facility listing on RehabLookup.com.<br>
          <a href="${dashboardUrl}/settings" style="color: #1B365D;">Manage notification preferences</a>
        </p>
      </div>
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

    // Get the dashboard URL from environment or default
    const dashboardUrl = Deno.env.get("DASHBOARD_URL") || "https://rehablookup.com/provider";

    // Find facilities that need reminders:
    // - Created more than 3 days ago
    // - Haven't received a reminder in the last 7 days
    // - Have received fewer than 3 reminders total
    // - Are pending or approved status
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    console.log("[PROFILE-REMINDERS] Fetching incomplete facilities...");

    const { data: facilities, error: facilitiesError } = await supabase
      .from("facilities")
      .select(`
        id,
        name,
        description,
        logo_url,
        gallery_urls,
        website,
        profile_reminder_count,
        user_id,
        created_at
      `)
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
        // Fetch profile for this facility's user
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, first_name")
          .eq("user_id", facility.user_id)
          .maybeSingle();

        if (!profile?.email) {
          console.log(`[PROFILE-REMINDERS] No profile/email for facility ${facility.id}`);
          continue;
        }

        // Check notification preferences
        const { data: preferences } = await supabase
          .from("notification_preferences")
          .select("email_product_updates")
          .eq("user_id", facility.user_id)
          .maybeSingle();

        // Skip if user has opted out of product updates
        if (preferences?.email_product_updates === false) {
          console.log(`[PROFILE-REMINDERS] User opted out for facility ${facility.id}`);
          continue;
        }

        // Fetch services count
        const { count: servicesCount } = await supabase
          .from("facility_services")
          .select("*", { count: "exact", head: true })
          .eq("facility_id", facility.id);

        // Fetch insurance count
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

        // Only send reminder if profile is incomplete (less than 100%)
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
            from: "RehabLookup <notifications@resend.dev>",
            to: [profile.email],
            subject: `Complete your ${facility.name} profile (${completion.percentage}% done)`,
            html: emailHtml,
          }),
        });

        if (!emailResponse.ok) {
          const errorData = await emailResponse.text();
          console.error(`[PROFILE-REMINDERS] Email error for ${facility.id}:`, errorData);
          errors.push(`Failed to send to ${profile.email}: ${errorData}`);
          continue;
        }

        // Update the facility reminder tracking
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
