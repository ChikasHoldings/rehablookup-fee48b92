import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SearchForm } from "@/components/search/SearchForm";
import { TreatmentCenterCard } from "@/components/cards/TreatmentCenterCard";
import { Button } from "@/components/ui/button";
import { treatmentCenters } from "@/data/treatmentCenters";
import heroBg from "@/assets/hero-bg.jpg";
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
      {/* Hero Section - Viewport Height */}
      <section className="relative flex min-h-[calc(100vh-5rem)] max-h-[calc(100vh-5rem)] overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img 
            src={heroBg} 
            alt="" 
            className="h-full w-full object-cover"
          />
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/80 to-accent/70" />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/40 via-transparent to-primary/20" />
        </div>

        {/* Content Container */}
        <div className="container relative flex flex-1 flex-col justify-center py-6 md:py-8">
          <div className="mx-auto w-full max-w-5xl text-center">
            {/* Trust Badge - Compact */}
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1.5 backdrop-blur-md animate-fade-in">
              <Star className="h-3.5 w-3.5 fill-primary-foreground text-primary-foreground" />
              <span className="text-xs font-semibold text-primary-foreground">
                Trusted by families nationwide
              </span>
            </div>

            {/* Headline - Compact */}
            <h1 className="mb-3 font-display text-2xl font-bold leading-tight text-primary-foreground drop-shadow-lg sm:text-3xl md:text-4xl lg:text-5xl animate-fade-in" style={{ animationDelay: "50ms" }}>
              Find Trusted Addiction Treatment Centers
            </h1>

            {/* Subheadline - Single line */}
            <p className="mb-6 text-sm text-primary-foreground/90 sm:text-base md:text-lg animate-fade-in" style={{ animationDelay: "100ms" }}>
              Compare verified rehab programs and take the first step toward recovery.
            </p>

            {/* Search Form - Compact Inline */}
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

            {/* Trust Badges - Compact Row */}
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 animate-fade-in md:gap-x-6" style={{ animationDelay: "250ms" }}>
              {trustBadges.map((badge) => (
                <div key={badge.label} className="flex items-center gap-1.5 text-primary-foreground/85">
                  <badge.icon className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">{badge.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Centers */}
      <section className="py-20 md:py-28">
        <div className="container">
          <div className="mb-12 text-center">
            <h2 className="mb-4 font-display text-3xl font-bold text-foreground md:text-4xl">
              Featured Treatment Centers
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Hand-selected facilities known for exceptional care, verified outcomes, and compassionate treatment.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featuredCenters.map((center) => (
              <TreatmentCenterCard key={center.id} center={center} featured />
            ))}
          </div>

          <div className="mt-10 text-center">
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
      <section className="bg-secondary/50 py-20 md:py-28">
        <div className="container">
          <div className="mb-12 text-center">
            <h2 className="mb-4 font-display text-3xl font-bold text-foreground md:text-4xl">
              How It Works
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Finding the right treatment center is simple and confidential.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Search & Compare",
                description: "Enter your location and preferences to find verified treatment centers that match your needs.",
                icon: "🔍",
              },
              {
                step: "02",
                title: "Review Options",
                description: "Compare programs, treatment types, insurance acceptance, and facility amenities.",
                icon: "📋",
              },
              {
                step: "03",
                title: "Connect & Start",
                description: "Contact centers directly or request more information. Help is just a call away.",
                icon: "📞",
              },
            ].map((item, index) => (
              <div
                key={item.step}
                className="relative rounded-xl bg-card p-8 shadow-card transition-all hover:shadow-lg"
              >
                <div className="absolute -top-4 left-6 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {index + 1}
                </div>
                <div className="mb-4 text-4xl">{item.icon}</div>
                <h3 className="mb-2 font-display text-xl font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 md:py-28">
        <div className="container">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="mb-6 font-display text-3xl font-bold text-foreground md:text-4xl">
                Why Families Trust RehabLookup
              </h2>
              <p className="mb-8 text-lg text-muted-foreground">
                We understand that finding addiction treatment is a critical decision. 
                Our mission is to provide transparent, accurate information to help families 
                find the right care.
              </p>

              <ul className="space-y-4">
                {[
                  "Every facility is verified for licensing and accreditation",
                  "Transparent information about treatment programs and costs",
                  "No hidden fees or surprise referral practices",
                  "Confidential and secure communication",
                  "Support available 24/7 for urgent situations",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                    <span className="text-foreground">{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <Link to="/about">
                  <Button variant="secondary" size="lg" className="gap-2">
                    Learn More About Us
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 p-8">
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <Heart className="mb-4 h-16 w-16 text-primary" />
                  <div className="mb-2 font-display text-5xl font-bold text-primary">10,000+</div>
                  <p className="text-lg text-muted-foreground">
                    Families helped find treatment
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="gradient-hero py-16 md:py-20">
        <div className="container text-center">
          <h2 className="mb-4 font-display text-3xl font-bold text-primary-foreground md:text-4xl">
            Ready to Take the First Step?
          </h2>
          <p className="mb-8 text-lg text-primary-foreground/85">
            Recovery is possible. Find the right treatment center today.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link to="/rehab-centers">
              <Button variant="hero" size="xl" className="gap-2">
                Find Rehab Now
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <a href="tel:1-800-555-0199">
              <Button variant="hero-secondary" size="xl" className="gap-2">
                <Phone className="h-5 w-5" />
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
