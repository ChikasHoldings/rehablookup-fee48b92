import { useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { 
  Shield, 
  Clock, 
  Heart, 
  CheckCircle, 
  MapPin, 
  BookOpen, 
  Phone, 
  Building2, 
  ArrowRight,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LazyVideoEmbed } from "@/components/ui/lazy-video-embed";
import { supabase } from "@/integrations/supabase/client";
import logoImage from "@/assets/logo-header.webp";
import { LeadIntakeForm } from "@/components/lead-intake";
import { scrollToTopInstant } from "@/hooks/useScrollToTop";

// Configure your video here. Leave `videoId` empty to hide the video block
// entirely; populating it renders the player. Previously held a Rick-Astley
// placeholder which would have shipped "Never Gonna Give You Up" to anyone
// who hit /ads/:slug — removed to avoid that reputational risk.
const VIDEO_CONFIG = {
  platform: "youtube" as const, // or "vimeo"
  videoId: "", // Set to a real YouTube/Vimeo video ID to enable.
};

interface UTMParams {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
}

// Recommended content cards for success page
const RECOMMENDED_CONTENT = [
  {
    icon: Building2,
    title: "Browse Treatment Centers",
    description: "Explore verified rehab facilities near you with detailed profiles and amenities.",
    href: "/rehab-centers",
    color: "bg-blue-500/10 text-blue-600",
  },
  {
    icon: MapPin,
    title: "Find by Location",
    description: "Search treatment options in your state or city for convenient access.",
    href: "/locations",
    color: "bg-emerald-500/10 text-emerald-600",
  },
  {
    icon: BookOpen,
    title: "Recovery Resources",
    description: "Educational articles on treatment types, recovery stages, and what to expect.",
    href: "/resources",
    color: "bg-purple-500/10 text-purple-600",
  },
  {
    icon: Shield,
    title: "Insurance Information",
    description: "Learn which insurance plans cover treatment and how to verify your benefits.",
    href: "/insurance",
    color: "bg-amber-500/10 text-amber-600",
  },
];

// Custom success component for landing page
function LandingSuccessView({ firstName }: { firstName: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 flex flex-col">
      <Helmet>
        <title>Thank You | RehabLookup</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      
      {/* Minimal header */}
      <header className="py-6 px-4">
        <div className="max-w-3xl mx-auto">
          <Link to="/">
            <img src={logoImage} alt="RehabLookup" className="h-10" />
          </Link>
        </div>
      </header>
      
      <main className="flex-1 px-4 py-8 md:py-12">
        <div className="max-w-3xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              Thank You{firstName ? `, ${firstName}` : ""}!
            </h1>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              Your request has been received. A treatment specialist will reach out within 24 hours using your preferred contact method.
            </p>
          </div>
          
          {/* What Happens Next */}
          <div className="bg-card border border-border rounded-2xl p-6 md:p-8 mb-10 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-100">
            <div className="flex items-center gap-2 mb-5">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-lg text-foreground">What happens next?</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary">1</span>
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">Review</p>
                  <p className="text-xs text-muted-foreground mt-0.5">A verified specialist reviews your information</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary">2</span>
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">Contact</p>
                  <p className="text-xs text-muted-foreground mt-0.5">They reach out using your preferred method</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary">3</span>
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">Connect</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Discuss options and next steps together</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Emergency Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
            <div className="flex items-center justify-center gap-2 text-amber-800">
              <Phone className="w-4 h-4 shrink-0" />
              <span className="text-sm font-medium">
                If this is an emergency, please call 911 or SAMHSA: 1-800-662-4357
              </span>
            </div>
          </div>
          
          {/* Recommended Content */}
          <div className="animate-in fade-in slide-in-from-bottom-5 duration-500 delay-200">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Explore While You Wait
              </h2>
              <p className="text-muted-foreground text-sm">
                Learn more about treatment options and recovery resources
              </p>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              {RECOMMENDED_CONTENT.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className="group flex items-start gap-4 p-5 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-md transition-all duration-200"
                >
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${item.color}`}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">
                        {item.title}
                      </h3>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {item.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
          
          {/* Return Home CTA */}
          <div className="text-center mt-10 animate-in fade-in slide-in-from-bottom-6 duration-500 delay-300">
            <Link to="/">
              <Button variant="outline" size="lg" className="gap-2">
                Return to Home
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </main>
      
      {/* Minimal footer */}
      <footer className="py-6 px-4 border-t border-border/50 mt-auto">
        <div className="max-w-3xl mx-auto text-center text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} RehabLookup. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
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
  
  // Custom success renderer that scrolls to top and shows landing-specific success
  const renderSuccess = ({ firstName }: { firstName: string }) => {
    // Scroll to top when showing success
    scrollToTopInstant();
    return <LandingSuccessView firstName={firstName} />;
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 flex flex-col">
      <Helmet>
        <title>Find Treatment Options | RehabLookup</title>
        <meta name="description" content="Get help exploring treatment options today. Share a few details and we'll help connect you with appropriate treatment options — no obligation." />
        <meta name="robots" content="noindex, nofollow" />
        {/* No canonical: this is a noindex paid-ad landing surface mounted at
            /ads/:slug; pointing to a generic /lp/ad URL was misleading. */}
      </Helmet>
      
      {/* Minimal header with logo only */}
      <header className="py-6 px-4">
        <div className="max-w-2xl mx-auto">
          <img src={logoImage} alt="RehabLookup" className="h-10" />
        </div>
      </header>
      
      <main className="flex-1 px-4 py-6 md:py-10">
        <div className="max-w-2xl mx-auto space-y-8">
          
          {/* Hero Section — kept tight + form-focused (conversion-LP
              pattern). Tightened typography one tier so it doesn't
              dominate the form below. */}
          <section className="text-center space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-foreground tracking-tight leading-tight">
              Find treatment options that fit your needs
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto">
              Share a few details and we'll help connect you with appropriate treatment options — no obligation.
            </p>
          </section>
          
          {/* Video Section — only renders when VIDEO_CONFIG.videoId is set. */}
          {VIDEO_CONFIG.videoId && (
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
          )}
          
          {/* Lead Intake Form with custom success */}
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
            <LeadIntakeForm renderSuccess={renderSuccess} />
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
                    Our placement service is completely free with no obligation.
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
