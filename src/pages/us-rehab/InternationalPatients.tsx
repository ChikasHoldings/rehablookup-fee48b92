import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";
import { InternationalPageHero } from "./components";
import { Globe, Plane, FileCheck, Heart, Users, MessageCircle, ArrowRight, CheckCircle, MapPin, ChevronRight, Sparkles, Phone } from "lucide-react";
import heroImage from "@/assets/hero-international-rehab.jpg";

const internationalServices = [
  { icon: Plane, title: "Travel Coordination", description: "Airport pickup, transportation, and arrival assistance arranged end-to-end." },
  { icon: FileCheck, title: "Visa Support", description: "Documentation and guidance for ESTA and B-2 medical visa applications." },
  { icon: Globe, title: "Multilingual Staff", description: "Treatment teams fluent in multiple languages across partner facilities." },
  { icon: Heart, title: "Cultural Sensitivity", description: "Programmes respecting diverse backgrounds, dietary needs, and traditions." },
  { icon: Users, title: "Family Support", description: "International family programmes and virtual sessions across time zones." },
  { icon: MessageCircle, title: "24/7 Communication", description: "Support available across all time zones via phone, email, and secure chat." }
];

const InternationalPatients = () => {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "US Rehab for International Patients",
    "description": "Specialized addiction treatment services for international patients seeking treatment in the United States.",
    "provider": { "@type": "Organization", "name": "RehabLookup" },
    "areaServed": { "@type": "Country", "name": "United States" }
  };

  return (
    <Layout>
      <SEO
        title="Rehab for International Patients | US Addiction Treatment for Foreigners"
        description="Specialized US addiction treatment services for international patients. Visa support, travel coordination, multilingual staff, and culturally sensitive care."
        canonical="/us-rehab/international-patients"
        keywords={["rehab for foreigners USA", "international patient treatment", "US rehab for overseas patients"]}
        structuredData={schemaData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "US Rehab", url: "/us-rehab" },
          { name: "International Patients", url: "/us-rehab/international-patients" },
        ]}
      />

      <InternationalPageHero
        flag="🌍"
        badge="Serving Clients from 50+ Countries"
        title="US Rehab for International Patients"
        subtitle="World-Class Treatment, Global Accessibility"
        description="We specialise in helping international clients access America's finest addiction treatment facilities. From visa guidance to airport pickup, we handle every detail."
        trustPoints={["200+ Vetted Facilities", "24-Hour Response", "100% Confidential"]}
        heroImage={heroImage}
        heroAlt="Panoramic view of luxury US rehab destinations for international patients"
      />

      {/* Services */}
      <section className="py-16 md:py-20 bg-background">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-12">
            <span className="text-sm font-semibold uppercase tracking-wide text-primary mb-2 block">International Services</span>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Comprehensive Support for Global Clients</h2>
            <p className="text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">End-to-end support for your treatment journey in America.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {internationalServices.map((service, index) => (
              <div key={index} className="group p-6 bg-muted/20 rounded-xl border border-border/50 hover:border-primary/20 hover:shadow-sm transition-all">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <service.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{service.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Country-Specific Pages */}
      <section className="py-16 md:py-20 bg-muted/20">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-10">
            <span className="text-sm font-semibold uppercase tracking-wide text-primary mb-2 block">By Region</span>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Find Information for Your Region</h2>
            <p className="text-base text-muted-foreground max-w-2xl mx-auto">Country-specific guides with visa, travel, and cost information tailored to your needs.</p>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { flag: "🇬🇧", region: "United Kingdom & Ireland", desc: "ESTA visa-free entry, skip NHS waitlists", href: "/us-rehab/uk-patients" },
              { flag: "🇨🇦", region: "Canada", desc: "No visa needed, close proximity, skip waitlists", href: "/us-rehab/canadian-patients" },
              { flag: "🇦🇪", region: "UAE & Middle East", desc: "Maximum discretion, Arabic support, luxury", href: "/us-rehab/uae-middle-east" },
              { flag: "🇪🇺", region: "Europe", desc: "ESTA for most EU nations, multilingual support", href: "/us-rehab/european-patients" },
              { flag: "🇦🇺", region: "Australia", desc: "ESTA visa-free, direct flights to California", href: "/us-rehab/australian-patients" },
              { flag: "🌍", region: "All Other Countries", desc: "B-2 medical visa guidance, full coordination", href: "/international/apply" },
            ].map((item) => (
              <Link key={item.region} to={item.href} className="group block p-5 bg-background rounded-xl border border-border/50 hover:border-primary/20 hover:shadow-md transition-all">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{item.flag}</span>
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-base">{item.region}</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-20 bg-background">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <span className="text-sm font-semibold uppercase tracking-wide text-primary mb-2 block">Process</span>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">How It Works</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: "1", title: "Apply Online", desc: "Complete our confidential intake form with your treatment needs." },
              { step: "2", title: "Get Matched", desc: "Our advisors match you with facilities that accept international patients." },
              { step: "3", title: "Arrange Travel", desc: "We coordinate visa documents, flights, and airport transfers." },
              { step: "4", title: "Begin Recovery", desc: "Arrive and begin your personalised treatment programme." },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="h-11 w-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 font-bold text-base">{item.step}</div>
                <h3 className="font-semibold text-foreground mb-2 text-sm">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 md:py-20 bg-muted/20">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: "50+", label: "Countries Served" },
              { value: "2,500+", label: "International Placements" },
              { value: "24hr", label: "Response Time" },
              { value: "98%", label: "Placement Success" },
            ].map((stat) => (
              <div key={stat.label} className="text-center p-5 bg-background rounded-xl border border-border/50">
                <div className="text-2xl md:text-3xl font-bold text-primary mb-1">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-20 bg-background">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-10">
            <span className="text-sm font-semibold uppercase tracking-wide text-primary mb-2 block">FAQ</span>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">International Patient FAQs</h2>
          </div>
          <div className="space-y-4">
            {[
              { q: "Why do international patients choose US rehab?", a: "International patients choose US treatment for world-class clinical care, privacy from their home community, access to innovative therapies, and the opportunity to focus entirely on recovery in a new environment." },
              { q: "How does the visa process work?", a: "Most patients enter on a B-2 tourist visa for medical treatment or via ESTA for eligible countries. You'll need a letter from the treatment facility and proof of funds. Our team helps facilitate the documentation process." },
              { q: "What if I don't speak English fluently?", a: "Many US treatment centres have multilingual staff and translation services. We match you with facilities that accommodate your language needs." },
              { q: "How do I pay for treatment without US insurance?", a: "International patients typically self-pay. Treatment centres accept wire transfers, credit cards, and payment plans. Costs range from $20,000–$100,000+ per month depending on the programme." },
              { q: "Is my treatment confidential?", a: "Absolutely. US HIPAA laws protect your privacy, and being in a different country adds geographic separation from your community. Records cannot be shared without explicit consent." },
            ].map((faq, i) => (
              <details key={i} className="group bg-muted/20 rounded-xl border border-border/50 overflow-hidden">
                <summary className="flex items-center justify-between cursor-pointer p-5 text-sm font-semibold text-foreground hover:text-primary transition-colors">
                  {faq.q}
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 ml-4 group-open:rotate-90 transition-transform" />
                </summary>
                <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed border-t border-border/30 pt-4">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-20 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5 p-8 md:p-12 shadow-lg">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
              <div className="relative text-center">
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-6">
                  <Sparkles className="h-4 w-4" />
                  <span>International Placement Service</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Start Your US Treatment Journey</h2>
                <p className="text-base text-muted-foreground mb-8 max-w-xl mx-auto leading-relaxed">Our international team is ready to guide you through every step — from initial enquiry to admission and beyond.</p>
                <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground text-base px-8 py-6 shadow-md">
                  <Link to="/international/apply" className="flex items-center gap-2">Apply for Treatment <ArrowRight className="h-5 w-5" /></Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default InternationalPatients;
