import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IpLookupResult {
  query: string;
  country: string;
  countryCode: string;
  region: string;
  regionName: string;
  city: string;
  zip: string;
  lat: number;
  lon: number;
  timezone: string;
  isp: string;
  org: string;
  as: string;
  status: string;
  message?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ip } = await req.json();

    if (!ip) {
      return new Response(
        JSON.stringify({ error: 'IP address is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Skip lookup for localhost/private IPs
    if (ip === '127.0.0.1' || ip === 'localhost' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
      return new Response(
        JSON.stringify({
          ip,
          city: 'Local',
          regionName: 'Network',
          country: 'Private',
          countryCode: '--',
          isp: 'Local Network',
          status: 'success'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use ip-api.com (free, no API key required, 45 requests per minute)
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query`);
    
    if (!response.ok) {
      throw new Error(`IP API returned status ${response.status}`);
    }

    const data: IpLookupResult = await response.json();

    if (data.status === 'fail') {
      return new Response(
        JSON.stringify({
          ip,
          city: 'Unknown',
          regionName: '',
          country: 'Unknown',
          countryCode: '--',
          isp: '',
          status: 'fail',
          message: data.message || 'IP lookup failed'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        ip: data.query || ip,
        city: data.city || 'Unknown',
        regionName: data.regionName || '',
        country: data.country || 'Unknown',
        countryCode: data.countryCode || '--',
        region: data.region || '',
        zip: data.zip || '',
        lat: data.lat,
        lon: data.lon,
        timezone: data.timezone || '',
        isp: data.isp || '',
        org: data.org || '',
        as: data.as || '',
        status: 'success'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('IP lookup error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to lookup IP location',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
