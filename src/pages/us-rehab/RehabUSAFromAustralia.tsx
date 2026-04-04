import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { Layout } from "@/components/layout/Layout";
import { InternationalPageHero } from "./components";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle, MapPin, Shield, Clock, Star, ChevronRight, Plane, FileText, Heart, Sparkles, Zap, Building2, Globe } from "lucide-react";
import heroImage from "@/assets/hero-australia-rehab.jpg";

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
};

export default function RehabUSAFromAustralia() {
  return (
    <Layout>
      <SEO
        title="US Rehab for Australians | American Addiction Treatment from Australia"
        description="Australian patients seeking addiction treatment in America. Access cutting-edge US programs, luxury facilities, and immediate admission. Complete confidentiality guaranteed."
        canonical="/us-rehab/australian-patients"
        keywords={["US rehab from Australia", "American rehab Australians", "addiction treatment USA from Australia", "luxury rehab America Australian"]}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "MedicalWebPage",
          name: "US Rehab for Australian Patients",
          description: "Guide for Australians seeking addiction treatment in the United States",
          audience: { "@type": "MedicalAudience", audienceType: "Patient", geographicArea: { "@type": "Country", name: "Australia" } },
        }}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "US Treatment", url: "/us-rehab" },
          { name: "Australian Patients", url: "/us-rehab/australian-patients" },
        ]}
      />

      <InternationalPageHero
        flag="🇦🇺"
        badge="For Australian Residents"
        title="US Rehab for Australians"
        subtitle="World-Class American Treatment. A Fresh Start Far From Home."
        description="Access America's most innovative treatment programmes with cutting-edge therapies, luxury accommodations, and a healing environment far from everyday triggers."
        trustPoints={["ESTA — Visa-Free Entry", "Immediate Admission", "100% Confidential"]}
        heroImage={heroImage}
        heroAlt="Beachfront luxury rehab facility for Australian patients"
      />

      {/* Stats Bar */}
      <section className="border-b border-border bg-primary text-primary-foreground py-3">
        <div className="container px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center max-w-4xl mx-auto">
            {[
              { icon: Plane, value: "14hr", label: "Direct Flight" },
              { icon: Shield, value: "100%", label: "HIPAA Protected" },
              { icon: Clock, value: "24hr", label: "Admission Speed" },
              { icon: Building2, value: "200+", label: "US Facilities" },
            ].map((s) => (
              <div key={s.label} className="px-1">
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  <s.icon className="h-3.5 w-3.5 text-accent shrink-0" />
                  <span className="text-xl font-bold">{s.value}</span>
                </div>
                <p className="text-[10px] md:text-xs text-primary-foreground/80">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Australians Choose US */}
      <section className="py-14 md:py-20 bg-background">
        <div className="container mx-auto px-4 max-w-6xl">
          <motion.div {...fadeUp} transition={{ duration: 0.4 }} className="text-center mb-12">
            <p className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-wide mb-2">Why America</p>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-3">Why Australian Patients Choose American Rehab</h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">The US offers treatment innovation, scale, and privacy that Australia's smaller market can't match.</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            {[
              { icon: Zap, title: "Cutting-Edge Innovation", desc: "Access NAD+, ketamine-assisted treatment, neurofeedback, and psychedelic research programmes not yet in Australia." },
              { icon: Shield, title: "Geographic Privacy", desc: "Treatment 15,000km from home. Complete separation from your Australian community and workplace." },
              { icon: Clock, title: "No Medicare Waits", desc: "Australian public services have extensive waiting. US facilities admit within 24-72 hours with full detox." },
              { icon: MapPin, title: "Diverse Environments", desc: "California surf therapy, Arizona desert retreats, Colorado mountain lodges — settings that accelerate recovery." },
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

      {/* How It Works */}
      <section className="py-14 md:py-20 bg-muted/30">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div {...fadeUp} transition={{ duration: 0.4 }} className="text-center mb-12">
            <p className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-wide mb-2">Process</p>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-3">How It Works for Australian Patients</h2>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">A streamlined process designed for Australian residents</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-5">
            {[
              { step: "1", title: "Apply Online", desc: "Complete our confidential intake form with your treatment preferences." },
              { step: "2", title: "Get Matched", desc: "Our team matches you with US facilities suited to your clinical needs." },
              { step: "3", title: "Arrange Travel", desc: "We coordinate ESTA, flights from Sydney/Melbourne, and arrival logistics." },
              { step: "4", title: "Begin Recovery", desc: "Arrive at your facility and begin your personalised treatment programme." },
            ].map((item, i) => (
              <motion.div key={item.step} {...fadeUp} transition={{ duration: 0.4, delay: i * 0.1 }} className="text-center">
                <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 font-bold text-lg">{item.step}</div>
                <h3 className="font-semibold text-foreground mb-2 text-sm">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
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
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-3">What Australian Patients Need to Know</h2>
          </motion.div>
          <div className="space-y-4">
            {[
              { icon: Plane, title: "Travel & Entry", content: "Australians enter the US visa-free via ESTA for stays up to 90 days. Direct flights from Sydney/Melbourne to LA are ~14 hours. For longer programmes, a B-2 medical visa is recommended." },
              { icon: FileText, title: "Costs & Payment", content: "Australians typically invest AUD $20,000–$80,000+ per month. Medicare doesn't cover overseas treatment. Wire transfers, credit cards, and payment plans are accepted." },
              { icon: Heart, title: "Aftercare & Return", content: "We coordinate your return with local therapists, support groups, and virtual follow-up with your US clinical team. Many facilities offer alumni networks across time zones." },
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

      {/* Popular Destinations */}
      <section className="py-14 md:py-20 bg-muted/30">
        <div className="container mx-auto px-4 max-w-5xl">
          <motion.div {...fadeUp} transition={{ duration: 0.4 }} className="text-center mb-10">
            <p className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-wide mb-2">Destinations</p>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-3">Popular US Destinations for Australians</h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">Aussie clients choose these locations for climate, direct flights, and world-class facilities.</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { state: "California", desc: "Direct flights from Sydney, Malibu luxury, surf therapy", emoji: "🌴", href: "/us-rehab/luxury-rehab-california" },
              { state: "Florida", desc: "Warm climate, beachside recovery, diverse programmes", emoji: "🌺", href: "/us-rehab/luxury-rehab-florida" },
              { state: "Arizona", desc: "Desert healing, equine therapy, Sedona wellness", emoji: "🏜️", href: "/us-rehab/luxury-rehab-arizona" },
              { state: "Hawaii", desc: "Closest US state, tropical healing, holistic focus", emoji: "🌺", href: "/rehab-centers/hawaii" },
              { state: "Colorado", desc: "Mountain retreats, adventure therapy", emoji: "⛰️", href: "/rehab-centers/colorado" },
              { state: "Texas", desc: "Ranch-style luxury, expansive facilities", emoji: "🤠", href: "/rehab-centers/texas" },
            ].map((dest, i) => (
              <motion.div key={dest.state} {...fadeUp} transition={{ duration: 0.4, delay: i * 0.06 }}>
                <Link to={dest.href} className="group block p-5 bg-background rounded-xl border hover:border-primary/30 hover:shadow-lg transition-all h-full">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl">{dest.emoji}</span>
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{dest.state}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{dest.desc}</p>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-14 md:py-20 bg-background">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.div {...fadeUp} transition={{ duration: 0.4 }} className="text-center mb-10">
            <p className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-wide mb-2">FAQ</p>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-3">Australia to US Treatment FAQs</h2>
          </motion.div>
          <div className="space-y-3">
            {[
              { q: "Can Australians get addiction treatment in the US?", a: "Yes. American rehab centres welcome Australian patients. The US offers more variety, specialty programmes, and luxury accommodations. Many Aussies choose US treatment for privacy, innovation, and immediate admission." },
              { q: "How does US rehab compare to Australian treatment?", a: "The US has the world's largest private rehab industry, offering more variety in treatment approaches, luxury levels, and specialisations. American facilities often access newer therapies before they reach Australia." },
              { q: "What's the cost for Australians?", a: "Typically AUD $20,000–$80,000+ per month. Medicare doesn't cover overseas treatment, so this is private-pay. Many consider it worthwhile for premium care and a fresh-start environment." },
              { q: "Do I need a visa?", a: "Australians use ESTA (Visa Waiver Program) for stays up to 90 days — no visa appointment needed. For longer programmes, a B-2 medical visa is recommended." },
              { q: "Will my Australian employer find out?", a: "No. US treatment is completely confidential. Records are protected by HIPAA and cannot be accessed by Australian employers, insurers, or government agencies." },
            ].map((faq, i) => (
              <motion.details key={i} {...fadeUp} transition={{ duration: 0.3, delay: i * 0.05 }}
                className="group bg-background rounded-xl border overflow-hidden hover:shadow-sm transition-shadow">
                <summary className="flex items-center justify-between cursor-pointer p-5 text-sm font-semibold text-foreground hover:text-primary transition-colors">
                  {faq.q}
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 ml-4 group-open:rotate-90 transition-transform" />
                </summary>
                <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed border-t border-border/30 pt-4">
                  {faq.a}
                </div>
              </motion.details>
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
                  <span>Australian Patient Specialist Team</span>
                </div>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-3">Start Your American Recovery Journey</h2>
                <p className="text-sm sm:text-base text-muted-foreground mb-8 max-w-xl mx-auto leading-relaxed">Our team understands Australian patient needs. Premium US placement with full travel coordination.</p>
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
                  { href: "/us-rehab/european-patients", label: "European Patients" },
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
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Explore US Treatment</h3>
              <div className="space-y-1">
                {[
                  { href: "/us-rehab/luxury-rehab-america", label: "Luxury Rehab" },
                  { href: "/us-rehab/best-rehab-usa", label: "Best Rehab in USA" },
                  { href: "/us-rehab/alcohol-rehab-usa", label: "Alcohol Rehab USA" },
                  { href: "/us-rehab/drug-rehab-usa", label: "Drug Rehab USA" },
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
