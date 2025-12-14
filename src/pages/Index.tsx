import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SearchForm } from "@/components/search/SearchForm";
import { TreatmentCenterCard } from "@/components/cards/TreatmentCenterCard";
import { Button } from "@/components/ui/button";
import { treatmentCenters } from "@/data/treatmentCenters";
import { 
  Shield, 
  Phone, 
  CheckCircle, 
  Users, 
  Heart, 
  Clock,
  ArrowRight,
  Star
} from "lucide-react";

const trustBadges = [
  { icon: Shield, label: "Verified Centers" },
  { icon: CheckCircle, label: "Insurance Accepted" },
  { icon: Clock, label: "24/7 Support" },
  { icon: Users, label: "10,000+ Helped" },
];

const Index = () => {
  const featuredCenters = treatmentCenters.filter((c) => c.featured).slice(0, 3);

  return (
    <Layout>
      {/* Hero Section - Light Background */}
      <section className="relative flex min-h-[calc(100vh-5rem)] max-h-[calc(100vh-5rem)] overflow-hidden bg-card">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.02]">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%231F4FD8' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        {/* Content Container */}
        <div className="container relative flex flex-1 flex-col justify-center py-6 md:py-8">
          <div className="mx-auto w-full max-w-5xl text-center">
            {/* Trust Badge */}
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 animate-fade-in">
              <Star className="h-3.5 w-3.5 fill-primary text-primary" />
              <span className="text-xs font-semibold text-primary">
                Trusted by families nationwide
              </span>
            </div>

            {/* Headline - Dark text */}
            <h1 className="mb-3 font-display text-2xl font-bold leading-tight text-foreground sm:text-3xl md:text-4xl lg:text-5xl animate-fade-in" style={{ animationDelay: "50ms" }}>
              Find Trusted Addiction Treatment Centers
            </h1>

            {/* Subheadline - Muted text */}
            <p className="mb-6 text-sm text-muted-foreground sm:text-base md:text-lg animate-fade-in" style={{ animationDelay: "100ms" }}>
              Compare verified rehab programs and take the first step toward recovery.
            </p>

            {/* Search Form */}
            <div className="mb-6 animate-fade-in" style={{ animationDelay: "150ms" }}>
              <SearchForm variant="compact-hero" />
            </div>

            {/* CTAs */}
            <div className="mb-6 flex flex-col items-center justify-center gap-3 sm:flex-row animate-fade-in" style={{ animationDelay: "200ms" }}>
              <a href="tel:1-800-555-0199" className="group">
                <Button variant="hero-secondary" size="default" className="gap-2 text-sm">
                  <Phone className="h-4 w-4" />
                  Call Now: 1-800-555-0199
                </Button>
              </a>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 animate-fade-in md:gap-x-6" style={{ animationDelay: "250ms" }}>
              {trustBadges.map((badge) => (
                <div key={badge.label} className="flex items-center gap-1.5 text-muted-foreground">
                  <badge.icon className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-medium">{badge.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Centers */}
      <section className="py-16 md:py-20">
        <div className="container">
          <div className="mb-10 text-center">
            <h2 className="mb-3 font-display text-2xl font-bold text-foreground md:text-3xl">
              Featured Treatment Centers
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Hand-selected facilities known for exceptional care and verified outcomes.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featuredCenters.map((center) => (
              <TreatmentCenterCard key={center.id} center={center} featured />
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link to="/rehab-centers">
              <Button variant="outline" size="lg" className="gap-2">
                View All Centers
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-y border-border bg-secondary/50 py-16 md:py-20">
        <div className="container">
          <div className="mb-10 text-center">
            <h2 className="mb-3 font-display text-2xl font-bold text-foreground md:text-3xl">
              How It Works
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Finding the right treatment center is simple and confidential.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Search & Compare",
                description: "Enter your location and preferences to find verified treatment centers.",
                icon: "🔍",
              },
              {
                step: "02",
                title: "Review Options",
                description: "Compare programs, treatment types, and insurance acceptance.",
                icon: "📋",
              },
              {
                step: "03",
                title: "Connect & Start",
                description: "Contact centers directly or request more information.",
                icon: "📞",
              },
            ].map((item, index) => (
              <div
                key={item.step}
                className="relative rounded-xl border border-border bg-card p-6 shadow-card"
              >
                <div className="absolute -top-3 left-5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {index + 1}
                </div>
                <div className="mb-3 text-3xl">{item.icon}</div>
                <h3 className="mb-2 font-display text-lg font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 md:py-20">
        <div className="container">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <h2 className="mb-5 font-display text-2xl font-bold text-foreground md:text-3xl">
                Why Families Trust RehabLookup
              </h2>
              <p className="mb-6 text-muted-foreground">
                We provide transparent, accurate information to help families 
                find the right care—without pressure or hidden fees.
              </p>

              <ul className="space-y-3">
                {[
                  "Every facility is verified for licensing and accreditation",
                  "Transparent information about treatment programs",
                  "No hidden fees or surprise referral practices",
                  "Confidential and secure communication",
                  "Support available 24/7 for urgent situations",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <span className="text-sm text-foreground">{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                <Link to="/about">
                  <Button variant="secondary" size="default" className="gap-2">
                    Learn More About Us
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="aspect-square rounded-xl border border-border bg-card p-8 shadow-card">
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <Heart className="mb-4 h-14 w-14 text-primary" />
                  <div className="mb-2 font-display text-4xl font-bold text-primary">10,000+</div>
                  <p className="text-muted-foreground">
                    Families helped find treatment
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="border-t border-border bg-primary py-12 md:py-16">
        <div className="container text-center">
          <h2 className="mb-3 font-display text-2xl font-bold text-primary-foreground md:text-3xl">
            Ready to Take the First Step?
          </h2>
          <p className="mb-6 text-primary-foreground/85">
            Recovery is possible. Find the right treatment center today.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/rehab-centers">
              <Button variant="hero-light" size="lg" className="gap-2">
                Find Rehab Now
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="tel:1-800-555-0199">
              <Button variant="hero-secondary" size="lg" className="gap-2 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                <Phone className="h-4 w-4" />
                Call 1-800-555-0199
              </Button>
            </a>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
