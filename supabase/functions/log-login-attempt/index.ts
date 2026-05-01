import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-forwarded-for, x-real-ip, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { identifier, success, actionType = 'login' } = await req.json();

    if (!identifier) {
      return new Response(
        JSON.stringify({ error: 'Identifier is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract client IP from various headers
    const forwardedFor = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const cfConnectingIp = req.headers.get('cf-connecting-ip');
    
    // Priority: CF > X-Forwarded-For (first IP) > X-Real-IP > fallback
    let clientIp = 'unknown';
    if (cfConnectingIp) {
      clientIp = cfConnectingIp;
    } else if (forwardedFor) {
      clientIp = forwardedFor.split(',')[0].trim();
    } else if (realIp) {
      clientIp = realIp;
    }

    const userAgent = req.headers.get('user-agent') || 'unknown';

    console.log(`[LOG-LOGIN-ATTEMPT] Logging ${actionType} attempt for ${identifier}, IP: ${clientIp}, success: ${success}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if IP is blocked
    const { data: isBlocked } = await supabase.rpc('is_identifier_blocked', { p_identifier: clientIp });
    
    if (isBlocked) {
      console.log(`[LOG-LOGIN-ATTEMPT] IP ${clientIp} is blocked`);
      return new Response(
        JSON.stringify({ 
          error: 'Access denied', 
          blocked: true,
          message: 'Your IP address has been temporarily blocked due to suspicious activity.'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the attempt with IP in metadata
    await supabase.rpc('log_rate_limit_event', {
      p_identifier: identifier,
      p_action_type: actionType,
      p_success: success,
      p_metadata: {
        ip_address: clientIp,
        user_agent: userAgent,
        timestamp: new Date().toISOString()
      }
    });

    // Also log IP separately for IP-based rate limiting
    if (!success) {
      await supabase.rpc('log_rate_limit_event', {
        p_identifier: clientIp,
        p_action_type: `${actionType}_ip`,
        p_success: false,
        p_metadata: {
          email: identifier,
          user_agent: userAgent,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check rate limit for both identifier and IP
    const { data: identifierLimit } = await supabase.rpc('check_rate_limit', {
      p_identifier: identifier,
      p_action_type: actionType,
      p_max_attempts: 5,
      p_window_minutes: 15
    });

    const { data: ipLimit } = await supabase.rpc('check_rate_limit', {
      p_identifier: clientIp,
      p_action_type: `${actionType}_ip`,
      p_max_attempts: 10,
      p_window_minutes: 15
    });

    const isLimited = identifierLimit?.is_limited || ipLimit?.is_limited;
    const retryAfter = Math.max(
      identifierLimit?.retry_after_seconds || 0,
      ipLimit?.retry_after_seconds || 0
    );

    return new Response(
      JSON.stringify({
        success: true,
        ip_captured: clientIp,
        rate_limited: isLimited,
        retry_after_seconds: retryAfter,
        identifier_attempts: identifierLimit?.attempts || 0,
        ip_attempts: ipLimit?.attempts || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[LOG-LOGIN-ATTEMPT] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
