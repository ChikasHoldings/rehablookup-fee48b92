import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VERSION = "1.0.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    // Accept both snake_case and camelCase
    const facility_id = body.facility_id || body.facilityId;

    if (!facility_id) {
      console.error('Missing facility_id');
      return new Response(
        JSON.stringify({ error: 'facility_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Tracking view for facility: ${facility_id}`);

    // Use service role to bypass RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if facility exists and is approved
    const { data: facility, error: facilityError } = await supabase
      .from('facilities')
      .select('id, status')
      .eq('id', facility_id)
      .maybeSingle();

    if (facilityError) {
      console.error('Error fetching facility:', facilityError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify facility' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!facility || facility.status !== 'approved') {
      console.log('Facility not found or not approved');
      return new Response(
        JSON.stringify({ error: 'Facility not found or not approved' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const today = new Date().toISOString().split('T')[0];

    // Try to increment existing record or insert new one
    const { data: existingView, error: selectError } = await supabase
      .from('facility_views')
      .select('id, view_count')
      .eq('facility_id', facility_id)
      .eq('view_date', today)
      .maybeSingle();

    if (selectError) {
      console.error('Error checking existing view:', selectError);
      return new Response(
        JSON.stringify({ error: 'Failed to check existing views' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingView) {
      // Increment existing count
      const { error: updateError } = await supabase
        .from('facility_views')
        .update({ view_count: existingView.view_count + 1 })
        .eq('id', existingView.id);

      if (updateError) {
        console.error('Error updating view count:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update view count' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Updated view count to ${existingView.view_count + 1}`);
    } else {
      // Insert new record
      const { error: insertError } = await supabase
        .from('facility_views')
        .insert({ facility_id, view_date: today, view_count: 1 });

      if (insertError) {
        console.error('Error inserting view:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to record view' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Inserted new view record');
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in track-view function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
