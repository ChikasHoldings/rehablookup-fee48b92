import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { US_STATES } from "@/lib/constants";

interface PlacementIntakeFormProps {
  onSuccess: (caseId: string) => void;
}

const STEPS = [
  { title: "About You", description: "Who needs help" },
  { title: "Treatment", description: "Care needs" },
  { title: "Insurance", description: "Payment info" },
  { title: "Preferences", description: "Location & timing" },
  { title: "Contact", description: "How to reach you" },
];

const CARE_TYPES = [
  { value: "detox", label: "Detox" },
  { value: "inpatient", label: "Residential Inpatient" },
  { value: "php", label: "Partial Hospitalization (PHP)" },
  { value: "iop", label: "Intensive Outpatient (IOP)" },
  { value: "outpatient", label: "Outpatient" },
  { value: "mat", label: "Medication-Assisted Treatment (MAT)" },
  { value: "sober_living", label: "Sober Living" },
  { value: "not_sure", label: "Not Sure - Need Guidance" },
];

const PRIMARY_ISSUES = [
  { value: "alcohol", label: "Alcohol" },
  { value: "opioids", label: "Opioids (Heroin, Fentanyl, Pills)" },
  { value: "benzos", label: "Benzodiazepines" },
  { value: "stimulants", label: "Stimulants (Meth, Cocaine)" },
  { value: "marijuana", label: "Marijuana" },
  { value: "prescription", label: "Prescription Drugs" },
  { value: "mental_health", label: "Mental Health (No Substance)" },
  { value: "dual_diagnosis", label: "Co-occurring Mental Health" },
  { value: "other", label: "Other" },
];

const URGENCY_OPTIONS = [
  { value: "immediate", label: "Immediate (Today/Tomorrow)" },
  { value: "within_week", label: "Within This Week" },
  { value: "within_month", label: "Within 30 Days" },
  { value: "flexible", label: "Flexible / Exploring Options" },
];

const INSURANCE_CARRIERS = [
  "Aetna",
  "Anthem",
  "Blue Cross Blue Shield",
  "Cigna",
  "Humana",
  "Kaiser Permanente",
  "Medicaid",
  "Medicare",
  "Tricare",
  "United Healthcare",
  "Other",
];

const SPECIAL_CONSIDERATIONS = [
  { value: "trauma_informed", label: "Trauma-Informed Care" },
  { value: "lgbtq", label: "LGBTQ+ Affirming" },
  { value: "medical_detox", label: "Medical Detox Required" },
  { value: "chronic_pain", label: "Chronic Pain Management" },
  { value: "eating_disorder", label: "Eating Disorder" },
  { value: "veterans", label: "Veterans Program" },
  { value: "professionals", label: "Professionals Program" },
  { value: "faith_based", label: "Faith-Based" },
];

export function PlacementIntakeForm({ onSuccess }: PlacementIntakeFormProps) {
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    // Step 1: About
    whoSeekingHelp: "self",
    ageRange: "",
    gender: "",
    
    // Step 2: Treatment
    primaryIssues: [] as string[],
    levelOfCare: "",
    specialConsiderations: [] as string[],
    
    // Step 3: Insurance
    paymentType: "",
    insuranceCarrier: "",
    insurancePlan: "",
    selfPayBudget: "",
    
    // Step 4: Preferences
    preferredStates: [] as string[],
    preferredCities: "",
    urgency: "",
    additionalNotes: "",
    
    // Step 5: Contact
    seekerName: "",
    seekerPhone: "",
    seekerEmail: "",
    preferredContactMethod: "phone",
    bestTimeToContact: "",
  });

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleArrayValue = (field: string, value: string) => {
    setFormData((prev) => {
      const current = prev[field as keyof typeof prev] as string[];
      if (current.includes(value)) {
        return { ...prev, [field]: current.filter((v) => v !== value) };
      } else {
        return { ...prev, [field]: [...current, value] };
      }
    });
  };

  const canProceed = () => {
    switch (step) {
      case 0: // About
        return formData.whoSeekingHelp && formData.ageRange;
      case 1: // Treatment
        return formData.primaryIssues.length > 0 && formData.levelOfCare;
      case 2: // Insurance
        return formData.paymentType;
      case 3: // Preferences
        return formData.urgency;
      case 4: // Contact
        return formData.seekerName && formData.seekerPhone && formData.seekerEmail;
      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    if (!canProceed()) return;
    
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("placement_cases")
        .insert({
          seeker_name: formData.seekerName,
          seeker_email: formData.seekerEmail,
          seeker_phone: formData.seekerPhone,
          who_seeking_help: formData.whoSeekingHelp,
          primary_issue: formData.primaryIssues,
          level_of_care: formData.levelOfCare,
          payment_type: formData.paymentType,
          insurance_carrier: formData.insuranceCarrier || null,
          insurance_plan: formData.insurancePlan || null,
          self_pay_budget: formData.selfPayBudget || null,
          preferred_states: formData.preferredStates.length > 0 ? formData.preferredStates : null,
          preferred_cities: formData.preferredCities ? formData.preferredCities.split(",").map(c => c.trim()) : null,
          urgency: formData.urgency,
          age_range: formData.ageRange,
          gender: formData.gender || null,
          special_considerations: formData.specialConsiderations.length > 0 
            ? { needs: formData.specialConsiderations } 
            : {},
          additional_notes: formData.additionalNotes || null,
          preferred_contact_method: formData.preferredContactMethod,
          best_time_to_contact: formData.bestTimeToContact || null,
          status: "new",
        })
        .select("id")
        .single();

      if (error) throw error;

      toast.success("Your request has been submitted!");
      onSuccess(data.id);
    } catch (error: any) {
      console.error("Submission error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="font-medium text-foreground">
            Step {step + 1}: {STEPS[step].title}
          </span>
          <span className="text-muted-foreground">
            {step + 1} of {STEPS.length}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step Content */}
      <div className="min-h-[320px]">
        {step === 0 && (
          <div className="space-y-6">
            <div className="space-y-3">
              <Label>Who needs help?</Label>
              <RadioGroup
                value={formData.whoSeekingHelp}
                onValueChange={(v) => updateField("whoSeekingHelp", v)}
                className="grid gap-2"
              >
                <Label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                  <RadioGroupItem value="self" />
                  <span>Myself</span>
                </Label>
                <Label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                  <RadioGroupItem value="loved_one" />
                  <span>A loved one (family member or friend)</span>
                </Label>
                <Label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                  <RadioGroupItem value="professional" />
                  <span>I'm a professional making a referral</span>
                </Label>
              </RadioGroup>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Age Range</Label>
                <Select value={formData.ageRange} onValueChange={(v) => updateField("ageRange", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select age range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="adolescent">Adolescent (13-17)</SelectItem>
                    <SelectItem value="young_adult">Young Adult (18-25)</SelectItem>
                    <SelectItem value="adult">Adult (26-64)</SelectItem>
                    <SelectItem value="senior">Senior (65+)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Gender (Optional)</Label>
                <Select value={formData.gender} onValueChange={(v) => updateField("gender", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="non_binary">Non-binary</SelectItem>
                    <SelectItem value="prefer_not_say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-3">
              <Label>Primary Issue(s) - Select all that apply</Label>
              <div className="grid sm:grid-cols-2 gap-2">
                {PRIMARY_ISSUES.map((issue) => (
                  <Label
                    key={issue.value}
                    className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                  >
                    <Checkbox
                      checked={formData.primaryIssues.includes(issue.value)}
                      onCheckedChange={() => toggleArrayValue("primaryIssues", issue.value)}
                    />
                    <span className="text-sm">{issue.label}</span>
                  </Label>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Level of Care Needed</Label>
              <Select value={formData.levelOfCare} onValueChange={(v) => updateField("levelOfCare", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select level of care" />
                </SelectTrigger>
                <SelectContent>
                  {CARE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Special Considerations (Optional)</Label>
              <div className="grid sm:grid-cols-2 gap-2">
                {SPECIAL_CONSIDERATIONS.map((item) => (
                  <Label
                    key={item.value}
                    className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                  >
                    <Checkbox
                      checked={formData.specialConsiderations.includes(item.value)}
                      onCheckedChange={() => toggleArrayValue("specialConsiderations", item.value)}
                    />
                    <span className="text-sm">{item.label}</span>
                  </Label>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="space-y-3">
              <Label>How will you pay for treatment?</Label>
              <RadioGroup
                value={formData.paymentType}
                onValueChange={(v) => updateField("paymentType", v)}
                className="grid gap-2"
              >
                <Label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                  <RadioGroupItem value="insurance" />
                  <span>Private Insurance</span>
                </Label>
                <Label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                  <RadioGroupItem value="medicaid" />
                  <span>Medicaid</span>
                </Label>
                <Label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                  <RadioGroupItem value="medicare" />
                  <span>Medicare</span>
                </Label>
                <Label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                  <RadioGroupItem value="self_pay" />
                  <span>Self-Pay (Out of Pocket)</span>
                </Label>
              </RadioGroup>
            </div>

            {formData.paymentType === "insurance" && (
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Insurance Carrier</Label>
                  <Select
                    value={formData.insuranceCarrier}
                    onValueChange={(v) => updateField("insuranceCarrier", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select carrier" />
                    </SelectTrigger>
                    <SelectContent>
                      {INSURANCE_CARRIERS.map((carrier) => (
                        <SelectItem key={carrier} value={carrier.toLowerCase().replace(/\s/g, "_")}>
                          {carrier}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Plan Name (Optional)</Label>
                  <Input
                    placeholder="e.g., PPO Gold"
                    value={formData.insurancePlan}
                    onChange={(e) => updateField("insurancePlan", e.target.value)}
                  />
                </div>
              </div>
            )}

            {formData.paymentType === "self_pay" && (
              <div className="space-y-2">
                <Label>Monthly Budget Range (Optional)</Label>
                <Select
                  value={formData.selfPayBudget}
                  onValueChange={(v) => updateField("selfPayBudget", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select budget range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="under_10k">Under $10,000/month</SelectItem>
                    <SelectItem value="10k_20k">$10,000 - $20,000/month</SelectItem>
                    <SelectItem value="20k_30k">$20,000 - $30,000/month</SelectItem>
                    <SelectItem value="30k_50k">$30,000 - $50,000/month</SelectItem>
                    <SelectItem value="over_50k">Over $50,000/month</SelectItem>
                    <SelectItem value="flexible">Flexible / Need Guidance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="space-y-3">
              <Label>How urgent is this?</Label>
              <RadioGroup
                value={formData.urgency}
                onValueChange={(v) => updateField("urgency", v)}
                className="grid gap-2"
              >
                {URGENCY_OPTIONS.map((option) => (
                  <Label
                    key={option.value}
                    className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                  >
                    <RadioGroupItem value={option.value} />
                    <span>{option.label}</span>
                  </Label>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Preferred State(s) - Optional</Label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
                {US_STATES.map((state) => (
                  <Label
                    key={state.abbreviation}
                    className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5 text-xs"
                  >
                    <Checkbox
                      checked={formData.preferredStates.includes(state.abbreviation)}
                      onCheckedChange={() => toggleArrayValue("preferredStates", state.abbreviation)}
                    />
                    <span>{state.abbreviation}</span>
                  </Label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Preferred Cities (Optional)</Label>
              <Input
                placeholder="e.g., Los Angeles, San Diego"
                value={formData.preferredCities}
                onChange={(e) => updateField("preferredCities", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Separate multiple cities with commas</p>
            </div>

            <div className="space-y-2">
              <Label>Anything else we should know? (Optional)</Label>
              <Textarea
                placeholder="Any additional details that would help us find the right fit..."
                value={formData.additionalNotes}
                onChange={(e) => updateField("additionalNotes", e.target.value)}
                rows={3}
              />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Your Name</Label>
              <Input
                placeholder="Full name"
                value={formData.seekerName}
                onChange={(e) => updateField("seekerName", e.target.value)}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={formData.seekerPhone}
                  onChange={(e) => updateField("seekerPhone", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={formData.seekerEmail}
                  onChange={(e) => updateField("seekerEmail", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Preferred Contact Method</Label>
              <RadioGroup
                value={formData.preferredContactMethod}
                onValueChange={(v) => updateField("preferredContactMethod", v)}
                className="flex gap-4"
              >
                <Label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="phone" />
                  <span>Phone</span>
                </Label>
                <Label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="email" />
                  <span>Email</span>
                </Label>
                <Label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="text" />
                  <span>Text</span>
                </Label>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Best Time to Contact (Optional)</Label>
              <Select
                value={formData.bestTimeToContact}
                onValueChange={(v) => updateField("bestTimeToContact", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Morning (8am - 12pm)</SelectItem>
                  <SelectItem value="afternoon">Afternoon (12pm - 5pm)</SelectItem>
                  <SelectItem value="evening">Evening (5pm - 8pm)</SelectItem>
                  <SelectItem value="anytime">Anytime</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
              <p>
                By submitting, you agree to our{" "}
                <a href="/privacy-policy" className="text-primary underline">
                  Privacy Policy
                </a>
                . Your information is kept confidential and secure.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t">
        <Button
          variant="outline"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0 || isSubmitting}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!canProceed()}>
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={!canProceed() || isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Request"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
