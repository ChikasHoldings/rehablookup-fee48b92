import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { Layout } from "@/components/layout/Layout";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";
import { ArrowRight, CheckCircle, MapPin, Shield, Clock, Globe, Star, Phone, ChevronRight, Plane, FileText, Heart, Sparkles, Users } from "lucide-react";

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
      />

      <div className="container mx-auto px-4 pt-4">
        <BreadcrumbNav items={[
          { label: "US Rehab", href: "/us-rehab" },
          { label: "UK Patients" },
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
            <span className="text-lg">🇬🇧</span>
            <span>For British & Irish Residents</span>
          </div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-3 leading-tight tracking-tight">
            US Rehab for UK Patients
          </h1>
          <p className="text-lg md:text-xl text-primary font-semibold mb-3">
            Skip NHS Waiting Lists. Start Recovery Today.
          </p>
          <p className="text-base md:text-lg text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            Access America's finest treatment centres with immediate admission, world-class clinical care, and complete privacy — thousands of miles from home.
          </p>
          <div className="flex flex-wrap justify-center gap-5 mb-10">
            {["ESTA — No Visa Required", "Immediate Admission", "100% Confidential"].map(t => (
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

      {/* Why UK Patients Choose US */}
      <section className="py-16 md:py-20 bg-background">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-12">
            <span className="text-sm font-semibold uppercase tracking-wide text-primary mb-2 block">Why America</span>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Why British Patients Choose American Rehab</h2>
            <p className="text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">The US offers advantages that simply aren't available through the NHS or UK private sector.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {[
              { icon: Clock, title: "No NHS Waiting Lists", desc: "NHS addiction services often involve weeks or months of waiting. US facilities admit within 24-72 hours with full medical detox on-site." },
              { icon: Shield, title: "Complete Privacy from UK Systems", desc: "Treatment records stay in the US, protected by HIPAA law. No GP notifications, no employer disclosures, no UK insurance records." },
              { icon: Star, title: "World-Leading Clinical Care", desc: "Access cutting-edge therapies like NAD+, neurofeedback, EMDR, and psychedelic-assisted treatment not yet available in UK facilities." },
              { icon: MapPin, title: "Healing Environments", desc: "From Malibu's oceanfront to Arizona's desert retreats — therapeutic settings that accelerate recovery far from London's pressure." },
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

      {/* How It Works */}
      <section className="py-16 md:py-20 bg-muted/20">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <span className="text-sm font-semibold uppercase tracking-wide text-primary mb-2 block">Process</span>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">How It Works for UK Patients</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: "1", title: "Apply Online", desc: "Complete our confidential intake form with your treatment needs." },
              { step: "2", title: "Get Matched", desc: "Our UK-experienced advisors match you with ideal US facilities." },
              { step: "3", title: "Arrange Travel", desc: "We coordinate flights, ESTA, and airport transfers." },
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

      {/* Key Considerations */}
      <section className="py-16 md:py-20 bg-background">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-10">
            <span className="text-sm font-semibold uppercase tracking-wide text-primary mb-2 block">Practical Info</span>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">What UK Patients Need to Know</h2>
          </div>
          <div className="space-y-4">
            {[
              { icon: Plane, title: "Travel & Entry", content: "UK citizens travel visa-free under the ESTA Visa Waiver Program for stays up to 90 days. Apply online at least 72 hours before travel. For longer programmes, a B-2 medical visa is recommended. Our team provides supporting documentation." },
              { icon: FileText, title: "Costs & Payment", content: "UK patients typically invest £12,000–£65,000+ per month for US treatment, depending on the facility level. This is self-pay as NHS coverage doesn't extend abroad. Wire transfers, credit cards, and payment plans are accepted. Many families find the investment worthwhile for immediate access and premium care." },
              { icon: Heart, title: "Aftercare & Return", content: "We coordinate your return to the UK with continuing care: local therapists, SMART Recovery and 12-step meetings, and virtual follow-up sessions with your US clinical team to maintain progress." },
            ].map((item) => (
              <div key={item.title} className="flex gap-4 p-6 rounded-xl border border-border/50 bg-muted/20">
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
      <section className="py-16 md:py-20 bg-muted/20">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 text-primary mb-3">
              <MapPin className="h-5 w-5" />
              <span className="text-sm font-semibold uppercase tracking-wide">Destinations</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Popular US Destinations for UK Patients</h2>
            <p className="text-base text-muted-foreground max-w-2xl mx-auto">British clients frequently choose these locations for their world-class facilities and direct flight access.</p>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { state: "California", desc: "Malibu luxury, LA celebrity rehab, year-round sun", emoji: "🌴", href: "/us-rehab/luxury-rehab-california" },
              { state: "Florida", desc: "Recovery capital of America, beachside programmes", emoji: "🌺", href: "/us-rehab/luxury-rehab-florida" },
              { state: "Arizona", desc: "Desert healing, equine therapy, Sedona wellness", emoji: "🏜️", href: "/us-rehab/luxury-rehab-arizona" },
              { state: "New York", desc: "Executive programmes, Hamptons privacy", emoji: "🗽", href: "/rehab-centers/new-york" },
              { state: "Colorado", desc: "Mountain retreats, adventure therapy", emoji: "⛰️", href: "/rehab-centers/colorado" },
              { state: "Texas", desc: "Ranch-style facilities, affordable luxury", emoji: "🤠", href: "/rehab-centers/texas" },
            ].map((dest) => (
              <Link key={dest.state} to={dest.href} className="group block p-5 bg-background rounded-xl border border-border/50 hover:border-primary/20 hover:shadow-md transition-all">
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
      <section className="py-16 md:py-20 bg-background">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-10">
            <span className="text-sm font-semibold uppercase tracking-wide text-primary mb-2 block">FAQ</span>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">UK to US Treatment FAQs</h2>
            <p className="text-base text-muted-foreground">Common questions from British patients considering treatment in America.</p>
          </div>
          <div className="space-y-4">
            {[
              { q: "Can UK citizens get rehab treatment in America?", a: "Yes. US rehab centres welcome patients from the United Kingdom. Most facilities have experience with international admissions and can coordinate ESTA documentation, travel logistics, and aftercare planning for UK residents." },
              { q: "Is US rehab better than UK rehab?", a: "The US offers distinct advantages: immediate admission (no NHS waiting lists), complete privacy from UK systems, access to luxury and executive programmes, and innovative treatments not yet available in the UK. Many British residents choose US treatment for discretion and premium clinical care." },
              { q: "How much does US rehab cost for UK patients?", a: "UK patients typically invest £12,000–£65,000+ per month, depending on the facility and luxury level. This is self-pay as NHS coverage doesn't extend to US facilities. Many find the investment worthwhile for immediate access and world-class care." },
              { q: "What travel documents do I need?", a: "UK citizens enter the US visa-free via the ESTA Visa Waiver Program for treatment stays up to 90 days. For longer programmes, a B-2 tourist visa for medical treatment is recommended. Our team provides supporting documentation." },
              { q: "Will my treatment be confidential from UK employers?", a: "Absolutely. US treatment facilities operate independently of UK healthcare systems. Records are protected by US HIPAA laws and cannot be shared with UK employers, insurers, or government agencies without your explicit consent." },
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
                  <span>UK Patient Specialist Team</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Start Your American Recovery Journey</h2>
                <p className="text-base text-muted-foreground mb-8 max-w-xl mx-auto leading-relaxed">Our UK-experienced advisors understand your needs. Get placed in premium US facilities with full travel coordination.</p>
                <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 mb-8">
                  {["Confidential Consultation", "ESTA Guidance", "Airport Transfers"].map(item => (
                    <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
                <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground text-base px-8 py-6 shadow-md">
                  <Link to="/international/apply" className="flex items-center gap-2">Apply for Treatment <ArrowRight className="h-5 w-5" /></Link>
                </Button>
              </div>
            </div>
          </div>
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
                  { href: "/us-rehab/international-patients", label: "All International" },
                ].map((link) => (
                  <Link key={link.href} to={link.href} className="group flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted/40 transition-colors">
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
