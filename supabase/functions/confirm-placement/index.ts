import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CONFIRM-PLACEMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error("Authentication failed");
    }

    const { inquiryId, facilityId, confirmationType, admittedAt } = await req.json();
    
    if (!inquiryId || !facilityId || !confirmationType) {
      throw new Error("Inquiry ID, Facility ID, and confirmation type are required");
    }

    logStep("Processing confirmation", { inquiryId, facilityId, confirmationType });

    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    // Get the inquiry
    const { data: inquiry, error: inquiryError } = await supabaseService
      .from('concierge_inquiries')
      .select('*')
      .eq('id', inquiryId)
      .single();

    if (inquiryError || !inquiry) {
      throw new Error("Inquiry not found");
    }

    // Verify the facility is in the matched list
    const matchedFacilityIds = inquiry.matched_facility_ids || [];
    if (!matchedFacilityIds.includes(facilityId)) {
      throw new Error("Facility not in matched list for this inquiry");
    }

    // Check user authorization
    const isSeeker = inquiry.user_email === userData.user.email;
    
    // Check if user is provider
    const { data: facility } = await supabaseService
      .from('facilities')
      .select('id, user_id, name')
      .eq('id', facilityId)
      .eq('user_id', userData.user.id)
      .maybeSingle();
    
    const isProvider = !!facility;

    if (!isSeeker && !isProvider) {
      throw new Error("Not authorized to confirm this placement");
    }

    // Handle confirmation based on type
    const updates: Record<string, unknown> = {};

    if (confirmationType === 'seeker') {
      if (!isSeeker) throw new Error("Only seeker can confirm admission");
      updates.seeker_confirmed = true;
      updates.seeker_confirmed_at = new Date().toISOString();
      logStep("Seeker confirmation recorded");
    } else if (confirmationType === 'provider') {
      if (!isProvider) throw new Error("Only provider can confirm placement");
      updates.placed_facility_id = facilityId;
      updates.placement_confirmed = true;
      updates.placement_confirmed_at = admittedAt || new Date().toISOString();
      logStep("Provider confirmation recorded");
    }

    // Check if both parties have confirmed
    const willBeFullyConfirmed = 
      (confirmationType === 'seeker' && inquiry.placement_confirmed) ||
      (confirmationType === 'provider' && inquiry.seeker_confirmed);

    if (willBeFullyConfirmed) {
      updates.status = 'placed';
      logStep("Dual confirmation complete - placement confirmed");
    } else {
      updates.status = 'confirming';
    }

    updates.updated_at = new Date().toISOString();

    // Update the inquiry
    const { error: updateError } = await supabaseService
      .from('concierge_inquiries')
      .update(updates)
      .eq('id', inquiryId);

    if (updateError) {
      throw new Error(`Failed to update inquiry: ${updateError.message}`);
    }

    // If fully confirmed, trigger fee charge
    if (willBeFullyConfirmed) {
      logStep("Triggering placement fee charge");
      
      // Call the charge function
      try {
        const chargeResponse = await fetch(`${supabaseUrl}/functions/v1/charge-placement-fee`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            inquiryId,
            facilityId,
            feeType: 'flat_fee',
          }),
        });

        const chargeResult = await chargeResponse.json();
        logStep("Charge result", chargeResult);
      } catch (chargeError) {
        logStep("Warning: Charge failed", { error: chargeError });
        // Don't fail the confirmation if charge fails
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        confirmationType,
        fullyConfirmed: willBeFullyConfirmed,
        status: willBeFullyConfirmed ? 'placed' : 'confirming',
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
