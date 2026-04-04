import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { Layout } from "@/components/layout/Layout";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";
import { ArrowRight, CheckCircle, MapPin, Shield, Clock, Globe, Star, Phone, ChevronRight, Plane, FileText, Heart, Sparkles, Lock, Languages } from "lucide-react";

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
      />

      <div className="container mx-auto px-4 pt-4">
        <BreadcrumbNav items={[
          { label: "US Rehab", href: "/us-rehab" },
          { label: "UAE & Middle East" },
        ]} />
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/[0.03] via-background to-background py-16 md:py-24">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/[0.04] rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-accent/[0.04] rounded-full blur-3xl" />
        </div>
        <div className="container relative mx-auto px-4 max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 bg-accent/10 text-accent px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <span className="text-lg">🇦🇪</span>
            <span>For UAE & Gulf Region Residents</span>
          </div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-3 leading-tight tracking-tight">
            Discreet US Rehab for UAE & Middle East
          </h1>
          <p className="text-lg md:text-xl text-primary font-semibold mb-3">
            Ultra-Private Treatment. Complete Confidentiality.
          </p>
          <p className="text-base md:text-lg text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            Access America's most exclusive treatment centres with absolute privacy. Luxury accommodations, cultural sensitivity, and world-class clinical care for patients from Dubai, Abu Dhabi, and across the Middle East.
          </p>
          <div className="flex flex-wrap justify-center gap-5 mb-10">
            {["Maximum Discretion", "Arabic-Speaking Staff", "Halal Accommodations"].map(t => (
              <div key={t} className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">{t}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground text-base px-8 py-6">
              <Link to="/international/apply" className="flex items-center gap-2">Apply for Treatment <ArrowRight className="h-5 w-5" /></Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-base px-8 py-6 border-border">
              <Link to="/concierge" className="flex items-center gap-2"><Phone className="h-4 w-4" /> Speak to an Advisor</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Why UAE Patients Choose US */}
      <section className="py-16 md:py-20 bg-background">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-12">
            <span className="text-sm font-semibold uppercase tracking-wide text-primary mb-2 block">Why America</span>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Why Gulf Region Clients Choose American Treatment</h2>
            <p className="text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">The US provides a level of privacy, luxury, and clinical excellence that addresses the unique needs of Middle Eastern patients.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {[
              { icon: Lock, title: "Absolute Confidentiality", desc: "Treatment thousands of miles from home with zero connection to UAE authorities, employers, or community. HIPAA-protected records cannot be accessed internationally." },
              { icon: Star, title: "Ultra-Luxury Facilities", desc: "Private suites, concierge services, gourmet dining, spa amenities, and executive accommodations that meet the expectations of Gulf region clientele." },
              { icon: Languages, title: "Arabic-Speaking Care", desc: "Many US facilities employ Arabic-speaking therapists and clinical staff. We match you with programmes that accommodate language, dietary, and cultural requirements." },
              { icon: Shield, title: "Cultural Sensitivity", desc: "Prayer accommodations, halal dining options, gender-separated facilities, and staff trained in Middle Eastern cultural norms and family dynamics." },
            ].map((item) => (
              <div key={item.title} className="group p-6 bg-muted/20 rounded-xl border border-border/50 hover:border-primary/20 hover:shadow-sm transition-all">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Countries Served */}
      <section className="py-16 md:py-20 bg-muted/20">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-10">
            <span className="text-sm font-semibold uppercase tracking-wide text-primary mb-2 block">Region</span>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Serving the Entire Gulf & Middle East Region</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {[
              "🇦🇪 UAE / Dubai", "🇸🇦 Saudi Arabia", "🇶🇦 Qatar", "🇰🇼 Kuwait",
              "🇧🇭 Bahrain", "🇴🇲 Oman", "🇯🇴 Jordan", "🇱🇧 Lebanon",
            ].map((c) => (
              <div key={c} className="bg-background rounded-xl border border-border/50 px-4 py-3 text-sm font-medium text-foreground text-center">
                {c}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-20 bg-background">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <span className="text-sm font-semibold uppercase tracking-wide text-primary mb-2 block">Process</span>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Your Journey to Recovery</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: "1", title: "Confidential Inquiry", desc: "Complete our secure intake form. All communications are encrypted." },
              { step: "2", title: "Facility Matching", desc: "We match you with facilities offering Arabic support and cultural accommodations." },
              { step: "3", title: "Travel Coordination", desc: "Visa documentation, private flights, and discreet airport transfers arranged." },
              { step: "4", title: "Begin Treatment", desc: "Arrive at your luxury facility and begin your personalised recovery programme." },
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

      {/* Practical Info */}
      <section className="py-16 md:py-20 bg-muted/20">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-10">
            <span className="text-sm font-semibold uppercase tracking-wide text-primary mb-2 block">Practical Info</span>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">What Middle Eastern Patients Need to Know</h2>
          </div>
          <div className="space-y-4">
            {[
              { icon: Plane, title: "Visa & Travel", content: "UAE citizens require a US B-1/B-2 visa for medical treatment. Our team provides all necessary facility documentation to support your application. Private jet charters and VIP airport services can be arranged for maximum discretion." },
              { icon: FileText, title: "Investment & Payment", content: "Premium US treatment programmes range from $30,000–$100,000+ per month for luxury accommodations. Wire transfers, bank guarantees, and family office coordination are standard. All financial arrangements remain completely confidential." },
              { icon: Heart, title: "Aftercare & Return", content: "We coordinate continuing care upon your return, including virtual therapy sessions across time zones, connection with local recovery resources, and periodic follow-up with your US clinical team." },
            ].map((item) => (
              <div key={item.title} className="flex gap-4 p-6 rounded-xl border border-border/50 bg-background">
                <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  <item.icon className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1.5 text-base">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Destinations */}
      <section className="py-16 md:py-20 bg-background">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 text-primary mb-3">
              <MapPin className="h-5 w-5" />
              <span className="text-sm font-semibold uppercase tracking-wide">Destinations</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Top US Destinations for Middle Eastern Clients</h2>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { state: "California", desc: "Malibu luxury, Beverly Hills privacy, world-class facilities", emoji: "🌴", href: "/us-rehab/luxury-rehab-california" },
              { state: "Florida", desc: "Miami luxury, warm climate, diverse communities", emoji: "🌺", href: "/us-rehab/luxury-rehab-florida" },
              { state: "Arizona", desc: "Desert wellness, Scottsdale luxury, spiritual healing", emoji: "🏜️", href: "/us-rehab/luxury-rehab-arizona" },
              { state: "New York", desc: "Executive programmes, Manhattan privacy", emoji: "🗽", href: "/rehab-centers/new-york" },
              { state: "Texas", desc: "Expansive ranch-style luxury, family programmes", emoji: "🤠", href: "/rehab-centers/texas" },
              { state: "Colorado", desc: "Mountain retreat healing, adventure therapy", emoji: "⛰️", href: "/rehab-centers/colorado" },
            ].map((dest) => (
              <Link key={dest.state} to={dest.href} className="group block p-5 bg-muted/20 rounded-xl border border-border/50 hover:border-primary/20 hover:shadow-md transition-all">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{dest.emoji}</span>
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{dest.state}</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{dest.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-20 bg-muted/20">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-10">
            <span className="text-sm font-semibold uppercase tracking-wide text-primary mb-2 block">FAQ</span>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">UAE & Middle East Treatment FAQs</h2>
          </div>
          <div className="space-y-4">
            {[
              { q: "Is treatment in America confidential from UAE authorities?", a: "Absolutely. US treatment facilities operate completely independently of Middle Eastern governments. Your records are protected by US HIPAA laws and cannot be shared with UAE authorities, employers, or family members without your explicit written consent." },
              { q: "Do US rehabs accommodate Arabic-speaking patients?", a: "Many US facilities offer Arabic-speaking staff or professional translation services. We match you with programmes that accommodate your language preferences, dietary requirements (halal), and prayer accommodations." },
              { q: "What is the cost for UAE patients?", a: "Luxury US treatment ranges from $30,000–$100,000+ per month for premium accommodations. Executive programmes with private suites, concierge services, and comprehensive aftercare are most popular with Gulf region patients." },
              { q: "How do I travel from Dubai to US rehab?", a: "UAE citizens apply for a US B-2 visa for medical treatment. Our team coordinates all logistics including visa documentation, private flight arrangements, and VIP airport transfers to ensure a discreet, seamless journey." },
              { q: "Can my family be involved in treatment?", a: "Yes. Many programmes offer family therapy via secure video conferencing across time zones. Some families choose to stay nearby during treatment, and we can arrange luxury accommodation for visiting family members." },
            ].map((faq, i) => (
              <details key={i} className="group bg-background rounded-xl border border-border/50 overflow-hidden">
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
      <section className="py-16 md:py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5 p-8 md:p-12 shadow-lg">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
              <div className="relative text-center">
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-6">
                  <Sparkles className="h-4 w-4" />
                  <span>Gulf Region Specialist Team</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Begin Your Confidential Recovery</h2>
                <p className="text-base text-muted-foreground mb-8 max-w-xl mx-auto leading-relaxed">Our advisors understand Middle Eastern client needs. Get placed in discreet, luxury US treatment with full cultural accommodations.</p>
                <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground text-base px-8 py-6 shadow-md">
                  <Link to="/international/apply" className="flex items-center gap-2">Apply for Treatment <ArrowRight className="h-5 w-5" /></Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Internal Links */}
      <section className="py-10 border-t border-border bg-muted/20">
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
                ].map((link) => (
                  <Link key={link.href} to={link.href} className="group flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted/40 transition-colors">
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
                ].map((link) => (
                  <Link key={link.href} to={link.href} className="group flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted/40 transition-colors">
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
