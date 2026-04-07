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
  { icon: Stethoscope, title: "Medical Detox", coverage: "Covered", details: "Medically supervised detox and withdrawal management" },
  { icon: Building2, title: "Inpatient Rehab", coverage: "Prior Auth Required", details: "Residential treatment with prior authorization" },
  { icon: Users, title: "Outpatient Programs", coverage: "Covered", details: "IOP, PHP, and standard outpatient treatment" },
  { icon: Heart, title: "MAT Programs", coverage: "Included", details: "Medication-assisted treatment for substance use disorders" },
];

const faqs = [
  { question: "Does Molina Healthcare cover addiction treatment?", answer: "Yes. Molina Healthcare covers substance use disorder treatment as part of its behavioral health benefits. Coverage includes detox, inpatient and outpatient rehabilitation, counseling, and medication-assisted treatment across its Medicaid, Medicare, and Marketplace plans." },
  { question: "What Molina plans cover rehab?", answer: "Molina offers coverage through Medicaid managed care, Medicare Advantage, and ACA Marketplace plans in 19+ states. All plans include behavioral health benefits for addiction treatment as required by federal parity laws." },
  { question: "Do I need prior authorization with Molina?", answer: "Most Molina plans require prior authorization for inpatient and residential treatment. Outpatient services and initial assessments typically do not require authorization." },
  { question: "Does Molina cover medication-assisted treatment?", answer: "Yes, Molina covers FDA-approved medications for addiction treatment including buprenorphine (Suboxone), methadone maintenance, and naltrexone (Vivitrol) when prescribed by authorized providers." },
  { question: "How do I find Molina in-network treatment centers?", answer: "Use Molina's provider directory on their website, call Molina Member Services, or search our directory for facilities that accept Molina Healthcare plans." },
];

const verificationSteps = [
  { step: 1, title: "Call Molina Member Services", description: "Use the number on your Molina ID card" },
  { step: 2, title: "Request Behavioral Health Benefits", description: "Ask about substance abuse treatment coverage" },
  { step: 3, title: "Check Authorization Requirements", description: "Learn which services need prior approval" },
  { step: 4, title: "Find In-Network Providers", description: "Confirm treatment centers accept your Molina plan" },
];

export default function MolinaRehab() {
  const faqSchema = generateFAQSchema(faqs);
  return (
    <Layout>
      <SEO title="Molina Healthcare Rehab Coverage | Addiction Treatment" description="Find addiction treatment centers that accept Molina Healthcare. Learn about Molina's behavioral health coverage for detox, rehab, and outpatient programs." canonical="/insurance/molina-rehab" keywords={["Molina rehab coverage", "Molina Healthcare addiction treatment", "Molina drug rehab", "Molina behavioral health", "rehab that takes Molina"]} breadcrumbs={[{ name: "Home", url: "/" }, { name: "Insurance", url: "/insurance" }, { name: "Molina Rehab Coverage", url: "/insurance/molina-rehab" }]} structuredData={[faqSchema, { "@context": "https://schema.org", "@type": "MedicalWebPage", specialty: "Addiction Medicine", lastReviewed: new Date().toISOString().split("T")[0] }]} />

      <section className="relative overflow-hidden bg-primary py-10 md:py-14">
        <div className="container">
          <BreadcrumbNav className="mb-4" items={[{ label: "Insurance", href: "/insurance" }, { label: "Molina Rehab Coverage" }]} />
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="bg-white/20 text-white border-0 mb-4">Medicaid & Marketplace Insurer</Badge>
            <h1 className="mb-4 font-display text-2xl font-bold text-primary-foreground md:text-3xl lg:text-4xl">Molina Healthcare Rehab Coverage</h1>
            <p className="text-primary-foreground/80 text-sm md:text-base max-w-2xl mx-auto">Molina Healthcare provides behavioral health coverage including addiction treatment through Medicaid, Medicare, and Marketplace plans in 19+ states.</p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild size="lg" variant="secondary"><Link to="/rehab-centers"><MapPin className="mr-2 h-4 w-4" />Find Molina-Accepting Centers</Link></Button>
              <Button asChild size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10"><Link to="/insurance"><Shield className="mr-2 h-4 w-4" />All Insurance Options</Link></Button>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-muted/50 py-4"><div className="container"><div className="flex items-center justify-center gap-3 text-sm text-muted-foreground"><AlertCircle className="h-4 w-4 text-primary shrink-0" /><p><span className="font-medium text-foreground">Coverage varies by plan and state.</span> Contact Molina or treatment facilities to verify your specific benefits.</p></div></div></section>

      <section className="py-10 md:py-14"><div className="container"><div className="mb-8 text-center"><h2 className="font-display text-xl font-bold text-foreground md:text-2xl">What Molina Covers for Addiction Treatment</h2><p className="mt-2 text-muted-foreground max-w-2xl mx-auto">Behavioral health benefits across Medicaid, Medicare, and Marketplace plans</p></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{coverageDetails.map((item) => { const Icon = item.icon; return (<div key={item.title} className="rounded-xl border border-border bg-card p-5"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4"><Icon className="h-5 w-5" /></div><h3 className="font-semibold text-foreground mb-1">{item.title}</h3><Badge variant="outline" className="mb-2 text-xs">{item.coverage}</Badge><p className="text-sm text-muted-foreground">{item.details}</p></div>); })}</div></div></section>

      <section className="border-t border-border bg-muted/30 py-10 md:py-14"><div className="container"><div className="mb-8 text-center"><h2 className="font-display text-xl font-bold text-foreground md:text-2xl">How to Verify Your Molina Benefits</h2></div><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">{verificationSteps.map((step) => (<div key={step.step} className="relative rounded-xl border border-border bg-card p-5"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm mb-4">{step.step}</div><h3 className="font-semibold text-foreground mb-2">{step.title}</h3><p className="text-sm text-muted-foreground">{step.description}</p></div>))}</div></div></section>

      <section className="py-10 md:py-14"><div className="container"><div className="grid md:grid-cols-2 gap-8 items-center"><div><h2 className="font-display text-xl font-bold text-foreground md:text-2xl mb-4">Molina Behavioral Health Benefits</h2><ul className="space-y-3">{["Coverage through Medicaid managed care plans", "ACA Marketplace plans with essential health benefits", "Medication-assisted treatment included", "Crisis intervention services", "Mental health parity compliance"].map((b, i) => (<li key={i} className="flex items-start gap-3"><CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" /><span className="text-muted-foreground">{b}</span></li>))}</ul></div><div className="bg-muted/50 rounded-xl p-6 border border-border"><div className="flex items-center gap-3 mb-4"><Phone className="h-6 w-6 text-primary" /><h3 className="font-semibold text-foreground">Molina Member Services</h3></div><p className="text-muted-foreground text-sm mb-4">Contact Molina for coverage questions and provider searches.</p><div className="space-y-2 text-sm"><p className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /><span>Available 24/7 for urgent needs</span></p><p className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" /><span>Have your member ID ready</span></p></div></div></div></div></section>

      <FeaturedCentersSection title="Treatment Centers Accepting Molina" description="Verified facilities that work with Molina Healthcare" limit={8} className="border-t border-border" />

      <section className="border-t border-border bg-muted/30 py-10 md:py-14"><div className="container"><div className="mb-8 text-center"><h2 className="font-display text-xl font-bold text-foreground md:text-2xl">Molina Coverage Questions</h2></div><div className="mx-auto max-w-3xl space-y-4">{faqs.map((faq, i) => (<div key={i} className="rounded-xl border border-border bg-card p-5"><h3 className="font-semibold text-foreground mb-2">{faq.question}</h3><p className="text-sm text-muted-foreground">{faq.answer}</p></div>))}</div></div></section>

      <StateLinksSection title="Molina Rehab Coverage by State" subtitle="Find Molina-accepting treatment centers in your state" basePath="/insurance/molina-rehab" buttonPrefix="Molina in" />

      <section className="py-10 md:py-14"><div className="container"><div className="mx-auto max-w-2xl text-center"><h2 className="font-display text-xl font-bold text-foreground md:text-2xl mb-4">Find Treatment Centers That Accept Molina</h2><p className="text-muted-foreground mb-6">Search our directory for rehab facilities that accept Molina Healthcare.</p><div className="flex flex-col sm:flex-row items-center justify-center gap-3"><Button asChild size="lg"><Link to="/rehab-centers">Search Treatment Centers<ArrowRight className="ml-2 h-4 w-4" /></Link></Button><Button asChild size="lg" variant="outline"><Link to="/cost-estimator"><DollarSign className="mr-2 h-4 w-4" />Estimate Costs</Link></Button></div></div></div></section>

      <InternalLinkingSection title="Explore More Resources" description="Learn about treatment options and find care near you" variant="grid" groups={[{ title: "Treatment Programs", links: treatmentTypeLinks.slice(0, 5) }, { title: "Find Treatment Near You", links: nearMeLinks.slice(0, 5) }, { title: "Recovery Guides", links: resourceLinks.slice(0, 5) }]} />

      <section className="border-t border-border bg-muted/30 py-8"><div className="container"><div className="flex flex-wrap items-center justify-center gap-4 text-sm"><span className="text-muted-foreground">Other Insurance Options:</span><Link to="/insurance/medicaid-rehab" className="text-primary hover:underline">Medicaid Coverage</Link><Link to="/insurance/ambetter-rehab" className="text-primary hover:underline">Ambetter Coverage</Link><Link to="/insurance/wellcare-rehab" className="text-primary hover:underline">WellCare Coverage</Link><Link to="/insurance" className="text-primary hover:underline">All Insurance →</Link></div></div></section>
    </Layout>
  );
}
