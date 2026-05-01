import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { analytics } from "@/lib/analytics";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Home, 
  Search, 
  ArrowLeft, 
  MapPin, 
  Phone, 
  FileText, 
  Building2, 
  HeartHandshake,
  HelpCircle,
  Shield
} from "lucide-react";

// Mirror the canonical filter values accepted by /search-results
// (see src/pages/SearchResults.tsx — `treatment` and `insurance` query params).
const TREATMENT_OPTIONS = [
  { value: "detox", label: "Detox" },
  { value: "inpatient", label: "Inpatient" },
  { value: "outpatient", label: "Outpatient" },
  { value: "dual-diagnosis", label: "Dual Diagnosis" },
  { value: "holistic", label: "Holistic" },
] as const;

const INSURANCE_OPTIONS = [
  { value: "aetna", label: "Aetna" },
  { value: "bcbs", label: "Blue Cross Blue Shield" },
  { value: "cigna", label: "Cigna" },
  { value: "united", label: "United Healthcare" },
  { value: "kaiser", label: "Kaiser Permanente" },
  { value: "humana", label: "Humana" },
  { value: "anthem", label: "Anthem" },
  { value: "medicare", label: "Medicare" },
  { value: "medicaid", label: "Medicaid" },
  { value: "tricare", label: "TRICARE" },
  { value: "private-pay", label: "Self-Pay / Private Pay" },
] as const;

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [treatment, setTreatment] = useState("");
  const [insurance, setInsurance] = useState("");
  const reportedRef = useRef<string | null>(null);

  useEffect(() => {
    // Strict-Mode guard: only report each unique pathname once per mount.
    if (reportedRef.current === location.pathname) return;
    reportedRef.current = location.pathname;

    if (import.meta.env.DEV) {
      console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    }

    // Best-effort: pull the current user id (may be null for anon traffic)
    // and forward path + referrer + viewport + extra request context to GA
    // and the backend log.
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const fullUrl = typeof window !== "undefined" ? window.location.href : "";
    // Browser SPA navigation is always a GET. We still capture it explicitly
    // so future server-side / edge logging can populate non-GET methods.
    const httpMethod = "GET";

    const buildPayload = (userId: string | null) => ({
      path: location.pathname,
      search: location.search,
      referrer: typeof document !== "undefined" ? document.referrer : "",
      viewport:
        typeof window !== "undefined"
          ? `${window.innerWidth}x${window.innerHeight}`
          : undefined,
      userId,
      sessionId:
        typeof window !== "undefined"
          ? window.sessionStorage?.getItem("rl_session_id") ?? null
          : null,
      httpMethod,
      hash,
      fullUrl,
    });

    let cancelled = false;
    supabase.auth.getUser()
      .then(({ data }) => {
        if (cancelled) return;
        analytics.pageNotFound(buildPayload(data.user?.id ?? null));
      })
      .catch(() => {
        if (cancelled) return;
        analytics.pageNotFound(buildPayload(null));
      });
    return () => {
      cancelled = true;
    };
  }, [location.pathname, location.search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    const trimmed = searchQuery.trim();
    if (trimmed) params.set("location", trimmed);
    if (treatment) params.set("treatment", treatment);
    if (insurance) params.set("insurance", insurance);
    // Require at least one signal so we never send users to an empty results page.
    if ([...params.keys()].length === 0) return;
    navigate(`/search-results?${params.toString()}`);
  };

  const popularLinks = [
    { label: "Find Rehab Centers", href: "/rehab-centers", icon: Building2 },
    { label: "Concierge Service", href: "/concierge", icon: HeartHandshake },
    { label: "How It Works", href: "/how-it-works", icon: HelpCircle },
    { label: "Insurance Coverage", href: "/insurance", icon: Shield },
  ];

  const treatmentTypes = [
    { label: "Drug Rehab Near Me", href: "/drug-rehab-near-me" },
    { label: "Alcohol Rehab Near Me", href: "/alcohol-rehab-near-me" },
    { label: "Detox Centers", href: "/detox-near-me" },
    { label: "Inpatient Treatment", href: "/inpatient-rehab-near-me" },
    { label: "Outpatient Programs", href: "/outpatient-near-me" },
    { label: "Dual Diagnosis", href: "/dual-diagnosis-near-me" },
  ];

  return (
    <Layout>
      <SEO
        title="Page Not Found - RehabLookup"
        description="The page you're looking for doesn't exist. Find addiction treatment centers and get help at RehabLookup."
        noindex={true}
      />
      <div className="min-h-[calc(100vh-200px)] bg-gradient-to-b from-primary/5 via-background to-muted/30 py-12 px-4 md:py-20">
        <div className="max-w-4xl mx-auto">
          {/* Main 404 Section */}
          <div className="text-center mb-12">
            {/* 404 Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-destructive/10 px-4 py-2 animate-fade-in">
              <MapPin className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium text-destructive">Page Not Found</span>
            </div>
            
            {/* Large 404 with gradient */}
            <h1 className="mb-4 font-display text-8xl font-bold bg-gradient-to-br from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent md:text-9xl animate-fade-in">
              404
            </h1>
            
            {/* Message */}
            <p className="mb-3 text-xl font-semibold text-foreground md:text-2xl">
              Oops! This page doesn't exist
            </p>
            <p className="mb-8 text-muted-foreground leading-relaxed max-w-md mx-auto">
              The page you're looking for may have been moved or no longer exists. 
              Let us help you find the treatment resources you need.
            </p>

            {/* Search Box */}
            <Card className="max-w-lg mx-auto mb-8 shadow-lg border-border/50">
              <CardContent className="p-4">
                <form onSubmit={handleSearch} className="flex gap-2">
                  <div className="relative flex-1">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search by city, state, or zip code..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Button type="submit" className="gap-2">
                    <Search className="h-4 w-4" />
                    <span className="hidden sm:inline">Search</span>
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Primary Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
              <Link to="/" className="w-full sm:w-auto">
                <Button size="lg" className="gap-2 w-full sm:w-auto shadow-md">
                  <Home className="h-4 w-4" />
                  Go Home
                </Button>
              </Link>
              <Link to="/rehab-centers" className="w-full sm:w-auto">
                <Button variant="secondary" size="lg" className="gap-2 w-full sm:w-auto shadow-md">
                  <Building2 className="h-4 w-4" />
                  Browse Rehab Centers
                </Button>
              </Link>
              <Link to="/concierge" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="gap-2 w-full sm:w-auto border-primary/30 hover:bg-primary/5">
                  <Phone className="h-4 w-4" />
                  Find Treatment
                </Button>
              </Link>
            </div>

            {/* Back Link */}
            <button 
              onClick={() => window.history.back()}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              Go back to previous page
            </button>
          </div>

          {/* Helpful Links Section */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Popular Pages */}
            <Card className="shadow-card border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="h-5 w-5 text-primary" />
                  <h2 className="font-display font-semibold text-lg">Popular Pages</h2>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {popularLinks.map((link) => (
                    <Link
                      key={link.href}
                      to={link.href}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                    >
                      <link.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                        {link.label}
                      </span>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Treatment Types */}
            <Card className="shadow-card border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="h-5 w-5 text-primary" />
                  <h2 className="font-display font-semibold text-lg">Find Treatment</h2>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {treatmentTypes.map((link) => (
                    <Link
                      key={link.href}
                      to={link.href}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                    >
                      <MapPin className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                        {link.label}
                      </span>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Emergency CTA */}
          <div className="mt-10 text-center p-6 rounded-xl bg-primary/5 border border-primary/10">
            <p className="text-sm text-muted-foreground mb-2">Need immediate help?</p>
            <p className="font-display font-semibold text-foreground mb-3">
              Our support team is available 24/7 to connect you with treatment
            </p>
            <Link to="/concierge">
              <Button variant="default" className="gap-2">
                <Phone className="h-4 w-4" />
                Find Treatment
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default NotFound;