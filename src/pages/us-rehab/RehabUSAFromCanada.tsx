import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { Layout } from "@/components/layout/Layout";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";
import { InternationalPageHero } from "./components";
import { ArrowRight, CheckCircle, MapPin, Shield, Clock, Globe, Users, Star, Phone, ChevronRight, Plane, FileText, Heart } from "lucide-react";
import heroImage from "@/assets/hero-canada-rehab.jpg";

export default function RehabUSAFromCanada() {
  return (
    <Layout>
      <SEO
        title="Rehab in USA for Canadians | Private Addiction Treatment from Canada"
        description="Canadians seeking private addiction treatment in the United States. Skip wait times, access world-class rehab facilities. Insurance guidance and visa support."
        canonical="/us-rehab/canadian-patients"
        keywords={["rehab in USA from Canada", "Canadian addiction treatment USA", "private rehab for Canadians"]}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "MedicalWebPage",
          name: "US Rehab for Canadian Patients",
          description: "Guide for Canadians seeking addiction treatment in the United States",
          audience: { "@type": "MedicalAudience", audienceType: "Patient", geographicArea: { "@type": "Country", name: "Canada" } },
        }}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "US Treatment", url: "/us-rehab" },
          { name: "Canadian Patients", url: "/us-rehab/canadian-patients" },
        ]}
      />




      <InternationalPageHero
        flag="🇨🇦"
        badge="For Canadian Residents"
        title="World-Class Addiction Treatment in the USA — For Canadians"
        subtitle="Skip the Wait Times. Access Premium US Programs."
        description="Access private, evidence-based rehab programs across the United States with personalized support from intake to aftercare."
        trustPoints={["No Visa Required", "24-72 Hour Admission", "100% Confidential"]}
        heroImage={heroImage}
        heroAlt="Mountain luxury rehab facility for Canadian patients"
      />

      <main className="flex-1">

        {/* Why Canadians Choose US Rehab */}
        <section className="py-12 md:py-20">
          <div className="container max-w-4xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-8 text-center">
              Why Canadians Choose American Rehab
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {[
                { icon: Clock, title: "No Wait Times", desc: "Canadian public health wait lists can stretch 3-6 months for residential treatment. US facilities often admit within 24-72 hours." },
                { icon: Shield, title: "Private & Confidential", desc: "Discrete, luxury programs away from your community. Complete privacy for professionals, executives, and public figures." },
                { icon: Star, title: "World-Class Programs", desc: "Access JCAHO-accredited facilities with cutting-edge treatments: NAD+ therapy, neurofeedback, trauma-focused modalities." },
                { icon: MapPin, title: "Ideal Locations", desc: "From California beaches to Arizona deserts to Florida coastlines — healing environments not available in Canada." },
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

        {/* How It Works */}
        <section className="py-12 md:py-16 bg-muted/30 border-y border-border">
          <div className="container max-w-4xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground text-center mb-10">
              How It Works for Canadian Patients
            </h2>
            <div className="grid md:grid-cols-4 gap-6">
              {[
                { step: "1", title: "Apply Online", desc: "Complete our confidential intake form with your treatment needs and preferences." },
                { step: "2", title: "Get Matched", desc: "Our advisors match you with facilities that accept Canadian patients and meet your needs." },
                { step: "3", title: "Arrange Travel", desc: "We help coordinate travel logistics, border crossing documentation, and admissions." },
                { step: "4", title: "Begin Treatment", desc: "Arrive at your facility and begin your personalized recovery program." },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 font-bold text-lg">
                    {item.step}
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Key Considerations */}
        <section className="py-12 md:py-20">
          <div className="container max-w-4xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-8">
              What Canadian Patients Need to Know
            </h2>
            <div className="space-y-6">
              {[
                { icon: FileText, title: "Insurance & Payment", content: "Most Canadian provincial health plans (OHIP, MSP, etc.) do not cover treatment in the US. Many families use private insurance, self-pay, or employer EAP programs. We help you understand costs upfront and explore payment options." },
                { icon: Plane, title: "Travel & Entry", content: "Canadians can enter the US for medical treatment with a valid passport. No visa required for stays under 6 months. We provide guidance on border crossing and what to tell customs officers." },
                { icon: Heart, title: "Aftercare Planning", content: "We help coordinate your return to Canada with continuing care: local therapists, support groups, and virtual follow-up with your US treatment team." },
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

        {/* Popular Destinations */}
        <section className="py-12 md:py-16 bg-muted/30 border-y border-border">
          <div className="container max-w-4xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground text-center mb-8">
              Popular US Destinations for Canadian Patients
            </h2>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { state: "California", desc: "Luxury rehab, holistic programs, year-round sun", href: "/us-rehab/luxury-rehab-california" },
                { state: "Florida", desc: "Affordable quality programs, warm climate", href: "/us-rehab/luxury-rehab-florida" },
                { state: "Arizona", desc: "Desert healing, world-class detox facilities", href: "/us-rehab/luxury-rehab-arizona" },
                { state: "New York", desc: "Urban programs, close to the border", href: "/rehab-centers/new-york" },
                { state: "Washington", desc: "Close to BC, Pacific Northwest programs", href: "/rehab-centers/washington" },
                { state: "Montana", desc: "Wilderness therapy, close to Alberta", href: "/rehab-centers/montana" },
              ].map((dest) => (
                <Link key={dest.state} to={dest.href} className="group block rounded-xl border border-border bg-card p-5 hover:border-primary/30 hover:shadow-md transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{dest.state}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">{dest.desc}</p>
                </Link>
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
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                    Ready to Begin Your Recovery?
                  </h2>
                  <p className="text-base text-muted-foreground mb-8 max-w-xl mx-auto leading-relaxed">
                    Our team specializes in helping Canadian patients access the best US treatment programs. Confidential, no-obligation consultation.
                  </p>
                  <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 mb-8">
                    {["Confidential Consultation", "No-Obligation", "Canadian Specialist Advisors"].map(item => (
                      <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link to="/international/apply">
                      <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 text-base font-semibold px-8 py-6 shadow-md">
                        Apply for Treatment
                        <ArrowRight className="h-5 w-5" />
                      </Button>
                    </Link>
                    <Link to="/concierge">
                      <Button size="lg" variant="outline" className="gap-2 text-base px-8 py-6 border-border">
                        <Phone className="h-4 w-4" />
                        Talk to Our Team
                      </Button>
                    </Link>
                  </div>
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
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">More for International Patients</h3>
                <div className="space-y-1.5">
                  {[
                    { href: "/us-rehab/uk-patients", label: "Rehab for UK Residents" },
                    { href: "/us-rehab/uae-middle-east", label: "Rehab for UAE & Middle East" },
                    { href: "/us-rehab/european-patients", label: "Rehab for European Patients" },
                    { href: "/us-rehab/australian-patients", label: "Rehab for Australian Patients" },
                    { href: "/us-rehab/international-patients", label: "All International Patients" },
                  ].map((link) => (
                    <Link key={link.href} to={link.href} className="group flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted/60 transition-colors">
                      <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{link.label}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                    </Link>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Explore US Treatment</h3>
                <div className="space-y-1.5">
                  {[
                    { href: "/us-rehab/best-rehab-usa", label: "Best Rehab in USA" },
                    { href: "/us-rehab/luxury-rehab-america", label: "Luxury Rehab in America" },
                    { href: "/us-rehab/alcohol-rehab-usa", label: "Alcohol Rehab USA" },
                    { href: "/us-rehab/drug-rehab-usa", label: "Drug Rehab USA" },
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
    </Layout>
  );
}
