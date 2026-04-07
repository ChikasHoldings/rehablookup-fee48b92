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
  { icon: Stethoscope, title: "Medical Detox", coverage: "Covered", details: "Medically supervised detoxification services" },
  { icon: Building2, title: "Inpatient Rehab", coverage: "Prior Auth Required", details: "Residential treatment with prior authorization" },
  { icon: Users, title: "Outpatient Programs", coverage: "Covered", details: "IOP, PHP, and outpatient counseling" },
  { icon: Heart, title: "MAT Programs", coverage: "Included", details: "Medication-assisted treatment for substance use disorders" },
];

const faqs = [
  { question: "Does Highmark BCBS cover addiction treatment?", answer: "Yes. Highmark Blue Cross Blue Shield provides comprehensive behavioral health coverage for substance use disorder treatment including detox, inpatient and outpatient rehabilitation, counseling, and medication-assisted treatment across its individual, employer, Medicare, and Medicaid plans." },
  { question: "Where does Highmark operate?", answer: "Highmark is the fourth-largest Blue Cross Blue Shield insurer in the U.S., serving members in Pennsylvania, Delaware, West Virginia, and western New York. Through the Blue Card program, Highmark members can access in-network treatment facilities nationwide." },
  { question: "Does Highmark require pre-authorization for rehab?", answer: "Most Highmark plans require prior authorization for inpatient and residential substance abuse treatment. You can request authorization through Highmark's behavioral health services or by calling member services." },
  { question: "Does Highmark cover out-of-network rehab?", answer: "PPO and PPO Blue plans typically provide out-of-network coverage at higher cost-sharing. HMO plans generally require in-network providers. Contact Highmark to understand your plan's specific out-of-network benefits." },
  { question: "How do I find Highmark in-network treatment centers?", answer: "Use Highmark's online provider directory, call member services, or search our directory for facilities that accept Highmark Blue Cross Blue Shield insurance." },
];

const verificationSteps = [
  { step: 1, title: "Call Highmark Member Services", description: "Use the number on your Highmark BCBS ID card" },
  { step: 2, title: "Request BH Benefits Details", description: "Ask about substance use disorder treatment coverage" },
  { step: 3, title: "Get Prior Authorization", description: "Obtain approval for inpatient or residential treatment" },
  { step: 4, title: "Find In-Network Providers", description: "Locate treatment facilities that accept Highmark" },
];

export default function HighmarkRehab() {
  const faqSchema = generateFAQSchema(faqs);
  return (
    <Layout>
      <SEO title="Highmark BCBS Rehab Coverage | Addiction Treatment Insurance" description="Find addiction treatment centers that accept Highmark Blue Cross Blue Shield. Learn about Highmark's behavioral health coverage for detox, rehab, and outpatient programs." canonical="/insurance/highmark-rehab" keywords={["Highmark BCBS rehab coverage", "Highmark addiction treatment", "Highmark Blue Cross Blue Shield rehab", "Highmark behavioral health", "rehab that takes Highmark"]} breadcrumbs={[{ name: "Home", url: "/" }, { name: "Insurance", url: "/insurance" }, { name: "Highmark Rehab Coverage", url: "/insurance/highmark-rehab" }]} structuredData={[faqSchema, { "@context": "https://schema.org", "@type": "MedicalWebPage", specialty: "Addiction Medicine", lastReviewed: new Date().toISOString().split("T")[0] }]} />

      <section className="relative overflow-hidden bg-primary py-10 md:py-14">
        <div className="container">
          <BreadcrumbNav className="mb-4" items={[{ label: "Insurance", href: "/insurance" }, { label: "Highmark Rehab Coverage" }]} />
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="bg-white/20 text-white border-0 mb-4">Blue Cross Blue Shield Affiliate</Badge>
            <h1 className="mb-4 font-display text-2xl font-bold text-primary-foreground md:text-3xl lg:text-4xl">Highmark BCBS Rehab Coverage</h1>
            <p className="text-primary-foreground/80 text-sm md:text-base max-w-2xl mx-auto">Highmark Blue Cross Blue Shield provides comprehensive behavioral health coverage for addiction treatment across Pennsylvania, Delaware, West Virginia, and western New York.</p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild size="lg" variant="secondary"><Link to="/rehab-centers"><MapPin className="mr-2 h-4 w-4" />Find Highmark-Accepting Centers</Link></Button>
              <Button asChild size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10"><Link to="/insurance"><Shield className="mr-2 h-4 w-4" />All Insurance Options</Link></Button>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-muted/50 py-4"><div className="container"><div className="flex items-center justify-center gap-3 text-sm text-muted-foreground"><AlertCircle className="h-4 w-4 text-primary shrink-0" /><p><span className="font-medium text-foreground">Coverage varies by plan.</span> Contact Highmark to verify your specific behavioral health benefits.</p></div></div></section>

      <section className="py-10 md:py-14"><div className="container"><div className="mb-8 text-center"><h2 className="font-display text-xl font-bold text-foreground md:text-2xl">What Highmark Covers for Addiction Treatment</h2><p className="mt-2 text-muted-foreground max-w-2xl mx-auto">Comprehensive behavioral health benefits for substance use disorders</p></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{coverageDetails.map((item) => { const Icon = item.icon; return (<div key={item.title} className="rounded-xl border border-border bg-card p-5"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4"><Icon className="h-5 w-5" /></div><h3 className="font-semibold text-foreground mb-1">{item.title}</h3><Badge variant="outline" className="mb-2 text-xs">{item.coverage}</Badge><p className="text-sm text-muted-foreground">{item.details}</p></div>); })}</div></div></section>

      <section className="border-t border-border bg-muted/30 py-10 md:py-14"><div className="container"><div className="mb-8 text-center"><h2 className="font-display text-xl font-bold text-foreground md:text-2xl">How to Verify Your Highmark Benefits</h2></div><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">{verificationSteps.map((step) => (<div key={step.step} className="relative rounded-xl border border-border bg-card p-5"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm mb-4">{step.step}</div><h3 className="font-semibold text-foreground mb-2">{step.title}</h3><p className="text-sm text-muted-foreground">{step.description}</p></div>))}</div></div></section>

      <section className="py-10 md:py-14"><div className="container"><div className="grid md:grid-cols-2 gap-8 items-center"><div><h2 className="font-display text-xl font-bold text-foreground md:text-2xl mb-4">Highmark Behavioral Health Benefits</h2><ul className="space-y-3">{["4th largest BCBS insurer in the U.S.", "Blue Card access to nationwide treatment facilities", "Medication-assisted treatment coverage", "Integrated behavioral and medical care", "Mental health parity compliance"].map((b, i) => (<li key={i} className="flex items-start gap-3"><CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" /><span className="text-muted-foreground">{b}</span></li>))}</ul></div><div className="bg-muted/50 rounded-xl p-6 border border-border"><div className="flex items-center gap-3 mb-4"><Phone className="h-6 w-6 text-primary" /><h3 className="font-semibold text-foreground">Highmark Member Services</h3></div><p className="text-muted-foreground text-sm mb-4">Contact Highmark for coverage verification and provider searches.</p><div className="space-y-2 text-sm"><p className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /><span>Behavioral health support line available</span></p><p className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" /><span>Have your member ID and group number ready</span></p></div></div></div></div></section>

      <FeaturedCentersSection title="Treatment Centers Accepting Highmark" description="Verified facilities that work with Highmark BCBS insurance" limit={8} className="border-t border-border" />

      <section className="border-t border-border bg-muted/30 py-10 md:py-14"><div className="container"><div className="mb-8 text-center"><h2 className="font-display text-xl font-bold text-foreground md:text-2xl">Highmark Coverage Questions</h2></div><div className="mx-auto max-w-3xl space-y-4">{faqs.map((faq, i) => (<div key={i} className="rounded-xl border border-border bg-card p-5"><h3 className="font-semibold text-foreground mb-2">{faq.question}</h3><p className="text-sm text-muted-foreground">{faq.answer}</p></div>))}</div></div></section>

      <StateLinksSection title="Highmark Rehab Coverage by State" subtitle="Find Highmark-accepting treatment centers in your state" basePath="/insurance/highmark-rehab" buttonPrefix="Highmark in" />

      <section className="py-10 md:py-14"><div className="container"><div className="mx-auto max-w-2xl text-center"><h2 className="font-display text-xl font-bold text-foreground md:text-2xl mb-4">Find Treatment Centers That Accept Highmark</h2><p className="text-muted-foreground mb-6">Search our directory for rehab facilities accepting Highmark Blue Cross Blue Shield.</p><div className="flex flex-col sm:flex-row items-center justify-center gap-3"><Button asChild size="lg"><Link to="/rehab-centers">Search Treatment Centers<ArrowRight className="ml-2 h-4 w-4" /></Link></Button><Button asChild size="lg" variant="outline"><Link to="/cost-estimator"><DollarSign className="mr-2 h-4 w-4" />Estimate Costs</Link></Button></div></div></div></section>

      <InternalLinkingSection title="Explore More Resources" description="Learn about treatment options and find care near you" variant="grid" groups={[{ title: "Treatment Programs", links: treatmentTypeLinks.slice(0, 5) }, { title: "Find Treatment Near You", links: nearMeLinks.slice(0, 5) }, { title: "Recovery Guides", links: resourceLinks.slice(0, 5) }]} />

      <section className="border-t border-border bg-muted/30 py-8"><div className="container"><div className="flex flex-wrap items-center justify-center gap-4 text-sm"><span className="text-muted-foreground">Other Insurance Options:</span><Link to="/insurance/bcbs-treatment" className="text-primary hover:underline">BCBS Coverage</Link><Link to="/insurance/anthem-rehab" className="text-primary hover:underline">Anthem Coverage</Link><Link to="/insurance/aetna-rehab" className="text-primary hover:underline">Aetna Coverage</Link><Link to="/insurance" className="text-primary hover:underline">All Insurance →</Link></div></div></section>
    </Layout>
  );
}
