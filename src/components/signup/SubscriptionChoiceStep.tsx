import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Check, Loader2 } from "lucide-react";

export type SubscriptionChoice = "free" | "pro_monthly" | "pro_annual";

interface SubscriptionChoiceStepProps {
  /** Called when the user clicks the primary CTA. */
  onSelect: (choice: SubscriptionChoice) => void;
  /** Default highlighted choice. Claim entry → 'free'; commercial → 'pro_monthly'. */
  defaultChoice?: SubscriptionChoice;
  /** Disable interaction (e.g. while submission is in flight). */
  submitting?: boolean;
}

interface ChoiceCard {
  value: SubscriptionChoice;
  title: string;
  price: string;
  priceSuffix: string;
  body: string;
  badge?: { label: string; tone: "popular" | "save" };
  features: string[];
}

const CARDS: ChoiceCard[] = [
  {
    value: "free",
    title: "Free",
    price: "$0",
    priceSuffix: "forever",
    body:
      "List your facility in our directory. Edit description, upload logo, add up to 5 photos. SAMHSA-published contact info shown publicly. Inquiries route through our concierge team.",
    features: [
      "Visible in directory",
      "Edit description, treatments, hours",
      "Up to 5 photos + logo",
      "SAMHSA contact shown publicly",
      "Inquiries routed via concierge",
    ],
  },
  {
    value: "pro_monthly",
    title: "Pro — Monthly",
    price: "$99",
    priceSuffix: "/month, cancel anytime",
    body:
      "Verified badge, your direct contact details displayed, 10 photos + 1 video, inquiries delivered directly to your inbox with full contact info, respond to reviews.",
    badge: { label: "Most popular", tone: "popular" },
    features: [
      "Verified badge",
      "Direct contact info shown publicly",
      "10 photos + 1 video",
      "Inquiries delivered to your inbox",
      "Respond to reviews",
    ],
  },
  {
    value: "pro_annual",
    title: "Pro — Annual",
    price: "$1,009.80",
    priceSuffix: "/year ($84.15/month equivalent)",
    body: "Same as Pro Monthly, but commit to the year and save 15%.",
    badge: { label: "Save 15%", tone: "save" },
    features: [
      "Everything in Pro Monthly",
      "15% off the monthly rate",
      "Locks in your current rate at renewal",
    ],
  },
];

const CTA_COPY: Record<SubscriptionChoice, string> = {
  free: "Complete listing (Free)",
  pro_monthly: "Continue to payment ($99/mo)",
  pro_annual: "Continue to payment ($1,009.80/yr)",
};

/**
 * Subscription choice step for the signup / claim flow.
 *
 * Single-choice radio group with three vertically-stacked cards. NOT a
 * full comparison table — Featured and Concierge are intentionally
 * absent from signup (they're post-signup dashboard add-ons).
 *
 * The "Most popular" badge appears only on Pro Monthly; "Save 15%" only
 * on Pro Annual; nothing on Free.
 */
export function SubscriptionChoiceStep({
  onSelect,
  defaultChoice = "pro_monthly",
  submitting,
}: SubscriptionChoiceStepProps) {
  const [choice, setChoice] = useState<SubscriptionChoice>(defaultChoice);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-foreground">
          Choose your subscription
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick a plan to finish creating your listing. You can change or cancel
          anytime.
        </p>
      </div>

      <div
        role="radiogroup"
        aria-label="Subscription plan"
        className="space-y-3"
      >
        {CARDS.map((card) => {
          const selected = choice === card.value;
          return (
            <Card
              key={card.value}
              role="radio"
              aria-checked={selected}
              tabIndex={0}
              onClick={() => !submitting && setChoice(card.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  if (!submitting) setChoice(card.value);
                }
              }}
              className={cn(
                "cursor-pointer transition-all p-5 border-2",
                selected
                  ? "border-[#1B365D] bg-[#1B365D]/[0.02] shadow-md"
                  : "border-slate-200 hover:border-[#1B365D]/40",
                submitting && "pointer-events-none opacity-60",
              )}
            >
              <div className="flex items-start gap-4">
                {/* Custom radio dot */}
                <div
                  className={cn(
                    "mt-1 h-5 w-5 rounded-full border-2 shrink-0 flex items-center justify-center",
                    selected ? "border-[#1B365D] bg-[#1B365D]" : "border-slate-300",
                  )}
                  aria-hidden
                >
                  {selected && <div className="h-2 w-2 rounded-full bg-white" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <h3 className="font-semibold text-base md:text-lg text-slate-900">
                      {card.title}
                    </h3>
                    {card.badge && (
                      <Badge
                        className={cn(
                          "text-[10px] uppercase tracking-wide font-semibold",
                          card.badge.tone === "popular"
                            ? "bg-[#CDA223] hover:bg-[#CDA223] text-[#1B365D]"
                            : "bg-emerald-100 hover:bg-emerald-100 text-emerald-800",
                        )}
                      >
                        {card.badge.label}
                      </Badge>
                    )}
                  </div>

                  <div className="mb-2">
                    <span className="text-xl md:text-2xl font-bold text-[#1B365D]">
                      {card.price}
                    </span>
                    <span className="text-sm text-slate-500 ml-1">
                      {card.priceSuffix}
                    </span>
                  </div>

                  <p className="text-sm text-slate-600 leading-relaxed">
                    {card.body}
                  </p>

                  {selected && (
                    <ul className="mt-3 space-y-1">
                      {card.features.map((f) => (
                        <li
                          key={f}
                          className="flex items-start gap-2 text-xs md:text-sm text-slate-700"
                        >
                          <Check className="h-3.5 w-3.5 mt-0.5 shrink-0 text-emerald-600" aria-hidden />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-slate-500 leading-relaxed">
        Featured placements and Concierge Partner add-ons are available after
        signup from your provider dashboard.
      </p>

      <Button
        type="button"
        onClick={() => onSelect(choice)}
        disabled={submitting}
        size="lg"
        className="w-full bg-[#1B365D] hover:bg-[#142a4a] text-white font-semibold gap-2"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing…
          </>
        ) : (
          CTA_COPY[choice]
        )}
      </Button>
    </div>
  );
}
