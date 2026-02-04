import { useState, useEffect } from "react";
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
  TrendingUp, 
  ArrowRight, 
  CheckCircle2,
  Sparkles,
  BarChart3,
  MessageSquare
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

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
    cta: "Edit Listing",
  },
  {
    icon: Users,
    title: "Manage Inquiries",
    description: "Review and respond to families seeking treatment",
    action: "inquiries",
    cta: "View Inquiries",
  },
  {
    icon: BarChart3,
    title: "Track Performance",
    description: "Monitor your listing views, leads, and engagement",
    action: "analytics",
    cta: "View Analytics",
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

  const handleDismiss = async () => {
    setIsUpdating(true);
    
    // Mark as celebrated so modal doesn't show again
    await supabase
      .from("facilities")
      .update({ profile_completion_celebrated: true })
      .eq("id", facilityId);
    
    setOpen(false);
    setIsUpdating(false);
    onDismiss?.();
  };

  const handleNavigate = (action: string) => {
    handleDismiss();
    navigate(`/provider/${action}`);
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(value) => !value && handleDismiss()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-4">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-2xl font-display">
            Welcome to RehabLookup!
          </DialogTitle>
          <DialogDescription className="text-base">
            {facilityName ? (
              <>Your listing for <span className="font-medium text-foreground">{facilityName}</span> has been submitted for review.</>
            ) : (
              <>Your facility listing has been submitted for review.</>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Status Banner */}
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <CheckCircle2 className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="font-medium text-amber-900 dark:text-amber-100 text-sm">
                  Pending Review
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                  Our team will review your listing within 24-48 hours. You'll receive an email once approved.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground px-1">
              While you wait, you can:
            </p>
            {welcomeSteps.map((step, index) => (
              <button
                key={step.action}
                onClick={() => handleNavigate(step.action)}
                className={cn(
                  "w-full flex items-center gap-4 p-3 rounded-lg border border-border",
                  "hover:bg-accent hover:border-accent-foreground/20 transition-all",
                  "text-left group"
                )}
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <step.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground">{step.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{step.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={handleDismiss}
            disabled={isUpdating}
          >
            Explore Dashboard
          </Button>
          <Button 
            className="flex-1"
            onClick={() => handleNavigate("listings")}
            disabled={isUpdating}
          >
            Complete My Listing
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
