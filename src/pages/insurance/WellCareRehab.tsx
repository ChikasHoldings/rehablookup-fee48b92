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
  { icon: Stethoscope, title: "Medical Detox", coverage: "Covered", details: "Medically supervised detoxification" },
  { icon: Building2, title: "Inpatient Rehab", coverage: "Prior Auth Required", details: "Residential treatment with authorization" },
  { icon: Users, title: "Outpatient Programs", coverage: "Covered", details: "IOP, PHP, and outpatient counseling" },
  { icon: Heart, title: "MAT Programs", coverage: "Included", details: "Medication-assisted treatment for opioid and alcohol use" },
];

const faqs = [
  { question: "Does WellCare cover addiction treatment?", answer: "Yes. WellCare (now part of Centene) provides behavioral health coverage for substance use disorders through its Medicaid, Medicare Advantage, and ACA Marketplace plans. Coverage includes detox, inpatient and outpatient rehab, counseling, and medication-assisted treatment." },
  { question: "What WellCare plans cover substance abuse treatment?", answer: "WellCare Medicaid managed care, Medicare Advantage, and Marketplace plans all include behavioral health benefits covering addiction treatment. Specific coverage details vary by state and plan type." },
  { question: "Do I need prior authorization for WellCare rehab coverage?", answer: "Inpatient and residential treatment typically require prior authorization. Emergency detox services may not need pre-approval. Contact WellCare member services to confirm requirements for your specific plan." },
  { question: "Does WellCare cover medication-assisted treatment (MAT)?", answer: "Yes, WellCare covers FDA-approved MAT medications including buprenorphine, methadone, and naltrexone when prescribed as part of a comprehensive treatment program." },
  { question: "How do I verify my WellCare behavioral health benefits?", answer: "Call the member services number on your WellCare ID card, visit the WellCare website, or ask a treatment facility to verify your benefits on your behalf." },
];

const verificationSteps = [
  { step: 1, title: "Call WellCare Member Services", description: "Use the number on your WellCare ID card" },
  { step: 2, title: "Ask About Behavioral Health", description: "Request substance abuse treatment benefit details" },
  { step: 3, title: "Get Prior Authorization", description: "Obtain approval for residential or inpatient treatment" },
  { step: 4, title: "Find In-Network Providers", description: "Locate WellCare-approved treatment facilities" },
];

export default function WellCareRehab() {
  const faqSchema = generateFAQSchema(faqs);
  return (
    <Layout>
      <SEO title="WellCare Rehab Coverage | Addiction Treatment Insurance" description="Find addiction treatment centers that accept WellCare insurance. Learn about WellCare's behavioral health coverage for detox, rehab, and outpatient programs." canonical="/insurance/wellcare-rehab" keywords={["WellCare rehab coverage", "WellCare addiction treatment", "WellCare drug rehab", "WellCare behavioral health", "rehab that takes WellCare"]} breadcrumbs={[{ name: "Home", url: "/" }, { name: "Insurance", url: "/insurance" }, { name: "WellCare Rehab Coverage", url: "/insurance/wellcare-rehab" }]} structuredData={[faqSchema, { "@context": "https://schema.org", "@type": "MedicalWebPage", specialty: "Addiction Medicine", lastReviewed: new Date().toISOString().split("T")[0] }]} />

      <section className="relative overflow-hidden bg-primary py-10 md:py-14">
        <div className="container">
          <BreadcrumbNav className="mb-4" items={[{ label: "Insurance", href: "/insurance" }, { label: "WellCare Rehab Coverage" }]} />
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="bg-white/20 text-white border-0 mb-4">Medicaid & Medicare Insurer</Badge>
            <h1 className="mb-4 font-display text-2xl font-bold text-primary-foreground md:text-3xl lg:text-4xl">WellCare Rehab Coverage</h1>
            <p className="text-primary-foreground/80 text-sm md:text-base max-w-2xl mx-auto">WellCare provides comprehensive behavioral health coverage including addiction treatment through Medicaid and Medicare Advantage plans.</p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild size="lg" variant="secondary"><Link to="/rehab-centers"><MapPin className="mr-2 h-4 w-4" />Find WellCare-Accepting Centers</Link></Button>
              <Button asChild size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10"><Link to="/insurance"><Shield className="mr-2 h-4 w-4" />All Insurance Options</Link></Button>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-muted/50 py-4"><div className="container"><div className="flex items-center justify-center gap-3 text-sm text-muted-foreground"><AlertCircle className="h-4 w-4 text-primary shrink-0" /><p><span className="font-medium text-foreground">Coverage varies by plan and state.</span> Contact WellCare to verify your specific behavioral health benefits.</p></div></div></section>

      <section className="py-10 md:py-14"><div className="container"><div className="mb-8 text-center"><h2 className="font-display text-xl font-bold text-foreground md:text-2xl">What WellCare Covers for Addiction Treatment</h2><p className="mt-2 text-muted-foreground max-w-2xl mx-auto">Behavioral health benefits for substance use disorder treatment</p></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{coverageDetails.map((item) => { const Icon = item.icon; return (<div key={item.title} className="rounded-xl border border-border bg-card p-5"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4"><Icon className="h-5 w-5" /></div><h3 className="font-semibold text-foreground mb-1">{item.title}</h3><Badge variant="outline" className="mb-2 text-xs">{item.coverage}</Badge><p className="text-sm text-muted-foreground">{item.details}</p></div>); })}</div></div></section>

      <section className="border-t border-border bg-muted/30 py-10 md:py-14"><div className="container"><div className="mb-8 text-center"><h2 className="font-display text-xl font-bold text-foreground md:text-2xl">How to Verify Your WellCare Benefits</h2></div><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">{verificationSteps.map((step) => (<div key={step.step} className="relative rounded-xl border border-border bg-card p-5"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm mb-4">{step.step}</div><h3 className="font-semibold text-foreground mb-2">{step.title}</h3><p className="text-sm text-muted-foreground">{step.description}</p></div>))}</div></div></section>

      <section className="py-10 md:py-14"><div className="container"><div className="grid md:grid-cols-2 gap-8 items-center"><div><h2 className="font-display text-xl font-bold text-foreground md:text-2xl mb-4">WellCare Behavioral Health Benefits</h2><ul className="space-y-3">{["Medicaid managed care in multiple states", "Medicare Advantage behavioral health benefits", "Medication-assisted treatment coverage", "Crisis intervention services", "Care coordination and case management"].map((b, i) => (<li key={i} className="flex items-start gap-3"><CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" /><span className="text-muted-foreground">{b}</span></li>))}</ul></div><div className="bg-muted/50 rounded-xl p-6 border border-border"><div className="flex items-center gap-3 mb-4"><Phone className="h-6 w-6 text-primary" /><h3 className="font-semibold text-foreground">WellCare Member Services</h3></div><p className="text-muted-foreground text-sm mb-4">Contact WellCare for coverage and authorization assistance.</p><div className="space-y-2 text-sm"><p className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /><span>24/7 nurse line available</span></p><p className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" /><span>Have your member ID ready</span></p></div></div></div></div></section>

      <FeaturedCentersSection title="Treatment Centers Accepting WellCare" description="Verified facilities that work with WellCare insurance" limit={8} className="border-t border-border" />

      <section className="border-t border-border bg-muted/30 py-10 md:py-14"><div className="container"><div className="mb-8 text-center"><h2 className="font-display text-xl font-bold text-foreground md:text-2xl">WellCare Coverage Questions</h2></div><div className="mx-auto max-w-3xl space-y-4">{faqs.map((faq, i) => (<div key={i} className="rounded-xl border border-border bg-card p-5"><h3 className="font-semibold text-foreground mb-2">{faq.question}</h3><p className="text-sm text-muted-foreground">{faq.answer}</p></div>))}</div></div></section>

      <StateLinksSection title="WellCare Rehab Coverage by State" subtitle="Find WellCare-accepting treatment centers in your state" basePath="/insurance/wellcare-rehab" buttonPrefix="WellCare in" />

      <section className="py-10 md:py-14"><div className="container"><div className="mx-auto max-w-2xl text-center"><h2 className="font-display text-xl font-bold text-foreground md:text-2xl mb-4">Find Treatment Centers That Accept WellCare</h2><p className="text-muted-foreground mb-6">Search our directory for rehab facilities accepting WellCare insurance.</p><div className="flex flex-col sm:flex-row items-center justify-center gap-3"><Button asChild size="lg"><Link to="/rehab-centers">Search Treatment Centers<ArrowRight className="ml-2 h-4 w-4" /></Link></Button><Button asChild size="lg" variant="outline"><Link to="/cost-estimator"><DollarSign className="mr-2 h-4 w-4" />Estimate Costs</Link></Button></div></div></div></section>

      <InternalLinkingSection title="Explore More Resources" description="Learn about treatment options and find care near you" variant="grid" groups={[{ title: "Treatment Programs", links: treatmentTypeLinks.slice(0, 5) }, { title: "Find Treatment Near You", links: nearMeLinks.slice(0, 5) }, { title: "Recovery Guides", links: resourceLinks.slice(0, 5) }]} />

      <section className="border-t border-border bg-muted/30 py-8"><div className="container"><div className="flex flex-wrap items-center justify-center gap-4 text-sm"><span className="text-muted-foreground">Other Insurance Options:</span><Link to="/insurance/medicaid-rehab" className="text-primary hover:underline">Medicaid Coverage</Link><Link to="/insurance/molina-rehab" className="text-primary hover:underline">Molina Coverage</Link><Link to="/insurance/ambetter-rehab" className="text-primary hover:underline">Ambetter Coverage</Link><Link to="/insurance" className="text-primary hover:underline">All Insurance →</Link></div></div></section>
    </Layout>
  );
}
