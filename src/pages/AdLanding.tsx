import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Shield, Clock, Heart, CheckCircle } from "lucide-react";
import { LazyVideoEmbed } from "@/components/ui/lazy-video-embed";
import { supabase } from "@/integrations/supabase/client";
import logoImage from "@/assets/logo.png";
import { LeadIntakeForm } from "@/components/lead-intake";

// Configure your video here - replace with your actual video ID
const VIDEO_CONFIG = {
  platform: "youtube" as const, // or "vimeo"
  videoId: "dQw4w9WgXcQ", // Replace with your actual YouTube/Vimeo video ID
};

interface UTMParams {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
}

export default function AdLanding() {
  const [searchParams] = useSearchParams();
  
  // UTM parameters
  const utmParams = useRef<UTMParams>({
    utm_source: searchParams.get("utm_source"),
    utm_medium: searchParams.get("utm_medium"),
    utm_campaign: searchParams.get("utm_campaign"),
    utm_term: searchParams.get("utm_term"),
    utm_content: searchParams.get("utm_content"),
  });
  
  // Track page view on mount with UTM params
  useEffect(() => {
    const trackPageView = async () => {
      try {
        const utm = utmParams.current;
        await supabase.from("request_help_analytics").insert([{
          event_type: "page_view",
          source: "ad_landing",
          metadata: JSON.parse(JSON.stringify({ utm })),
        }]);
      } catch (error) {
        console.error("Analytics tracking error:", error);
      }
    };
    trackPageView();
  }, []);
  
  const handleVideoPlay = async () => {
    try {
      const utm = utmParams.current;
      await supabase.from("request_help_analytics").insert([{
        event_type: "video_play",
        source: "ad_landing",
        metadata: JSON.parse(JSON.stringify({ utm })),
      }]);
    } catch (error) {
      console.error("Analytics tracking error:", error);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 flex flex-col">
      <Helmet>
        <title>Find Treatment Options | RehabLookup</title>
        <meta name="description" content="Get help exploring treatment options today. Share a few details and we'll help connect you with appropriate treatment options — no obligation." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      
      {/* Minimal header with logo only */}
      <header className="py-6 px-4">
        <div className="max-w-2xl mx-auto">
          <img src={logoImage} alt="RehabLookup" className="h-10" />
        </div>
      </header>
      
      <main className="flex-1 px-4 py-6 md:py-10">
        <div className="max-w-2xl mx-auto space-y-8">
          
          {/* Hero Section */}
          <section className="text-center space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-foreground tracking-tight leading-tight">
              Find treatment options that fit your needs
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto">
              Share a few details and we'll help connect you with appropriate treatment options — no obligation.
            </p>
          </section>
          
          {/* Video Section */}
          <section className="space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-100">
            <LazyVideoEmbed
              platform={VIDEO_CONFIG.platform}
              videoId={VIDEO_CONFIG.videoId}
              title="How RehabLookup helps connect people with treatment"
              onPlay={handleVideoPlay}
            />
            <p className="text-sm text-muted-foreground text-center">
              A brief overview of how we help connect people with treatment options in a respectful, confidential way.
            </p>
          </section>
          
          {/* Lead Intake Form - Same as Get Help page */}
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
            <LeadIntakeForm />
          </section>
          
          {/* Trust & Info Section */}
          <section className="space-y-6 pt-4 animate-in fade-in slide-in-from-bottom-5 duration-500 delay-300">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Why Choose RehabLookup?
              </h2>
              <p className="text-muted-foreground text-sm">
                We're here to help you find the right treatment center for your recovery journey.
              </p>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Shield className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground text-sm">100% Confidential</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Your information is private and only shared with matching treatment providers.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground text-sm">Quick Response</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Get connected with verified treatment centers within hours.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Heart className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground text-sm">Free Service</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Our matching service is completely free with no obligation.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <CheckCircle className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground text-sm">Verified Centers</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    All treatment facilities are credential-verified for quality care.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
      
      {/* Minimal footer */}
      <footer className="py-6 px-4 border-t border-border/50 mt-8">
        <div className="max-w-2xl mx-auto text-center text-xs text-muted-foreground space-y-2">
          <p>© {new Date().getFullYear()} RehabLookup. All rights reserved.</p>
          <p>
            By submitting this form, you consent to being contacted by a treatment provider.
          </p>
        </div>
      </footer>
    </div>
  );
}
