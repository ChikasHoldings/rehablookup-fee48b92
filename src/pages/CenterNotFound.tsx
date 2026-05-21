import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ReportIssueDialog } from "@/components/feedback/ReportIssueDialog";
import {
  Building2,
  Search,
  MapPin,
  ArrowLeft,
  HeartHandshake,
  Phone,
  Compass,
  ShieldCheck,
  Flag,
} from "lucide-react";

interface CenterNotFoundProps {
  /**
   * Optional — the slug the user attempted to view. Shown in the message so
   * they understand WHY they landed here (helps with trust + recovery).
   */
  attemptedSlug?: string;
  /**
   * Reason for the miss. Drives the headline copy.
   *  - "missing"  : slug had no matching record
   *  - "inactive" : record exists but isn't publicly approved
   *  - "invalid"  : slug failed format validation
   */
  reason?: "missing" | "inactive" | "invalid";
}

/**
 * Dedicated "Center Not Found" page.
 *
 * Replaces the previous silent redirect to /rehab-centers when a /center/:slug
 * URL doesn't resolve. Goals:
 *   - Tell the user clearly that THIS specific page is unavailable.
 *   - Give them an immediate retry path: a search box that submits to
 *     /search-results so they don't have to backtrack.
 *   - Surface the most common recovery actions (browse directory,
 *     concierge, popular treatment categories) so the visit is not wasted.
 *   - Stay out of Google's index (noindex) so this page doesn't compete
 *     with real listings.
 */
const CenterNotFound = ({ attemptedSlug, reason = "missing" }: CenterNotFoundProps) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState(
    attemptedSlug ? attemptedSlug.replace(/-/g, " ") : "",
  );
  const [reportOpen, setReportOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      navigate("/rehab-centers");
      return;
    }
    // Reuse the existing search-results page; it accepts a free-text
    // location/name query via the `location` param.
    navigate(`/search-results?location=${encodeURIComponent(trimmed)}`);
  };

  // Softened copy: prior version claimed "no longer active" for any miss,
  // which was inaccurate — the most common miss is a misspelled or moved
  // URL, not a deactivated facility. Keep the headline factual + neutral.
  const headline =
    reason === "invalid"
      ? "That link doesn't look right"
      : "We couldn't find this center";

  const subline =
    reason === "invalid"
      ? "The URL appears to be malformed. Try searching by city, state, or facility name."
      : "The page you're looking for may have moved, or the slug is incorrect. Browse similar centers nearby:";

  const popularCategories = [
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
        title="Treatment Center Not Found - RehabLookup"
        description="The treatment center you're looking for is unavailable. Search RehabLookup's verified directory of rehab centers by city, state, or name."
        noindex={true}
      />
      <div className="min-h-[calc(100vh-200px)] bg-gradient-to-b from-primary/5 via-background to-muted/30 py-8 px-4 md:py-12">
        <div className="max-w-4xl mx-auto">
          {/* Recovery surface — kept light + helpful tone (NOT a dark
              directory hero). Tightened headline + padding so the
              404 feels actionable rather than dramatic. */}
          <div className="text-center mb-8">
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground animate-fade-in">
              <Building2 className="h-3 w-3" />
              Page Not Found
            </div>

            <h1 className="mb-3 font-display text-2xl md:text-3xl lg:text-4xl font-bold text-foreground animate-fade-in">
              {headline}
            </h1>
            <p className="mx-auto mb-2 max-w-xl text-muted-foreground leading-relaxed">
              {subline}
            </p>
            {attemptedSlug && (
              <p className="mb-6 text-xs text-muted-foreground/80">
                Requested:{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                  /center/{attemptedSlug}
                </code>
              </p>
            )}

            {/* Search-and-retry */}
            <Card className="max-w-xl mx-auto mt-6 mb-6 shadow-lg border-border/50">
              <CardContent className="p-4">
                <form onSubmit={handleSearch} className="flex gap-2">
                  <div className="relative flex-1">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search by city, state, or facility name..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="pl-9"
                      aria-label="Search rehab centers"
                      autoFocus
                    />
                  </div>
                  <Button type="submit" className="gap-2">
                    <Search className="h-4 w-4" />
                    <span className="hidden sm:inline">Search</span>
                  </Button>
                </form>
                <p className="mt-2 text-xs text-muted-foreground text-left">
                  Tip: try a city, state, or part of the center's name.
                </p>
              </CardContent>
            </Card>

            {/* Primary actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4">
              <Link to="/rehab-centers">
                <Button size="lg" className="gap-2 w-full sm:w-auto shadow-md">
                  <Compass className="h-4 w-4" />
                  Browse All Centers
                </Button>
              </Link>
              <Link to="/concierge">
                <Button
                  variant="outline"
                  size="lg"
                  className="gap-2 w-full sm:w-auto border-primary/30 hover:bg-primary/5"
                >
                  <HeartHandshake className="h-4 w-4" />
                  Talk to a Placement Advisor
                </Button>
              </Link>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
              <button
                onClick={() => window.history.back()}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <ArrowLeft className="h-3 w-3" />
                Go back to previous page
              </button>
              <span className="hidden sm:inline text-muted-foreground/40">•</span>
              <button
                type="button"
                onClick={() => setReportOpen(true)}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <Flag className="h-3 w-3" />
                Report this issue
              </button>
            </div>
          </div>

          {/* Recovery options */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="shadow-card border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="h-5 w-5 text-primary" />
                  <h2 className="font-display font-semibold text-lg">
                    Popular Treatment Categories
                  </h2>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {popularCategories.map((link) => (
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

            <Card className="shadow-card border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <h2 className="font-display font-semibold text-lg">
                    Why you might be here
                  </h2>
                </div>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>The URL has a typo or the slug is incorrect.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>The facility recently updated its profile URL.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>The link you followed may be outdated.</span>
                  </li>
                </ul>
                <p className="mt-4 text-xs text-muted-foreground">
                  Our concierge team can match you with a verified treatment
                  center — usually within 24 hours.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Concierge CTA */}
          <div className="mt-10 text-center p-6 rounded-xl bg-primary/5 border border-primary/10">
            <p className="text-sm text-muted-foreground mb-2">
              Need immediate help?
            </p>
            <p className="font-display font-semibold text-foreground mb-3">
              Our placement advisors are available 24/7 to connect you with the
              right treatment center.
            </p>
            <Link to="/concierge">
              <Button variant="default" className="gap-2">
                <Phone className="h-4 w-4" />
                Find Treatment Now
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <ReportIssueDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        context="center-not-found"
        attemptedSlug={attemptedSlug ?? null}
      />
    </Layout>
  );
};

export default CenterNotFound;
