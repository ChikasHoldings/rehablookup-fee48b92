import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const VERSION = "1.0.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const generateRequestId = () => `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

const logStep = (requestId: string, step: string, details?: Record<string, unknown>) => {
  const timestamp = new Date().toISOString();
  console.log(`[CONFIRM-PLACEMENT] [${VERSION}] [${requestId}] [${timestamp}] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

// UUID validation
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

// ISO date validation
const isValidISODate = (str: string): boolean => {
  if (!str) return true; // Optional field
  const date = new Date(str);
  return !isNaN(date.getTime()) && str === date.toISOString().slice(0, -1) + 'Z' || /^\d{4}-\d{2}-\d{2}/.test(str);
};

Deno.serve(async (req) => {
  const requestId = generateRequestId();
  
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // POST only
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    logStep(requestId, "Function started", { version: VERSION });

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

    const { inquiryId, facilityId, confirmationType, admittedAt, isInternational } = await req.json();
    
    // Validate required fields
    if (!inquiryId || !facilityId || !confirmationType) {
      throw new Error("Inquiry ID, Facility ID, and confirmation type are required");
    }

    // Strict UUID validation
    if (!isValidUUID(inquiryId)) {
      throw new Error("Invalid inquiry ID format");
    }
    if (!isValidUUID(facilityId)) {
      throw new Error("Invalid facility ID format");
    }

    // Validate confirmation type
    const validConfirmationTypes = ['admin', 'admin_confirm', 'placement_confirm'];
    if (!validConfirmationTypes.includes(confirmationType)) {
      throw new Error("Invalid confirmation type");
    }

    // Validate admitted date if provided
    if (admittedAt && !isValidISODate(admittedAt)) {
      throw new Error("Invalid admitted date format");
    }

    logStep(requestId, "Processing confirmation", { inquiryId, facilityId, confirmationType });

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

    // Guard: strict status transition validation
    const CONFIRMABLE_STATUSES = ['matched', 'introductions_sent', 'in_contact'];
    
    if (inquiry.status === 'placed') {
      logStep(requestId, "Case already placed - idempotent return", { inquiryId });
      return new Response(JSON.stringify({ 
        success: true, 
        alreadyPlaced: true,
        requestId,
        _version: VERSION,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (inquiry.status === 'closed') {
      throw new Error("Cannot confirm placement for a closed case");
    }
    if (!CONFIRMABLE_STATUSES.includes(inquiry.status)) {
      throw new Error(`Cannot confirm placement: case is in '${inquiry.status}' status. Must be in: ${CONFIRMABLE_STATUSES.join(', ')}`);
    }

    // Verify the facility is in the matched list
    const matchedFacilityIds = [
      ...(inquiry.matched_facility_ids || []),
      ...(inquiry.admin_matched_facility_ids || []),
    ];
    if (!matchedFacilityIds.includes(facilityId)) {
      throw new Error("Facility not in matched list for this inquiry");
    }

    // Check user authorization - ADMIN ONLY for brokerage model
    // Verify user is an admin
    const { data: userRole } = await supabaseService
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .eq('role', 'admin')
      .maybeSingle();

    const isAdmin = !!userRole;

    if (!isAdmin) {
      throw new Error("Only administrators can confirm placements. This ensures RehabLookup coordinates all admissions.");
    }

    logStep(requestId, "Admin authorization verified", { adminUserId: userData.user.id });

    // Admin confirms placement directly - no dual confirmation needed in brokerage model
    const updates: Record<string, unknown> = {
      placed_facility_id: facilityId,
      placement_confirmed: true,
      placement_confirmed_at: admittedAt || new Date().toISOString(),
      seeker_confirmed: true, // Admin acts on behalf of both parties
      seeker_confirmed_at: new Date().toISOString(),
      status: 'placed',
    };

    logStep(requestId, "Admin confirmed placement", { facilityId, admittedAt });

    updates.updated_at = new Date().toISOString();

    // Update the inquiry
    const { error: updateError } = await supabaseService
      .from('concierge_inquiries')
      .update(updates)
      .eq('id', inquiryId);

    if (updateError) {
      throw new Error(`Failed to update inquiry: ${updateError.message}`);
    }

    // Log the case event
    try {
      await supabaseService.from("concierge_case_events").insert({
        inquiry_id: inquiryId,
        event_type: "placement_confirmed",
        event_data: { 
          facility_id: facilityId,
          admitted_at: admittedAt || new Date().toISOString(),
          confirmed_by: "admin",
        },
        actor_id: userData.user.id,
        actor_type: "admin",
      });
      logStep(requestId, "Case event logged");
    } catch (eventError) {
      logStep(requestId, "Warning: Failed to log case event", { error: String(eventError) });
    }

    // Send placement complete notification (admin-controlled)
    logStep(requestId, "Sending placement complete notifications");
    
    try {
      await fetch(`${supabaseUrl}/functions/v1/send-concierge-notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          type: 'placement_complete',
          inquiryId,
          facilityId,
        }),
      });
    } catch (notifError) {
      logStep(requestId, "Warning: Failed to send placement complete notification", { error: String(notifError) });
    }

    logStep(requestId, "Triggering placement fee charge");
    
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
          isInternational: isInternational || false,
        }),
      });

      const chargeResult = await chargeResponse.json();
      logStep(requestId, "Charge result", chargeResult);
    } catch (chargeError) {
      logStep(requestId, "Warning: Charge failed", { error: String(chargeError) });
      // Don't fail the confirmation if charge fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        adminConfirmed: true,
        status: 'placed',
        requestId,
        _version: VERSION,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep(requestId, "ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage, requestId, _version: VERSION }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
