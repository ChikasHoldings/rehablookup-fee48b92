import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DirectLeadRequest {
  facilityId: string;
  facilityName: string;
  facilityEmail?: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message?: string | null;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[${requestId}] submit-direct-lead: Redirecting to submit-qualified-lead`);

  try {
    const body: DirectLeadRequest = await req.json();
    
    // Validate required fields
    if (!body.facilityId || !body.firstName || !body.email || !body.phone) {
      console.log(`[${requestId}] Missing required fields`);
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Transform direct lead format to qualified lead format
    const qualifiedLeadPayload = {
      facilityId: body.facilityId,
      name: `${body.firstName} ${body.lastName}`.trim(),
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone,
      message: body.message || "",
      preferredContact: "phone",
      // Default values for qualified lead fields
      whoSeekingHelp: "self",
      locationZip: "00000",
      locationCityState: "",
      urgency: "exploring",
      primarySubstance: [],
      levelOfCare: "not_sure",
      dualDiagnosis: "not_sure",
      insuranceType: "not_sure",
      insuranceProvider: "",
      budgetPreference: "",
      source: "direct_profile",
    };

    console.log(`[${requestId}] Forwarding to submit-qualified-lead`, { 
      facilityId: body.facilityId,
      leadName: qualifiedLeadPayload.name 
    });

    // Forward to submit-qualified-lead edge function
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error(`[${requestId}] Missing Supabase configuration`);
      return new Response(
        JSON.stringify({ success: false, error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get client IP for forwarding
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("x-real-ip") || 
                     "unknown";

    const response = await fetch(`${supabaseUrl}/functions/v1/submit-qualified-lead`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseAnonKey}`,
        "x-forwarded-for": clientIP,
      },
      body: JSON.stringify(qualifiedLeadPayload),
    });

    const result = await response.json();
    
    console.log(`[${requestId}] submit-qualified-lead response`, { 
      status: response.status, 
      success: result.success 
    });

    // Return the response from submit-qualified-lead
    return new Response(
      JSON.stringify(result),
      { 
        status: response.status, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[${requestId}] Error in submit-direct-lead:`, errorMsg);
    
    return new Response(
      JSON.stringify({ success: false, error: "Failed to submit lead" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
