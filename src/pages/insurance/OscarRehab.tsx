import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO, generateFAQSchema } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";
import { FeaturedCentersSection } from "@/components/seo/FeaturedCentersSection";
import { InternalLinkingSection, treatmentTypeLinks, nearMeLinks, resourceLinks } from "@/components/seo/InternalLinkingSection";
import { StateLinksSection } from "@/components/treatment/StateLinksSection";
import { Shield, CheckCircle, ArrowRight, Phone, MapPin, FileText, Clock, DollarSign, Building2, Users, Stethoscope, Heart, AlertCircle } from "lucide-react";

const coverageDetails = [
  { icon: Stethoscope, title: "Medical Detox", coverage: "Covered", details: "Medically necessary detoxification services" },
  { icon: Building2, title: "Inpatient Rehab", coverage: "Prior Auth Required", details: "Residential treatment with pre-authorization" },
  { icon: Users, title: "Outpatient Programs", coverage: "Covered", details: "IOP, PHP, and outpatient counseling" },
  { icon: Heart, title: "Behavioral Health", coverage: "Essential Benefit", details: "Mental health and substance abuse as ACA benefit" },
];

const faqs = [
  { question: "Does Oscar Health cover addiction treatment?", answer: "Yes. Oscar Health is an ACA-compliant insurer, and all plans include substance use disorder treatment as an essential health benefit. Coverage includes detox, inpatient rehabilitation, outpatient programs, counseling, and medication-assisted treatment." },
  { question: "What makes Oscar different for rehab coverage?", answer: "Oscar Health is known for its tech-forward approach with a user-friendly app, free 24/7 doctor on call, and dedicated care team. Members can easily navigate behavioral health benefits and find in-network providers through Oscar's digital tools." },
  { question: "Does Oscar require pre-authorization for rehab?", answer: "Oscar typically requires prior authorization for inpatient and residential treatment. Their care team can help guide you through the authorization process and connect you with in-network facilities." },
  { question: "Where is Oscar Health available?", answer: "Oscar Health offers plans in 22+ states through the ACA Marketplace. Availability varies by state and county. Check the Healthcare.gov marketplace or Oscar's website for availability in your area." },
  { question: "Does Oscar cover telehealth for addiction counseling?", answer: "Yes, Oscar provides robust telehealth benefits including virtual behavioral health counseling and follow-up care, which can be especially valuable for ongoing addiction recovery support." },
];

const verificationSteps = [
  { step: 1, title: "Log Into Oscar App or Website", description: "Access your benefits through Oscar's digital platform" },
  { step: 2, title: "Contact Your Care Team", description: "Oscar assigns a dedicated care team to each member" },
  { step: 3, title: "Verify Behavioral Health Benefits", description: "Review your SUD treatment coverage details" },
  { step: 4, title: "Find In-Network Providers", description: "Use Oscar's directory to locate treatment facilities" },
];

export default function OscarRehab() {
  const faqSchema = generateFAQSchema(faqs);
  return (
    <Layout>
      <SEO title="Oscar Health Rehab Coverage | Addiction Treatment Insurance" description="Find addiction treatment centers that accept Oscar Health insurance. Learn about Oscar's ACA Marketplace coverage for detox, rehab, and outpatient programs." canonical="/insurance/oscar-rehab" keywords={["Oscar Health rehab coverage", "Oscar addiction treatment", "Oscar Health drug rehab", "Oscar insurance rehab", "rehab that takes Oscar Health"]} breadcrumbs={[{ name: "Home", url: "/" }, { name: "Insurance", url: "/insurance" }, { name: "Oscar Rehab Coverage", url: "/insurance/oscar-rehab" }]} structuredData={faqSchema} />

      <section className="relative overflow-hidden bg-primary py-10 md:py-14">
        <div className="container">
          <BreadcrumbNav className="mb-4" items={[{ label: "Insurance", href: "/insurance" }, { label: "Oscar Rehab Coverage" }]} />
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="bg-white/20 text-white border-0 mb-4">Tech-Forward ACA Insurer</Badge>
            <h1 className="mb-4 font-display text-2xl font-bold text-primary-foreground md:text-3xl lg:text-4xl">Oscar Health Rehab Coverage</h1>
            <p className="text-primary-foreground/80 text-sm md:text-base max-w-2xl mx-auto">Oscar Health provides ACA-compliant plans with comprehensive behavioral health benefits and a tech-forward approach to addiction treatment coverage.</p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild size="lg" variant="secondary"><Link to="/rehab-centers"><MapPin className="mr-2 h-4 w-4" />Find Oscar-Accepting Centers</Link></Button>
              <Button asChild size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10"><Link to="/insurance"><Shield className="mr-2 h-4 w-4" />All Insurance Options</Link></Button>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-muted/50 py-4"><div className="container"><div className="flex items-center justify-center gap-3 text-sm text-muted-foreground"><AlertCircle className="h-4 w-4 text-primary shrink-0" /><p><span className="font-medium text-foreground">Coverage varies by plan level.</span> Contact Oscar's care team to verify your specific behavioral health benefits.</p></div></div></section>

      <section className="py-10 md:py-14"><div className="container"><div className="mb-8 text-center"><h2 className="font-display text-xl font-bold text-foreground md:text-2xl">What Oscar Covers for Addiction Treatment</h2><p className="mt-2 text-muted-foreground max-w-2xl mx-auto">ACA essential health benefits for substance use disorders</p></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{coverageDetails.map((item) => { const Icon = item.icon; return (<div key={item.title} className="rounded-xl border border-border bg-card p-5"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4"><Icon className="h-5 w-5" /></div><h3 className="font-semibold text-foreground mb-1">{item.title}</h3><Badge variant="outline" className="mb-2 text-xs">{item.coverage}</Badge><p className="text-sm text-muted-foreground">{item.details}</p></div>); })}</div></div></section>

      <section className="border-t border-border bg-muted/30 py-10 md:py-14"><div className="container"><div className="mb-8 text-center"><h2 className="font-display text-xl font-bold text-foreground md:text-2xl">How to Verify Your Oscar Benefits</h2></div><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">{verificationSteps.map((step) => (<div key={step.step} className="relative rounded-xl border border-border bg-card p-5"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm mb-4">{step.step}</div><h3 className="font-semibold text-foreground mb-2">{step.title}</h3><p className="text-sm text-muted-foreground">{step.description}</p></div>))}</div></div></section>

      <section className="py-10 md:py-14"><div className="container"><div className="grid md:grid-cols-2 gap-8 items-center"><div><h2 className="font-display text-xl font-bold text-foreground md:text-2xl mb-4">Oscar Behavioral Health Benefits</h2><ul className="space-y-3">{["ACA-compliant essential health benefit coverage", "Dedicated care team for each member", "Easy-to-use app for benefits navigation", "Telehealth behavioral health sessions", "Free 24/7 doctor on call for guidance"].map((b, i) => (<li key={i} className="flex items-start gap-3"><CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" /><span className="text-muted-foreground">{b}</span></li>))}</ul></div><div className="bg-muted/50 rounded-xl p-6 border border-border"><div className="flex items-center gap-3 mb-4"><Phone className="h-6 w-6 text-primary" /><h3 className="font-semibold text-foreground">Oscar Care Team</h3></div><p className="text-muted-foreground text-sm mb-4">Oscar assigns a dedicated care team to help navigate your benefits.</p><div className="space-y-2 text-sm"><p className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /><span>24/7 doctor on call</span></p><p className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" /><span>Use the Oscar app for quick access</span></p></div></div></div></div></section>

      <FeaturedCentersSection title="Treatment Centers Accepting Oscar" description="Verified facilities that work with Oscar Health insurance" limit={8} className="border-t border-border" />

      <section className="border-t border-border bg-muted/30 py-10 md:py-14"><div className="container"><div className="mb-8 text-center"><h2 className="font-display text-xl font-bold text-foreground md:text-2xl">Oscar Coverage Questions</h2></div><div className="mx-auto max-w-3xl space-y-4">{faqs.map((faq, i) => (<div key={i} className="rounded-xl border border-border bg-card p-5"><h3 className="font-semibold text-foreground mb-2">{faq.question}</h3><p className="text-sm text-muted-foreground">{faq.answer}</p></div>))}</div></div></section>

      <StateLinksSection title="Oscar Health Rehab Coverage by State" subtitle="Find Oscar-accepting treatment centers in your state" basePath="/insurance/oscar-rehab" buttonPrefix="Oscar in" />

      <section className="py-10 md:py-14"><div className="container"><div className="mx-auto max-w-2xl text-center"><h2 className="font-display text-xl font-bold text-foreground md:text-2xl mb-4">Find Treatment Centers That Accept Oscar</h2><p className="text-muted-foreground mb-6">Search our directory for rehab facilities accepting Oscar Health insurance.</p><div className="flex flex-col sm:flex-row items-center justify-center gap-3"><Button asChild size="lg"><Link to="/rehab-centers">Search Treatment Centers<ArrowRight className="ml-2 h-4 w-4" /></Link></Button><Button asChild size="lg" variant="outline"><Link to="/cost-estimator"><DollarSign className="mr-2 h-4 w-4" />Estimate Costs</Link></Button></div></div></div></section>

      <InternalLinkingSection title="Explore More Resources" description="Learn about treatment options and find care near you" variant="grid" groups={[{ title: "Treatment Programs", links: treatmentTypeLinks.slice(0, 5) }, { title: "Find Treatment Near You", links: nearMeLinks.slice(0, 5) }, { title: "Recovery Guides", links: resourceLinks.slice(0, 5) }]} />

      <section className="border-t border-border bg-muted/30 py-8"><div className="container"><div className="flex flex-wrap items-center justify-center gap-4 text-sm"><span className="text-muted-foreground">Other Insurance Options:</span><Link to="/insurance/ambetter-rehab" className="text-primary hover:underline">Ambetter Coverage</Link><Link to="/insurance/bcbs-treatment" className="text-primary hover:underline">BCBS Coverage</Link><Link to="/insurance/cigna-rehab" className="text-primary hover:underline">Cigna Coverage</Link><Link to="/insurance" className="text-primary hover:underline">All Insurance →</Link></div></div></section>
    </Layout>
  );
}
