/**
 * Provider Onboarding picker
 * ──────────────────────────
 * Two-card picker shown after /auth/signup completes. Lets the new provider
 * choose between listing a brand-new facility or claiming an existing
 * (SAMHSA-imported / unverified) listing.
 *
 * Auth gate: if the visitor isn't signed in, kick them to /login?type=provider
 * (preserving `?returnTo` if present). Already-registered providers landing
 * here while signed out are sent to login — not signup — to keep entry
 * paths consistent with the rest of the provider panel.
 *
 * "Claim an existing listing" routes to the public rehab-centers search
 * page with ?intent=claim — that mode highlights the "Claim This Listing"
 * CTA on each facility profile and skips seeker conversion prompts.
 */

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Building2, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function ProviderOnboarding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (!session?.user) {
        const returnTo = searchParams.get("returnTo") ?? "/provider/onboarding";
        const search = new URLSearchParams({ type: "provider", returnTo }).toString();
        navigate(`/login?${search}`, { replace: true });
        return;
      }
      setChecking(false);
    });
    return () => {
      cancelled = true;
    };
  }, [navigate, searchParams]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Get started — RehabLookup for providers</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <Header />
      <main className="container mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-14 max-w-4xl">
        <header className="text-center mb-8 md:mb-10">
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
            How would you like to get started?
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-2 max-w-xl mx-auto">
            Pick the path that matches your facility. You can always add more
            listings later from your dashboard.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-6 md:p-7 flex flex-col gap-4 hover:border-primary/40 transition-colors">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" aria-hidden />
            </div>
            <div className="space-y-1.5">
              <h2 className="font-semibold text-lg">List a new facility</h2>
              <p className="text-sm text-muted-foreground">
                Add a treatment center that isn't already on RehabLookup. You'll
                supply the facility details, services, and any photos you want
                to publish.
              </p>
            </div>
            <Button
              className="mt-auto w-full gap-2"
              onClick={() => navigate("/provider/onboarding/new-listing")}
            >
              List a new facility
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </Card>

          <Card className="p-6 md:p-7 flex flex-col gap-4 hover:border-primary/40 transition-colors">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-emerald-600" aria-hidden />
            </div>
            <div className="space-y-1.5">
              <h2 className="font-semibold text-lg">Claim an existing listing</h2>
              <p className="text-sm text-muted-foreground">
                Take ownership of a listing that was created from public SAMHSA
                records. Verify your role, then enrich the listing in one flow.
              </p>
            </div>
            <Button
              variant="secondary"
              className="mt-auto w-full gap-2"
              onClick={() => navigate("/rehab-centers?intent=claim")}
            >
              Find my facility
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
            <p className="text-xs text-muted-foreground">
              Tip: search by your facility name or city, then click
              <span className="font-medium text-foreground"> &ldquo;Claim This Listing&rdquo; </span>
              on its profile.
            </p>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  );
}
