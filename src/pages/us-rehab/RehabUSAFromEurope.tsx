import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ArrowRight, CheckCircle, MapPin, Shield, Clock, Globe, Users, Star, Phone, ChevronRight, Plane, FileText, Heart } from "lucide-react";

export default function RehabUSAFromEurope() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <SEO
        title="Rehab in USA for Europeans | Addiction Treatment from Europe"
        description="European residents seeking world-class addiction treatment in the United States. English-speaking programs, visa guidance, and personalized care coordination."
        canonical="/us-rehab/european-patients"
        keywords={["rehab in USA from Europe", "European addiction treatment USA", "drug rehab USA from Germany", "alcohol rehab USA from France", "private rehab America Europeans"]}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "MedicalWebPage",
          name: "US Rehab for European Patients",
          description: "Guide for Europeans seeking addiction treatment in the United States",
          audience: { "@type": "MedicalAudience", audienceType: "Patient", geographicArea: { "@type": "Continent", name: "Europe" } },
        }}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "US Treatment", url: "/us-rehab" },
          { name: "European Patients", url: "/us-rehab/european-patients" },
        ]}
      />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative bg-primary py-16 md:py-24 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-foreground/5 via-transparent to-transparent" />
          <div className="container relative z-10 max-w-4xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 bg-primary-foreground/10 border border-primary-foreground/20 rounded-full px-4 py-1.5 mb-6">
              <Globe className="h-4 w-4 text-primary-foreground/80" />
              <span className="text-sm font-medium text-primary-foreground/90">🇪🇺 For European Residents</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-display font-bold text-primary-foreground leading-tight mb-6">
              Premium Addiction Treatment in the USA — For European Patients
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto mb-10">
              Access America's leading rehab facilities with full English-language support, ESTA/visa guidance, and personalized care coordination from our international team.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/international/apply">
                <Button size="lg" variant="secondary" className="gap-2 text-base font-semibold px-8 h-13 shadow-lg">
                  Apply for Treatment
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/concierge">
                <Button size="lg" variant="outline" className="gap-2 text-base border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 h-13">
                  <Phone className="h-4 w-4" />
                  Speak to an Advisor
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Why Europeans Choose US Rehab */}
        <section className="py-12 md:py-20">
          <div className="container max-w-4xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-8 text-center">
              Why Europeans Choose American Rehab
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {[
                { icon: Star, title: "Innovation & Excellence", desc: "American rehab facilities lead the world in evidence-based treatments, including NAD+ therapy, EMDR, neurofeedback, and precision medicine approaches." },
                { icon: Shield, title: "Complete Privacy", desc: "Treatment thousands of miles from home provides absolute discretion — essential for professionals, executives, and public figures in Europe." },
                { icon: Clock, title: "Immediate Admission", desc: "No NHS-style waiting lists. Many US facilities can admit within 24-48 hours, with medical detox available on-site." },
                { icon: MapPin, title: "Healing Environments", desc: "From Malibu oceanfront to Sedona deserts to Miami luxury — therapeutic settings that accelerate recovery in ways European clinics rarely match." },
              ].map((item) => (
                <div key={item.title} className="bg-card rounded-xl border border-border p-6 hover:border-primary/30 hover:shadow-md transition-all">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Countries Served */}
        <section className="py-12 md:py-16 bg-muted/30 border-y border-border">
          <div className="container max-w-4xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground text-center mb-8">
              We Help Patients From Across Europe
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {[
                "🇬🇧 United Kingdom", "🇩🇪 Germany", "🇫🇷 France", "🇳🇱 Netherlands",
                "🇨🇭 Switzerland", "🇸🇪 Sweden", "🇳🇴 Norway", "🇩🇰 Denmark",
                "🇮🇪 Ireland", "🇪🇸 Spain", "🇮🇹 Italy", "🇧🇪 Belgium",
              ].map((country) => (
                <div key={country} className="bg-card rounded-lg border border-border px-4 py-3 text-sm font-medium text-foreground text-center">
                  {country}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Practical Info */}
        <section className="py-12 md:py-20">
          <div className="container max-w-4xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-8">
              Practical Information for European Patients
            </h2>
            <div className="space-y-6">
              {[
                { icon: Plane, title: "ESTA & Visa Requirements", content: "Citizens of Visa Waiver Program countries (UK, Germany, France, most EU nations) can enter the US on an ESTA for medical treatment stays up to 90 days. For longer programs, a B-2 medical visa may be required. Our team guides you through the process." },
                { icon: FileText, title: "Payment & Insurance", content: "European health insurance typically does not cover US treatment. Most patients self-pay or use private international health insurance. We provide transparent pricing and can arrange payment plans with facilities. Costs range from $15,000-$80,000 for 30-day programs." },
                { icon: Heart, title: "Aftercare & Continuity", content: "We coordinate your return with local therapists and support groups in your home country. Many US facilities offer virtual aftercare sessions to maintain continuity of care across time zones." },
              ].map((item) => (
                <div key={item.title} className="flex gap-4 p-6 rounded-xl border border-border bg-card">
                  <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                    <item.icon className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 md:py-24 bg-primary relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-primary-foreground/5 via-transparent to-transparent" />
          <div className="container relative z-10 max-w-3xl mx-auto px-4 text-center">
            <h2 className="text-2xl md:text-4xl font-display font-bold text-primary-foreground mb-4">
              Start Your Recovery Journey
            </h2>
            <p className="text-lg text-primary-foreground/80 mb-10 max-w-xl mx-auto">
              Our international team understands the unique needs of European patients. Confidential consultation available in English.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
              <Link to="/international/apply">
                <Button size="lg" variant="secondary" className="gap-2 text-base font-semibold px-10 h-14 shadow-lg">
                  Apply for Treatment
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
            </div>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-primary-foreground/60">
              <span className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5" /> Free consultation</span>
              <span className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5" /> 100% confidential</span>
              <span className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5" /> ESTA & visa guidance</span>
            </div>
          </div>
        </section>

        {/* Internal Links */}
        <section className="py-10 border-t border-border bg-muted/20">
          <div className="container max-w-5xl mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">More for International Patients</h3>
                <div className="space-y-1.5">
                  {[
                    { href: "/us-rehab/uk-patients", label: "UK Patients" },
                    { href: "/us-rehab/canadian-patients", label: "Canadian Patients" },
                    { href: "/us-rehab/uae-middle-east", label: "UAE & Middle East" },
                    { href: "/us-rehab/australian-patients", label: "Australian Patients" },
                    { href: "/us-rehab/international-patients", label: "All International" },
                  ].map((link) => (
                    <Link key={link.href} to={link.href} className="group flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted/60 transition-colors">
                      <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{link.label}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                    </Link>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Popular Programs</h3>
                <div className="space-y-1.5">
                  {[
                    { href: "/us-rehab/luxury-rehab-america", label: "Luxury Rehab" },
                    { href: "/us-rehab/executive-rehab", label: "Executive Rehab" },
                    { href: "/us-rehab/private-rehab-america", label: "Private Programs" },
                    { href: "/us-rehab/best-rehab-usa", label: "Best Rehab in USA" },
                    { href: "/rehab-centers", label: "Search All Facilities" },
                  ].map((link) => (
                    <Link key={link.href} to={link.href} className="group flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted/60 transition-colors">
                      <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{link.label}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
