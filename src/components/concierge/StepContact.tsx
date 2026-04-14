import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Phone, Mail, User, AlertCircle } from "lucide-react";
import type { ConciergeIntakeData } from "@/pages/concierge/ConciergeIntake";
import { formatEmailInput } from "@/lib/emailUtils";

const BEST_TIMES = [
  { value: "morning", label: "Morning (8am - 12pm)" },
  { value: "afternoon", label: "Afternoon (12pm - 5pm)" },
  { value: "evening", label: "Evening (5pm - 8pm)" },
  { value: "anytime", label: "Anytime" },
];

const REFERRAL_SOURCES = [
  { value: "google", label: "Google Search" },
  { value: "friend_family", label: "Friend or Family" },
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
  const sanitizeName = (val: string) => val.replace(/<[^>]*>/g, "").replace(/javascript:/gi, "").slice(0, 100);

  const handlePhoneChange = (value: string, field: 'phone' | 'alternativeContactPhone' | 'emergencyContactPhone') => {
    onChange({ [field]: formatPhoneNumber(value) });
  };

  return (
    <div className="space-y-5">
      {/* Primary Contact Section */}
      <div className="space-y-4 p-4 border rounded-lg">
        <div className="flex items-center gap-2 text-sm font-medium">
          <User className="h-4 w-4 text-primary" />
          Primary Contact
        </div>

        {/* First Name and Last Name */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              First Name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={data.firstName || ""}
              onChange={(e) => onChange({ firstName: sanitizeName(e.target.value) })}
              placeholder="First name"
              maxLength={100}
              className={`h-11 ${errors.firstName ? "border-destructive ring-1 ring-destructive" : ""}`}
            />
            {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Last Name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={data.lastName || ""}
              onChange={(e) => onChange({ lastName: sanitizeName(e.target.value) })}
              placeholder="Last name"
              maxLength={100}
              className={`h-11 ${errors.lastName ? "border-destructive ring-1 ring-destructive" : ""}`}
            />
            {errors.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              Phone <span className="text-destructive">*</span>
            </Label>
            <Input
              type="tel"
              value={data.phone}
              onChange={(e) => handlePhoneChange(e.target.value, 'phone')}
              placeholder="(555) 123-4567"
              className={`h-11 ${errors.phone ? "border-destructive ring-1 ring-destructive" : ""}`}
            />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              type="email"
              value={data.email}
              onChange={(e) => onChange({ email: formatEmailInput(e.target.value) })}
              placeholder="you@example.com"
              maxLength={254}
              className={`h-11 ${errors.email ? "border-destructive ring-1 ring-destructive" : ""}`}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Best Time to Call <span className="text-destructive">*</span>
          </Label>
          <Select value={data.bestTimeToCall} onValueChange={(v) => onChange({ bestTimeToCall: v })}>
            <SelectTrigger className={`h-11 ${errors.bestTimeToCall ? "border-destructive ring-1 ring-destructive" : ""}`}>
              <SelectValue placeholder="Select time" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {BEST_TIMES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.bestTimeToCall && <p className="text-xs text-destructive">{errors.bestTimeToCall}</p>}
        </div>
      </div>

      {/* Alternative & Emergency Contact - Collapsible/Compact */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-3 p-3 rounded-lg bg-muted/30 border">
          <Label className="text-sm font-medium">
            Alternative Contact <span className="text-xs text-muted-foreground">(Optional)</span>
          </Label>
          <Input
            value={data.alternativeContactName || ""}
            onChange={(e) => onChange({ alternativeContactName: sanitizeName(e.target.value) })}
            placeholder="Name"
            maxLength={100}
            className="h-10"
          />
          <Input
            type="tel"
            value={data.alternativeContactPhone || ""}
            onChange={(e) => handlePhoneChange(e.target.value, 'alternativeContactPhone')}
            placeholder="Phone"
            className="h-10"
          />
        </div>

        <div className="space-y-3 p-3 rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20">
          <Label className="text-sm font-medium flex items-center gap-1.5 text-orange-800 dark:text-orange-200">
            <AlertCircle className="h-3.5 w-3.5" />
            Emergency Contact
          </Label>
          <Input
            value={data.emergencyContactName || ""}
            onChange={(e) => onChange({ emergencyContactName: sanitizeName(e.target.value) })}
            placeholder="Name"
            maxLength={100}
            className="h-10"
          />
          <Input
            type="tel"
            value={data.emergencyContactPhone || ""}
            onChange={(e) => handlePhoneChange(e.target.value, 'emergencyContactPhone')}
            placeholder="Phone"
            className="h-10"
          />
        </div>
      </div>

      {/* Additional Notes */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">
            Additional Notes <span className="text-xs text-muted-foreground">(Optional)</span>
          </Label>
          <span className="text-xs text-muted-foreground">
            {data.notes.length}/1000
          </span>
        </div>
        <Textarea
          value={data.notes}
          onChange={(e) => onChange({ notes: e.target.value.replace(/<[^>]*>/g, "").slice(0, 1000) })}
          rows={3}
          maxLength={1000}
          placeholder="Share any details that will help us process your placement..."
          className={`resize-none ${errors.notes ? "border-destructive ring-1 ring-destructive" : ""}`}
        />
        {errors.notes && <p className="text-xs text-destructive">{errors.notes}</p>}
      </div>

      {/* Referral Source */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">How did you hear about us?</Label>
        <Select value={data.referralSource || ""} onValueChange={(v) => onChange({ referralSource: v })}>
          <SelectTrigger className="h-11">
            <SelectValue placeholder="Select source" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            {REFERRAL_SOURCES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* HIPAA Consent */}
      <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
        <label className="flex items-start gap-3 cursor-pointer">
          <Checkbox
            checked={data.hipaaConsent || false}
            onCheckedChange={(checked) => onChange({ hipaaConsent: !!checked })}
            className={`mt-0.5 ${errors.hipaaConsent ? "border-destructive" : ""}`}
          />
          <div className="space-y-1">
            <span className="text-sm font-medium">
              I consent to HIPAA-aware practices <span className="text-destructive">*</span>
            </span>
            <p className="text-xs text-muted-foreground">
              I understand my information will be handled according to HIPAA guidelines and shared only with matched facilities.
            </p>
          </div>
        </label>
        {errors.hipaaConsent && <p className="text-xs text-destructive mt-2">{errors.hipaaConsent}</p>}
      </div>

      {/* Trust Indicators */}
      <div className="flex flex-wrap gap-3 justify-center text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <svg className="h-3.5 w-3.5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          SSL Encrypted
        </span>
        <span className="flex items-center gap-1">
          <svg className="h-3.5 w-3.5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          HIPAA Compliant
        </span>
        <span className="flex items-center gap-1">
          <svg className="h-3.5 w-3.5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Confidential
        </span>
      </div>
    </div>
  );
}
