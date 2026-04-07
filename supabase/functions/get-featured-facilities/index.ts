import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Plan product IDs - support both old (legacy) and new Pro IDs
const FEATURED_PRODUCT_IDS = ["prod_TbalOeJZA2ZoJl", "prod_TbyzJVNOQL71NN"]; // Legacy Featured
const PRO_PRODUCT_IDS = ["prod_TbalLOPujTIoUe", "prod_Tbyz1bf6iYyzYd"]; // Pro plan (includes legacy Professional)
const DEFAULT_MAX_HOMEPAGE_FEATURED = 6;

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[GET-FEATURED-FACILITIES] ${step}${detailsStr}`);
};

// Generate a deterministic seed based on date for consistent daily rotation
const getDailySeed = (): number => {
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
};

// Deterministic shuffle using seed
const seededShuffle = <T>(array: T[], seed: number): T[] => {
  const shuffled = [...array];
  let currentSeed = seed;
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    currentSeed = (currentSeed * 1103515245 + 12345) & 0x7fffffff;
    const j = currentSeed % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
};

// Notification settings type
type NotificationSettings = {
  rotation_notifications_enabled: boolean;
  notify_on_featured: boolean;
  notify_on_unfeatured: boolean;
  notification_timing: "immediate" | "daily_digest" | "weekly_digest";
  admin_email_recipients: string[];
};

const defaultNotificationSettings: NotificationSettings = {
  rotation_notifications_enabled: true,
  notify_on_featured: true,
  notify_on_unfeatured: false,
  notification_timing: "immediate",
  admin_email_recipients: ["Support@rehablookup.com"],
};

// Send featured notification email
async function sendFeaturedEmail(
  resend: Resend | null,
  providerEmail: string,
  providerName: string,
  facilityName: string,
  adminRecipients: string[]
) {
  if (!resend) {
    logStep("Resend not configured, skipping email");
    return;
  }

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f6f8fb;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f6f8fb; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #1B365D 0%, #2D4A7C 100%); padding: 40px 40px 30px; text-align: center;">
                  <div style="display: inline-block; background-color: rgba(201, 162, 39, 0.2); padding: 12px 24px; border-radius: 50px; margin-bottom: 16px;">
                    <span style="font-size: 28px;">🌟</span>
                  </div>
                  <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0 0 8px;">You're Featured!</h1>
                  <p style="color: rgba(255, 255, 255, 0.85); font-size: 16px; margin: 0;">Your facility is on the homepage today</p>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <p style="color: #1A1A1A; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                    Hi${providerName ? ` ${providerName}` : ''},
                  </p>
                  <p style="color: #1A1A1A; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                    Great news! <strong>${facilityName}</strong> is being featured on the RehabLookup homepage today. This premium placement increases your visibility to families and individuals searching for treatment options.
                  </p>
                  
                  <!-- Highlight Box -->
                  <div style="background-color: #FEF9E7; border-left: 4px solid #C9A227; padding: 20px; border-radius: 0 8px 8px 0; margin: 24px 0;">
                    <h3 style="color: #1B365D; font-size: 16px; font-weight: 600; margin: 0 0 8px;">What This Means For You</h3>
                    <ul style="color: #5E6B7A; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                      <li>Priority visibility on the homepage</li>
                      <li>Increased profile views from potential clients</li>
                      <li>Higher chance of receiving qualified leads</li>
                    </ul>
                  </div>
                  
                  <p style="color: #5E6B7A; font-size: 14px; line-height: 1.6; margin: 24px 0 0;">
                    Featured facilities rotate daily to ensure fair exposure for all Pro subscribers. Keep your profile updated to maximize the impact of your featured placement!
                  </p>
                  
                  <!-- CTA Button -->
                  <div style="text-align: center; margin-top: 32px;">
                    <a href="https://rehablookup.com/provider/listing" style="display: inline-block; background-color: #1B365D; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      View Your Listing
                    </a>
                  </div>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f6f8fb; padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                  <p style="color: #9CA3AF; font-size: 12px; line-height: 1.6; margin: 0;">
                    This email was sent because you have an active Pro subscription.<br>
                    <a href="https://rehablookup.com/provider/settings" style="color: #1B365D; text-decoration: underline;">Manage notification preferences</a>
                  </p>
                  <p style="color: #9CA3AF; font-size: 12px; margin: 16px 0 0;">
                    © ${new Date().getFullYear()} RehabLookup. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  try {
    // Send to provider
    const providerResult = await resend.emails.send({
      from: "RehabLookup <no-reply@rehablookup.com>",
      to: [providerEmail],
      subject: `🌟 ${facilityName} is Featured on Homepage Today!`,
      html: emailHtml,
    });
    logStep("Sent featured email to provider", { email: providerEmail, result: providerResult });

    // Send copies to admin recipients
    if (adminRecipients.length > 0) {
      const adminHtml = `
        <div style="background: #FEF3C7; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; font-size: 14px;">
          <strong>Admin Copy:</strong> This email was sent to ${providerEmail} for facility "${facilityName}"
        </div>
        ${emailHtml}
      `;
      
      await resend.emails.send({
        from: "RehabLookup <no-reply@rehablookup.com>",
        to: adminRecipients,
        subject: `[Admin] Featured Rotation: ${facilityName}`,
        html: adminHtml,
      });
      logStep("Sent featured email to admins", { recipients: adminRecipients });
    }
  } catch (emailError) {
    logStep("Error sending featured email", { error: String(emailError) });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (!stripeKey) {
      logStep("No Stripe key, returning empty array");
      return new Response(JSON.stringify({ 
        featuredFacilityIds: [],
        homepageFeaturedIds: [],
        allEligibleIds: []
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const resend = resendApiKey ? new Resend(resendApiKey) : null;

    // Fetch notification settings
    let notificationSettings = defaultNotificationSettings;
    let maxHomepageFeatured = DEFAULT_MAX_HOMEPAGE_FEATURED;
    
    try {
      const { data: settingsData } = await supabaseClient
        .from("platform_settings")
        .select("setting_value")
        .eq("setting_key", "featured_notification_settings")
        .maybeSingle();
      
      if (settingsData?.setting_value) {
        notificationSettings = settingsData.setting_value as NotificationSettings;
        logStep("Loaded notification settings", notificationSettings);
      } else {
        logStep("Using default notification settings");
      }

      // Fetch platform settings (max homepage featured)
      const { data: platformData } = await supabaseClient
        .from("platform_settings")
        .select("setting_value")
        .eq("setting_key", "featured_platform_settings")
        .maybeSingle();
      
      if (platformData?.setting_value) {
        const platformSettings = platformData.setting_value as { max_homepage_featured?: number };
        if (platformSettings.max_homepage_featured && platformSettings.max_homepage_featured > 0) {
          maxHomepageFeatured = platformSettings.max_homepage_featured;
          logStep("Loaded max homepage featured", { maxHomepageFeatured });
        }
      }
    } catch (settingsError) {
      logStep("Error loading settings, using defaults", { error: String(settingsError) });
    }

    // Get all approved, non-suspended facilities (including legacy featured flag and display order)
    const { data: facilities, error: facilitiesError } = await supabaseClient
      .from("facilities")
      .select("id, user_id, featured, featured_pinned, last_featured_shown_at, suspended, name, featured_display_order")
      .eq("status", "approved")
      .or("suspended.is.null,suspended.eq.false");

    if (facilitiesError) {
      logStep("Error fetching facilities", { error: facilitiesError.message });
      throw new Error(`Failed to fetch facilities: ${facilitiesError.message}`);
    }

    logStep("Fetched facilities", { count: facilities?.length || 0 });

    interface EligibleFacility {
      id: string;
      user_id: string;
      featured_pinned: boolean;
      last_featured_shown_at: string | null;
      featured_display_order: number | null;
      provider_email?: string;
      provider_name?: string;
      facility_name?: string;
      plan_type?: 'featured' | 'professional' | 'pro';
    }

    const eligibleFacilities: EligibleFacility[] = [];
    const professionalFacilityIds: string[] = []; // Track professional plan facilities
    const proFacilityIds: string[] = []; // Track Pro subscription facilities

    // Fetch Pro subscriptions first
    const { data: proSubs } = await supabaseClient
      .from("pro_subscriptions")
      .select("facility_id, provider_id")
      .eq("status", "active")
      .gt("current_period_end", new Date().toISOString());

    logStep("Fetched Pro subscriptions", { count: proSubs?.length || 0 });

    // Add Pro facilities to eligible list and track IDs
    for (const proSub of proSubs || []) {
      if (proSub.facility_id) {
        proFacilityIds.push(proSub.facility_id);
        
        // Get facility and provider info
        const facility = (facilities || []).find(f => f.id === proSub.facility_id);
        if (facility) {
          const { data: profile } = await supabaseClient
            .from("profiles")
            .select("email, first_name, last_name")
            .eq("user_id", facility.user_id)
            .maybeSingle();

          eligibleFacilities.push({
            id: facility.id,
            user_id: facility.user_id,
            featured_pinned: facility.featured_pinned || false,
            last_featured_shown_at: facility.last_featured_shown_at,
            featured_display_order: facility.featured_display_order,
            provider_email: profile?.email,
            provider_name: profile?.first_name || "",
            facility_name: facility.name || "",
            plan_type: 'pro',
          });
          logStep("Added Pro subscriber facility", { facilityId: facility.id });
        }
      }
    }

    // Check each facility's owner for Featured subscription
    for (const facility of facilities || []) {
      // Get provider email from profiles table
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("email, first_name, last_name")
        .eq("user_id", facility.user_id)
        .maybeSingle();
      
      const providerEmail = profile?.email;
      
      if (!providerEmail) continue;

      try {
        // Find Stripe customer
        const customers = await stripe.customers.list({ email: providerEmail, limit: 1 });
        if (customers.data.length === 0) continue;

        const customerId = customers.data[0].id;

        // Check for active Featured subscription
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          status: "active",
          limit: 1,
        });

        if (subscriptions.data.length > 0) {
          const subscription = subscriptions.data[0];
          const productId = subscription.items.data[0].price.product as string;

          // Check for Featured subscription
          if (FEATURED_PRODUCT_IDS.includes(productId)) {
            // Get facility name
            const { data: facilityData } = await supabaseClient
              .from("facilities")
              .select("name")
              .eq("id", facility.id)
              .single();

            eligibleFacilities.push({
              id: facility.id,
              user_id: facility.user_id,
              featured_pinned: facility.featured_pinned || false,
              last_featured_shown_at: facility.last_featured_shown_at,
              featured_display_order: facility.featured_display_order,
              provider_email: providerEmail,
              provider_name: profile?.first_name || "",
              facility_name: facilityData?.name || "",
              plan_type: 'featured',
            });
            logStep("Found Featured subscriber", { facilityId: facility.id, email: providerEmail });
          } 
          // Check for Pro (legacy Professional) subscription
          else if (PRO_PRODUCT_IDS.includes(productId)) {
            professionalFacilityIds.push(facility.id);
            logStep("Found Pro subscriber (legacy Professional)", { facilityId: facility.id, email: providerEmail });
          }
        }
      } catch (stripeError) {
        logStep("Error checking Stripe for facility", { facilityId: facility.id, error: String(stripeError) });
        // Continue checking other facilities
      }
    }

    logStep("Total eligible Featured subscription facilities", { count: eligibleFacilities.length });
    logStep("Total Professional subscription facilities", { count: professionalFacilityIds.length });

    // Also include legacy featured facilities (those with featured=true in database)
    const legacyFeaturedFacilities = (facilities || []).filter(f => 
      f.featured === true && !eligibleFacilities.some(ef => ef.id === f.id)
    );

    for (const facility of legacyFeaturedFacilities) {
      // Get provider info for legacy featured
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("email, first_name, last_name")
        .eq("user_id", facility.user_id)
        .maybeSingle();

      eligibleFacilities.push({
        id: facility.id,
        user_id: facility.user_id,
        featured_pinned: facility.featured_pinned || false,
        last_featured_shown_at: facility.last_featured_shown_at,
        featured_display_order: facility.featured_display_order,
        provider_email: profile?.email,
        provider_name: profile?.first_name || "",
        facility_name: facility.name || "",
      });
      logStep("Added legacy featured facility", { facilityId: facility.id, name: facility.name });
    }

    logStep("Total eligible Featured facilities (subscription + legacy)", { count: eligibleFacilities.length });

    // All eligible facility IDs (for search priority)
    const allEligibleIds = eligibleFacilities.map(f => f.id);

    // Select homepage featured (max configurable with rotation)
    let homepageFeaturedIds: string[] = [];
    const newlyFeaturedFacilities: EligibleFacility[] = [];

    if (eligibleFacilities.length <= maxHomepageFeatured) {
      // Show all if within limit, but still sort by display order
      const sorted = [...eligibleFacilities].sort((a, b) => {
        // Pinned facilities first
        if (a.featured_pinned && !b.featured_pinned) return -1;
        if (!a.featured_pinned && b.featured_pinned) return 1;
        // Then by display order
        if (a.featured_display_order !== null && b.featured_display_order !== null) {
          return a.featured_display_order - b.featured_display_order;
        }
        if (a.featured_display_order !== null) return -1;
        if (b.featured_display_order !== null) return 1;
        return 0;
      });
      homepageFeaturedIds = sorted.map(f => f.id);
    } else {
      // Sort by: 1) pinned, 2) display_order, 3) fairness rotation
      const pinned = eligibleFacilities.filter(f => f.featured_pinned).sort((a, b) => {
        if (a.featured_display_order !== null && b.featured_display_order !== null) {
          return a.featured_display_order - b.featured_display_order;
        }
        if (a.featured_display_order !== null) return -1;
        if (b.featured_display_order !== null) return 1;
        return 0;
      });
      
      const unpinned = eligibleFacilities.filter(f => !f.featured_pinned);

      // Sort unpinned by display_order first, then by last_featured_shown_at for fairness
      unpinned.sort((a, b) => {
        // First priority: display order
        if (a.featured_display_order !== null && b.featured_display_order !== null) {
          return a.featured_display_order - b.featured_display_order;
        }
        if (a.featured_display_order !== null) return -1;
        if (b.featured_display_order !== null) return 1;
        // Fallback: last_featured_shown_at (oldest/null first for fairness)
        if (!a.last_featured_shown_at && !b.last_featured_shown_at) return 0;
        if (!a.last_featured_shown_at) return -1;
        if (!b.last_featured_shown_at) return 1;
        return new Date(a.last_featured_shown_at).getTime() - new Date(b.last_featured_shown_at).getTime();
      });

      // Use daily seed for additional variation on items without display order
      const withOrder = unpinned.filter(f => f.featured_display_order !== null);
      const withoutOrder = unpinned.filter(f => f.featured_display_order === null);
      const dailySeed = getDailySeed();
      const shuffledWithoutOrder = seededShuffle(withoutOrder, dailySeed);

      // Combine: pinned first (always shown), then ordered, then shuffled unordered
      const combined = [...pinned, ...withOrder, ...shuffledWithoutOrder];
      const selectedFacilities = combined.slice(0, maxHomepageFeatured);
      homepageFeaturedIds = selectedFacilities.map(f => f.id);

      // Update last_featured_shown_at for facilities shown today
      const today = new Date().toISOString();
      const todayDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD for checking
      
      for (const facility of selectedFacilities) {
        // Check if facility was already featured today
        const wasAlreadyFeaturedToday = facility.last_featured_shown_at?.startsWith(todayDate);
        
        await supabaseClient
          .from("facilities")
          .update({ last_featured_shown_at: today })
          .eq("id", facility.id);
        
        // Track newly featured facilities for notifications
        if (!wasAlreadyFeaturedToday) {
          newlyFeaturedFacilities.push(facility);
          
          // Create in-app notification
          const { data: existingNotification } = await supabaseClient
            .from("provider_notifications")
            .select("id")
            .eq("user_id", facility.user_id)
            .eq("facility_id", facility.id)
            .eq("type", "featured_rotation")
            .gte("created_at", todayDate)
            .maybeSingle();
          
          if (!existingNotification) {
            await supabaseClient
              .from("provider_notifications")
              .insert({
                user_id: facility.user_id,
                facility_id: facility.id,
                type: "featured_rotation",
                title: "Featured on Homepage! 🌟",
                message: `Your facility "${facility.facility_name}" is being featured on the homepage today. This increases your visibility to potential clients.`,
                metadata: { featured_date: todayDate }
              });
            
            logStep("Created featured rotation notification", { facilityId: facility.id, facilityName: facility.facility_name });
          }
        }
      }

      logStep("Updated last_featured_shown_at for homepage featured", { count: homepageFeaturedIds.length });
    }

    // Send email notifications for newly featured facilities (if enabled)
    if (
      notificationSettings.rotation_notifications_enabled && 
      notificationSettings.notify_on_featured &&
      notificationSettings.notification_timing === "immediate" &&
      newlyFeaturedFacilities.length > 0
    ) {
      logStep("Sending featured emails", { count: newlyFeaturedFacilities.length });
      
      for (const facility of newlyFeaturedFacilities) {
        if (facility.provider_email) {
          await sendFeaturedEmail(
            resend,
            facility.provider_email,
            facility.provider_name || "",
            facility.facility_name || "Your facility",
            notificationSettings.admin_email_recipients
          );
        }
      }
    } else if (newlyFeaturedFacilities.length > 0) {
      logStep("Skipping email notifications", { 
        enabled: notificationSettings.rotation_notifications_enabled,
        notifyOnFeatured: notificationSettings.notify_on_featured,
        timing: notificationSettings.notification_timing,
        newlyFeaturedCount: newlyFeaturedFacilities.length
      });
    }

    logStep("Completed", { 
      totalEligible: allEligibleIds.length,
      homepageFeatured: homepageFeaturedIds.length,
      professional: professionalFacilityIds.length,
      newlyFeatured: newlyFeaturedFacilities.length
    });

    return new Response(
      JSON.stringify({ 
        featuredFacilityIds: allEligibleIds, // All eligible for search priority
        homepageFeaturedIds, // Max 6 for homepage display
        allEligibleIds, // Alias for clarity
        professionalFacilityIds, // All facilities with Professional plan
        proFacilityIds, // All facilities with Pro subscription
        paidFacilityIds: [...new Set([...allEligibleIds, ...professionalFacilityIds, ...proFacilityIds])], // All paid facilities combined (deduplicated)
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in get-featured-facilities", { message: errorMessage });
    return new Response(JSON.stringify({ 
      error: errorMessage, 
      featuredFacilityIds: [],
      homepageFeaturedIds: [],
      allEligibleIds: [],
      professionalFacilityIds: [],
      proFacilityIds: [],
      paidFacilityIds: [],
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200, // Return 200 with empty array to not break the UI
    });
  }
});
