import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Phone, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNewCtaSystem } from "@/hooks/useNewCtaSystem";
import { trackEvent, analytics } from "@/lib/analytics";

type CareLevel = "detox" | "inpatient" | "outpatient" | "not_sure";
type ContactMode = "phone" | "email";

const CARE_CHIPS: Array<{ value: CareLevel; label: string }> = [
  { value: "detox", label: "Detox" },
  { value: "inpatient", label: "Inpatient" },
  { value: "outpatient", label: "Outpatient" },
  { value: "not_sure", label: "Not sure" },
];

interface InlineIntakeFormProps {
  /** Optional heading override — page-specific copy reads better
   *  than a generic title (e.g. "Find Pennsylvania detox programs"). */
  heading?: string;
  className?: string;
}

/**
 * Compressed 3-field intake widget for embedding on state /
 * treatment-type / facility-detail pages. Collects first name +
 * phone-or-email + care level, fires the funnel-tracking events,
 * then routes the seeker into the full /concierge/intake flow with
 * `source=inline_widget`, `page_context=<pathname>`, and
 * `care=<level>` URL params so the full form can pre-select the
 * matching chip.
 *
 * NOTE: per the existing PII-safe whitelist, we don't persist
 * firstName / contact to localStorage; only the non-PII care chip
 * is passed forward via URL. The seeker re-enters identity on the
 * full intake form so the only place that ever holds PII is the
 * server-side draft created at full-intake submit time.
 *
 * Renders only when the NEW_CTA_SYSTEM flag is on.
 */
export function InlineIntakeForm({ heading, className }: InlineIntakeFormProps) {
  const enabled = useNewCtaSystem();
  const location = useLocation();
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const viewedRef = useRef(false);

  const [firstName, setFirstName] = useState("");
  const [contactMode, setContactMode] = useState<ContactMode>("phone");
  const [contact, setContact] = useState("");
  const [care, setCare] = useState<CareLevel | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fire intake_widget_viewed exactly once on scroll-into-view.
  useEffect(() => {
    if (!enabled || !rootRef.current || viewedRef.current) return;
    const node = rootRef.current;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !viewedRef.current) {
            viewedRef.current = true;
            trackEvent("intake_widget_viewed", { page_context: location.pathname });
          }
        }
      },
      { threshold: 0.2 },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [enabled, location.pathname]);

  if (!enabled) return null;

  const fireFieldFocus = (field: string) =>
    trackEvent("intake_widget_field_focused", { field, page_context: location.pathname });

  const canSubmit = firstName.trim().length > 0 && contact.trim().length > 0 && !!care;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      trackEvent("intake_widget_submitted", {
        page_context: location.pathname,
        care_level: care,
        contact_mode: contactMode,
        // PII-safe — we don't ship the actual contact value as an analytics
        // property; just whether the seeker supplied one.
        has_contact: contact.trim().length > 0,
      });
      analytics.leadFormStart();

      // Hand-off to the full intake form. The care chip pre-selects
      // there via `?care=`; firstName/contact intentionally don't
      // travel via URL or storage (PII policy) — seeker re-enters
      // on the full form, which is one extra step but the only
      // PII-safe path until save-placement-draft is extended to
      // accept minimal-field submissions.
      const params = new URLSearchParams({
        source: "inline_widget",
        page_context: location.pathname,
        care: care ?? "",
      });
      navigate(`/concierge/intake?${params.toString()}`);
    } catch (err) {
      console.error("[InlineIntakeForm] submit failed", err);
      setError("Couldn't continue. Please try again or call 214-639-6420.");
      setSubmitting(false);
    }
  };

  return (
    <div
      ref={rootRef}
      className={cn(
        "rounded-xl border border-slate-200 bg-white shadow-sm p-4 sm:p-5",
        className,
      )}
      data-cta-location="inline_widget"
    >
      <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-1">
        {heading ?? "Talk to our concierge"}
      </h3>
      <p className="text-xs sm:text-sm text-slate-600 mb-4">
        Free, confidential, and EKRA-compliant. We'll get back to you the same day.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3" noValidate>
        <div>
          <Label htmlFor="iw-first-name" className="text-xs font-medium text-slate-700">
            First name
          </Label>
          <Input
            id="iw-first-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            onFocus={() => fireFieldFocus("first_name")}
            required
            autoComplete="given-name"
            className="mt-1 h-10"
            placeholder="Jane"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="iw-contact" className="text-xs font-medium text-slate-700">
              {contactMode === "phone" ? "Phone number" : "Email"}
            </Label>
            <button
              type="button"
              onClick={() => {
                setContactMode((m) => (m === "phone" ? "email" : "phone"));
                setContact("");
              }}
              className="text-[11px] text-[#1B365D] hover:underline"
            >
              {contactMode === "phone" ? "Use email instead" : "Use phone instead"}
            </button>
          </div>
          <div className="relative mt-1">
            <span className="absolute inset-y-0 left-2.5 flex items-center text-slate-400" aria-hidden>
              {contactMode === "phone"
                ? <Phone className="h-3.5 w-3.5" />
                : <Mail className="h-3.5 w-3.5" />}
            </span>
            <Input
              id="iw-contact"
              type={contactMode === "phone" ? "tel" : "email"}
              inputMode={contactMode === "phone" ? "tel" : "email"}
              autoComplete={contactMode === "phone" ? "tel" : "email"}
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              onFocus={() => fireFieldFocus(contactMode)}
              required
              className="h-10 pl-8"
              placeholder={contactMode === "phone" ? "(555) 555-5555" : "jane@example.com"}
            />
          </div>
        </div>

        <div>
          <Label className="text-xs font-medium text-slate-700">
            What kind of help do you need?
          </Label>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {CARE_CHIPS.map((chip) => {
              const active = care === chip.value;
              return (
                <button
                  key={chip.value}
                  type="button"
                  onClick={() => {
                    setCare(chip.value);
                    fireFieldFocus("care_level");
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                    active
                      ? "bg-[#1B365D] text-white border-[#1B365D]"
                      : "bg-white text-slate-700 border-slate-300 hover:border-[#1B365D]/40",
                  )}
                  aria-pressed={active}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <p role="alert" className="text-xs text-red-700">
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={!canSubmit || submitting}
          className="w-full bg-[#1B365D] hover:bg-[#142a4a] gap-2"
        >
          {submitting ? "Continuing…" : "Continue to full intake"}
          <ArrowRight className="h-4 w-4" />
        </Button>

        <p className="text-[11px] text-slate-500 text-center">
          You'll finish on the secure intake page. We never charge per call, lead, or admission.
        </p>
      </form>
    </div>
  );
}
