import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INDEXNOW_KEY = "b5d6ae91829b4bfc8d8035d42e67c804";
const HOST = "rehablookup.com";
const KEY_LOCATION = `https://${HOST}/${INDEXNOW_KEY}.txt`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { urls } = await req.json();

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return new Response(
        JSON.stringify({ error: "URLs array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // IndexNow accepts up to 10,000 URLs per request
    const urlsToSubmit = urls.slice(0, 10000);

    const payload = {
      host: HOST,
      key: INDEXNOW_KEY,
      keyLocation: KEY_LOCATION,
      urlList: urlsToSubmit,
    };

    console.log(`Submitting ${urlsToSubmit.length} URLs to IndexNow`);

    const response = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const status = response.status;
    let message = "";

    switch (status) {
      case 200:
        message = "URLs submitted successfully";
        break;
      case 202:
        message = "URLs accepted, pending processing";
        break;
      case 400:
        message = "Invalid request";
        break;
      case 403:
        message = "Key not valid or not matching host";
        break;
      case 422:
        message = "Invalid URLs";
        break;
      case 429:
        message = "Too many requests";
        break;
      default:
        message = `Unexpected status: ${status}`;
    }

    console.log(`IndexNow response: ${status} - ${message}`);

    return new Response(
      JSON.stringify({ 
        success: status === 200 || status === 202,
        status,
        message,
        urlsSubmitted: urlsToSubmit.length,
      }),
      { 
        status: status === 200 || status === 202 ? 200 : status,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("IndexNow submission error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Failed to submit to IndexNow", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
