import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  Users, 
  ArrowRight, 
  Sparkles,
  Crown,
  Gift,
  Check,
  ChevronRight,
  Shield,
  Zap,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface ProviderWelcomeModalProps {
  facilityId: string;
  facilityName?: string;
  isFirstLogin?: boolean;
  onDismiss?: () => void;
}

async function trackWelcomeEvent(eventType: string, metadata?: Record<string, unknown>) {
  try {
    const session = await getCachedSession();
    if (!session) return;
    supabase.functions.invoke("log-activity", {
      body: {
        user_id: session.user.id,
        event_type: `welcome_modal_${eventType}`,
        event_description: `Welcome modal: ${eventType}`,
        metadata,
      },
    }).catch(() => {});
  } catch {}
}

const FREE_FEATURES = [
  "1 facility listing",
  "Direct inquiries",
  "Pay-per-lead unlocks",
  "Placement network",
  "Performance tracking",
];

const PRO_FEATURES = [
  "Up to 5 listings",
  "20% off unlocks",
  "20% off placements",
  "Featured exposure",
  "Priority visibility",
  "Advanced analytics",
];

export function ProviderWelcomeModal({ 
  facilityId, 
  facilityName,
  isFirstLogin = true,
  onDismiss 
}: ProviderWelcomeModalProps) {
  const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(facilityId);
  
  const [open, setOpen] = useState(isFirstLogin && isValidUUID);
  const [isUpdating, setIsUpdating] = useState(false);
  const [step, setStep] = useState<"welcome" | "plans">("welcome");
  const hasTrackedView = useRef(false);
  const navigate = useNavigate();

  const safeFacilityName = facilityName
    ? facilityName.replace(/<[^>]*>/g, "").slice(0, 100)
    : undefined;

  useEffect(() => {
    if (open && !hasTrackedView.current) {
      hasTrackedView.current = true;
      trackWelcomeEvent("viewed", { facilityId });
    }
  }, [open, facilityId]);

  const handleDismiss = async () => {
    if (isUpdating || !isValidUUID) return;
    setIsUpdating(true);
    trackWelcomeEvent("dismissed", { step });
    
    try {
      await supabase
        .from("facilities")
        .update({ profile_completion_celebrated: true })
        .eq("id", facilityId);
      
      setOpen(false);
      onDismiss?.();
    } finally {
      setIsUpdating(false);
    }
  };

  const handleNavigate = async (target: string, trackAs: string) => {
    const allowedTargets: Record<string, string> = {
      listings: "/provider/listings",
      dashboard: "/provider",
      "pro-upgrade": "/provider/pro-upgrade",
      billing: "/provider/billing?purchase_credits=true",
    };
    if (!allowedTargets[target]) return;
    
    trackWelcomeEvent(`clicked_${trackAs}`, { target });
    
    if (isValidUUID) {
      supabase
        .from("facilities")
        .update({ profile_completion_celebrated: true })
        .eq("id", facilityId)
        .then(() => {});
    }
    
    setOpen(false);
    onDismiss?.();
    navigate(allowedTargets[target]);
  };

  if (!open || !isValidUUID) return null;

  return (
    <Dialog open={open} onOpenChange={(value) => !value && handleDismiss()}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-[480px] max-h-[90dvh] p-0 gap-0 overflow-hidden rounded-2xl border border-border/50 shadow-2xl [&>button]:hidden">
        {/* Close */}
        <button
          onClick={handleDismiss}
          disabled={isUpdating}
          className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/80 dark:bg-background/80 backdrop-blur-sm text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        {/* Scrollable content */}
        <div className="overflow-y-auto overscroll-contain max-h-[90dvh]">
          {step === "welcome" ? (
            <WelcomeStep
              facilityName={safeFacilityName}
              isUpdating={isUpdating}
              onNavigate={handleNavigate}
              onShowPlans={() => { setStep("plans"); trackWelcomeEvent("clicked_view_plans"); }}
              onDismiss={handleDismiss}
            />
          ) : (
            <PlansStep
              isUpdating={isUpdating}
              onNavigate={handleNavigate}
              onBack={() => setStep("welcome")}
              onDismiss={handleDismiss}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Welcome Step ─── */
function WelcomeStep({
  facilityName,
  isUpdating,
  onNavigate,
  onShowPlans,
  onDismiss,
}: {
  facilityName?: string;
  isUpdating: boolean;
  onNavigate: (target: string, trackAs: string) => void;
  onShowPlans: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="animate-in fade-in duration-200">
      {/* Hero — compact */}
      <div className="relative bg-gradient-to-br from-primary via-primary to-primary-glow px-5 pt-6 pb-5 text-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--accent)/0.1),transparent_60%)]" />
        <div className="relative">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
            <Sparkles className="h-5.5 w-5.5 text-white" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight leading-snug">
            Welcome to RehabLookup
          </h2>
          <p className="mt-1.5 text-[13px] text-white/75 max-w-xs mx-auto leading-relaxed">
            {facilityName ? (
              <>Your listing for <span className="font-semibold text-white">{facilityName}</span> is being set up.</>
            ) : (
              <>Start receiving inquiries and placement opportunities.</>
            )}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 sm:px-5 pt-4 pb-1 space-y-4">
        {/* How it works — tight grid */}
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.08em] mb-2.5">
            How It Works
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: Building2, title: "List facility", desc: "Programs & insurance" },
              { icon: Users, title: "Get inquiries", desc: "From your listing page" },
              { icon: Zap, title: "Unlock leads", desc: "View contact details" },
              { icon: Shield, title: "Placements", desc: "Pre-screened referrals" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2.5 rounded-lg bg-muted/50 px-3 py-2.5">
                <div className="flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
                  <item.icon className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground leading-none">{item.title}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Welcome Offer — exclusive banner */}
        <button
          onClick={() => onNavigate("billing", "welcome_offer")}
          className={cn(
            "w-full rounded-xl px-4 py-3.5 text-left",
            "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20",
            "border border-amber-300/50 dark:border-amber-700/40",
            "hover:border-amber-400/70 hover:shadow-sm",
            "transition-all group relative overflow-hidden"
          )}
        >
          <div className="absolute top-0 right-0 px-2 py-0.5 bg-red-500 text-white text-[8px] font-bold uppercase tracking-wider rounded-bl-lg">
            Limited Time
          </div>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
              <Gift className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0 pr-12">
              <p className="text-[13px] font-bold text-foreground leading-tight">🎁 Welcome Credit Offer</p>
              <p className="text-[11px] text-amber-800 dark:text-amber-300/80 leading-snug mt-1">
                Get up to <strong>$200 bonus credits</strong> on your first top-up. Respond to inquiries faster — don't let leads slip away.
              </p>
            </div>
          </div>
          <div className="mt-2.5 flex items-center justify-between">
            <span className="text-[10px] text-amber-700/70 dark:text-amber-400/60">Exclusive to new providers</span>
            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
              Claim Now <ChevronRight className="h-3 w-3" />
            </span>
          </div>
        </button>
      </div>

      {/* CTAs — sticky feel */}
      <div className="px-4 sm:px-5 pt-2 pb-4 sm:pb-5 space-y-2">
        <Button 
          className="w-full h-10 text-[13px] font-semibold"
          onClick={() => onNavigate("listings", "complete_listing")}
          disabled={isUpdating}
        >
          Complete My Listing
          <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
        </Button>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            className="flex-1 h-9 text-xs"
            onClick={() => onNavigate("dashboard", "view_dashboard")}
            disabled={isUpdating}
          >
            Dashboard
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="flex-1 h-9 text-xs border-accent/25 text-accent hover:bg-accent/5 hover:text-accent hover:border-accent/40"
            onClick={onShowPlans}
            disabled={isUpdating}
          >
            <Crown className="h-3 w-3 mr-1" />
            Plans
          </Button>
        </div>
        <button
          onClick={onDismiss}
          disabled={isUpdating}
          className="w-full text-center text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors py-0.5"
        >
          Maybe Later
        </button>
      </div>
    </div>
  );
}

/* ─── Plans Step ─── */
function PlansStep({
  isUpdating,
  onNavigate,
  onBack,
  onDismiss,
}: {
  isUpdating: boolean;
  onNavigate: (target: string, trackAs: string) => void;
  onBack: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="animate-in fade-in slide-in-from-right-3 duration-200">
      {/* Header */}
      <div className="px-4 sm:px-5 pt-5 pb-3 text-center">
        <p className="text-[10px] font-semibold text-accent uppercase tracking-[0.08em] mb-0.5">Compare Plans</p>
        <h2 className="text-base sm:text-lg font-bold text-foreground leading-tight">Free vs Pro</h2>
        <p className="text-[11px] text-muted-foreground mt-1">Choose what fits your growth</p>
      </div>

      {/* Plan Cards — side by side */}
      <div className="px-4 sm:px-5 pb-3 grid grid-cols-2 gap-2.5">
        {/* Free */}
        <div className="rounded-xl border border-border bg-card p-3.5">
          <p className="text-xs font-bold text-foreground">Free</p>
          <p className="text-base font-bold text-foreground mt-0.5 mb-3">
            $0<span className="text-[10px] font-normal text-muted-foreground">/mo</span>
          </p>
          <div className="space-y-1.5">
            {FREE_FEATURES.map((f, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <Check className="h-3 w-3 text-muted-foreground/70 mt-px flex-shrink-0" />
                <span className="text-[10px] text-muted-foreground leading-snug">{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pro */}
        <div className="rounded-xl border-2 border-accent/30 bg-gradient-to-b from-accent/5 to-card p-3.5 relative">
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-px rounded-full bg-accent text-accent-foreground text-[9px] font-bold uppercase tracking-wider leading-normal">
            Popular
          </div>
          <p className="text-xs font-bold text-foreground">Pro</p>
          <p className="text-base font-bold text-foreground mt-0.5 mb-3">
            $399<span className="text-[10px] font-normal text-muted-foreground">/mo</span>
          </p>
          <div className="space-y-1.5">
            {PRO_FEATURES.map((f, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <Check className="h-3 w-3 text-accent mt-px flex-shrink-0" />
                <span className="text-[10px] text-foreground leading-snug font-medium">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTAs */}
      <div className="px-4 sm:px-5 pt-2 pb-4 sm:pb-5 space-y-2">
        <Button 
          className="w-full h-10 text-[13px] font-semibold bg-accent hover:bg-accent/90"
          onClick={() => onNavigate("pro-upgrade", "upgrade")}
          disabled={isUpdating}
        >
          <Crown className="h-3.5 w-3.5 mr-1.5" />
          Upgrade to Pro
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="flex-1 h-8 text-[11px] text-muted-foreground" onClick={onBack}>
            ← Back
          </Button>
          <Button variant="ghost" size="sm" className="flex-1 h-8 text-[11px] text-muted-foreground" onClick={onDismiss} disabled={isUpdating}>
            Maybe Later
          </Button>
        </div>
      </div>
    </div>
  );
}
