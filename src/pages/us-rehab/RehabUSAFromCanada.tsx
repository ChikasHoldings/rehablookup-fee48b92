import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { Layout } from "@/components/layout/Layout";
import { InternationalPageHero } from "./components";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle, MapPin, Shield, Clock, Globe, Users, Star, ChevronRight, Plane, FileText, Heart, Sparkles, Building2 } from "lucide-react";
import heroImage from "@/assets/hero-canada-rehab.jpg";

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
};

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

      {/* Stats Bar */}
      <section className="border-b border-border bg-primary text-primary-foreground py-3">
        <div className="container px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center max-w-4xl mx-auto">
            {[
              { icon: Plane, value: "3-5hr", label: "Flight Time" },
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

      {/* Why Canadians Choose US Rehab */}
      <section className="py-14 md:py-20 bg-background">
        <div className="container mx-auto px-4 max-w-6xl">
          <motion.div {...fadeUp} transition={{ duration: 0.4 }} className="text-center mb-12">
            <p className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-wide mb-2">Why America</p>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-3">Why Canadians Choose American Rehab</h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">The US offers treatment access, innovation, and privacy that Canada's public system can't match.</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            {[
              { icon: Clock, title: "No Wait Times", desc: "Canadian public wait lists stretch 3-6 months. US facilities admit within 24-72 hours with full medical detox." },
              { icon: Shield, title: "Private & Confidential", desc: "Discreet, luxury programs away from your community. Complete privacy for professionals and executives." },
              { icon: Star, title: "World-Class Programs", desc: "JCAHO-accredited facilities with cutting-edge treatments: NAD+ therapy, neurofeedback, trauma modalities." },
              { icon: MapPin, title: "Ideal Locations", desc: "California beaches, Arizona deserts, Florida coastlines — healing environments unavailable in Canada." },
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
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-3">How It Works for Canadian Patients</h2>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">A streamlined process designed for Canadian residents</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-5">
            {[
              { step: "1", title: "Apply Online", desc: "Complete our confidential intake form with your treatment needs and preferences." },
              { step: "2", title: "Get Matched", desc: "Our advisors match you with facilities that accept Canadian patients." },
              { step: "3", title: "Arrange Travel", desc: "We coordinate travel logistics, border documentation, and admissions." },
              { step: "4", title: "Begin Treatment", desc: "Arrive at your facility and begin your personalized recovery program." },
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
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-3">What Canadian Patients Need to Know</h2>
          </motion.div>
          <div className="space-y-4">
            {[
              { icon: FileText, title: "Insurance & Payment", content: "Most provincial health plans (OHIP, MSP, etc.) don't cover US treatment. Many families use private insurance, self-pay, or employer EAP programs. We help you understand costs upfront and explore payment options." },
              { icon: Plane, title: "Travel & Entry", content: "Canadians can enter the US for medical treatment with a valid passport. No visa required for stays under 6 months. We provide guidance on border crossing and customs." },
              { icon: Heart, title: "Aftercare Planning", content: "We coordinate your return to Canada with continuing care: local therapists, support groups, and virtual follow-up with your US treatment team." },
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
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-3">Popular US Destinations for Canadian Patients</h2>
          </motion.div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { state: "California", desc: "Luxury rehab, holistic programs, year-round sun", href: "/us-rehab/luxury-rehab-california" },
              { state: "Florida", desc: "Affordable quality programs, warm climate", href: "/us-rehab/luxury-rehab-florida" },
              { state: "Arizona", desc: "Desert healing, world-class detox facilities", href: "/us-rehab/luxury-rehab-arizona" },
              { state: "New York", desc: "Urban programs, close to the border", href: "/rehab-centers/new-york" },
              { state: "Washington", desc: "Close to BC, Pacific Northwest programs", href: "/rehab-centers/washington" },
              { state: "Montana", desc: "Wilderness therapy, close to Alberta", href: "/rehab-centers/montana" },
            ].map((dest, i) => (
              <motion.div key={dest.state} {...fadeUp} transition={{ duration: 0.4, delay: i * 0.06 }}>
                <Link to={dest.href} className="group block p-5 bg-background rounded-xl border hover:border-primary/30 hover:shadow-lg transition-all h-full">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{dest.state}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">{dest.desc}</p>
                </Link>
              </motion.div>
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
                  <span>Canadian Patient Specialist Team</span>
                </div>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-3">Ready to Begin Your Recovery?</h2>
                <p className="text-sm sm:text-base text-muted-foreground mb-8 max-w-xl mx-auto leading-relaxed">Our team specializes in helping Canadian patients access the best US treatment programs.</p>
                <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 mb-8">
                  {["Confidential Consultation", "No-Obligation", "Canadian Specialist Advisors"].map(item => (
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
                  { href: "/us-rehab/best-rehab-usa", label: "Best Rehab in USA" },
                  { href: "/us-rehab/luxury-rehab-america", label: "Luxury Rehab" },
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
