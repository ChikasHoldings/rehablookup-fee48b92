import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Featured plan product ID
const FEATURED_PRODUCT_ID = "prod_TbalOeJZA2ZoJl";
const MAX_HOMEPAGE_FEATURED = 6;

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
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

    // Get all approved, non-suspended facilities
    const { data: facilities, error: facilitiesError } = await supabaseClient
      .from("facilities")
      .select("id, user_id, featured_pinned, last_featured_shown_at, suspended")
      .eq("status", "approved")
      .or("suspended.is.null,suspended.eq.false");

    if (facilitiesError) {
      logStep("Error fetching facilities", { error: facilitiesError.message });
      throw new Error(`Failed to fetch facilities: ${facilitiesError.message}`);
    }

    logStep("Fetched facilities", { count: facilities?.length || 0 });

    interface EligibleFacility {
      id: string;
      featured_pinned: boolean;
      last_featured_shown_at: string | null;
    }

    const eligibleFacilities: EligibleFacility[] = [];

    // Check each facility's owner for Featured subscription
    for (const facility of facilities || []) {
      // Get provider email from profiles table
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("email")
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

          if (productId === FEATURED_PRODUCT_ID) {
            eligibleFacilities.push({
              id: facility.id,
              featured_pinned: facility.featured_pinned || false,
              last_featured_shown_at: facility.last_featured_shown_at,
            });
            logStep("Found Featured subscriber", { facilityId: facility.id, email: providerEmail });
          }
        }
      } catch (stripeError) {
        logStep("Error checking Stripe for facility", { facilityId: facility.id, error: String(stripeError) });
        // Continue checking other facilities
      }
    }

    logStep("Total eligible Featured facilities", { count: eligibleFacilities.length });

    // All eligible facility IDs (for search priority)
    const allEligibleIds = eligibleFacilities.map(f => f.id);

    // Select homepage featured (max 6 with rotation)
    let homepageFeaturedIds: string[] = [];

    if (eligibleFacilities.length <= MAX_HOMEPAGE_FEATURED) {
      // Show all if 6 or fewer
      homepageFeaturedIds = allEligibleIds;
    } else {
      // Rotation logic: pinned first, then rotate based on last_featured_shown_at with daily seed
      const pinned = eligibleFacilities.filter(f => f.featured_pinned);
      const unpinned = eligibleFacilities.filter(f => !f.featured_pinned);

      // Sort unpinned by last_featured_shown_at (oldest/null first for fairness)
      unpinned.sort((a, b) => {
        if (!a.last_featured_shown_at && !b.last_featured_shown_at) return 0;
        if (!a.last_featured_shown_at) return -1;
        if (!b.last_featured_shown_at) return 1;
        return new Date(a.last_featured_shown_at).getTime() - new Date(b.last_featured_shown_at).getTime();
      });

      // Use daily seed to add variation while maintaining fairness
      const dailySeed = getDailySeed();
      const shuffledUnpinned = seededShuffle(unpinned, dailySeed);

      // Combine: pinned first (always shown), then shuffled unpinned
      const combined = [...pinned, ...shuffledUnpinned];
      homepageFeaturedIds = combined.slice(0, MAX_HOMEPAGE_FEATURED).map(f => f.id);

      // Update last_featured_shown_at for facilities shown today
      const today = new Date().toISOString();
      const todayDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD for checking
      
      for (const id of homepageFeaturedIds) {
        // Check if facility was already featured today
        const facility = eligibleFacilities.find(f => f.id === id);
        const wasAlreadyFeaturedToday = facility?.last_featured_shown_at?.startsWith(todayDate);
        
        await supabaseClient
          .from("facilities")
          .update({ last_featured_shown_at: today })
          .eq("id", id);
        
        // Send notification only if newly featured today (not already notified)
        if (!wasAlreadyFeaturedToday) {
          // Get facility details for notification
          const { data: facilityData } = await supabaseClient
            .from("facilities")
            .select("name, user_id")
            .eq("id", id)
            .single();
          
          if (facilityData) {
            // Check if notification already exists for today
            const { data: existingNotification } = await supabaseClient
              .from("provider_notifications")
              .select("id")
              .eq("user_id", facilityData.user_id)
              .eq("facility_id", id)
              .eq("type", "featured_rotation")
              .gte("created_at", todayDate)
              .maybeSingle();
            
            if (!existingNotification) {
              await supabaseClient
                .from("provider_notifications")
                .insert({
                  user_id: facilityData.user_id,
                  facility_id: id,
                  type: "featured_rotation",
                  title: "Featured on Homepage! 🌟",
                  message: `Your facility "${facilityData.name}" is being featured on the homepage today. This increases your visibility to potential clients.`,
                  metadata: { featured_date: todayDate }
                });
              
              logStep("Sent featured rotation notification", { facilityId: id, facilityName: facilityData.name });
            }
          }
        }
      }

      logStep("Updated last_featured_shown_at for homepage featured", { count: homepageFeaturedIds.length });
    }

    logStep("Completed", { 
      totalEligible: allEligibleIds.length,
      homepageFeatured: homepageFeaturedIds.length 
    });

    return new Response(
      JSON.stringify({ 
        featuredFacilityIds: allEligibleIds, // All eligible for search priority
        homepageFeaturedIds, // Max 6 for homepage display
        allEligibleIds // Alias for clarity
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
      allEligibleIds: []
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200, // Return 200 with empty array to not break the UI
    });
  }
});
