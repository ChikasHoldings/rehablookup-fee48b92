import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowRight, Clock, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import { useActivePromotion, type PromoTarget } from "@/hooks/useActivePromotion";
import { TIER_PRICING, fmtMoneyWhole, applyPromoPercent, type TierKey } from "@/lib/billingPricing";

const dismissedKey = (userId: string, promoId: string) => `rl-promo-dismissed:${userId}:${promoId}`;

function targetRoute(target: PromoTarget, promoId: string): string {
  const p = `promo=${promoId}`;
  switch (target) {
    case "pro": return `/provider/billing?upgrade=pro&${p}`;
    case "featured": return `/provider/marketing/featured?${p}`;
    // A concierge-targeted campaign has no destination: the product is
    // retired. isSellableTarget() below suppresses the popup entirely, so
    // this branch is unreachable — it exists only because `target_product`
    // is a DB column whose enum still carries the value (Stage-4 debt).
    // Land on the marketing hub rather than the retired surface.
    case "concierge": return `/provider/marketing?${p}`;
  }
}

/**
 * A promotion is only shown if it sells something RehabLookup still sells.
 * Monetization is $0 listing / $99 Pro / Featured add-on — nothing else. A
 * campaign row still targeting the retired Concierge product must not be
 * advertised to a provider.
 */
function isSellableTarget(target: PromoTarget): boolean {
  return target === "pro" || target === "featured";
}

/**
 * One-time, non-intrusive conversion popup for the live promo matching the
 * provider's tier (Free→Pro, or Pro-without-add-on→Featured/Concierge). Shows
 * ONCE per campaign — modeled on WelcomeModal's dual-guard dismissal:
 *   • localStorage `rl-promo-dismissed:{userId}:{promoId}` (instant, per-browser)
 *   • promotion_dismissals row via dismiss_promotion RPC (cross-device backstop)
 * claimed the instant it shows, so a refresh can't re-pop. Delayed so the page
 * paints first; skipped during onboarding / a fresh checkout return.
 */
export function ConversionPromoPopup() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedFacility } = useSelectedFacility();
  const { promo } = useActivePromotion(selectedFacility?.id);
  const [open, setOpen] = useState(false);
  const shownRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (shownRef.current || !promo) return;
    if (!isSellableTarget(promo.target_product)) return;
    if (location.pathname.includes("/onboarding")) return;
    if (location.search.includes("checkout=success")) return;

    let cancelled = false;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const userId = sess.session?.user.id;
      if (!userId || cancelled) return;

      try {
        if (localStorage.getItem(dismissedKey(userId, promo.id)) === "1") return;
      } catch { /* private mode — fall through to DB gate */ }

      const { data: dismissal } = await supabase
        .from("promotion_dismissals")
        .select("promotion_id")
        .eq("promotion_id", promo.id)
        .eq("user_id", userId)
        .maybeSingle();
      if (cancelled) return;
      if (dismissal) {
        try { localStorage.setItem(dismissedKey(userId, promo.id), "1"); } catch { /* ignore */ }
        return;
      }

      shownRef.current = true;
      // Claim immediately (local + persisted) so it shows exactly once.
      try { localStorage.setItem(dismissedKey(userId, promo.id), "1"); } catch { /* ignore */ }
      void supabase.rpc("dismiss_promotion", { p_promotion_id: promo.id });
      trackEvent("promo_popup_shown", { promotion_id: promo.id, target: promo.target_product });

      timerRef.current = window.setTimeout(() => {
        if (!cancelled) setOpen(true);
      }, 800);
    })();

    return () => {
      cancelled = true;
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [promo, location.pathname, location.search]);

  if (!promo) return null;
  if (!isSellableTarget(promo.target_product)) return null;

  const tierKey = promo.target_product as TierKey;
  const monthly = TIER_PRICING[tierKey]?.monthlyCents ?? 0;
  const pct = promo.discount_percent ?? 0;
  const discounted = applyPromoPercent(monthly, pct);
  const hasDiscount = pct > 0 && discounted < monthly;
  const durationLabel = promo.discount_duration_months ? ` for ${promo.discount_duration_months} mo` : "";

  function handleCta() {
    trackEvent("promo_popup_clicked", { promotion_id: promo.id, target: promo.target_product });
    setOpen(false);
    navigate(targetRoute(promo.target_product, promo.id));
  }

  return (
    <Dialog open={open} onOpenChange={(o) => setOpen(o)}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[440px]">
        <DialogHeader className="space-y-0 border-b border-amber-100 bg-gradient-to-br from-amber-50 to-white px-6 pb-5 pt-6 text-left">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 ring-1 ring-amber-200">
            <Sparkles className="h-5 w-5 text-amber-600" aria-hidden />
          </div>
          <div className="flex items-center gap-2">
            <DialogTitle className="text-[19px] font-semibold tracking-tight text-slate-900">
              {promo.headline}
            </DialogTitle>
          </div>
          {promo.urgency_label && (
            <span className="mt-2 inline-flex w-fit items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
              <Clock className="h-3 w-3" aria-hidden />
              {promo.urgency_label}
            </span>
          )}
          {promo.subcopy && (
            <DialogDescription className="mt-2 text-sm text-slate-600">
              {promo.subcopy}
            </DialogDescription>
          )}
        </DialogHeader>

        {hasDiscount && monthly > 0 && (
          <div className="px-6 py-4">
            <div className="rounded-xl border border-amber-200/70 bg-amber-50/50 p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">
                {fmtMoneyWhole(discounted)}<span className="text-base font-medium text-slate-500">/mo{durationLabel}</span>
              </p>
              <p className="mt-0.5 text-xs text-slate-600">
                <span className="font-semibold text-emerald-700">{pct}% off</span>{" "}
                <span className="line-through text-slate-400">{fmtMoneyWhole(monthly)}/mo</span>
                {durationLabel && <span>, then {fmtMoneyWhole(monthly)}/mo</span>}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 px-6 pb-6 pt-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-700"
          >
            Maybe later
          </button>
          <Button onClick={handleCta} className="gap-2 bg-amber-500 hover:bg-amber-600 text-white">
            {promo.cta_label || "Claim this offer"}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
