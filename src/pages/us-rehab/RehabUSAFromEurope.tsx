import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { Layout } from "@/components/layout/Layout";
import { InternationalPageHero } from "./components";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle, MapPin, Shield, Clock, Globe, Star, ChevronRight, Plane, FileText, Heart, Sparkles, Building2 } from "lucide-react";
import heroImage from "@/assets/hero-europe-rehab.jpg";

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
};

export default function RehabUSAFromEurope() {
  return (
    <Layout>
      <SEO
        title="Rehab in USA for Europeans | Addiction Treatment from Europe"
        description="European residents seeking world-class addiction treatment in the United States. English-speaking programs, visa guidance, and personalized care coordination."
        canonical="/us-rehab/european-patients"
        keywords={["rehab in USA from Europe", "European addiction treatment USA", "drug rehab USA from Germany"]}
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
        hreflang={[
          { lang: "de", href: "https://rehablookup.com/us-rehab/european-patients" },
          { lang: "fr", href: "https://rehablookup.com/us-rehab/european-patients" },
          { lang: "en-IE", href: "https://rehablookup.com/us-rehab/european-patients" },
          { lang: "en-US", href: "https://rehablookup.com/international" },
          { lang: "x-default", href: "https://rehablookup.com/international" },
        ]}
      />

      <InternationalPageHero
        flag="🇪🇺"
        badge="For European Residents"
        title="Premium Addiction Treatment in the USA — For European Patients"
        subtitle="Innovation. Privacy. World-Class Recovery."
        description="Access America's leading rehab facilities with full English-language support, ESTA/visa guidance, and personalized care coordination from our international team."
        trustPoints={["ESTA for Most EU Nations", "Immediate Admission", "Multilingual Support"]}
        heroImage={heroImage}
        heroAlt="Elegant European-style luxury rehab facility in America"
      />

      {/* Stats Bar */}
      <section className="border-b border-border bg-primary text-primary-foreground py-3">
        <div className="container px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center max-w-4xl mx-auto">
            {[
              { icon: Globe, value: "30+", label: "EU Countries" },
              { icon: Shield, value: "100%", label: "HIPAA Protected" },
              { icon: Clock, value: "24hr", label: "Admission Speed" },
              { icon: Building2, value: "200+", label: "US Facilities" },
            ].map((s) => (
              <div key={s.label} className="px-1">
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  <s.icon className="h-3.5 w-3.5 text-accent shrink-0" />
                  <span className="text-xl font-bold">{s.value}</span>
                </div>
                <p className="text-xs md:text-xs text-primary-foreground/80">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Europeans Choose US Rehab */}
      <section className="py-14 md:py-20 bg-background">
        <div className="container mx-auto px-4 max-w-6xl">
          <motion.div {...fadeUp} transition={{ duration: 0.4 }} className="text-center mb-12">
            <p className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-wide mb-2">Why America</p>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-3">Why Europeans Choose American Rehab</h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">The US offers treatment innovation, scale, and privacy that European systems can't match.</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            {[
              { icon: Star, title: "Innovation & Excellence", desc: "World-leading evidence-based treatments: NAD+ therapy, EMDR, neurofeedback, and precision medicine approaches." },
              { icon: Shield, title: "Complete Privacy", desc: "Treatment thousands of miles from home. Absolute discretion for professionals, executives, and public figures." },
              { icon: Clock, title: "Immediate Admission", desc: "No NHS-style waiting lists. Many US facilities admit within 24-48 hours with on-site medical detox." },
              { icon: MapPin, title: "Healing Environments", desc: "Malibu oceanfront, Sedona deserts, Miami luxury — settings that accelerate recovery beyond European clinics." },
            ].map((item, i) => (
              <motion.div key={item.title} {...fadeUp} transition={{ duration: 0.4, delay: i * 0.1 }}
                className="bg-background border rounded-xl p-5 md:p-6 hover:shadow-lg transition-shadow">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-1.5 text-sm md:text-base">{item.title}</h3>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Countries Served */}
      <section className="py-14 md:py-20 bg-muted/30">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div {...fadeUp} transition={{ duration: 0.4 }} className="text-center mb-10">
            <p className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-wide mb-2">Coverage</p>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-3">We Help Patients From Across Europe</h2>
          </motion.div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {[
              "🇬🇧 United Kingdom", "🇩🇪 Germany", "🇫🇷 France", "🇳🇱 Netherlands",
              "🇨🇭 Switzerland", "🇸🇪 Sweden", "🇳🇴 Norway", "🇩🇰 Denmark",
              "🇮🇪 Ireland", "🇪🇸 Spain", "🇮🇹 Italy", "🇧🇪 Belgium",
            ].map((country) => (
              <motion.div key={country} {...fadeUp} transition={{ duration: 0.3 }}
                className="bg-background rounded-xl border px-4 py-3 text-sm font-medium text-foreground text-center hover:shadow-sm transition-shadow">
                {country}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Practical Info */}
      <section className="py-14 md:py-20 bg-background">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div {...fadeUp} transition={{ duration: 0.4 }} className="text-center mb-10">
            <p className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-wide mb-2">Practical Info</p>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-3">Practical Information for European Patients</h2>
          </motion.div>
          <div className="space-y-4">
            {[
              { icon: Plane, title: "ESTA & Visa Requirements", content: "VWP countries (UK, Germany, France, most EU) can enter on ESTA for up to 90 days. For longer programs, a B-2 medical visa may be required. Our team guides you through the process." },
              { icon: FileText, title: "Payment & Insurance", content: "European health insurance typically doesn't cover US treatment. Most patients self-pay or use private international insurance. Costs range from $15,000-$80,000 for 30-day programs." },
              { icon: Heart, title: "Aftercare & Continuity", content: "We coordinate your return with local therapists and support groups. Many US facilities offer virtual aftercare to maintain continuity across time zones." },
            ].map((item, i) => (
              <motion.div key={item.title} {...fadeUp} transition={{ duration: 0.4, delay: i * 0.08 }}
                className="flex gap-4 p-5 md:p-6 rounded-xl border bg-background hover:shadow-md transition-shadow">
                <div className="h-11 w-11 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                  <item.icon className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1.5 text-sm md:text-base">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.content}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 md:py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="max-w-4xl mx-auto">
            <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5 p-8 md:p-12 shadow-lg">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
              <div className="relative text-center">
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-6">
                  <Sparkles className="h-4 w-4" />
                  <span>European Patient Specialist Team</span>
                </div>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-3">Start Your Recovery Journey</h2>
                <p className="text-sm sm:text-base text-muted-foreground mb-8 max-w-xl mx-auto leading-relaxed">Our international team understands European patient needs. Confidential consultation available in English.</p>
                <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 mb-8">
                  {["Confidential Consultation", "ESTA & Visa Guidance", "Multilingual Support"].map(item => (
                    <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
                <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground text-base px-8 py-6 shadow-lg shadow-accent/25">
                  <Link to="/international/apply" className="flex items-center gap-2">Apply for Treatment <ArrowRight className="h-5 w-5" /></Link>
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Internal Links */}
      <section className="py-10 border-t border-border bg-background">
        <div className="container max-w-5xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">More for International Patients</h3>
              <div className="space-y-1">
                {[
                  { href: "/us-rehab/uk-patients", label: "UK Patients" },
                  { href: "/us-rehab/canadian-patients", label: "Canadian Patients" },
                  { href: "/us-rehab/uae-middle-east", label: "UAE & Middle East" },
                  { href: "/us-rehab/australian-patients", label: "Australian Patients" },
                  { href: "/international", label: "International Placement" },
                ].map((link) => (
                  <Link key={link.href} to={link.href} className="group flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted/50 transition-colors">
                    <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{link.label}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Popular Programs</h3>
              <div className="space-y-1">
                {[
                  { href: "/us-rehab/luxury-rehab-america", label: "Luxury Rehab" },
                  { href: "/us-rehab/executive-rehab", label: "Executive Rehab" },
                  { href: "/us-rehab/private-rehab-america", label: "Private Programs" },
                  { href: "/us-rehab/best-rehab-usa", label: "Best Rehab in USA" },
                  { href: "/rehab-centers", label: "Search All Facilities" },
                ].map((link) => (
                  <Link key={link.href} to={link.href} className="group flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted/50 transition-colors">
                    <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{link.label}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
