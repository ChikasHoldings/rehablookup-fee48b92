import { motion } from "framer-motion";
import { AlertCircle, Lock } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { ConciergeIntakeData } from "@/pages/concierge/ConciergeIntake";

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

/**
 * "Additional contacts & consent" — the late-stage step that captures
 * the optional alternative-contact + emergency-contact details, free-form
 * notes, referral source, and the HIPAA acknowledgement.
 *
 * First/last name + phone + email + bestTimeToCall used to live here too
 * but moved to step 1 (`StepName`) so the user provides identity info
 * before any sensitive question. The fields are unchanged in the
 * `ConciergeIntakeData` schema — only their position in the UI shifted.
 */
export function StepContact({ data, errors, onChange }: Props) {
  const sanitizeName = (val: string) =>
    val.replace(/<[^>]*>/g, "").replace(/javascript:/gi, "").slice(0, 100);

  const formatPhone = (value: string) => {
    const n = value.replace(/\D/g, "");
    if (n.length <= 3) return n;
    if (n.length <= 6) return `(${n.slice(0, 3)}) ${n.slice(3)}`;
    return `(${n.slice(0, 3)}) ${n.slice(3, 6)}-${n.slice(6, 10)}`;
  };

  const handlePhoneChange = (
    value: string,
    field: "alternativeContactPhone" | "emergencyContactPhone",
  ) => {
    onChange({ [field]: formatPhone(value) });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-5 md:space-y-6"
    >
      <div className="text-center mb-6 md:mb-8">
        <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground mb-1.5 md:mb-2">
          Anything else we should know?
        </h2>
        <p className="text-sm md:text-base text-muted-foreground">
          Optional contacts and notes that help your placement advisor.
        </p>
      </div>

      <div className="space-y-5 max-w-xl mx-auto px-1">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-3 p-4 rounded-lg bg-muted/30 border">
            <Label className="text-sm font-medium">
              Alternative contact <span className="text-xs text-muted-foreground">(Optional)</span>
            </Label>
            <Input
              value={data.alternativeContactName || ""}
              onChange={(e) =>
                onChange({ alternativeContactName: sanitizeName(e.target.value) })
              }
              placeholder="Name"
              maxLength={100}
              className="h-10"
            />
            <Input
              type="tel"
              value={data.alternativeContactPhone || ""}
              onChange={(e) => handlePhoneChange(e.target.value, "alternativeContactPhone")}
              placeholder="Phone"
              className="h-10"
            />
          </div>

          <div className="space-y-3 p-4 rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20">
            <Label className="text-sm font-medium flex items-center gap-1.5 text-orange-800 dark:text-orange-200">
              <AlertCircle className="h-3.5 w-3.5" />
              Emergency contact
            </Label>
            <Input
              value={data.emergencyContactName || ""}
              onChange={(e) =>
                onChange({ emergencyContactName: sanitizeName(e.target.value) })
              }
              placeholder="Name"
              maxLength={100}
              className="h-10"
            />
            <Input
              type="tel"
              value={data.emergencyContactPhone || ""}
              onChange={(e) => handlePhoneChange(e.target.value, "emergencyContactPhone")}
              placeholder="Phone"
              className="h-10"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              Additional notes <span className="text-xs text-muted-foreground">(Optional)</span>
            </Label>
            <span className="text-xs text-muted-foreground">{data.notes.length}/1000</span>
          </div>
          <Textarea
            value={data.notes}
            onChange={(e) =>
              onChange({ notes: e.target.value.replace(/<[^>]*>/g, "").slice(0, 1000) })
            }
            rows={3}
            maxLength={1000}
            placeholder="Share any details that will help us process your placement..."
            className={`resize-none ${errors.notes ? "border-destructive ring-1 ring-destructive" : ""}`}
          />
          {errors.notes && <p className="text-xs text-destructive">{errors.notes}</p>}
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">How did you hear about us?</Label>
          <Select
            value={data.referralSource || ""}
            onValueChange={(v) => onChange({ referralSource: v })}
          >
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Select source" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {REFERRAL_SOURCES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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
                I understand my information will be handled according to HIPAA guidelines and
                shared only with matched facilities.
              </p>
            </div>
          </label>
          {errors.hipaaConsent && (
            <p className="text-xs text-destructive mt-2">{errors.hipaaConsent}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-3 justify-center text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Lock className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
            SSL encrypted
          </span>
          <span className="flex items-center gap-1">
            <Lock className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
            HIPAA compliant
          </span>
          <span className="flex items-center gap-1">
            <Lock className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
            Confidential
          </span>
        </div>
      </div>
    </motion.div>
  );
}
