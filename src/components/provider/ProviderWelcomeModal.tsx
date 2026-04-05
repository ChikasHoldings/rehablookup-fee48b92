import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
      <DialogContent className="w-[calc(100%-2rem)] max-w-[420px] p-0 gap-0 overflow-hidden rounded-xl">
        {/* Header Section */}
        <div className="bg-gradient-to-br from-primary/5 via-primary/8 to-accent/5 p-5 sm:p-6">
          <DialogHeader className="space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="text-center space-y-1.5">
              <DialogTitle className="text-lg font-semibold text-foreground">
                Welcome to RehabLookup!
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {facilityName ? (
                  <>Your listing for <span className="font-medium text-foreground">{facilityName}</span> is under review</>
                ) : (
                  <>Your facility listing is under review</>
                )}
              </DialogDescription>
            </div>
          </DialogHeader>
        </div>

        {/* Body Section */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* Status Banner */}
          <div className="flex items-center gap-2.5 rounded-lg bg-warning/5 border border-warning/20 p-3">
            <Clock className="h-4 w-4 text-warning flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              Review takes 24-48 hours. We'll email you once approved.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              While you wait
            </p>
            <div className="space-y-2">
              {welcomeSteps.map((step) => (
                <button
                  key={step.action}
                  onClick={() => handleNavigate(step.action)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg",
                    "border border-border bg-card",
                    "hover:bg-accent/5 hover:border-primary/20",
                    "transition-colors text-left group"
                  )}
                >
                  <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <step.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{step.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{step.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Section */}
        <div className="px-5 sm:px-6 pb-5 sm:pb-6 flex flex-col-reverse sm:flex-row gap-2">
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
            Complete Listing
            <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
