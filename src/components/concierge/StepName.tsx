import { motion } from "framer-motion";
import { Phone, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatEmailInput } from "@/lib/emailUtils";
import type { ConciergeIntakeData } from "@/pages/concierge/ConciergeIntake";

const BEST_TIME_CHIPS: Array<{ value: string; label: string }> = [
  { value: "anytime", label: "ASAP / Anytime" },
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
];

interface Props {
  data: ConciergeIntakeData;
  errors: Record<string, string>;
  onChange: (updates: Partial<ConciergeIntakeData>) => void;
}

/**
 * Step 1 — Name, contact, best time to reach.
 *
 * Mirrors the visual treatment of `src/components/international/steps/
 * StepContact.tsx` (centered heading, h-12 inputs, max-w-sm column) so
 * the concierge intake's first impression matches the international
 * application. Captures the four pieces of identity info the user
 * provides BEFORE any clinical / insurance question:
 *   • firstName, lastName
 *   • phone, email
 *   • bestTimeToCall
 *
 * The data model fields are unchanged from the existing schema — they
 * just moved from the late-stage StepContact into step 1.
 */
export function StepName({ data, errors, onChange }: Props) {
  const sanitizeName = (val: string) =>
    val.replace(/<[^>]*>/g, "").replace(/javascript:/gi, "").slice(0, 100);

  const formatPhone = (value: string) => {
    const n = value.replace(/\D/g, "");
    if (n.length <= 3) return n;
    if (n.length <= 6) return `(${n.slice(0, 3)}) ${n.slice(3)}`;
    return `(${n.slice(0, 3)}) ${n.slice(3, 6)}-${n.slice(6, 10)}`;
  };

  const inputClass = (key: string) =>
    cn(
      "h-12 text-base mt-2",
      errors[key] && "border-destructive ring-1 ring-destructive",
    );

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-5 md:space-y-6"
    >
      <div className="text-center mb-6 md:mb-8">
        <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground mb-1.5 md:mb-2">
          Let's start with your name
        </h2>
        <p className="text-sm md:text-base text-muted-foreground">
          We'll use this to personalize your placement call. Everything you share
          is 100% confidential.
        </p>
      </div>

      <div className="space-y-4 max-w-sm mx-auto px-1">
        <div>
          <Label htmlFor="firstName" className="text-sm font-medium">
            First name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="firstName"
            value={data.firstName || ""}
            onChange={(e) => onChange({ firstName: sanitizeName(e.target.value) })}
            placeholder="Enter your first name"
            maxLength={100}
            className={inputClass("firstName")}
            autoFocus
          />
          {errors.firstName && (
            <p className="mt-1 text-xs text-destructive">{errors.firstName}</p>
          )}
        </div>

        <div>
          <Label htmlFor="lastName" className="text-sm font-medium">
            Last name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="lastName"
            value={data.lastName || ""}
            onChange={(e) => onChange({ lastName: sanitizeName(e.target.value) })}
            placeholder="Enter your last name"
            maxLength={100}
            className={inputClass("lastName")}
          />
          {errors.lastName && (
            <p className="mt-1 text-xs text-destructive">{errors.lastName}</p>
          )}
        </div>

        <div>
          <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5" />
            Phone <span className="text-destructive">*</span>
          </Label>
          <Input
            id="phone"
            type="tel"
            value={data.phone}
            onChange={(e) => onChange({ phone: formatPhone(e.target.value) })}
            placeholder="(555) 123-4567"
            className={inputClass("phone")}
          />
          {errors.phone && (
            <p className="mt-1 text-xs text-destructive">{errors.phone}</p>
          )}
        </div>

        <div>
          <Label htmlFor="email" className="text-sm font-medium flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5" />
            Email <span className="text-destructive">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            value={data.email}
            onChange={(e) => onChange({ email: formatEmailInput(e.target.value) })}
            placeholder="you@example.com"
            maxLength={254}
            className={inputClass("email")}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-destructive">{errors.email}</p>
          )}
        </div>

        <div>
          <span className="text-sm font-medium">Best time to reach you</span>
          <p className="text-xs text-muted-foreground mt-0.5 mb-3">Optional — pick a window you'll likely be free.</p>
          <div role="radiogroup" aria-label="Best time to reach you" className="flex flex-wrap gap-2">
            {BEST_TIME_CHIPS.map((chip) => {
              const active = data.bestTimeToCall === chip.value;
              return (
                <button
                  key={chip.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onChange({ bestTimeToCall: chip.value })}
                  className={cn(
                    "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground hover:border-primary/40",
                  )}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
