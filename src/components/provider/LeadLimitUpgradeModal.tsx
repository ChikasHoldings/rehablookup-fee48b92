import { useState, useEffect, forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Zap, 
  TrendingUp, 
  Crown, 
  ArrowRight,
} from "lucide-react";

interface LeadLimitUpgradeModalProps {
  usedLeads: number;
  leadLimit: number;
  currentPlan: "basic" | "professional" | "featured";
  isOpen?: boolean;
  onClose?: () => void;
}

const STORAGE_KEY = "lead_limit_upgrade_modal_dismissed";
const DISMISS_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export const LeadLimitUpgradeModal = forwardRef<HTMLDivElement, LeadLimitUpgradeModalProps>(
  function LeadLimitUpgradeModal({
    usedLeads,
    leadLimit,
    currentPlan,
    isOpen: controlledOpen,
    onClose,
  }, ref) {
  const navigate = useNavigate();
  const [internalOpen, setInternalOpen] = useState(false);

  const usagePercent = leadLimit > 0 ? (usedLeads / leadLimit) * 100 : 0;
  const shouldShow = usagePercent >= 80 && currentPlan !== "featured";

  // Check if modal was recently dismissed
  useEffect(() => {
    if (controlledOpen !== undefined) return; // Controlled mode

    if (shouldShow) {
      const dismissedAt = localStorage.getItem(STORAGE_KEY);
      if (dismissedAt) {
        const dismissedTime = parseInt(dismissedAt, 10);
        if (Date.now() - dismissedTime < DISMISS_DURATION) {
          return; // Still within dismiss period
        }
      }
      // Small delay to avoid showing immediately on page load
      const timer = setTimeout(() => setInternalOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [shouldShow, controlledOpen]);

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
    if (onClose) {
      onClose();
    } else {
      setInternalOpen(false);
    }
  };

  const handleUpgrade = () => {
    handleClose();
    navigate("/provider/billing");
  };

  if (!shouldShow && controlledOpen === undefined) return null;

  const isApproaching = usagePercent >= 80 && usagePercent < 100;
  const isAtLimit = usagePercent >= 100;

  const nextPlan = currentPlan === "basic" ? "Professional" : "Featured";
  const nextPlanBenefits = currentPlan === "basic" 
    ? ["100 qualified leads/month", "Email notifications", "Lead management dashboard"]
    : ["100% exclusive leads", "Homepage featured placement", "Priority search ranking"];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center pb-2">
          <div className={`mx-auto h-12 w-12 rounded-full flex items-center justify-center mb-3 ${
            isAtLimit ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
          }`}>
            {isAtLimit ? <TrendingUp className="h-6 w-6" /> : <Zap className="h-6 w-6" />}
          </div>
          <DialogTitle className="text-xl">
            {isAtLimit ? "Lead Limit Reached" : "Approaching Lead Limit"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {isAtLimit 
              ? "You've used all your monthly leads. Upgrade to continue receiving qualified leads."
              : "You're almost at your monthly lead limit. Upgrade now to avoid missing opportunities."
            }
          </DialogDescription>
        </DialogHeader>

        {/* Usage Progress */}
        <div className="py-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Monthly Usage</span>
            <span className="font-semibold">
              {usedLeads} / {leadLimit} leads
            </span>
          </div>
          <Progress 
            value={Math.min(usagePercent, 100)} 
            className={`h-3 ${isAtLimit ? "[&>div]:bg-red-500" : "[&>div]:bg-amber-500"}`}
          />
          <p className="text-xs text-muted-foreground text-center">
            {isAtLimit 
              ? "100% of your monthly leads used"
              : `${Math.round(usagePercent)}% of your monthly leads used`
            }
          </p>
        </div>

        {/* Upgrade Benefits */}
        <div className="bg-muted/30 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            {currentPlan === "basic" ? (
              <TrendingUp className="h-4 w-4 text-primary" />
            ) : (
              <Crown className="h-4 w-4 text-amber-500" />
            )}
            <span className="font-medium text-sm">Upgrade to {nextPlan}</span>
          </div>
          <ul className="space-y-2">
            {nextPlanBenefits.map((benefit) => (
              <li key={benefit} className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={handleUpgrade} className="w-full group">
            <Zap className="h-4 w-4 mr-2" />
            Upgrade Now
            <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
          </Button>
          <Button variant="ghost" onClick={handleClose} className="w-full text-muted-foreground">
            Remind Me Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
});
