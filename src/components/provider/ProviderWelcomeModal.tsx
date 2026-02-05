import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  Users, 
  ArrowRight, 
  Sparkles,
  BarChart3,
  Clock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface ProviderWelcomeModalProps {
  facilityId: string;
  facilityName?: string;
  isFirstLogin?: boolean;
  onDismiss?: () => void;
}

const welcomeSteps = [
  {
    icon: Building2,
    title: "Complete Your Profile",
    description: "Add photos, services, and insurance details to attract more families",
    action: "listings",
  },
  {
    icon: Users,
    title: "Manage Inquiries",
    description: "Review and respond to families seeking treatment",
    action: "inquiries",
  },
  {
    icon: BarChart3,
    title: "Track Performance",
    description: "Monitor your listing views, leads, and engagement",
    action: "analytics",
  },
];

export function ProviderWelcomeModal({ 
  facilityId, 
  facilityName,
  isFirstLogin = true,
  onDismiss 
}: ProviderWelcomeModalProps) {
  const [open, setOpen] = useState(isFirstLogin);
  const [isUpdating, setIsUpdating] = useState(false);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const handleDismiss = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    
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

  const handleNavigate = (action: string) => {
    handleDismiss();
    navigate(`/provider/${action}`);
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(value) => !value && handleDismiss()}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary/5 via-primary/10 to-accent/5 px-4 sm:px-6 pt-5 sm:pt-6 pb-4">
          <DialogHeader className="text-center space-y-2.5">
            <div className="mx-auto w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-lg sm:text-xl font-display text-center">
                Welcome to RehabLookup!
              </DialogTitle>
              <DialogDescription className="text-[13px] sm:text-sm text-center leading-relaxed">
                {facilityName ? (
                  <>Your listing for <span className="font-medium text-foreground">{facilityName}</span> is under review.</>
                ) : (
                  <>Your facility listing is under review.</>
                )}
              </DialogDescription>
            </div>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="px-4 sm:px-6 py-4 space-y-3.5">
          {/* Status */}
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/60 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <p className="text-xs sm:text-[13px] text-amber-800 dark:text-amber-200">
                Review takes 24-48 hours. We'll email you once approved.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              While you wait
            </p>
            <div className="grid gap-1.5">
              {welcomeSteps.map((step) => (
                <button
                  key={step.action}
                  onClick={() => handleNavigate(step.action)}
                  className={cn(
                    "w-full flex items-center gap-2.5 p-2.5 rounded-lg border border-border/50",
                    "hover:bg-accent/50 hover:border-primary/20 transition-all",
                    "text-left group active:scale-[0.99]"
                  )}
                >
                  <div className="flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <step.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[13px] sm:text-sm text-foreground">{step.title}</p>
                    <p className="text-[11px] sm:text-xs text-muted-foreground">{step.description}</p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 pb-4 pt-1">
          <div className={cn("flex gap-2", isMobile ? "flex-col-reverse" : "flex-row")}>
            <Button 
              variant="outline" 
              size={isMobile ? "default" : "sm"}
              className="flex-1"
              onClick={handleDismiss}
              disabled={isUpdating}
            >
              Explore Dashboard
            </Button>
            <Button 
              size={isMobile ? "default" : "sm"}
              className="flex-1"
              onClick={() => handleNavigate("listings")}
              disabled={isUpdating}
            >
              Complete Listing
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
