import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  LayoutDashboard,
  FileText,
  Users,
  BarChart3,
  CreditCard,
  Settings,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  CheckCircle2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TOUR_STORAGE_KEY = "provider-onboarding-tour-completed";

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  tip?: string;
}

const tourSteps: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to Your Provider Dashboard!",
    description: "We're excited to have you on RehabLookup. This quick tour will show you around your dashboard and help you get started.",
    icon: Sparkles,
    tip: "This tour only takes about 1 minute to complete.",
  },
  {
    id: "dashboard",
    title: "Dashboard Overview",
    description: "Your dashboard gives you a quick snapshot of your facility's performance - including profile views, leads received, and your current plan status.",
    icon: LayoutDashboard,
    tip: "Check your dashboard daily to stay on top of new leads.",
  },
  {
    id: "listing",
    title: "My Listing",
    description: "This is where you manage your facility profile. Add photos, update your services, and keep your information current to attract more leads.",
    icon: FileText,
    tip: "Complete your profile to 100% to maximize visibility.",
  },
  {
    id: "leads",
    title: "Leads Inbox",
    description: "All your incoming leads appear here. You can view contact details, send emails, add notes, and track the status of each lead.",
    icon: Users,
    tip: "Respond to leads within 24 hours for best conversion rates.",
  },
  {
    id: "analytics",
    title: "Analytics",
    description: "Track your facility's performance over time. See views, leads, and engagement metrics to understand how your listing is performing.",
    icon: BarChart3,
    tip: "Use date filters to compare performance across different periods.",
  },
  {
    id: "billing",
    title: "Billing & Plans",
    description: "Manage your subscription, upgrade your plan, and access premium features. Higher tiers get more leads and better visibility.",
    icon: CreditCard,
    tip: "Featured plans get homepage placement and priority in search.",
  },
  {
    id: "settings",
    title: "Settings",
    description: "Customize your notification preferences, manage account security, view activity logs, and control your session settings.",
    icon: Settings,
    tip: "Enable email notifications to never miss a new lead.",
  },
  {
    id: "complete",
    title: "You're All Set!",
    description: "That's the tour! Start by completing your facility profile, then watch the leads come in. We're here to help you succeed.",
    icon: CheckCircle2,
    tip: "Need help? Visit the Help section in your profile menu.",
  },
];

interface OnboardingTourProps {
  forceOpen?: boolean;
  onComplete?: () => void;
}

export function OnboardingTour({ forceOpen = false, onComplete }: OnboardingTourProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      setCurrentStep(0);
      return;
    }

    // Check if user has completed the tour
    const tourCompleted = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!tourCompleted) {
      // Small delay to let the dashboard render first
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [forceOpen]);

  const handleNext = useCallback(() => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      completeTour();
    }
  }, [currentStep]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const completeTour = useCallback(() => {
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
    setIsOpen(false);
    setCurrentStep(0);
    onComplete?.();
  }, [onComplete]);

  const dismissTour = useCallback(() => {
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
    setIsOpen(false);
    setCurrentStep(0);
    onComplete?.();
  }, [onComplete]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "Escape") {
        e.preventDefault();
        dismissTour();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleNext, handlePrev, dismissTour]);

  const step = tourSteps[currentStep];
  const Icon = step.icon;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === tourSteps.length - 1;
  const progress = ((currentStep + 1) / tourSteps.length) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) dismissTour();
    }}>
      <DialogContent 
        className="sm:max-w-[440px] p-0 gap-0 overflow-hidden border-border bg-card rounded-xl shadow-xl [&>button]:hidden"
      >
        {/* Progress bar */}
        <div className="h-1.5 bg-muted w-full">
          <div 
            className="h-full bg-primary transition-all duration-300 ease-out rounded-r-full"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Custom close button */}
        <button
          onClick={dismissTour}
          className="absolute right-4 top-4 z-10 rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
          aria-label="Close tour"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Content area */}
        <div className="px-6 pt-10 pb-6">
          <DialogHeader className="space-y-0 flex flex-col items-center">
            {/* Icon */}
            <div className={cn(
              "p-4 rounded-full transition-colors mb-4",
              isLastStep ? "bg-green-500/10" : "bg-primary/10"
            )}>
              <Icon className={cn(
                "h-10 w-10",
                isLastStep ? "text-green-500" : "text-primary"
              )} />
            </div>

            {/* Title */}
            <DialogTitle className="text-center text-xl font-semibold leading-tight mb-3">
              {step.title}
            </DialogTitle>

            {/* Description */}
            <DialogDescription className="text-center text-sm text-muted-foreground leading-relaxed max-w-[360px]">
              {step.description}
            </DialogDescription>
          </DialogHeader>

          {/* Tip box */}
          {step.tip && (
            <div className="mt-5 bg-primary/5 border border-primary/20 rounded-lg p-3.5">
              <p className="text-sm text-muted-foreground flex items-start gap-2.5">
                <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span><strong className="text-foreground font-medium">Tip:</strong> {step.tip}</span>
              </p>
            </div>
          )}

          {/* Step indicators */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {tourSteps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={cn(
                  "h-2 rounded-full transition-all duration-200 hover:opacity-80",
                  index === currentStep 
                    ? "w-8 bg-primary" 
                    : index < currentStep 
                      ? "w-2 bg-primary/50" 
                      : "w-2 bg-muted-foreground/25"
                )}
                aria-label={`Go to step ${index + 1}`}
              />
            ))}
          </div>

          {/* Step counter */}
          <p className="text-center text-xs text-muted-foreground mt-3">
            Step {currentStep + 1} of {tourSteps.length}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-muted/40 border-t border-border">
          <div className="w-24">
            {!isFirstStep ? (
              <Button variant="ghost" size="sm" onClick={handlePrev} className="gap-1 h-9">
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={dismissTour} className="text-muted-foreground h-9">
                Skip tour
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {!isLastStep && !isFirstStep && (
              <Button variant="ghost" size="sm" onClick={dismissTour} className="text-muted-foreground h-9">
                Skip
              </Button>
            )}
            <Button onClick={handleNext} size="sm" className="min-w-[110px] h-9 font-medium">
              {isLastStep ? (
                "Get Started"
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Export function to reset tour (for settings page)
export function resetOnboardingTour() {
  localStorage.removeItem(TOUR_STORAGE_KEY);
}

// Export function to check if tour was completed
export function isTourCompleted() {
  return localStorage.getItem(TOUR_STORAGE_KEY) === "true";
}
