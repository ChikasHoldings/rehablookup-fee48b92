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
  { icon: Stethoscope, title: "Medical Detox", coverage: "Covered", details: "Medically supervised withdrawal management" },
  { icon: Building2, title: "Inpatient Rehab", coverage: "Prior Auth Required", details: "Residential treatment with authorization" },
  { icon: Users, title: "Outpatient Programs", coverage: "Covered", details: "IOP, PHP, and individual/group counseling" },
  { icon: Heart, title: "EAP Services", coverage: "Included", details: "Employee Assistance Program behavioral health" },
];

const faqs = [
  { question: "Does Magellan Health cover addiction treatment?", answer: "Yes. Magellan Health is one of the largest behavioral health managed care companies in the U.S. They manage mental health and substance use disorder benefits for millions of members through employer plans, Medicaid, and government programs." },
  { question: "How does Magellan behavioral health coverage work?", answer: "Magellan typically manages behavioral health benefits on behalf of other insurance plans and employers. Your primary insurer may use Magellan to administer substance abuse treatment benefits, including prior authorization and provider network management." },
  { question: "Do I need pre-authorization from Magellan?", answer: "Most inpatient and residential treatment services require prior authorization from Magellan. Contact the number on your insurance card to initiate the authorization process before starting treatment." },
  { question: "Does Magellan cover medication-assisted treatment?", answer: "Yes, Magellan covers FDA-approved medications for addiction treatment including Suboxone, methadone, and Vivitrol as part of comprehensive substance abuse treatment programs." },
  { question: "How do I find Magellan-approved treatment centers?", answer: "Use Magellan's provider directory, call member services, or search our directory for facilities that accept Magellan-managed behavioral health benefits." },
];

const verificationSteps = [
  { step: 1, title: "Call Your Plan's BH Number", description: "Use the behavioral health number on your insurance card" },
  { step: 2, title: "Confirm Magellan Manages Benefits", description: "Verify Magellan administers your substance abuse benefits" },
  { step: 3, title: "Request Prior Authorization", description: "Get approval for inpatient or residential treatment" },
  { step: 4, title: "Find Approved Providers", description: "Locate treatment facilities in Magellan's network" },
];

export default function MagellanRehab() {
  const faqSchema = generateFAQSchema(faqs);
  return (
    <Layout>
      <SEO title="Magellan Health Rehab Coverage | Behavioral Health Treatment" description="Find addiction treatment centers that accept Magellan Health. Learn about Magellan's behavioral health coverage for detox, rehab, and outpatient programs." canonical="/insurance/magellan-rehab" keywords={["Magellan Health rehab coverage", "Magellan addiction treatment", "Magellan behavioral health", "Magellan drug rehab", "rehab that takes Magellan"]} breadcrumbs={[{ name: "Home", url: "/" }, { name: "Insurance", url: "/insurance" }, { name: "Magellan Rehab Coverage", url: "/insurance/magellan-rehab" }]} structuredData={faqSchema} />

      <section className="relative overflow-hidden bg-primary py-10 md:py-14">
        <div className="container">
          <BreadcrumbNav className="mb-4" items={[{ label: "Insurance", href: "/insurance" }, { label: "Magellan Rehab Coverage" }]} />
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="bg-white/20 text-white border-0 mb-4">Behavioral Health Specialist</Badge>
            <h1 className="mb-4 font-display text-2xl font-bold text-primary-foreground md:text-3xl lg:text-4xl">Magellan Health Rehab Coverage</h1>
            <p className="text-primary-foreground/80 text-sm md:text-base max-w-2xl mx-auto">Magellan Health manages behavioral health benefits for millions of Americans, providing comprehensive addiction treatment coverage.</p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild size="lg" variant="secondary"><Link to="/rehab-centers"><MapPin className="mr-2 h-4 w-4" />Find Magellan-Accepting Centers</Link></Button>
              <Button asChild size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10"><Link to="/insurance"><Shield className="mr-2 h-4 w-4" />All Insurance Options</Link></Button>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-muted/50 py-4"><div className="container"><div className="flex items-center justify-center gap-3 text-sm text-muted-foreground"><AlertCircle className="h-4 w-4 text-primary shrink-0" /><p><span className="font-medium text-foreground">Coverage varies by employer plan.</span> Contact Magellan or your insurer to verify your specific behavioral health benefits.</p></div></div></section>

      <section className="py-10 md:py-14"><div className="container"><div className="mb-8 text-center"><h2 className="font-display text-xl font-bold text-foreground md:text-2xl">What Magellan Covers for Addiction Treatment</h2><p className="mt-2 text-muted-foreground max-w-2xl mx-auto">Managed behavioral health benefits for substance use disorders</p></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{coverageDetails.map((item) => { const Icon = item.icon; return (<div key={item.title} className="rounded-xl border border-border bg-card p-5"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4"><Icon className="h-5 w-5" /></div><h3 className="font-semibold text-foreground mb-1">{item.title}</h3><Badge variant="outline" className="mb-2 text-xs">{item.coverage}</Badge><p className="text-sm text-muted-foreground">{item.details}</p></div>); })}</div></div></section>

      <section className="border-t border-border bg-muted/30 py-10 md:py-14"><div className="container"><div className="mb-8 text-center"><h2 className="font-display text-xl font-bold text-foreground md:text-2xl">How to Verify Your Magellan Benefits</h2></div><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">{verificationSteps.map((step) => (<div key={step.step} className="relative rounded-xl border border-border bg-card p-5"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm mb-4">{step.step}</div><h3 className="font-semibold text-foreground mb-2">{step.title}</h3><p className="text-sm text-muted-foreground">{step.description}</p></div>))}</div></div></section>

      <section className="py-10 md:py-14"><div className="container"><div className="grid md:grid-cols-2 gap-8 items-center"><div><h2 className="font-display text-xl font-bold text-foreground md:text-2xl mb-4">Magellan Behavioral Health Benefits</h2><ul className="space-y-3">{["Largest behavioral health managed care company", "Network includes thousands of treatment facilities", "Comprehensive substance abuse treatment coverage", "Employee Assistance Program (EAP) integration", "24/7 crisis support line"].map((b, i) => (<li key={i} className="flex items-start gap-3"><CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" /><span className="text-muted-foreground">{b}</span></li>))}</ul></div><div className="bg-muted/50 rounded-xl p-6 border border-border"><div className="flex items-center gap-3 mb-4"><Phone className="h-6 w-6 text-primary" /><h3 className="font-semibold text-foreground">Magellan Member Services</h3></div><p className="text-muted-foreground text-sm mb-4">Contact Magellan for coverage verification and provider searches.</p><div className="space-y-2 text-sm"><p className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /><span>24/7 crisis line available</span></p><p className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" /><span>Have your member ID and group number ready</span></p></div></div></div></div></section>

      <FeaturedCentersSection title="Treatment Centers Accepting Magellan" description="Verified facilities in the Magellan behavioral health network" limit={8} className="border-t border-border" />

      <section className="border-t border-border bg-muted/30 py-10 md:py-14"><div className="container"><div className="mb-8 text-center"><h2 className="font-display text-xl font-bold text-foreground md:text-2xl">Magellan Coverage Questions</h2></div><div className="mx-auto max-w-3xl space-y-4">{faqs.map((faq, i) => (<div key={i} className="rounded-xl border border-border bg-card p-5"><h3 className="font-semibold text-foreground mb-2">{faq.question}</h3><p className="text-sm text-muted-foreground">{faq.answer}</p></div>))}</div></div></section>

      <StateLinksSection title="Magellan Rehab Coverage by State" subtitle="Find Magellan-network treatment centers in your state" basePath="/insurance/magellan-rehab" buttonPrefix="Magellan in" />

      <section className="py-10 md:py-14"><div className="container"><div className="mx-auto max-w-2xl text-center"><h2 className="font-display text-xl font-bold text-foreground md:text-2xl mb-4">Find Treatment Centers That Accept Magellan</h2><p className="text-muted-foreground mb-6">Search our directory for rehab facilities in the Magellan behavioral health network.</p><div className="flex flex-col sm:flex-row items-center justify-center gap-3"><Button asChild size="lg"><Link to="/rehab-centers">Search Treatment Centers<ArrowRight className="ml-2 h-4 w-4" /></Link></Button><Button asChild size="lg" variant="outline"><Link to="/cost-estimator"><DollarSign className="mr-2 h-4 w-4" />Estimate Costs</Link></Button></div></div></div></section>

      <InternalLinkingSection title="Explore More Resources" description="Learn about treatment options and find care near you" variant="grid" groups={[{ title: "Treatment Programs", links: treatmentTypeLinks.slice(0, 5) }, { title: "Find Treatment Near You", links: nearMeLinks.slice(0, 5) }, { title: "Recovery Guides", links: resourceLinks.slice(0, 5) }]} />

      <section className="border-t border-border bg-muted/30 py-8"><div className="container"><div className="flex flex-wrap items-center justify-center gap-4 text-sm"><span className="text-muted-foreground">Other Insurance Options:</span><Link to="/insurance/aetna-rehab" className="text-primary hover:underline">Aetna Coverage</Link><Link to="/insurance/cigna-rehab" className="text-primary hover:underline">Cigna Coverage</Link><Link to="/insurance/united-healthcare-rehab" className="text-primary hover:underline">UHC Coverage</Link><Link to="/insurance" className="text-primary hover:underline">All Insurance →</Link></div></div></section>
    </Layout>
  );
}
