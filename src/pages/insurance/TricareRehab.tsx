import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO, generateFAQSchema } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";
import { FeaturedCentersSection } from "@/components/seo/FeaturedCentersSection";
import {
  Shield,
  CheckCircle,
  ArrowRight,
  Phone,
  MapPin,
  FileText,
  Clock,
  DollarSign,
  Building2,
  Users,
  Stethoscope,
  Heart,
  AlertCircle,
} from "lucide-react";

const coverageDetails = [
  { icon: Stethoscope, title: "Medical Detox", coverage: "Covered", details: "Medically necessary detoxification services" },
  { icon: Building2, title: "Inpatient Rehab", coverage: "Covered with Referral", details: "Residential treatment with provider referral" },
  { icon: Users, title: "Outpatient Programs", coverage: "Covered", details: "IOP, PHP, and standard outpatient therapy" },
  { icon: Heart, title: "MAT Programs", coverage: "Included", details: "Medication-assisted treatment for opioid & alcohol use" },
];

const faqs = [
  { question: "Does TRICARE cover addiction treatment?", answer: "Yes. TRICARE covers substance use disorder (SUD) treatment under the Mental Health Parity and Addiction Equity Act. This includes detox, inpatient rehabilitation, outpatient counseling, and medication-assisted treatment for active duty, retirees, and eligible family members." },
  { question: "Do I need a referral for TRICARE rehab coverage?", answer: "Active duty service members need a referral from their primary care manager. TRICARE Select and TRICARE For Life beneficiaries may self-refer to network providers, but some services require prior authorization." },
  { question: "What TRICARE plans cover rehab?", answer: "All TRICARE plans cover SUD treatment: TRICARE Prime, TRICARE Select, TRICARE For Life, TRICARE Reserve Select, TRICARE Young Adult, and TRICARE Retired Reserve. Coverage details and cost-sharing vary by plan." },
  { question: "Does TRICARE cover residential treatment?", answer: "Yes, TRICARE covers residential rehabilitation when medically necessary and authorized. Active duty members may access the Substance Use Disorder Clinical Care (SUDCC) program through military treatment facilities." },
  { question: "What are my out-of-pocket costs with TRICARE?", answer: "Active duty members have no cost-sharing for SUD treatment. Retirees and family members may have copays, cost-shares, or deductibles depending on their TRICARE plan type." },
];

const verificationSteps = [
  { step: 1, title: "Identify Your TRICARE Plan", description: "Know which TRICARE plan you have (Prime, Select, etc.)" },
  { step: 2, title: "Contact TRICARE Regional Contractor", description: "Call Humana Military (East) or Health Net Federal (West)" },
  { step: 3, title: "Get Authorization if Required", description: "Obtain prior authorization for inpatient treatment" },
  { step: 4, title: "Find TRICARE-Authorized Providers", description: "Locate certified treatment facilities in the network" },
];

export default function TricareRehab() {
  const faqSchema = generateFAQSchema(faqs);

  return (
    <Layout>
      <SEO
        title="TRICARE Rehab Coverage | Military Insurance Addiction Treatment"
        description="TRICARE covers addiction treatment for military members, retirees, and families. Find rehab centers that accept TRICARE insurance for detox, inpatient, and outpatient programs."
        canonical="/insurance/tricare-rehab"
        keywords={["TRICARE rehab coverage", "TRICARE addiction treatment", "military rehab insurance", "TRICARE drug rehab", "TRICARE substance abuse", "rehab that takes TRICARE"]}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Insurance", url: "/insurance" },
          { name: "TRICARE Rehab Coverage", url: "/insurance/tricare-rehab" },
        ]}
        structuredData={faqSchema}
      />

      <section className="relative overflow-hidden bg-primary py-10 md:py-14">
        <div className="container">
          <BreadcrumbNav className="mb-4" items={[{ label: "Insurance", href: "/insurance" }, { label: "TRICARE Rehab Coverage" }]} />
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 flex items-center justify-center gap-3">
              <Badge variant="secondary" className="bg-white/20 text-white border-0">Military Health Insurance</Badge>
            </div>
            <h1 className="mb-4 font-display text-2xl font-bold text-primary-foreground md:text-3xl lg:text-4xl">TRICARE Rehab Coverage</h1>
            <p className="text-primary-foreground/80 text-sm md:text-base max-w-2xl mx-auto">TRICARE provides comprehensive addiction treatment coverage for active duty service members, retirees, and eligible family members.</p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild size="lg" variant="secondary"><Link to="/rehab-centers"><MapPin className="mr-2 h-4 w-4" />Find TRICARE-Accepting Centers</Link></Button>
              <Button asChild size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10"><Link to="/insurance"><Shield className="mr-2 h-4 w-4" />All Insurance Options</Link></Button>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-muted/50 py-4">
        <div className="container">
          <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4 text-primary shrink-0" />
            <p><span className="font-medium text-foreground">Coverage varies by TRICARE plan.</span> Contact your TRICARE regional contractor to verify your specific behavioral health benefits.</p>
          </div>
        </div>
      </section>

      <section className="py-10 md:py-14">
        <div className="container">
          <div className="mb-8 text-center">
            <h2 className="font-display text-xl font-bold text-foreground md:text-2xl">What TRICARE Covers for Addiction Treatment</h2>
            <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">Comprehensive behavioral health benefits for military families</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {coverageDetails.map((item) => {
              const IconComponent = item.icon;
              return (
                <div key={item.title} className="rounded-xl border border-border bg-card p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4"><IconComponent className="h-5 w-5" /></div>
                  <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                  <Badge variant="outline" className="mb-2 text-xs">{item.coverage}</Badge>
                  <p className="text-sm text-muted-foreground">{item.details}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-muted/30 py-10 md:py-14">
        <div className="container">
          <div className="mb-8 text-center"><h2 className="font-display text-xl font-bold text-foreground md:text-2xl">How to Verify Your TRICARE Benefits</h2></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {verificationSteps.map((step) => (
              <div key={step.step} className="relative rounded-xl border border-border bg-card p-5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm mb-4">{step.step}</div>
                <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-10 md:py-14">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="font-display text-xl font-bold text-foreground md:text-2xl mb-4">TRICARE Behavioral Health Benefits</h2>
              <ul className="space-y-3">
                {["No cost-sharing for active duty members", "Coverage across all TRICARE plan types", "Access to SUDCC program for service members", "Medication-assisted treatment included", "Mental health parity protections apply"].map((benefit, index) => (
                  <li key={index} className="flex items-start gap-3"><CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" /><span className="text-muted-foreground">{benefit}</span></li>
                ))}
              </ul>
            </div>
            <div className="bg-muted/50 rounded-xl p-6 border border-border">
              <div className="flex items-center gap-3 mb-4"><Phone className="h-6 w-6 text-primary" /><h3 className="font-semibold text-foreground">TRICARE Contact</h3></div>
              <p className="text-muted-foreground text-sm mb-4">Contact your TRICARE regional contractor for coverage and authorization questions.</p>
              <div className="space-y-2 text-sm">
                <p className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /><span>24/7 nurse advice line available</span></p>
                <p className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" /><span>Have your military ID and sponsor SSN ready</span></p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <FeaturedCentersSection title="Treatment Centers Accepting TRICARE" description="Verified facilities that work with TRICARE insurance" limit={8} className="border-t border-border" />

      <section className="border-t border-border bg-muted/30 py-10 md:py-14">
        <div className="container">
          <div className="mb-8 text-center"><h2 className="font-display text-xl font-bold text-foreground md:text-2xl">TRICARE Coverage Questions</h2></div>
          <div className="mx-auto max-w-3xl space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="rounded-xl border border-border bg-card p-5">
                <h3 className="font-semibold text-foreground mb-2">{faq.question}</h3>
                <p className="text-sm text-muted-foreground">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-10 md:py-14">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-xl font-bold text-foreground md:text-2xl mb-4">Find Treatment Centers That Accept TRICARE</h2>
            <p className="text-muted-foreground mb-6">Search our directory for rehab facilities that accept TRICARE insurance.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild size="lg"><Link to="/rehab-centers">Search Treatment Centers<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
              <Button asChild size="lg" variant="outline"><Link to="/cost-estimator"><DollarSign className="mr-2 h-4 w-4" />Estimate Costs</Link></Button>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-muted/30 py-8">
        <div className="container">
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
            <span className="text-muted-foreground">Other Insurance Options:</span>
            <Link to="/insurance/aetna-rehab" className="text-primary hover:underline">Aetna Coverage</Link>
            <Link to="/insurance/bcbs-treatment" className="text-primary hover:underline">BCBS Coverage</Link>
            <Link to="/insurance/united-healthcare-rehab" className="text-primary hover:underline">UHC Coverage</Link>
            <Link to="/insurance" className="text-primary hover:underline">All Insurance →</Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
