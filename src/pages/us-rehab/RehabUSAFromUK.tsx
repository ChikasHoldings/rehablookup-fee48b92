import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { Layout } from "@/components/layout/Layout";
import { InternationalPageHero } from "./components";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle, MapPin, Shield, Clock, Star, ChevronRight, Plane, FileText, Heart, Sparkles, Globe, Building2 } from "lucide-react";
import heroImage from "@/assets/hero-uk-rehab.jpg";

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
};

export default function RehabUSAFromUK() {
  return (
    <Layout>
      <SEO
        title="US Rehab for UK Patients | American Addiction Treatment from Britain"
        description="British patients seeking addiction treatment in America. Escape NHS waiting lists with immediate US admission. Luxury rehab, complete privacy, world-class care."
        canonical="/us-rehab/uk-patients"
        keywords={["US rehab from UK", "American rehab for British", "addiction treatment USA from Britain", "luxury rehab America UK patients"]}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "MedicalWebPage",
          name: "US Rehab for UK Patients",
          description: "Guide for British patients seeking addiction treatment in the United States",
          audience: { "@type": "MedicalAudience", audienceType: "Patient", geographicArea: { "@type": "Country", name: "United Kingdom" } },
        }}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "US Treatment", url: "/us-rehab" },
          { name: "UK Patients", url: "/us-rehab/uk-patients" },
        ]}
        hreflang={[
          { lang: "en-GB", href: "https://rehablookup.com/us-rehab/uk-patients" },
          { lang: "en-US", href: "https://rehablookup.com/international" },
          { lang: "x-default", href: "https://rehablookup.com/international" },
        ]}
      />

      <InternationalPageHero
        flag="🇬🇧"
        badge="For British & Irish Residents"
        title="US Rehab for UK Patients"
        subtitle="Skip NHS Waiting Lists. Start Recovery Today."
        description="Access America's finest treatment centres with immediate admission, world-class clinical care, and complete privacy — thousands of miles from home."
        trustPoints={["ESTA — No Visa Required", "Immediate Admission", "100% Confidential"]}
        heroImage={heroImage}
        heroAlt="Luxury oceanfront rehab facility in California for UK patients"
      />

      {/* Stats Bar */}
      <section className="border-b border-border bg-primary text-primary-foreground py-3">
        <div className="container px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center max-w-4xl mx-auto">
            {[
              { icon: Globe, value: "10hr", label: "Direct Flight" },
              { icon: Shield, value: "100%", label: "HIPAA Protected" },
              { icon: Clock, value: "24hr", label: "Admission Speed" },
              { icon: Building2, value: "1,000+", label: "US Facilities" },
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

      {/* Why UK Patients Choose US */}
      <section className="py-14 md:py-20 bg-background">
        <div className="container mx-auto px-4 max-w-6xl">
          <motion.div {...fadeUp} transition={{ duration: 0.4 }} className="text-center mb-12">
            <p className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-wide mb-2">Why America</p>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-3">Why British Patients Choose American Rehab</h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">The US offers advantages that simply aren't available through the NHS or UK private sector.</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            {[
              { icon: Clock, title: "No NHS Waiting Lists", desc: "US facilities admit within 24-72 hours with full medical detox on-site. No referrals, no gatekeeping." },
              { icon: Shield, title: "Complete Privacy", desc: "Treatment records stay in the US, protected by HIPAA. No GP notifications, no employer disclosures." },
              { icon: Star, title: "World-Leading Care", desc: "Access cutting-edge therapies like NAD+, neurofeedback, EMDR, and psychedelic-assisted treatment." },
              { icon: MapPin, title: "Healing Environments", desc: "From Malibu's oceanfront to Arizona's desert retreats — therapeutic settings that accelerate recovery." },
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
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-3">How It Works for UK Patients</h2>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">A streamlined process designed for British residents seeking US treatment</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-5">
            {[
              { step: "1", title: "Apply Online", desc: "Complete our confidential intake form with your treatment needs." },
              { step: "2", title: "Get Matched", desc: "Our UK-experienced advisors match you with ideal US facilities." },
              { step: "3", title: "Arrange Travel", desc: "We coordinate flights, ESTA, and airport transfers." },
              { step: "4", title: "Begin Recovery", desc: "Arrive and begin your personalised treatment programme." },
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

      {/* Key Considerations */}
      <section className="py-14 md:py-20 bg-background">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div {...fadeUp} transition={{ duration: 0.4 }} className="text-center mb-10">
            <p className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-wide mb-2">Practical Info</p>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-3">What UK Patients Need to Know</h2>
          </motion.div>
          <div className="space-y-4">
            {[
              { icon: Plane, title: "Travel & Entry", content: "UK citizens travel visa-free under the ESTA Visa Waiver Program for stays up to 90 days. Apply online at least 72 hours before travel. For longer programmes, a B-2 medical visa is recommended. Our team provides supporting documentation." },
              { icon: FileText, title: "Costs & Payment", content: "UK patients typically invest £12,000–£65,000+ per month for US treatment, depending on the facility level. This is self-pay as NHS coverage doesn't extend abroad. Wire transfers, credit cards, and payment plans are accepted." },
              { icon: Heart, title: "Aftercare & Return", content: "We coordinate your return to the UK with continuing care: local therapists, SMART Recovery and 12-step meetings, and virtual follow-up sessions with your US clinical team." },
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
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-3">Popular US Destinations for UK Patients</h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">British clients frequently choose these locations for their world-class facilities and direct flight access.</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { state: "California", desc: "Malibu luxury, LA celebrity rehab, year-round sun", emoji: "🌴", href: "/us-rehab/luxury-rehab-california" },
              { state: "Florida", desc: "Recovery capital of America, beachside programmes", emoji: "🌺", href: "/us-rehab/luxury-rehab-florida" },
              { state: "Arizona", desc: "Desert healing, equine therapy, Sedona wellness", emoji: "🏜️", href: "/us-rehab/luxury-rehab-arizona" },
              { state: "New York", desc: "Executive programmes, Hamptons privacy", emoji: "🗽", href: "/rehab-centers/new-york" },
              { state: "Colorado", desc: "Mountain retreats, adventure therapy", emoji: "⛰️", href: "/rehab-centers/colorado" },
              { state: "Texas", desc: "Ranch-style facilities, affordable luxury", emoji: "🤠", href: "/rehab-centers/texas" },
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
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-3">UK to US Treatment FAQs</h2>
            <p className="text-sm text-muted-foreground">Common questions from British patients considering treatment in America.</p>
          </motion.div>
          <div className="space-y-3">
            {[
              { q: "Can UK citizens get rehab treatment in America?", a: "Yes. US rehab centres welcome patients from the United Kingdom. Most facilities have experience with international admissions and can coordinate ESTA documentation, travel logistics, and aftercare planning for UK residents." },
              { q: "Is US rehab better than UK rehab?", a: "The US offers distinct advantages: immediate admission (no NHS waiting lists), complete privacy from UK systems, access to luxury and executive programmes, and innovative treatments not yet available in the UK." },
              { q: "How much does US rehab cost for UK patients?", a: "UK patients typically invest £12,000–£65,000+ per month, depending on the facility and luxury level. This is self-pay as NHS coverage doesn't extend to US facilities." },
              { q: "What travel documents do I need?", a: "UK citizens enter the US visa-free via the ESTA Visa Waiver Program for treatment stays up to 90 days. For longer programmes, a B-2 tourist visa for medical treatment is recommended." },
              { q: "Will my treatment be confidential from UK employers?", a: "Absolutely. US treatment facilities operate independently of UK healthcare systems. Records are protected by US HIPAA laws and cannot be shared with UK employers, insurers, or government agencies without your explicit consent." },
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
                  <span>UK Patient Specialist Team</span>
                </div>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-3">Start Your American Recovery Journey</h2>
                <p className="text-sm sm:text-base text-muted-foreground mb-8 max-w-xl mx-auto leading-relaxed">Our UK-experienced advisors understand your needs. Get placed in premium US facilities with full travel coordination.</p>
                <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 mb-8">
                  {["Confidential Consultation", "ESTA Guidance", "Airport Transfers"].map(item => (
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
                  { href: "/us-rehab/canadian-patients", label: "Canadian Patients" },
                  { href: "/us-rehab/uae-middle-east", label: "UAE & Middle East" },
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
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Explore US Treatment</h3>
              <div className="space-y-1">
                {[
                  { href: "/us-rehab/luxury-rehab-america", label: "Luxury Rehab" },
                  { href: "/us-rehab/executive-rehab", label: "Executive Rehab" },
                  { href: "/us-rehab/private-rehab-america", label: "Private Programmes" },
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
