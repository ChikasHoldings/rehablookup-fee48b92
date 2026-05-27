import { useState, type FormEvent } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useSearchParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, ShieldCheck, Lock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getFriendlyErrorString } from "@/lib/contracts/friendly-error-messages";
import { analytics } from "@/lib/analytics";
import { TOPIC_HERO_IMAGES } from "@/data/locationImages";

// Top US health insurers families search for. Order = popularity-weighted.
const CARRIERS = [
  "Aetna",
  "Ambetter",
  "Anthem Blue Cross Blue Shield",
  "Blue Cross Blue Shield",
  "Cigna",
  "Highmark",
  "Humana",
  "Kaiser Permanente",
  "Magellan",
  "Medicaid",
  "Medicare",
  "Molina",
  "Oscar Health",
  "Tricare",
  "United Healthcare",
  "WellCare",
  "Other / I don't know",
];

const RELATIONSHIPS = [
  { value: "self", label: "Self" },
  { value: "spouse", label: "Spouse" },
  { value: "parent", label: "Parent" },
  { value: "child", label: "Child" },
  { value: "other", label: "Other" },
];

const URGENCIES = [
  { value: "immediate", label: "Immediately — I need help today" },
  { value: "within_week", label: "Within the next week" },
  { value: "flexible", label: "Flexible — just exploring" },
];

const SUBSTANCES = [
  "Alcohol", "Opioids / Heroin / Fentanyl", "Cocaine / Crack",
  "Methamphetamine", "Benzodiazepines", "Marijuana",
  "Prescription pills", "Multiple substances", "Mental health only / Co-occurring",
];

type Stage = "form" | "success";

export default function InsuranceVerification() {
  const [params] = useSearchParams();
  const [stage, setStage] = useState<Stage>("form");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestRef, setRequestRef] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [preferredContact, setPreferredContact] = useState<"phone" | "email" | "text">("phone");

  // Carrier prefill from query param so links from /insurance/aetna-rehab etc.
  // can pass `?carrier=Aetna` to skip the dropdown step mentally.
  const [carrier, setCarrier] = useState<string>(() => params.get("carrier") ?? "");
  const [memberId, setMemberId] = useState("");
  const [groupNumber, setGroupNumber] = useState("");
  const [policyHolderName, setPolicyHolderName] = useState("");
  const [policyHolderRelationship, setPolicyHolderRelationship] = useState<string>("self");

  const [primarySubstance, setPrimarySubstance] = useState<string>(() => params.get("substance") ?? "");
  const [urgency, setUrgency] = useState<string>(() => params.get("urgency") ?? "within_week");
  const [preferredState, setPreferredState] = useState<string>(() => params.get("state") ?? "");
  const [preferredCity, setPreferredCity] = useState<string>(() => params.get("city") ?? "");
  const [notes, setNotes] = useState("");

  const formValid =
    firstName.trim().length >= 1 &&
    lastName.trim().length >= 1 &&
    phone.replace(/\D/g, "").length >= 10 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    carrier.trim().length >= 1;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!formValid || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const utmSource = params.get("utm_source");
      const utmMedium = params.get("utm_medium");
      const utmCampaign = params.get("utm_campaign");

      const { data, error } = await supabase.functions.invoke(
        "submit-insurance-verification",
        {
          body: {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            dateOfBirth: dateOfBirth || null,
            phone: phone.trim(),
            email: email.trim().toLowerCase(),
            preferredContact,
            carrier: carrier.trim(),
            memberId: memberId.trim() || null,
            groupNumber: groupNumber.trim() || null,
            policyHolderName: policyHolderName.trim() || null,
            policyHolderRelationship,
            primarySubstance: primarySubstance || null,
            urgency,
            preferredState: preferredState || null,
            preferredCity: preferredCity || null,
            notes: notes.trim() || null,
            landingPage: window.location.pathname + window.location.search,
            utmSource,
            utmMedium,
            utmCampaign,
            referrer: document.referrer || null,
          },
        },
      );

      if (error) {
        toast.error(await getFriendlyErrorString(error, "Could not submit. Please call us instead."));
        return;
      }
      if (data?.error) {
        toast.error(await getFriendlyErrorString(data, "Could not submit. Please call us instead."));
        return;
      }
      setRequestRef(String(data?.requestId ?? "").slice(0, 8).toUpperCase());
      setStage("success");
      analytics.ctaClick("vob_submitted", `carrier:${carrier}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (stage === "success") {
    return (
      <Layout>
        <Helmet>
          <title>Insurance verification received | RehabLookup</title>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        <main className="container mx-auto max-w-2xl px-4 py-12">
          <Card>
            <CardContent className="p-8 md:p-10 text-center">
              <div className="mx-auto h-14 w-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">We've received your request</h1>
              <p className="text-muted-foreground mb-6">
                Our admissions team will verify your <strong>{carrier}</strong> coverage and reach out
                {urgency === "immediate" ? " within the next hour" : " within one business day"}.
              </p>
              {requestRef && (
                <p className="text-xs text-muted-foreground mb-6">
                  Reference: <span className="font-mono">{requestRef}</span>
                </p>
              )}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild>
                  <Link to="/rehab-centers">Browse treatment centers</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/concierge">Talk to a placement specialist</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO
        title="Free Insurance Verification | RehabLookup"
        description="Verify your insurance coverage for addiction treatment in minutes. Free, confidential, no obligation. Major carriers accepted: Aetna, BCBS, Cigna, United Healthcare, Medicaid, Medicare, Tricare and more."
        canonical="/insurance-verification"
        keywords={[
          "insurance verification",
          "verify insurance for rehab",
          "VOB",
          "verification of benefits",
          "rehab insurance check",
          "insurance coverage addiction treatment",
        ]}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Insurance", url: "/insurance" },
          { name: "Verification", url: "/insurance-verification" },
        ]}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: "Insurance Verification for Addiction Treatment",
          serviceType: "Insurance Verification of Benefits (VOB)",
          description:
            "Free verification of insurance coverage for addiction-treatment programs. We confirm your benefits with your carrier and report your in-network coverage, deductible, and out-of-pocket estimate.",
          provider: {
            "@type": "Organization",
            name: "RehabLookup",
            url: "https://rehablookup.com",
          },
          areaServed: { "@type": "Country", name: "United States" },
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
            availability: "https://schema.org/InStock",
            description: "Free and confidential. We never charge for the verification check.",
          },
        }}
      />

      {/* Hero — INSURANCE VERIFICATION. Smaller than State per the
          brief. Teal-cyan accent matches the Insurance hub. */}
      <section className="relative overflow-hidden border-b border-white/5 bg-gradient-to-br from-slate-950 via-teal-900/80 to-cyan-700/55">
        <img
          src={TOPIC_HERO_IMAGES.finance}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-30"
          loading="eager"
          decoding="async"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-slate-950/55" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(20,184,166,0.12),_transparent_55%)]" />
        <div className="container relative z-10 mx-auto px-4 py-6 md:py-8">
          <div className="max-w-2xl mx-auto text-center">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-100 backdrop-blur-sm ring-1 ring-emerald-400/25">
              <ShieldCheck className="h-3 w-3" />
              Free · Confidential · No Obligation
            </div>
            <h1 className="mb-2 font-display text-2xl md:text-3xl lg:text-4xl font-bold text-white">
              Verify Insurance for Treatment
            </h1>
            <p className="text-sm md:text-base text-white/85 max-w-xl mx-auto">
              We'll confirm what your plan covers for addiction treatment — usually within an hour.
            </p>
          </div>
        </div>
      </section>

      <main className="container mx-auto max-w-3xl px-4 py-8 md:py-10">

        <Card>
          <CardContent className="p-6 md:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Contact */}
              <section className="space-y-4">
                <h2 className="text-sm font-semibold text-foreground/80 uppercase tracking-wide">
                  About you
                </h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName">First name *</Label>
                    <Input id="firstName" autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required maxLength={100} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName">Last name *</Label>
                    <Input id="lastName" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} required maxLength={100} />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Phone *</Label>
                    <Input id="phone" type="tel" autoComplete="tel" placeholder="(555) 555-5555" value={phone} onChange={(e) => setPhone(e.target.value)} required maxLength={32} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email *</Label>
                    <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={255} />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="dob">Date of birth</Label>
                    <Input id="dob" type="date" autoComplete="bday" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
                    <p className="text-[11px] text-muted-foreground">Optional — helps the carrier match faster.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contact">How should we reach you?</Label>
                    <Select value={preferredContact} onValueChange={(v) => setPreferredContact(v as typeof preferredContact)}>
                      <SelectTrigger id="contact">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="phone">Call me</SelectItem>
                        <SelectItem value="text">Text me</SelectItem>
                        <SelectItem value="email">Email me</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>

              {/* Insurance */}
              <section className="space-y-4">
                <h2 className="text-sm font-semibold text-foreground/80 uppercase tracking-wide">
                  Your insurance
                </h2>
                <div className="space-y-1.5">
                  <Label htmlFor="carrier">Insurance carrier *</Label>
                  <Select value={carrier} onValueChange={setCarrier}>
                    <SelectTrigger id="carrier">
                      <SelectValue placeholder="Choose your insurance company" />
                    </SelectTrigger>
                    <SelectContent>
                      {CARRIERS.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="member">Member ID</Label>
                    <Input id="member" value={memberId} onChange={(e) => setMemberId(e.target.value)} placeholder="On the front of your card" maxLength={100} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="group">Group number</Label>
                    <Input id="group" value={groupNumber} onChange={(e) => setGroupNumber(e.target.value)} placeholder="Optional" maxLength={100} />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="policy-name">Policy holder name</Label>
                    <Input id="policy-name" value={policyHolderName} onChange={(e) => setPolicyHolderName(e.target.value)} placeholder="If not you" maxLength={200} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="relationship">Relationship to policy holder</Label>
                    <Select value={policyHolderRelationship} onValueChange={setPolicyHolderRelationship}>
                      <SelectTrigger id="relationship">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RELATIONSHIPS.map((r) => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="flex items-start gap-2 text-[12px] text-muted-foreground">
                  <Lock className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  Your member ID is encrypted in transit and is never displayed publicly. We share it
                  only with your carrier to confirm your benefits.
                </p>
              </section>

              {/* Treatment context */}
              <section className="space-y-4">
                <h2 className="text-sm font-semibold text-foreground/80 uppercase tracking-wide">
                  What you're looking for
                </h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="substance">Primary concern</Label>
                    <Select value={primarySubstance} onValueChange={setPrimarySubstance}>
                      <SelectTrigger id="substance">
                        <SelectValue placeholder="Optional" />
                      </SelectTrigger>
                      <SelectContent>
                        {SUBSTANCES.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="urgency">When do you need help?</Label>
                    <Select value={urgency} onValueChange={setUrgency}>
                      <SelectTrigger id="urgency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {URGENCIES.map((u) => (
                          <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="state">Preferred state</Label>
                    <Input id="state" value={preferredState} onChange={(e) => setPreferredState(e.target.value)} placeholder="Optional" maxLength={50} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="city">Preferred city</Label>
                    <Input id="city" value={preferredCity} onChange={(e) => setPreferredCity(e.target.value)} placeholder="Optional" maxLength={100} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="notes">Anything else?</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Special needs, current medications, prior treatment history…"
                    rows={3}
                    maxLength={2000}
                  />
                  {notes.length > 1800 && (
                    <p className="text-xs text-muted-foreground text-right">{notes.length}/2000</p>
                  )}
                </div>
              </section>

              <Button type="submit" size="lg" className="w-full" disabled={!formValid || isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  "Verify my insurance"
                )}
              </Button>

              <p className="text-[12px] text-center text-muted-foreground">
                By submitting you agree to be contacted about treatment options. We never sell your
                information. Verification of benefits does not enroll you in any program.
              </p>
            </form>
          </CardContent>
        </Card>
      </main>
    </Layout>
  );
}
