import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO, generateFAQSchema } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";
import { FeaturedCentersSection } from "@/components/seo/FeaturedCentersSection";
import { Shield, CheckCircle, ArrowRight, Phone, MapPin, FileText, Clock, DollarSign, Building2, Users, Stethoscope, Heart, AlertCircle } from "lucide-react";

const coverageDetails = [
  { icon: Stethoscope, title: "Medical Detox", coverage: "Covered", details: "Medically supervised detoxification services" },
  { icon: Building2, title: "Inpatient Rehab", coverage: "Prior Auth Required", details: "Residential treatment with prior authorization" },
  { icon: Users, title: "Outpatient Programs", coverage: "Covered", details: "IOP, PHP, and outpatient counseling" },
  { icon: Heart, title: "Behavioral Health", coverage: "Essential Benefit", details: "Mental health and substance abuse treatment" },
];

const faqs = [
  { question: "Does Ambetter cover addiction treatment?", answer: "Yes. Ambetter, a Centene Corporation subsidiary, offers ACA-compliant Marketplace plans that include substance use disorder treatment as an essential health benefit. Coverage includes detox, inpatient and outpatient rehab, counseling, and medication-assisted treatment." },
  { question: "What is Ambetter insurance?", answer: "Ambetter is an Affordable Care Act (ACA) Marketplace health insurance brand operated by Centene Corporation. It's available in 29+ states and offers Bronze, Silver, Gold, and sometimes Platinum plans, all of which include behavioral health benefits." },
  { question: "Does Ambetter require pre-authorization for rehab?", answer: "Most Ambetter plans require prior authorization for inpatient and residential substance abuse treatment. Outpatient services and initial assessments typically don't require pre-approval, but check your specific plan." },
  { question: "Does Ambetter cover medication-assisted treatment?", answer: "Yes, Ambetter covers MAT medications including buprenorphine (Suboxone), naltrexone (Vivitrol), and methadone as part of comprehensive addiction treatment under ACA essential health benefits." },
  { question: "How do I check my Ambetter rehab coverage?", answer: "Call the member services number on your Ambetter ID card, log into your Ambetter account online, or ask a treatment facility to verify your benefits. You can also call the Ambetter nurse hotline for guidance." },
];

const verificationSteps = [
  { step: 1, title: "Call Ambetter Member Services", description: "Use the number on your Ambetter ID card" },
  { step: 2, title: "Ask About SUD Benefits", description: "Request details on substance use disorder coverage" },
  { step: 3, title: "Verify Network Status", description: "Confirm treatment centers are in your Ambetter network" },
  { step: 4, title: "Get Prior Authorization", description: "Obtain approval for inpatient treatment if required" },
];

export default function AmbetterRehab() {
  const faqSchema = generateFAQSchema(faqs);
  return (
    <Layout>
      <SEO title="Ambetter Rehab Coverage | ACA Marketplace Addiction Treatment" description="Find addiction treatment centers that accept Ambetter insurance. Learn about Ambetter's ACA Marketplace coverage for detox, rehab, and outpatient programs." canonical="/insurance/ambetter-rehab" keywords={["Ambetter rehab coverage", "Ambetter addiction treatment", "Ambetter drug rehab", "Ambetter Marketplace rehab", "rehab that takes Ambetter", "Centene addiction treatment"]} breadcrumbs={[{ name: "Home", url: "/" }, { name: "Insurance", url: "/insurance" }, { name: "Ambetter Rehab Coverage", url: "/insurance/ambetter-rehab" }]} structuredData={faqSchema} />

      <section className="relative overflow-hidden bg-primary py-10 md:py-14">
        <div className="container">
          <BreadcrumbNav className="mb-4" items={[{ label: "Insurance", href: "/insurance" }, { label: "Ambetter Rehab Coverage" }]} />
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="bg-white/20 text-white border-0 mb-4">ACA Marketplace Insurer</Badge>
            <h1 className="mb-4 font-display text-2xl font-bold text-primary-foreground md:text-3xl lg:text-4xl">Ambetter Rehab Coverage</h1>
            <p className="text-primary-foreground/80 text-sm md:text-base max-w-2xl mx-auto">Ambetter provides ACA-compliant health plans with comprehensive behavioral health benefits including addiction treatment in 29+ states.</p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild size="lg" variant="secondary"><Link to="/rehab-centers"><MapPin className="mr-2 h-4 w-4" />Find Ambetter-Accepting Centers</Link></Button>
              <Button asChild size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10"><Link to="/insurance"><Shield className="mr-2 h-4 w-4" />All Insurance Options</Link></Button>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-muted/50 py-4"><div className="container"><div className="flex items-center justify-center gap-3 text-sm text-muted-foreground"><AlertCircle className="h-4 w-4 text-primary shrink-0" /><p><span className="font-medium text-foreground">Coverage varies by plan level and state.</span> Contact Ambetter to verify your specific behavioral health benefits.</p></div></div></section>

      <section className="py-10 md:py-14"><div className="container"><div className="mb-8 text-center"><h2 className="font-display text-xl font-bold text-foreground md:text-2xl">What Ambetter Covers for Addiction Treatment</h2><p className="mt-2 text-muted-foreground max-w-2xl mx-auto">ACA essential health benefits for substance use disorders</p></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{coverageDetails.map((item) => { const Icon = item.icon; return (<div key={item.title} className="rounded-xl border border-border bg-card p-5"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4"><Icon className="h-5 w-5" /></div><h3 className="font-semibold text-foreground mb-1">{item.title}</h3><Badge variant="outline" className="mb-2 text-xs">{item.coverage}</Badge><p className="text-sm text-muted-foreground">{item.details}</p></div>); })}</div></div></section>

      <section className="border-t border-border bg-muted/30 py-10 md:py-14"><div className="container"><div className="mb-8 text-center"><h2 className="font-display text-xl font-bold text-foreground md:text-2xl">How to Verify Your Ambetter Benefits</h2></div><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">{verificationSteps.map((step) => (<div key={step.step} className="relative rounded-xl border border-border bg-card p-5"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm mb-4">{step.step}</div><h3 className="font-semibold text-foreground mb-2">{step.title}</h3><p className="text-sm text-muted-foreground">{step.description}</p></div>))}</div></div></section>

      <section className="py-10 md:py-14"><div className="container"><div className="grid md:grid-cols-2 gap-8 items-center"><div><h2 className="font-display text-xl font-bold text-foreground md:text-2xl mb-4">Ambetter Behavioral Health Benefits</h2><ul className="space-y-3">{["ACA-compliant essential health benefit coverage", "Available in 29+ states through the Marketplace", "Medication-assisted treatment included", "Mental health parity compliance", "Telehealth behavioral health options"].map((b, i) => (<li key={i} className="flex items-start gap-3"><CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" /><span className="text-muted-foreground">{b}</span></li>))}</ul></div><div className="bg-muted/50 rounded-xl p-6 border border-border"><div className="flex items-center gap-3 mb-4"><Phone className="h-6 w-6 text-primary" /><h3 className="font-semibold text-foreground">Ambetter Member Services</h3></div><p className="text-muted-foreground text-sm mb-4">Contact Ambetter for coverage verification and provider searches.</p><div className="space-y-2 text-sm"><p className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /><span>24/7 nurse hotline available</span></p><p className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" /><span>Have your member ID ready</span></p></div></div></div></div></section>

      <FeaturedCentersSection title="Treatment Centers Accepting Ambetter" description="Verified facilities that work with Ambetter insurance" limit={8} className="border-t border-border" />

      <section className="border-t border-border bg-muted/30 py-10 md:py-14"><div className="container"><div className="mb-8 text-center"><h2 className="font-display text-xl font-bold text-foreground md:text-2xl">Ambetter Coverage Questions</h2></div><div className="mx-auto max-w-3xl space-y-4">{faqs.map((faq, i) => (<div key={i} className="rounded-xl border border-border bg-card p-5"><h3 className="font-semibold text-foreground mb-2">{faq.question}</h3><p className="text-sm text-muted-foreground">{faq.answer}</p></div>))}</div></div></section>

      <section className="py-10 md:py-14"><div className="container"><div className="mx-auto max-w-2xl text-center"><h2 className="font-display text-xl font-bold text-foreground md:text-2xl mb-4">Find Treatment Centers That Accept Ambetter</h2><p className="text-muted-foreground mb-6">Search our directory for rehab facilities accepting Ambetter Marketplace insurance.</p><div className="flex flex-col sm:flex-row items-center justify-center gap-3"><Button asChild size="lg"><Link to="/rehab-centers">Search Treatment Centers<ArrowRight className="ml-2 h-4 w-4" /></Link></Button><Button asChild size="lg" variant="outline"><Link to="/cost-estimator"><DollarSign className="mr-2 h-4 w-4" />Estimate Costs</Link></Button></div></div></div></section>

      <section className="border-t border-border bg-muted/30 py-8"><div className="container"><div className="flex flex-wrap items-center justify-center gap-4 text-sm"><span className="text-muted-foreground">Other Insurance Options:</span><Link to="/insurance/molina-rehab" className="text-primary hover:underline">Molina Coverage</Link><Link to="/insurance/wellcare-rehab" className="text-primary hover:underline">WellCare Coverage</Link><Link to="/insurance/oscar-rehab" className="text-primary hover:underline">Oscar Coverage</Link><Link to="/insurance" className="text-primary hover:underline">All Insurance →</Link></div></div></section>
    </Layout>
  );
}
