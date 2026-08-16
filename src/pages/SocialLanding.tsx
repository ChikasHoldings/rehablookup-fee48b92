import { useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import logoImage from "@/assets/logo-header.webp";

// Configure your vertical video here (9:16 aspect ratio recommended). Leave
// `videoId` empty to hide the video block entirely. Previously held a
// Rick-Astley placeholder which would have shipped "Never Gonna Give You Up"
// to anyone hitting /go/:slug — removed to avoid the brand-safety risk.
const VIDEO_CONFIG = {
  videoId: "", // Set to a real YouTube short / vertical video ID to enable.
};

interface UTMParams {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
}

export default function SocialLanding() {
  const [searchParams] = useSearchParams();
  const hasTrackedVideoPlay = useRef(false);
  
  // UTM parameters
  const utmParams = useRef<UTMParams>({
    utm_source: searchParams.get("utm_source"),
    utm_medium: searchParams.get("utm_medium"),
    utm_campaign: searchParams.get("utm_campaign"),
    utm_term: searchParams.get("utm_term"),
    utm_content: searchParams.get("utm_content"),
  });
  
  // Track page view on mount with social pixels
  useEffect(() => {
    const trackPageView = async () => {
      try {
        const utm = utmParams.current;
        await supabase.from("request_help_analytics").insert([{
          event_type: "page_view",
          source: "social_landing",
          metadata: JSON.parse(JSON.stringify({ utm, page: "social_landing" })),
        }]);
      } catch (error) {
        console.error("Analytics tracking error:", error);
      }
    };
    trackPageView();
    // Analytics provider removed — Meta Pixel PageView removed.
    
    // Fire TikTok Pixel PageView
    if (typeof window !== "undefined" && (window as { ttq?: { track: (event: string) => void } }).ttq) {
      (window as { ttq?: { track: (event: string) => void } }).ttq!.track("ViewContent");
    }
  }, []);
  
  const trackVideoPlay = async () => {
    if (!hasTrackedVideoPlay.current) {
      hasTrackedVideoPlay.current = true;
      try {
        const utm = utmParams.current;
        await supabase.from("request_help_analytics").insert([{
          event_type: "video_play",
          source: "social_landing",
          metadata: JSON.parse(JSON.stringify({ utm })),
        }]);
      } catch (error) {
        console.error("Analytics tracking error:", error);
      }
    }
  };
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Looking for treatment options? | RehabLookup</title>
        <meta name="description" content="Share a few details and we'll help guide you to available options. Confidential and no obligation." />
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href="https://rehablookup.com/lp/social" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Helmet>
      
      {/* Minimal header with small logo */}
      <header className="py-4 px-4">
        <img src={logoImage} alt="RehabLookup" width={150} height={36} className="h-7 w-auto opacity-70" />
      </header>
      
      <main className="flex-1 px-4 pb-8">
        <div className="max-w-lg mx-auto space-y-6">
          
          {/* Hero - Attention Grabbing */}
          <section className="text-center space-y-2 pt-2">
            <h1 className="text-2xl md:text-3xl font-semibold text-foreground leading-tight">
              Looking for treatment options?
            </h1>
            <p className="text-muted-foreground text-base">
              Share a few details and we'll help guide you to available options.
            </p>
          </section>
          
          {/* Vertical Video Section (9:16) — only renders when configured. */}
          {VIDEO_CONFIG.videoId && (
            <section className="relative mx-auto" style={{ maxWidth: "280px" }}>
              <div className="relative rounded-2xl overflow-hidden bg-muted" style={{ aspectRatio: "9/16" }}>
                <iframe
                  src={`https://www.youtube.com/embed/${VIDEO_CONFIG.videoId}?autoplay=1&mute=1&loop=1&playlist=${VIDEO_CONFIG.videoId}&controls=0&modestbranding=1&rel=0&showinfo=0&playsinline=1`}
                  title="Treatment information video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                  loading="lazy"
                  onLoad={() => trackVideoPlay()}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center mt-3">
                A brief explanation of how we help people explore treatment options privately and respectfully.
              </p>
            </section>
          )}
          
          {/* CTA into the directory. This is a generic "find treatment"
              landing with no specific facility, so it must NOT use the
              facility-required LeadIntakeForm (which dead-ends on submit with
              "select a treatment center"). Route to search instead, preserving
              UTM/campaign params for attribution. */}
          <section className="text-center space-y-3 pt-2">
            <Button asChild size="lg" className="w-full sm:w-auto h-12 px-8 text-base">
              <Link to={`/search-results${searchParams.toString() ? `?${searchParams.toString()}` : ""}`}>
                Search Treatment Centers
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <p className="text-xs text-muted-foreground">
              Free to search — no account required.
            </p>
          </section>
        </div>
      </main>
      
      {/* Minimal footer */}
      <footer className="py-6 px-4 border-t border-border/50">
        <div className="max-w-lg mx-auto text-center text-xs text-muted-foreground space-y-2">
          <p>© {new Date().getFullYear()} RehabLookup. All rights reserved.</p>
          <p>
            By submitting this form, you consent to being contacted by a treatment provider.
          </p>
        </div>
      </footer>
    </div>
  );
}
