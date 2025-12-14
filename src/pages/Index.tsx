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
      {/* Hero Section */}
      <section className="relative overflow-hidden gradient-hero">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        <div className="container relative py-20 md:py-28 lg:py-36">
          <div className="mx-auto max-w-4xl text-center">
            {/* Trust Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-4 py-2 backdrop-blur-sm animate-fade-in">
              <Star className="h-4 w-4 fill-primary-foreground text-primary-foreground" />
              <span className="text-sm font-medium text-primary-foreground">
                Trusted by families nationwide
              </span>
            </div>

            {/* Headline */}
            <h1 className="mb-6 font-display text-4xl font-bold leading-tight text-primary-foreground md:text-5xl lg:text-6xl animate-fade-in" style={{ animationDelay: "100ms" }}>
              Find Trusted Addiction Treatment Centers Near You
            </h1>

            {/* Subheadline */}
            <p className="mb-10 text-lg text-primary-foreground/85 md:text-xl animate-fade-in" style={{ animationDelay: "200ms" }}>
              Compare verified rehab programs, treatment options, and insurance acceptance. 
              Take the first step toward recovery today.
            </p>

            {/* CTA Buttons */}
            <div className="mb-12 flex flex-col items-center justify-center gap-4 sm:flex-row animate-fade-in" style={{ animationDelay: "300ms" }}>
              <Link to="/rehab-centers">
                <Button variant="hero" size="xl" className="gap-2">
                  Find Rehab Now
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <a href="tel:1-800-555-0199">
                <Button variant="hero-secondary" size="xl" className="gap-2">
                  <Phone className="h-5 w-5" />
                  Get Help Now
                </Button>
              </a>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-6 animate-fade-in" style={{ animationDelay: "400ms" }}>
              {trustBadges.map((badge) => (
                <div key={badge.label} className="flex items-center gap-2 text-primary-foreground/80">
                  <badge.icon className="h-5 w-5" />
                  <span className="text-sm font-medium">{badge.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Search Section */}
      <section className="relative -mt-12 z-10 px-4 md:px-0">
        <div className="container">
          <div className="mx-auto max-w-5xl animate-fade-in-up" style={{ animationDelay: "500ms" }}>
            <SearchForm variant="hero" />
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
