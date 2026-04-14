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
  BarChart3,
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

// Track modal interactions via log-activity
async function trackWelcomeEvent(eventType: string, metadata?: Record<string, unknown>) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
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
  "List 1 facility",
  "Receive direct inquiries",
  "Unlock leads with credits",
  "Opt into placement network",
  "Track facility performance",
];

const PRO_FEATURES = [
  "List up to 5 facilities",
  "20% off lead unlocks",
  "20% off placement fees",
  "Featured search exposure",
  "Priority visibility boost",
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

  // Track modal viewed
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
    
    // Persist dismiss
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
      <DialogContent className="w-[calc(100%-1.5rem)] max-w-[540px] p-0 gap-0 overflow-hidden rounded-2xl border-0 shadow-2xl [&>button]:hidden">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          disabled={isUpdating}
          className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm border border-border/50 text-muted-foreground hover:text-foreground hover:bg-background transition-all"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>

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
    <div className="animate-in fade-in duration-300">
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-primary via-primary to-primary-glow px-6 pt-8 pb-6 text-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--accent)/0.12),transparent_60%)]" />
        <div className="relative">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm ring-1 ring-white/20">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Welcome to RehabLookup
          </h2>
          <p className="mt-2 text-sm text-white/80 max-w-sm mx-auto leading-relaxed">
            {facilityName ? (
              <>Your listing for <span className="font-semibold text-white">{facilityName}</span> is being set up.</>
            ) : (
              <>Start receiving inquiries and placement opportunities today.</>
            )}
          </p>
        </div>
      </div>

      {/* How it works */}
      <div className="px-5 sm:px-6 pt-5 pb-2">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
          How It Works
        </p>
        <div className="space-y-2.5">
          {[
            { icon: Building2, title: "List your facility", desc: "Showcase your programs, services & insurance accepted" },
            { icon: Users, title: "Receive inquiries", desc: "Families find you directly from your listing page" },
            { icon: Zap, title: "Unlock leads", desc: "Purchase credits to view full contact details" },
            { icon: Shield, title: "Join placements", desc: "Opt in to receive pre-screened referrals" },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3 rounded-xl bg-muted/40 p-3 transition-colors hover:bg-muted/60">
              <div className="flex-shrink-0 mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <item.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Welcome Offer Banner */}
      <div className="mx-5 sm:mx-6 mt-4 mb-2">
        <button
          onClick={() => onNavigate("billing", "welcome_offer")}
          className={cn(
            "w-full flex items-center gap-3 rounded-xl p-3.5",
            "bg-gradient-to-r from-accent/10 via-accent/5 to-transparent",
            "border border-accent/25 hover:border-accent/40",
            "transition-all group text-left"
          )}
        >
          <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15">
            <Gift className="h-5 w-5 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">Welcome Offer</p>
            <p className="text-xs text-muted-foreground">Get bonus credits on your first top-up — limited time</p>
          </div>
          <ChevronRight className="h-4 w-4 text-accent/60 group-hover:text-accent group-hover:translate-x-0.5 transition-all flex-shrink-0" />
        </button>
      </div>

      {/* CTAs */}
      <div className="px-5 sm:px-6 pt-3 pb-5 sm:pb-6 space-y-2">
        <Button 
          className="w-full h-11 text-sm font-semibold"
          onClick={() => onNavigate("listings", "complete_listing")}
          disabled={isUpdating}
        >
          Complete My Listing
          <ArrowRight className="h-4 w-4 ml-1.5" />
        </Button>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="flex-1 h-10 text-sm"
            onClick={() => onNavigate("dashboard", "view_dashboard")}
            disabled={isUpdating}
          >
            View Dashboard
          </Button>
          <Button 
            variant="outline" 
            className="flex-1 h-10 text-sm border-accent/30 text-accent hover:bg-accent/5 hover:text-accent"
            onClick={onShowPlans}
            disabled={isUpdating}
          >
            <Crown className="h-3.5 w-3.5 mr-1.5" />
            See Plans
          </Button>
        </div>
        <button
          onClick={onDismiss}
          disabled={isUpdating}
          className="w-full text-center text-xs text-muted-foreground/70 hover:text-muted-foreground transition-colors py-1"
        >
          Maybe Later
        </button>
      </div>
    </div>
  );
}

/* ─── Plans Comparison Step ─── */
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
    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Header */}
      <div className="px-5 sm:px-6 pt-6 pb-4 text-center">
        <p className="text-[11px] font-semibold text-accent uppercase tracking-widest mb-1">Compare Plans</p>
        <h2 className="text-lg font-bold text-foreground">Free vs Pro Membership</h2>
        <p className="text-xs text-muted-foreground mt-1">Choose the plan that fits your growth goals</p>
      </div>

      {/* Plan Cards */}
      <div className="px-5 sm:px-6 pb-2 grid grid-cols-2 gap-3">
        {/* Free Plan */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div>
            <p className="text-sm font-bold text-foreground">Free</p>
            <p className="text-lg font-bold text-foreground mt-0.5">$0<span className="text-xs font-normal text-muted-foreground">/mo</span></p>
          </div>
          <div className="space-y-2">
            {FREE_FEATURES.map((f, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <Check className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <span className="text-[11px] text-muted-foreground leading-tight">{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pro Plan */}
        <div className="rounded-xl border-2 border-accent/40 bg-gradient-to-b from-accent/5 to-card p-4 space-y-3 relative">
          <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-accent text-accent-foreground text-[10px] font-bold uppercase tracking-wider">
            Popular
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Pro</p>
            <p className="text-lg font-bold text-foreground mt-0.5">$399<span className="text-xs font-normal text-muted-foreground">/mo</span></p>
          </div>
          <div className="space-y-2">
            {PRO_FEATURES.map((f, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <Check className="h-3.5 w-3.5 text-accent mt-0.5 flex-shrink-0" />
                <span className="text-[11px] text-foreground leading-tight font-medium">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTAs */}
      <div className="px-5 sm:px-6 pt-4 pb-5 sm:pb-6 space-y-2">
        <Button 
          className="w-full h-11 text-sm font-semibold bg-accent hover:bg-accent/90"
          onClick={() => onNavigate("pro-upgrade", "upgrade")}
          disabled={isUpdating}
        >
          <Crown className="h-4 w-4 mr-1.5" />
          Upgrade to Pro
        </Button>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 text-xs text-muted-foreground"
            onClick={onBack}
          >
            ← Back
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 text-xs text-muted-foreground"
            onClick={onDismiss}
            disabled={isUpdating}
          >
            Maybe Later
          </Button>
        </div>
      </div>
    </div>
  );
}
