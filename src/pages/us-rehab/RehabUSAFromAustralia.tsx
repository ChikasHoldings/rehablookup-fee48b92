import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { Layout } from "@/components/layout/Layout";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";
import { InternationalPageHero } from "./components";
import { ArrowRight, CheckCircle, MapPin, Shield, Clock, Star, ChevronRight, Plane, FileText, Heart, Sparkles, Zap, Phone } from "lucide-react";
import heroImage from "@/assets/hero-australia-rehab.jpg";

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

      <div className="container mx-auto px-4 pt-4">
        <BreadcrumbNav items={[
          { label: "US Rehab", href: "/us-rehab" },
          { label: "Australian Patients" },
        ]} />
      </div>

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

      {/* Why Australians Choose US */}
      <section className="py-16 md:py-20 bg-background">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-12">
            <span className="text-sm font-semibold uppercase tracking-wide text-primary mb-2 block">Why America</span>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Why Australian Patients Choose American Rehab</h2>
            <p className="text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">The US offers treatment innovation, scale, and privacy that Australia's smaller market simply can't match.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {[
              { icon: Zap, title: "Cutting-Edge Innovation", desc: "Access therapies like NAD+, ketamine-assisted treatment, neurofeedback, and psychedelic research programmes that haven't yet reached Australia." },
              { icon: Shield, title: "Geographic Distance = Privacy", desc: "Treatment 15,000km from home provides complete separation from your Australian community, workplace, and social circles. True fresh start." },
              { icon: Clock, title: "No Medicare Wait Times", desc: "Australian public mental health and addiction services have extensive waiting periods. US facilities admit within 24-72 hours with full medical detox." },
              { icon: MapPin, title: "Diverse Healing Environments", desc: "From California surf therapy to Arizona desert retreats to Colorado mountain lodges — therapeutic settings that accelerate recovery." },
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
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">How It Works for Australian Patients</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: "1", title: "Apply Online", desc: "Complete our confidential intake form with your treatment preferences." },
              { step: "2", title: "Get Matched", desc: "Our team matches you with US facilities suited to your clinical needs." },
              { step: "3", title: "Arrange Travel", desc: "We coordinate ESTA, flights from Sydney/Melbourne, and arrival logistics." },
              { step: "4", title: "Begin Recovery", desc: "Arrive at your facility and begin your personalised treatment programme." },
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
      <section className="py-16 md:py-20 bg-background">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-10">
            <span className="text-sm font-semibold uppercase tracking-wide text-primary mb-2 block">Practical Info</span>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">What Australian Patients Need to Know</h2>
          </div>
          <div className="space-y-4">
            {[
              { icon: Plane, title: "Travel & Entry", content: "Australian citizens enter the US visa-free via the ESTA Visa Waiver Program for treatment stays up to 90 days. Direct flights from Sydney and Melbourne to LA are approximately 14 hours. For longer programmes, a B-2 medical visa is recommended." },
              { icon: FileText, title: "Costs & Payment", content: "Australian patients typically invest AUD $20,000–$80,000+ per month for US treatment. Medicare and private Australian health insurance don't cover overseas treatment. Wire transfers, credit cards, and payment plans are accepted. Many families find the investment worthwhile for premium, immediate care." },
              { icon: Heart, title: "Aftercare & Return", content: "We coordinate your return to Australia with local therapists, support groups, and virtual follow-up sessions with your US clinical team. Many facilities offer alumni networks that span time zones." },
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
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Popular US Destinations for Australians</h2>
            <p className="text-base text-muted-foreground max-w-2xl mx-auto">Australian clients frequently choose these locations for their climate, direct flight access, and world-class facilities.</p>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { state: "California", desc: "Direct flights from Sydney, Malibu luxury, surf therapy", emoji: "🌴", href: "/us-rehab/luxury-rehab-california" },
              { state: "Florida", desc: "Warm climate, beachside recovery, diverse programmes", emoji: "🌺", href: "/us-rehab/luxury-rehab-florida" },
              { state: "Arizona", desc: "Desert healing, equine therapy, Sedona wellness", emoji: "🏜️", href: "/us-rehab/luxury-rehab-arizona" },
              { state: "Hawaii", desc: "Closest US state, tropical healing, holistic focus", emoji: "🌺", href: "/rehab-centers/hawaii" },
              { state: "Colorado", desc: "Mountain retreats, adventure therapy", emoji: "⛰️", href: "/rehab-centers/colorado" },
              { state: "Texas", desc: "Ranch-style luxury, expansive facilities", emoji: "🤠", href: "/rehab-centers/texas" },
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
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Australia to US Treatment FAQs</h2>
          </div>
          <div className="space-y-4">
            {[
              { q: "Can Australians get addiction treatment in the US?", a: "Yes. American rehab centres welcome Australian patients. The US offers treatment variety, specialty programmes, and luxury accommodations that may not be available in Australia. Many Aussies choose US treatment for privacy, innovation, and immediate admission." },
              { q: "How does US rehab compare to Australian treatment?", a: "The US has the world's largest private rehab industry, offering more variety in treatment approaches, luxury levels, and specialisations. American facilities often access newer therapies and medications before they reach Australia." },
              { q: "What's the cost for Australians?", a: "Australian patients typically invest AUD $20,000–$80,000+ per month depending on the facility. Medicare doesn't cover overseas treatment, so this is private-pay. Many consider it worthwhile for premium care and a fresh-start environment." },
              { q: "Do I need a visa?", a: "Australian citizens use ESTA (Visa Waiver Program) for stays up to 90 days — no visa appointment needed. For longer programmes, a B-2 medical visa is recommended. Our team provides facility documentation to support applications." },
              { q: "Will my Australian employer find out?", a: "No. US treatment is completely confidential and separate from Australian systems. Records are protected by US HIPAA laws and cannot be accessed by Australian employers, insurers, or government agencies." },
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
                  <span>Australian Patient Specialist Team</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Start Your American Recovery Journey</h2>
                <p className="text-base text-muted-foreground mb-8 max-w-xl mx-auto leading-relaxed">Our team understands Australian patient needs. Get placed in premium US facilities with full travel coordination.</p>
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
                  { href: "/us-rehab/uk-patients", label: "UK Patients" },
                  { href: "/us-rehab/canadian-patients", label: "Canadian Patients" },
                  { href: "/us-rehab/uae-middle-east", label: "UAE & Middle East" },
                  { href: "/us-rehab/european-patients", label: "European Patients" },
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
                  { href: "/us-rehab/best-rehab-usa", label: "Best Rehab in USA" },
                  { href: "/us-rehab/alcohol-rehab-usa", label: "Alcohol Rehab USA" },
                  { href: "/us-rehab/drug-rehab-usa", label: "Drug Rehab USA" },
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
