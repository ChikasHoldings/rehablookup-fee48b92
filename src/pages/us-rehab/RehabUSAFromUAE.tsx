import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { Layout } from "@/components/layout/Layout";
import { InternationalPageHero } from "./components";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle, MapPin, Shield, ChevronRight, Plane, FileText, Heart, Sparkles, Lock, Languages, Star, Clock, Building2, Globe } from "lucide-react";
import heroImage from "@/assets/hero-uae-rehab.jpg";

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
};

export default function RehabUSAFromUAE() {
  return (
    <Layout>
      <SEO
        title="US Rehab for UAE Patients | American Treatment from Dubai & Middle East"
        description="Discreet addiction treatment in America for UAE, Dubai, and Middle East patients. Luxury US rehab with complete confidentiality, Arabic support, and cultural sensitivity."
        canonical="/us-rehab/uae-middle-east"
        keywords={["US rehab from UAE", "American rehab Dubai", "addiction treatment USA Middle East", "luxury rehab America Arabic"]}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "MedicalWebPage",
          name: "US Rehab for UAE & Middle East Patients",
          description: "Guide for UAE and Middle Eastern patients seeking addiction treatment in the United States",
          audience: { "@type": "MedicalAudience", audienceType: "Patient", geographicArea: { "@type": "Country", name: "United Arab Emirates" } },
        }}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "US Treatment", url: "/us-rehab" },
          { name: "UAE & Middle East", url: "/us-rehab/uae-middle-east" },
        ]}
        hreflang={[
          { lang: "ar-AE", href: "https://rehablookup.com/us-rehab/uae-middle-east" },
          { lang: "ar", href: "https://rehablookup.com/us-rehab/uae-middle-east" },
          { lang: "en-US", href: "https://rehablookup.com/international" },
          { lang: "x-default", href: "https://rehablookup.com/international" },
        ]}
      />

      <InternationalPageHero
        flag="🇦🇪"
        badge="For UAE & Gulf Region Residents"
        title="Discreet US Rehab for UAE & Middle East"
        subtitle="Ultra-Private Treatment. Complete Confidentiality."
        description="Access America's most exclusive treatment centres with absolute privacy. Luxury accommodations, cultural sensitivity, and world-class clinical care for patients from Dubai, Abu Dhabi, and across the Middle East."
        trustPoints={["Maximum Discretion", "Arabic-Speaking Staff", "Halal Accommodations"]}
        heroImage={heroImage}
        heroAlt="Luxury desert wellness retreat for Middle Eastern patients"
      />

      {/* Stats Bar */}
      <section className="border-b border-border bg-primary text-primary-foreground py-3">
        <div className="container px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center max-w-4xl mx-auto">
            {[
              { icon: Lock, value: "100%", label: "Confidential" },
              { icon: Languages, value: "Arabic", label: "Speaking Staff" },
              { icon: Clock, value: "24hr", label: "Response Time" },
              { icon: Building2, value: "Luxury", label: "Facilities Only" },
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

      {/* Why UAE Patients Choose US */}
      <section className="py-14 md:py-20 bg-background">
        <div className="container mx-auto px-4 max-w-6xl">
          <motion.div {...fadeUp} transition={{ duration: 0.4 }} className="text-center mb-12">
            <p className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-wide mb-2">Why America</p>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-3">Why Gulf Region Clients Choose American Treatment</h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">The US provides privacy, luxury, and clinical excellence that addresses the unique needs of Middle Eastern patients.</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            {[
              { icon: Lock, title: "Absolute Confidentiality", desc: "Zero connection to UAE authorities, employers, or community. HIPAA-protected records cannot be accessed internationally." },
              { icon: Star, title: "Ultra-Luxury Facilities", desc: "Private suites, concierge services, gourmet dining, spa amenities, and executive accommodations." },
              { icon: Languages, title: "Arabic-Speaking Care", desc: "Arabic-speaking therapists and staff. Language, dietary, and cultural requirements fully accommodated." },
              { icon: Shield, title: "Cultural Sensitivity", desc: "Prayer accommodations, halal dining, gender-separated facilities, and culturally trained staff." },
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
            <p className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-wide mb-2">Region</p>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-3">Serving the Entire Gulf & Middle East Region</h2>
          </motion.div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {[
              "🇦🇪 UAE / Dubai", "🇸🇦 Saudi Arabia", "🇶🇦 Qatar", "🇰🇼 Kuwait",
              "🇧🇭 Bahrain", "🇴🇲 Oman", "🇯🇴 Jordan", "🇱🇧 Lebanon",
            ].map((c) => (
              <motion.div key={c} {...fadeUp} transition={{ duration: 0.3 }}
                className="bg-background rounded-xl border px-4 py-3 text-sm font-medium text-foreground text-center hover:shadow-sm transition-shadow">
                {c}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-14 md:py-20 bg-background">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div {...fadeUp} transition={{ duration: 0.4 }} className="text-center mb-12">
            <p className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-wide mb-2">Process</p>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-3">Your Journey to Recovery</h2>
          </motion.div>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-5">
            {[
              { step: "1", title: "Confidential Inquiry", desc: "Complete our secure intake form. All communications are encrypted." },
              { step: "2", title: "Facility Matching", desc: "We match you with facilities offering Arabic support and cultural accommodations." },
              { step: "3", title: "Travel Coordination", desc: "Visa documentation, private flights, and discreet airport transfers arranged." },
              { step: "4", title: "Begin Treatment", desc: "Arrive at your luxury facility and begin your personalised recovery programme." },
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
      <section className="py-14 md:py-20 bg-muted/30">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div {...fadeUp} transition={{ duration: 0.4 }} className="text-center mb-10">
            <p className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-wide mb-2">Practical Info</p>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-3">What Middle Eastern Patients Need to Know</h2>
          </motion.div>
          <div className="space-y-4">
            {[
              { icon: Plane, title: "Visa & Travel", content: "UAE citizens require a US B-1/B-2 visa for medical treatment. Our team provides all necessary facility documentation. Private jet charters and VIP airport services can be arranged." },
              { icon: FileText, title: "Investment & Payment", content: "Premium US programmes range from $30,000–$100,000+ per month. Wire transfers, bank guarantees, and family office coordination are standard. All financial arrangements remain confidential." },
              { icon: Heart, title: "Aftercare & Return", content: "We coordinate continuing care upon your return, including virtual therapy across time zones and connection with local recovery resources." },
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
      <section className="py-14 md:py-20 bg-background">
        <div className="container mx-auto px-4 max-w-5xl">
          <motion.div {...fadeUp} transition={{ duration: 0.4 }} className="text-center mb-10">
            <p className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-wide mb-2">Destinations</p>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-3">Top US Destinations for Middle Eastern Clients</h2>
          </motion.div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { state: "California", desc: "Malibu luxury, Beverly Hills privacy, world-class facilities", emoji: "🌴", href: "/us-rehab/luxury-rehab-california" },
              { state: "Florida", desc: "Miami luxury, warm climate, diverse communities", emoji: "🌺", href: "/us-rehab/luxury-rehab-florida" },
              { state: "Arizona", desc: "Desert wellness, Scottsdale luxury, spiritual healing", emoji: "🏜️", href: "/us-rehab/luxury-rehab-arizona" },
              { state: "New York", desc: "Executive programmes, Manhattan privacy", emoji: "🗽", href: "/rehab-centers/new-york" },
              { state: "Texas", desc: "Expansive ranch-style luxury, family programmes", emoji: "🤠", href: "/rehab-centers/texas" },
              { state: "Colorado", desc: "Mountain retreat healing, adventure therapy", emoji: "⛰️", href: "/rehab-centers/colorado" },
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
      <section className="py-14 md:py-20 bg-muted/30">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.div {...fadeUp} transition={{ duration: 0.4 }} className="text-center mb-10">
            <p className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-wide mb-2">FAQ</p>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-3">UAE & Middle East Treatment FAQs</h2>
          </motion.div>
          <div className="space-y-3">
            {[
              { q: "Is treatment in America confidential from UAE authorities?", a: "Absolutely. US treatment facilities operate completely independently. Records are protected by HIPAA and cannot be shared with UAE authorities, employers, or family without explicit written consent." },
              { q: "Do US rehabs accommodate Arabic-speaking patients?", a: "Many facilities offer Arabic-speaking staff or professional translation. We match you with programmes that accommodate language, dietary (halal), and prayer requirements." },
              { q: "What is the cost for UAE patients?", a: "Luxury US treatment ranges from $30,000–$100,000+ per month. Executive programmes with private suites and concierge services are most popular with Gulf region patients." },
              { q: "How do I travel from Dubai to US rehab?", a: "UAE citizens apply for a US B-2 visa for medical treatment. Our team coordinates all logistics including visa documentation, private flights, and VIP airport transfers." },
              { q: "Can my family be involved in treatment?", a: "Yes. Many programmes offer family therapy via secure video conferencing across time zones. We can arrange luxury accommodation for visiting family members." },
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
      <section className="py-14 md:py-20 bg-background">
        <div className="container mx-auto px-4">
          <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="max-w-4xl mx-auto">
            <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5 p-8 md:p-12 shadow-lg">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
              <div className="relative text-center">
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-6">
                  <Sparkles className="h-4 w-4" />
                  <span>Gulf Region Specialist Team</span>
                </div>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-3">Begin Your Confidential Recovery</h2>
                <p className="text-sm sm:text-base text-muted-foreground mb-8 max-w-xl mx-auto leading-relaxed">Our advisors understand Middle Eastern client needs. Discreet, luxury US placement with full cultural accommodations.</p>
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
                  { href: "/us-rehab/european-patients", label: "European Patients" },
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
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Luxury & Private Programmes</h3>
              <div className="space-y-1">
                {[
                  { href: "/us-rehab/luxury-rehab-america", label: "Luxury Rehab" },
                  { href: "/us-rehab/private-rehab-america", label: "Private & Discreet" },
                  { href: "/us-rehab/celebrity-rehab-usa", label: "Celebrity Rehab" },
                  { href: "/us-rehab/executive-rehab", label: "Executive Programmes" },
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
