import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const VERSION = "1.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const timestamp = new Date().toISOString();
  console.log(`[SAVE-INTL-DRAFT] [${VERSION}] [${timestamp}] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

// Input validation
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

const sanitizeString = (str: string, maxLength: number = 500): string => {
  if (!str || typeof str !== 'string') return '';
  return str.trim().slice(0, maxLength).replace(/[<>]/g, '');
};

const sanitizePhone = (phone: string): string => {
  if (!phone || typeof phone !== 'string') return '';
  return phone.replace(/[^\d+\-() ]/g, '').slice(0, 30);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    logStep("Function started", { version: VERSION });

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing required environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse and validate request body
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      logStep("ERROR: Invalid JSON body");
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const { intakeData, emailVerifiedAt, draftId: existingDraftId } = body;

    if (!intakeData || typeof intakeData !== 'object') {
      logStep("ERROR: Missing intake data");
      return new Response(
        JSON.stringify({ error: "Intake data is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const data = intakeData as Record<string, unknown>;

    // Validate required fields
    const email = sanitizeString(data.email as string, 254).toLowerCase();
    if (!isValidEmail(email)) {
      logStep("ERROR: Invalid email", { email });
      return new Response(
        JSON.stringify({ error: "Valid email is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const firstName = sanitizeString(data.first_name as string, 100);
    const lastName = sanitizeString(data.last_name as string, 100);
    const phone = sanitizePhone(data.phone as string);
    const country = sanitizeString(data.country as string, 100);
    const preferredLanguage = sanitizeString(data.preferred_language as string, 50) || "English";

    if (!firstName || !lastName) {
      logStep("ERROR: Missing required contact fields");
      return new Response(
        JSON.stringify({ error: "First name and last name are required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    if (!country) {
      logStep("ERROR: Missing country");
      return new Response(
        JSON.stringify({ error: "Country is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Generate draft ID if not provided
    const draftId = existingDraftId || `intl_draft_${crypto.randomUUID().slice(0, 12)}`;

    // Build the intake_data JSON
    const fullIntakeData = {
      first_name: firstName,
      last_name: lastName,
      email: email,
      phone: phone,
      country: country,
      preferred_language: preferredLanguage,
      seeking_for: sanitizeString(data.seeking_for as string, 50),
      age_range: sanitizeString(data.age_range as string, 50),
      gender: sanitizeString(data.gender as string, 50),
      level_of_care: sanitizeString(data.level_of_care as string, 100),
      primary_concern: sanitizeString(data.primary_concern as string, 100),
      co_occurring_conditions: Array.isArray(data.co_occurring_conditions) 
        ? data.co_occurring_conditions.map(c => sanitizeString(String(c), 100))
        : [],
      previous_treatment: sanitizeString(data.previous_treatment as string, 50),
      budget_range: sanitizeString(data.budget_range as string, 100),
      rehab_style: sanitizeString(data.rehab_style as string, 100),
      treatment_duration: sanitizeString(data.treatment_duration as string, 50),
      amenities: Array.isArray(data.amenities)
        ? data.amenities.map(a => sanitizeString(String(a), 100))
        : [],
      special_requirements: sanitizeString(data.special_requirements as string, 200),
      notes: sanitizeString(data.notes as string, 1000),
    };

    const clientName = `${firstName} ${lastName}`.trim();
    const now = new Date().toISOString();

    // Check if draft already exists by draft_id in metadata
    if (existingDraftId) {
      const { data: existingDraft } = await supabase
        .from("international_placement_cases")
        .select("id, payment_status")
        .contains("metadata", { draft_id: existingDraftId })
        .maybeSingle();

      if (existingDraft) {
        // Update existing draft
        const { error: updateError } = await supabase
          .from("international_placement_cases")
          .update({
            client_name: clientName,
            client_email: email,
            client_phone: phone,
            client_country: country,
            preferred_language: preferredLanguage,
            intake_data: fullIntakeData,
            email_verified_at: emailVerifiedAt || null,
            form_completed_at: now,
            updated_at: now,
            metadata: {
              draft_id: draftId,
              email_verified_at: emailVerifiedAt,
              form_completed_at: now,
            },
          })
          .eq("id", existingDraft.id);

        if (updateError) {
          logStep("Error updating draft", { error: updateError.message });
          throw new Error("Failed to update draft");
        }

        logStep("Draft updated", { draftId, caseId: existingDraft.id });

        return new Response(
          JSON.stringify({ 
            success: true, 
            draftId,
            caseId: existingDraft.id,
            isUpdate: true,
            _version: VERSION 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }
    }

    // Create new draft
    const { data: newCase, error: insertError } = await supabase
      .from("international_placement_cases")
      .insert({
        client_name: clientName,
        client_email: email,
        client_phone: phone,
        client_country: country,
        preferred_language: preferredLanguage,
        status: "draft",
        payment_status: "pending",
        payment_amount_cents: 29900,
        intake_data: fullIntakeData,
        email_verified_at: emailVerifiedAt || null,
        form_completed_at: now,
        priority: "normal",
        metadata: {
          draft_id: draftId,
          email_verified_at: emailVerifiedAt,
          form_completed_at: now,
        },
      })
      .select("id")
      .single();

    if (insertError) {
      logStep("Error creating draft", { error: insertError.message });
      throw new Error("Failed to create draft");
    }

    logStep("Draft created", { draftId, caseId: newCase.id });

    return new Response(
      JSON.stringify({ 
        success: true, 
        draftId,
        caseId: newCase.id,
        isUpdate: false,
        _version: VERSION 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage, _version: VERSION }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
