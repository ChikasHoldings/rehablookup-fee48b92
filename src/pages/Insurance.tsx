import { useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  CheckCircle, 
  Shield, 
  Clock, 
  Phone, 
  ArrowRight,
  HelpCircle,
  FileText,
  Heart
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { PhoneInput } from "@/components/ui/phone-input";
import { isValidPhoneNumber } from "@/lib/phoneUtils";
import { EmailInput } from "@/components/ui/email-input";

const insuranceLeadSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name must be less than 100 characters"),
  phone: z.string().refine((val) => isValidPhoneNumber(val), "Please enter a complete 10-digit phone number"),
  email: z.string().trim().email("Please enter a valid email").max(255, "Email is too long").optional().or(z.literal("")),
  insuranceProvider: z.string().min(1, "Please select your insurance provider"),
  memberId: z.string().max(100, "Member ID is too long").optional(),
});

const insuranceProviders = [
  "Aetna",
  "Anthem",
  "Blue Cross Blue Shield",
  "Cigna",
  "Humana",
  "Kaiser Permanente",
  "Medicaid",
  "Medicare",
  "United Healthcare",
  "TRICARE",
  "Magellan Health",
  "Beacon Health",
  "Other",
];

const coverageTypes = [
  { title: "Inpatient Treatment", description: "Residential programs with 24/7 care and supervision" },
  { title: "Outpatient Programs", description: "Flexible treatment while maintaining daily responsibilities" },
  { title: "Detoxification", description: "Medically supervised withdrawal management" },
  { title: "Medication-Assisted Treatment", description: "FDA-approved medications combined with counseling" },
  { title: "Mental Health Services", description: "Dual diagnosis and co-occurring disorder treatment" },
  { title: "Aftercare Support", description: "Ongoing support and relapse prevention programs" },
];

const faqs = [
  {
    question: "Does my insurance cover addiction treatment?",
    answer: "Most health insurance plans are required to cover substance abuse treatment under the Mental Health Parity and Addiction Equity Act. Coverage levels vary by plan, so verification is recommended."
  },
  {
    question: "What if I don't have insurance?",
    answer: "Many treatment centers offer sliding scale fees, payment plans, or can help you apply for Medicaid. Some facilities also accept self-pay patients at reduced rates."
  },
  {
    question: "How do I verify my benefits?",
    answer: "You can call your insurance company directly, use our free verification form, or contact a treatment center's admissions team who can verify benefits on your behalf."
  },
  {
    question: "What costs might I be responsible for?",
    answer: "Depending on your plan, you may have copays, deductibles, or coinsurance. Out-of-network facilities may have higher out-of-pocket costs."
  },
];

export default function Insurance() {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    insuranceProvider: "",
    memberId: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Validate form data
    const validation = insuranceLeadSchema.safeParse(formData);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast.error(firstError.message);
      setIsSubmitting(false);
      return;
    }

    try {
      // Create a message that includes insurance details
      const insuranceMessage = `Insurance Verification Request
Insurance Provider: ${formData.insuranceProvider}
Member ID: ${formData.memberId || 'Not provided'}`;

      // Submit lead to database
      const { error } = await supabase.from("leads").insert({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email?.trim() || `insurance-${Date.now()}@placeholder.com`,
        preferred_contact: "call",
        status: "new",
        source: "insurance_verification",
        insurance_provider: formData.insuranceProvider,
        message: insuranceMessage,
        qualified: false,
      });

      if (error) {
        console.error("Error submitting lead:", error);
        toast.error("Unable to submit your request. Please try again or call us directly.");
        setIsSubmitting(false);
        return;
      }

      toast.success("Verification request submitted! We'll contact you within 24 hours.");
      setFormData({
        name: "",
        phone: "",
        email: "",
        insuranceProvider: "",
        memberId: "",
      });
    } catch (err) {
      console.error("Error:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <SEO
        title="Insurance Coverage for Addiction Treatment | RehabLookup"
        description="Verify your insurance coverage for addiction treatment. Learn what's covered, check your benefits, and find treatment centers that accept your insurance."
        canonical="/insurance"
      />

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-primary/5 to-background border-b border-border">
        <div className="container py-12 md:py-16">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Insurance Coverage for Treatment
            </h1>
            <p className="text-muted-foreground text-base md:text-lg mb-6 max-w-2xl mx-auto">
              Most insurance plans cover addiction treatment. Verify your benefits and find covered treatment options.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                <span>Free Verification</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span>100% Confidential</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span>Results in 24 Hours</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 md:py-16">
        <div className="container">
          <div className="grid lg:grid-cols-5 gap-10 lg:gap-12">
            {/* Verification Form */}
            <div className="lg:col-span-2">
              <div className="sticky top-24">
                <div className="rounded-xl border border-border bg-card p-6">
                  <h2 className="font-display text-lg font-semibold text-foreground mb-1">
                    Verify Your Coverage
                  </h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    Get a free, confidential benefits check.
                  </p>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        placeholder="Your name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number *</Label>
                      <PhoneInput
                        id="phone"
                        value={formData.phone}
                        onChange={(value) => setFormData({ ...formData, phone: value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <EmailInput
                        id="email"
                        placeholder="your@email.com"
                        value={formData.email}
                        onChange={(value) => setFormData({ ...formData, email: value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="insurance">Insurance Provider *</Label>
                      <Select
                        value={formData.insuranceProvider}
                        onValueChange={(value) => setFormData({ ...formData, insuranceProvider: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select your insurance" />
                        </SelectTrigger>
                        <SelectContent>
                          {insuranceProviders.map((provider) => (
                            <SelectItem key={provider} value={provider}>
                              {provider}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="memberId">Member ID (Optional)</Label>
                      <Input
                        id="memberId"
                        placeholder="Found on your insurance card"
                        value={formData.memberId}
                        onChange={(e) => setFormData({ ...formData, memberId: e.target.value })}
                      />
                    </div>

                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? "Submitting..." : "Check My Coverage"}
                    </Button>

                    <p className="text-xs text-muted-foreground text-center">
                      By submitting, you agree to our{" "}
                      <Link to="/privacy-policy" className="underline hover:text-foreground">
                        Privacy Policy
                      </Link>
                    </p>
                  </form>
                </div>

                {/* Phone CTA */}
                <div className="mt-4 p-4 rounded-lg bg-muted/50 border border-border text-center">
                  <p className="text-sm text-muted-foreground mb-2">Prefer to speak with someone?</p>
                  <a 
                    href="tel:1-800-555-0199" 
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80"
                  >
                    <Phone className="h-4 w-4" />
                    1-800-555-0199
                  </a>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="lg:col-span-3 space-y-10">
              {/* Insurance Logos */}
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground mb-4">
                  We Work With Major Insurers
                </h2>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {["Aetna", "BCBS", "Cigna", "United", "Kaiser", "Humana", "Anthem", "Medicare", "Medicaid", "TRICARE"].map((name) => (
                    <div 
                      key={name}
                      className="flex h-12 items-center justify-center rounded-lg border border-border bg-background px-3 text-xs font-medium text-muted-foreground"
                    >
                      {name}
                    </div>
                  ))}
                </div>
              </div>

              {/* What's Covered */}
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground mb-4">
                  What Insurance Typically Covers
                </h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {coverageTypes.map((type) => (
                    <div 
                      key={type.title}
                      className="p-4 rounded-lg border border-border bg-card"
                    >
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <div>
                          <h3 className="font-medium text-foreground text-sm">{type.title}</h3>
                          <p className="text-xs text-muted-foreground mt-1">{type.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* How It Works */}
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground mb-4">
                  How Insurance Verification Works
                </h2>
                <div className="space-y-4">
                  {[
                    { step: "1", title: "Submit Your Information", description: "Fill out the form with your insurance details" },
                    { step: "2", title: "We Verify Benefits", description: "Our team contacts your insurer to check coverage" },
                    { step: "3", title: "Receive Your Results", description: "Get a detailed breakdown of your coverage within 24 hours" },
                    { step: "4", title: "Find Covered Treatment", description: "We help match you with in-network facilities" },
                  ].map((item) => (
                    <div key={item.step} className="flex items-start gap-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                        {item.step}
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground text-sm">{item.title}</h3>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* FAQs */}
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground mb-4">
                  Frequently Asked Questions
                </h2>
                <div className="space-y-4">
                  {faqs.map((faq) => (
                    <div key={faq.question} className="p-4 rounded-lg border border-border bg-card">
                      <div className="flex items-start gap-3">
                        <HelpCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <div>
                          <h3 className="font-medium text-foreground text-sm">{faq.question}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{faq.answer}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Resources */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/resources" className="flex-1">
                  <div className="h-full p-4 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-primary" />
                      <div>
                        <h3 className="font-medium text-foreground text-sm">Insurance Guides</h3>
                        <p className="text-xs text-muted-foreground">Learn more about coverage</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto" />
                    </div>
                  </div>
                </Link>
                <Link to="/request-help" className="flex-1">
                  <div className="h-full p-4 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <Heart className="h-5 w-5 text-primary" />
                      <div>
                        <h3 className="font-medium text-foreground text-sm">Get Help Now</h3>
                        <p className="text-xs text-muted-foreground">Connect with treatment</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto" />
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
