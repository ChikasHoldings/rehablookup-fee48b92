import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { 
  Loader2, 
  ArrowRight, 
  ArrowLeft,
  Shield,
  CreditCard,
  User,
  MapPin,
  Heart,
  ClipboardList,
  Phone
} from "lucide-react";

// US States
const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", 
  "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", 
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", 
  "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", 
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", 
  "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", 
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", 
  "Wisconsin", "Wyoming"
];

const AGE_RANGES = [
  { value: "18-25", label: "18-25" },
  { value: "26-35", label: "26-35" },
  { value: "36-45", label: "36-45" },
  { value: "46-55", label: "46-55" },
  { value: "56-65", label: "56-65" },
  { value: "65+", label: "65+" },
];

const PRIMARY_CONCERNS = [
  { value: "alcohol", label: "Alcohol" },
  { value: "opioids", label: "Opioids (heroin, fentanyl, pills)" },
  { value: "stimulants", label: "Stimulants (meth, cocaine)" },
  { value: "benzodiazepines", label: "Benzodiazepines" },
  { value: "marijuana", label: "Marijuana" },
  { value: "mental_health", label: "Mental Health (no substances)" },
  { value: "other", label: "Other" },
];

const LEVELS_OF_CARE = [
  { value: "detox", label: "Medical Detox" },
  { value: "residential", label: "Residential/Inpatient" },
  { value: "php", label: "Partial Hospitalization (PHP)" },
  { value: "iop", label: "Intensive Outpatient (IOP)" },
  { value: "unsure", label: "Not Sure - Need Guidance" },
];

const TIMELINE_OPTIONS = [
  { value: "immediate", label: "Immediate (1-3 days)" },
  { value: "this_week", label: "This Week" },
  { value: "next_week", label: "Next 1-2 Weeks" },
  { value: "this_month", label: "Within a Month" },
  { value: "exploring", label: "Just Exploring Options" },
];

const PAYMENT_TYPES = [
  { value: "insurance", label: "Insurance" },
  { value: "self-pay", label: "Self-Pay" },
  { value: "both", label: "Both Options" },
];

interface IntakeFormData {
  // Basic info
  ageRange: string;
  gender: string;
  currentState: string;
  currentCity: string;
  relationship: string;
  phone: string;
  
  // Care needs
  primaryConcern: string;
  levelOfCare: string;
  detoxNeeded: string;
  priorTreatment: boolean | null;
  
  // Preferences
  desiredState: string;
  desiredCity: string;
  timeline: string;
  
  // Payment
  paymentType: string;
  insuranceCarrier: string;
  
  // Additional
  notes: string;
  hipaaConsent: boolean;
}

const initialFormData: IntakeFormData = {
  ageRange: "",
  gender: "",
  currentState: "",
  currentCity: "",
  relationship: "self",
  phone: "",
  primaryConcern: "",
  levelOfCare: "",
  detoxNeeded: "",
  priorTreatment: null,
  desiredState: "",
  desiredCity: "",
  timeline: "",
  paymentType: "",
  insuranceCarrier: "",
  notes: "",
  hipaaConsent: false,
};

// Format phone number as user types
const formatPhoneNumber = (value: string): string => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
  return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
};

// Validate phone number (10 digits)
const isValidPhone = (phone: string): boolean => {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10;
};

interface ConciergeInlineIntakeProps {
  userEmail: string;
  userName: string;
  userPhone?: string;
  userId?: string;
}

export function ConciergeInlineIntake({ userEmail, userName, userPhone, userId }: ConciergeInlineIntakeProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<IntakeFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  const totalSteps = 4;

  const updateField = <K extends keyof IntakeFormData>(field: K, value: IntakeFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!formData.ageRange) newErrors.ageRange = "Required";
        if (!formData.gender) newErrors.gender = "Required";
        if (!formData.currentState) newErrors.currentState = "Required";
        if (!formData.currentCity) newErrors.currentCity = "Required";
        if (!formData.phone) {
          newErrors.phone = "Phone number is required for SMS updates";
        } else if (!isValidPhone(formData.phone)) {
          newErrors.phone = "Please enter a valid 10-digit phone number";
        }
        break;
      case 2:
        if (!formData.primaryConcern) newErrors.primaryConcern = "Required";
        if (!formData.levelOfCare) newErrors.levelOfCare = "Required";
        if (!formData.detoxNeeded) newErrors.detoxNeeded = "Required";
        break;
      case 3:
        if (!formData.desiredState) newErrors.desiredState = "Required";
        if (!formData.timeline) newErrors.timeline = "Required";
        if (!formData.paymentType) newErrors.paymentType = "Required";
        if ((formData.paymentType === "insurance" || formData.paymentType === "both") && !formData.insuranceCarrier) {
          newErrors.insuranceCarrier = "Required for insurance";
        }
        break;
      case 4:
        if (!formData.hipaaConsent) newErrors.hipaaConsent = "You must consent to continue";
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    } else {
      toast.error("Please fill in all required fields");
    }
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmitAndPay = async () => {
    if (!validateStep(currentStep)) {
      toast.error("Please complete all required fields");
      return;
    }

    setIsProcessing(true);

    try {
      // Call the checkout function with auth user data
      const { data, error } = await supabase.functions.invoke("create-concierge-checkout", {
        body: {
          email: userEmail,
          intakeData: {
            ...formData,
            decisionMakerName: userName,
            email: userEmail,
            phone: formData.phone || userPhone || "",
          },
          isAuthenticated: true,
          userId: userId, // Pass user ID for linking
        },
      });

      if (error) throw error;

      if (data?.url) {
        // Store intake data for post-payment submission
        localStorage.setItem("concierge_pending_intake", JSON.stringify({
          formData,
          userName,
          userEmail,
          userPhone: formData.phone || userPhone,
          sessionId: data.sessionId,
        }));
        
        // Redirect to Stripe checkout (validate URL origin)
        if (data.url.startsWith("https://checkout.stripe.com") || data.url.startsWith("https://billing.stripe.com")) {
          window.location.href = data.url;
        } else {
          throw new Error("Invalid checkout URL");
        }
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      toast.error("Failed to start checkout. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {Array.from({ length: totalSteps }).map((_, idx) => (
        <div
          key={idx}
          className={`h-2 rounded-full transition-all ${
            idx + 1 === currentStep
              ? "w-8 bg-primary"
              : idx + 1 < currentStep
              ? "w-2 bg-primary"
              : "w-2 bg-muted"
          }`}
        />
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">About the Person Seeking Help</h3>
          <p className="text-sm text-muted-foreground">Basic information to help us match you</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Age Range *</Label>
          <Select value={formData.ageRange} onValueChange={v => updateField("ageRange", v)}>
            <SelectTrigger className={errors.ageRange ? "border-destructive" : ""}>
              <SelectValue placeholder="Select age range" />
            </SelectTrigger>
            <SelectContent>
              {AGE_RANGES.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Gender *</Label>
          <Select value={formData.gender} onValueChange={v => updateField("gender", v)}>
            <SelectTrigger className={errors.gender ? "border-destructive" : ""}>
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="non-binary">Non-binary</SelectItem>
              <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Current State *</Label>
          <Select value={formData.currentState} onValueChange={v => updateField("currentState", v)}>
            <SelectTrigger className={errors.currentState ? "border-destructive" : ""}>
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent>
              {US_STATES.map(state => (
                <SelectItem key={state} value={state}>{state}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Current City *</Label>
          <Input
            value={formData.currentCity}
            onChange={e => updateField("currentCity", e.target.value)}
            placeholder="Enter city"
            className={errors.currentCity ? "border-destructive" : ""}
          />
        </div>
      </div>

      {/* Phone Number */}
      <div className="space-y-2">
        <Label htmlFor="phone" className="flex items-center gap-2">
          <Phone className="h-3.5 w-3.5" />
          Phone Number *
        </Label>
        <Input
          id="phone"
          type="tel"
          value={formData.phone}
          onChange={e => updateField("phone", formatPhoneNumber(e.target.value))}
          placeholder="(555) 123-4567"
          className={errors.phone ? "border-destructive" : ""}
          maxLength={14}
        />
        {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
        <p className="text-xs text-muted-foreground">
          We'll send SMS updates about your case and messages from matched facilities.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Who are you seeking help for? *</Label>
        <RadioGroup
          value={formData.relationship}
          onValueChange={v => updateField("relationship", v)}
          className="flex flex-wrap gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="self" id="self" />
            <Label htmlFor="self" className="font-normal cursor-pointer">Myself</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="family" id="family" />
            <Label htmlFor="family" className="font-normal cursor-pointer">Family member</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="friend" id="friend" />
            <Label htmlFor="friend" className="font-normal cursor-pointer">Friend</Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Heart className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">Treatment Needs</h3>
          <p className="text-sm text-muted-foreground">Help us understand your situation</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Primary Concern *</Label>
        <Select value={formData.primaryConcern} onValueChange={v => updateField("primaryConcern", v)}>
          <SelectTrigger className={errors.primaryConcern ? "border-destructive" : ""}>
            <SelectValue placeholder="Select primary concern" />
          </SelectTrigger>
          <SelectContent>
            {PRIMARY_CONCERNS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Level of Care Needed *</Label>
        <Select value={formData.levelOfCare} onValueChange={v => updateField("levelOfCare", v)}>
          <SelectTrigger className={errors.levelOfCare ? "border-destructive" : ""}>
            <SelectValue placeholder="Select level of care" />
          </SelectTrigger>
          <SelectContent>
            {LEVELS_OF_CARE.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Is medical detox needed? *</Label>
        <RadioGroup
          value={formData.detoxNeeded}
          onValueChange={v => updateField("detoxNeeded", v)}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="detox-yes" />
            <Label htmlFor="detox-yes" className="font-normal cursor-pointer">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="detox-no" />
            <Label htmlFor="detox-no" className="font-normal cursor-pointer">No</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="unsure" id="detox-unsure" />
            <Label htmlFor="detox-unsure" className="font-normal cursor-pointer">Not sure</Label>
          </div>
        </RadioGroup>
        {errors.detoxNeeded && <p className="text-xs text-destructive">{errors.detoxNeeded}</p>}
      </div>

      <div className="space-y-2">
        <Label>Any prior treatment?</Label>
        <RadioGroup
          value={formData.priorTreatment === null ? "" : formData.priorTreatment ? "yes" : "no"}
          onValueChange={v => updateField("priorTreatment", v === "yes")}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="prior-yes" />
            <Label htmlFor="prior-yes" className="font-normal cursor-pointer">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="prior-no" />
            <Label htmlFor="prior-no" className="font-normal cursor-pointer">No</Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <MapPin className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">Preferences & Payment</h3>
          <p className="text-sm text-muted-foreground">Location and payment details</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Preferred Treatment State *</Label>
          <Select value={formData.desiredState} onValueChange={v => updateField("desiredState", v)}>
            <SelectTrigger className={errors.desiredState ? "border-destructive" : ""}>
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="anywhere">Open to Anywhere</SelectItem>
              {US_STATES.map(state => (
                <SelectItem key={state} value={state}>{state}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Preferred City (optional)</Label>
          <Input
            value={formData.desiredCity}
            onChange={e => updateField("desiredCity", e.target.value)}
            placeholder="Enter city or leave blank"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Timeline *</Label>
        <Select value={formData.timeline} onValueChange={v => updateField("timeline", v)}>
          <SelectTrigger className={errors.timeline ? "border-destructive" : ""}>
            <SelectValue placeholder="When do you need treatment?" />
          </SelectTrigger>
          <SelectContent>
            {TIMELINE_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Payment Method *</Label>
        <RadioGroup
          value={formData.paymentType}
          onValueChange={v => updateField("paymentType", v)}
          className="flex flex-wrap gap-4"
        >
          {PAYMENT_TYPES.map(opt => (
            <div key={opt.value} className="flex items-center space-x-2">
              <RadioGroupItem value={opt.value} id={`pay-${opt.value}`} />
              <Label htmlFor={`pay-${opt.value}`} className="font-normal cursor-pointer">{opt.label}</Label>
            </div>
          ))}
        </RadioGroup>
        {errors.paymentType && <p className="text-xs text-destructive">{errors.paymentType}</p>}
      </div>

      {(formData.paymentType === "insurance" || formData.paymentType === "both") && (
        <div className="space-y-2">
          <Label>Insurance Carrier *</Label>
          <Input
            value={formData.insuranceCarrier}
            onChange={e => updateField("insuranceCarrier", e.target.value)}
            placeholder="e.g., Blue Cross, Aetna, United"
            className={errors.insuranceCarrier ? "border-destructive" : ""}
          />
        </div>
      )}
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <ClipboardList className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">Additional Notes & Consent</h3>
          <p className="text-sm text-muted-foreground">Almost done! Review and submit</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Additional Notes (optional)</Label>
        <Textarea
          value={formData.notes}
          onChange={e => updateField("notes", e.target.value)}
          placeholder="Any other details that would help us find the right match (special needs, preferences, concerns...)"
          rows={4}
        />
      </div>

      {/* Summary */}
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="summary">
          <AccordionTrigger className="text-sm">Review Your Information</AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Contact</span>
                <span>{userName} ({userEmail})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone</span>
                <span>{formData.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Age/Gender</span>
                <span>{formData.ageRange}, {formData.gender}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Location</span>
                <span>{formData.currentCity}, {formData.currentState}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Primary Concern</span>
                <span className="capitalize">{formData.primaryConcern.replace(/_/g, ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Level of Care</span>
                <span className="capitalize">{formData.levelOfCare.replace(/_/g, ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Preferred Location</span>
                <span>{formData.desiredCity ? `${formData.desiredCity}, ` : ""}{formData.desiredState}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Timeline</span>
                <span className="capitalize">{formData.timeline.replace(/_/g, ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment</span>
                <span className="capitalize">
                  {formData.paymentType === "insurance" || formData.paymentType === "both"
                    ? formData.insuranceCarrier
                    : formData.paymentType}
                </span>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="flex items-start space-x-3 p-4 rounded-lg bg-muted/50 border">
        <Checkbox
          id="hipaa-consent"
          checked={formData.hipaaConsent}
          onCheckedChange={checked => updateField("hipaaConsent", !!checked)}
          className={errors.hipaaConsent ? "border-destructive" : ""}
        />
        <div className="space-y-1">
          <Label htmlFor="hipaa-consent" className="cursor-pointer leading-relaxed">
            I consent to share my information with matched treatment providers to assist with my placement. 
            I understand this information will be handled according to HIPAA guidelines.
          </Label>
          {errors.hipaaConsent && <p className="text-xs text-destructive">{errors.hipaaConsent}</p>}
        </div>
      </div>

      {/* Price Info */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold">Concierge Fee</p>
                <p className="text-sm text-muted-foreground">One-time placement assistance</p>
              </div>
            </div>
            <p className="text-2xl font-bold text-primary">$29</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Start Your Personalized Placement</CardTitle>
        <CardDescription>
          Complete this quick intake and pay $29 to be placed in the right treatment center.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {renderStepIndicator()}

        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}

        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentStep === 1 || isProcessing}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {currentStep < totalSteps ? (
            <Button onClick={handleNext}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmitAndPay} disabled={isProcessing} className="gap-2">
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4" />
                  Pay $29 & Submit
                </>
              )}
            </Button>
          )}
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Shield className="h-3 w-3" />
          <span>Secure payment powered by Stripe</span>
        </div>
      </CardContent>
    </Card>
  );
}
