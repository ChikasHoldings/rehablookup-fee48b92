import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { HelpCircle, Phone, Mail, Clock, User, AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { ConciergeIntakeData } from "@/pages/concierge/ConciergeIntake";

const BEST_TIMES = [
  { value: "morning", label: "Morning (8am - 12pm)" },
  { value: "afternoon", label: "Afternoon (12pm - 5pm)" },
  { value: "evening", label: "Evening (5pm - 8pm)" },
  { value: "anytime", label: "Anytime" },
];

const REFERRAL_SOURCES = [
  { value: "google", label: "Google Search" },
  { value: "friend_family", label: "Friend or Family Referral" },
  { value: "healthcare_provider", label: "Healthcare Provider" },
  { value: "social_media", label: "Social Media" },
  { value: "treatment_alumni", label: "Treatment Alumni" },
  { value: "insurance", label: "Insurance Company" },
  { value: "other", label: "Other" },
];

interface Props {
  data: ConciergeIntakeData;
  errors: Record<string, string>;
  onChange: (updates: Partial<ConciergeIntakeData>) => void;
}

// Format phone number as user types
const formatPhoneNumber = (value: string) => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
  return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
};

export function StepContact({ data, errors, onChange }: Props) {
  const handlePhoneChange = (value: string, field: 'phone' | 'alternativeContactPhone' | 'emergencyContactPhone') => {
    onChange({ [field]: formatPhoneNumber(value) });
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground border-l-4 border-primary/30 pl-4 py-2 bg-muted/30 rounded-r-lg">
          We'll use this information to contact you about matched programs. All information is kept strictly confidential.
        </p>

        {/* Primary Contact */}
        <div className="space-y-4 p-4 border rounded-lg">
          <Label className="text-base font-medium flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Primary Contact (Decision Maker)
          </Label>

          <div className="space-y-2">
            <Label htmlFor="decisionMakerName">Full Name *</Label>
            <Input
              id="decisionMakerName"
              value={data.decisionMakerName}
              onChange={(e) => onChange({ decisionMakerName: e.target.value })}
              placeholder="Enter your full name"
              className={errors.decisionMakerName ? "border-destructive ring-1 ring-destructive" : ""}
            />
            {errors.decisionMakerName && <p className="text-sm text-destructive">{errors.decisionMakerName}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5" />
                Phone Number *
              </Label>
              <Input
                id="phone"
                type="tel"
                value={data.phone}
                onChange={(e) => handlePhoneChange(e.target.value, 'phone')}
                placeholder="(555) 123-4567"
                className={errors.phone ? "border-destructive ring-1 ring-destructive" : ""}
              />
              {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5" />
                Email Address *
              </Label>
              <Input
                id="email"
                type="email"
                value={data.email}
                onChange={(e) => onChange({ email: e.target.value })}
                placeholder="your@email.com"
                className={errors.email ? "border-destructive ring-1 ring-destructive" : ""}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" />
              Best Time to Call *
            </Label>
            <Select value={data.bestTimeToCall} onValueChange={(v) => onChange({ bestTimeToCall: v })}>
              <SelectTrigger className={errors.bestTimeToCall ? "border-destructive ring-1 ring-destructive" : ""}>
                <SelectValue placeholder="Select best time" />
              </SelectTrigger>
              <SelectContent>
                {BEST_TIMES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.bestTimeToCall && <p className="text-sm text-destructive">{errors.bestTimeToCall}</p>}
          </div>
        </div>

        {/* Alternative Contact */}
        <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
          <Label className="text-base font-medium flex items-center gap-2">
            Alternative Contact
            <span className="text-xs text-muted-foreground font-normal">(Optional backup contact)</span>
          </Label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="alternativeContactName">Name</Label>
              <Input
                id="alternativeContactName"
                value={data.alternativeContactName || ""}
                onChange={(e) => onChange({ alternativeContactName: e.target.value })}
                placeholder="Backup contact name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="alternativeContactPhone">Phone</Label>
              <Input
                id="alternativeContactPhone"
                type="tel"
                value={data.alternativeContactPhone || ""}
                onChange={(e) => handlePhoneChange(e.target.value, 'alternativeContactPhone')}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="space-y-4 p-4 border rounded-lg border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20">
          <Label className="text-base font-medium flex items-center gap-2 text-orange-800 dark:text-orange-200">
            <AlertCircle className="h-4 w-4" />
            Emergency Contact
            <span className="text-xs font-normal">(Recommended)</span>
          </Label>
          <p className="text-xs text-muted-foreground">Someone we can reach in case of emergency during the intake process</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="emergencyContactName">Name</Label>
              <Input
                id="emergencyContactName"
                value={data.emergencyContactName || ""}
                onChange={(e) => onChange({ emergencyContactName: e.target.value })}
                placeholder="Emergency contact name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emergencyContactPhone">Phone</Label>
              <Input
                id="emergencyContactPhone"
                type="tel"
                value={data.emergencyContactPhone || ""}
                onChange={(e) => handlePhoneChange(e.target.value, 'emergencyContactPhone')}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>
        </div>

        {/* Additional Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes" className="flex items-center gap-2">
            Additional Notes or Special Considerations *
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">Share anything else that would help us find the right program. This could include specific concerns, cultural preferences, or questions.</p>
              </TooltipContent>
            </Tooltip>
          </Label>
          <Textarea
            id="notes"
            value={data.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
            placeholder="Share any additional information that would help us find the right program (minimum 10 characters)..."
            rows={4}
            className={errors.notes ? "border-destructive ring-1 ring-destructive" : ""}
          />
          {errors.notes && <p className="text-sm text-destructive">{errors.notes}</p>}
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Share any details that will help us match you with the right facility</span>
            <span className={data.notes.length >= 10 ? "text-green-600" : ""}>
              {data.notes.length}/10 min
            </span>
          </div>
        </div>

        {/* Referral Source */}
        <div className="space-y-2">
          <Label>How did you hear about us?</Label>
          <Select value={data.referralSource || ""} onValueChange={(v) => onChange({ referralSource: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Select source" />
            </SelectTrigger>
            <SelectContent>
              {REFERRAL_SOURCES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* HIPAA Consent */}
        <div className="space-y-3 p-4 border rounded-lg bg-primary/5 border-primary/20">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="hipaa-consent"
              checked={data.hipaaConsent || false}
              onCheckedChange={(checked) => onChange({ hipaaConsent: !!checked })}
              className={errors.hipaaConsent ? "border-destructive" : ""}
            />
            <div className="space-y-1">
              <Label htmlFor="hipaa-consent" className="font-medium cursor-pointer">
                I consent to HIPAA-aware practices *
              </Label>
              <p className="text-xs text-muted-foreground">
                I understand that my information will be handled according to HIPAA guidelines and will only be shared with treatment facilities I'm matched with. I authorize RehabLookup to contact me regarding placement services.
              </p>
            </div>
          </div>
          {errors.hipaaConsent && <p className="text-sm text-destructive">{errors.hipaaConsent}</p>}
        </div>

        {/* Trust Indicators */}
        <div className="flex flex-wrap gap-4 justify-center text-xs text-muted-foreground pt-2">
          <span className="flex items-center gap-1">
            <svg className="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            256-bit SSL Encryption
          </span>
          <span className="flex items-center gap-1">
            <svg className="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            HIPAA Compliant
          </span>
          <span className="flex items-center gap-1">
            <svg className="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            100% Confidential
          </span>
        </div>
      </div>
    </TooltipProvider>
  );
}
