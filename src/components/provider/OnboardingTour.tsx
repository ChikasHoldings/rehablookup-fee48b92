import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [forceOpen]);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTour();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeTour = () => {
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
    setIsOpen(false);
    onComplete?.();
  };

  const skipTour = () => {
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
    setIsOpen(false);
    onComplete?.();
  };

  const step = tourSteps[currentStep];
  const Icon = step.icon;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === tourSteps.length - 1;
  const progress = ((currentStep + 1) / tourSteps.length) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) skipTour();
    }}>
      <DialogContent className="sm:max-w-md">
        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-muted rounded-t-lg overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <DialogHeader className="pt-2">
          <div className="flex items-center justify-center mb-4">
            <div className={cn(
              "p-4 rounded-full",
              isLastStep ? "bg-green-500/10" : "bg-primary/10"
            )}>
              <Icon className={cn(
                "h-8 w-8",
                isLastStep ? "text-green-500" : "text-primary"
              )} />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">
            {step.title}
          </DialogTitle>
          <DialogDescription className="text-center text-base pt-2">
            {step.description}
          </DialogDescription>
        </DialogHeader>

        {step.tip && (
          <div className="bg-muted/50 border border-border rounded-lg p-3 mx-4">
            <p className="text-sm text-muted-foreground flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span><strong>Tip:</strong> {step.tip}</span>
            </p>
          </div>
        )}

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-1.5 py-2">
          {tourSteps.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStep(index)}
              className={cn(
                "h-2 rounded-full transition-all duration-200",
                index === currentStep 
                  ? "w-6 bg-primary" 
                  : index < currentStep 
                    ? "w-2 bg-primary/50" 
                    : "w-2 bg-muted-foreground/30"
              )}
              aria-label={`Go to step ${index + 1}`}
            />
          ))}
        </div>

        <DialogFooter className="flex-row gap-2 sm:justify-between">
          <div>
            {!isFirstStep && (
              <Button variant="ghost" size="sm" onClick={handlePrev}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isLastStep && (
              <Button variant="ghost" size="sm" onClick={skipTour}>
                Skip tour
              </Button>
            )}
            <Button onClick={handleNext} size="sm">
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
        </DialogFooter>
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
