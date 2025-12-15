import { useMemo, useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  CheckCircle2, 
  Building2, 
  FileText, 
  Image as ImageIcon,
  Stethoscope,
  CreditCard,
  ChevronRight,
  ChevronDown,
  Sparkles,
  PartyPopper
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import confetti from "canvas-confetti";

interface OnboardingChecklistProps {
  facilityId: string;
  facilityData: {
    name: string;
    description?: string | null;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    website?: string | null;
    logo_url?: string | null;
    gallery_urls?: string[] | null;
  } | null;
}

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  link: string;
  icon: React.ElementType;
  priority: "required" | "recommended";
}

// Celebration confetti function
function triggerCelebration() {
  const duration = 3000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  const interval = setInterval(function() {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);

    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      colors: ['#1B365D', '#C9A227', '#22c55e', '#3b82f6', '#f59e0b'],
    });
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      colors: ['#1B365D', '#C9A227', '#22c55e', '#3b82f6', '#f59e0b'],
    });
  }, 250);
}

export function OnboardingChecklist({ facilityId, facilityData }: OnboardingChecklistProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const previousPercentageRef = useRef<number | null>(null);
  const celebrationTriggeredRef = useRef(false);
  const queryClient = useQueryClient();

  // Check if user has dismissed the celebration
  useEffect(() => {
    const dismissedKey = `profile-complete-dismissed-${facilityId}`;
    const wasDismissed = localStorage.getItem(dismissedKey);
    if (wasDismissed) {
      setDismissed(true);
    }
  }, [facilityId]);

  // Fetch services count
  const { data: servicesCount = 0 } = useQuery({
    queryKey: ["facility-services-count", facilityId],
    queryFn: async () => {
      const { count } = await supabase
        .from("facility_services")
        .select("*", { count: "exact", head: true })
        .eq("facility_id", facilityId);
      return count || 0;
    },
    enabled: !!facilityId,
    staleTime: 1000 * 60 * 5,
  });

  // Fetch insurance count
  const { data: insuranceCount = 0 } = useQuery({
    queryKey: ["facility-insurance-count", facilityId],
    queryFn: async () => {
      const { count } = await supabase
        .from("facility_insurance")
        .select("*", { count: "exact", head: true })
        .eq("facility_id", facilityId);
      return count || 0;
    },
    enabled: !!facilityId,
    staleTime: 1000 * 60 * 5,
  });

  const checklistItems: ChecklistItem[] = useMemo(() => {
    if (!facilityData) return [];

    return [
      {
        id: "basic-info",
        label: "Complete basic information",
        description: "Name, address, phone number",
        completed: !!(facilityData.name && facilityData.address && facilityData.city && facilityData.state && facilityData.phone),
        link: "/provider/listing",
        icon: Building2,
        priority: "required",
      },
      {
        id: "description",
        label: "Add facility description",
        description: "Tell families about your center",
        completed: !!(facilityData.description && facilityData.description.length >= 50),
        link: "/provider/listing",
        icon: FileText,
        priority: "required",
      },
      {
        id: "logo",
        label: "Upload your logo",
        description: "Build trust with professional branding",
        completed: !!facilityData.logo_url,
        link: "/provider/listing",
        icon: ImageIcon,
        priority: "recommended",
      },
      {
        id: "gallery",
        label: "Add facility photos",
        description: "Show families your space",
        completed: !!(facilityData.gallery_urls && facilityData.gallery_urls.length >= 1),
        link: "/provider/listing",
        icon: ImageIcon,
        priority: "recommended",
      },
      {
        id: "services",
        label: "List your services",
        description: "Treatment programs you offer",
        completed: servicesCount >= 3,
        link: "/provider/listing",
        icon: Stethoscope,
        priority: "required",
      },
      {
        id: "insurance",
        label: "Add accepted insurance",
        description: "Help families find coverage",
        completed: insuranceCount >= 1,
        link: "/provider/listing",
        icon: CreditCard,
        priority: "required",
      },
      {
        id: "website",
        label: "Add your website",
        description: "Link to more information",
        completed: !!facilityData.website,
        link: "/provider/listing",
        icon: Building2,
        priority: "recommended",
      },
    ];
  }, [facilityData, servicesCount, insuranceCount]);

  const completedCount = checklistItems.filter(item => item.completed).length;
  const totalCount = checklistItems.length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  
  const isComplete = completionPercentage === 100;
  const nextIncompleteItem = checklistItems.find(item => !item.completed);

  // Trigger celebration when reaching 100%
  useEffect(() => {
    if (
      isComplete && 
      previousPercentageRef.current !== null && 
      previousPercentageRef.current < 100 &&
      !celebrationTriggeredRef.current
    ) {
      celebrationTriggeredRef.current = true;
      setShowCelebration(true);
      triggerCelebration();
      
      // Send congratulatory email
      supabase.functions.invoke('send-profile-complete-email', {
        body: { facilityId }
      }).catch(console.error);
    }
    previousPercentageRef.current = completionPercentage;
  }, [completionPercentage, isComplete, facilityId]);

  const handleDismissCelebration = () => {
    const dismissedKey = `profile-complete-dismissed-${facilityId}`;
    localStorage.setItem(dismissedKey, 'true');
    setDismissed(true);
    setShowCelebration(false);
  };

  // Show celebration card if complete
  if (isComplete && showCelebration && !dismissed) {
    return (
      <Card className="border-l-4 border-l-green-500 bg-gradient-to-r from-green-50 to-background animate-fade-in overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center animate-scale-in">
                <PartyPopper className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-green-700">
                  🎉 Profile Complete!
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Your listing is now fully optimized
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-3xl font-bold text-green-600">100%</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground mb-4">
            Congratulations! Your facility profile is complete. Families can now find all the information they need to choose your center.
          </p>
          <div className="flex gap-2">
            <Button size="sm" className="bg-green-600 hover:bg-green-700" asChild>
              <Link to="/provider/listing">
                View Your Listing
              </Link>
            </Button>
            <Button size="sm" variant="outline" onClick={handleDismissCelebration}>
              Dismiss
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Don't show if 100% complete and dismissed
  if (isComplete && dismissed) {
    return null;
  }

  // Don't show if complete (without celebration shown yet)
  if (isComplete) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-l-4 border-l-primary bg-gradient-to-r from-primary/5 to-background">
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    Complete Your Profile
                    <ChevronDown className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform duration-200",
                      isOpen && "rotate-180"
                    )} />
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {completedCount} of {totalCount} tasks completed
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-primary">{completionPercentage}%</span>
              </div>
            </div>
            <Progress value={completionPercentage} className="h-2 mt-3" />
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-2 animate-fade-in">
            {checklistItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  to={item.link}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-colors group",
                    item.completed 
                      ? "bg-muted/50 border-transparent" 
                      : "bg-background border-border hover:border-primary/50 hover:bg-primary/5"
                  )}
                >
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-colors",
                    item.completed ? "bg-green-100" : "bg-primary/10"
                  )}>
                    {item.completed ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <Icon className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-medium",
                      item.completed ? "text-muted-foreground line-through" : "text-foreground"
                    )}>
                      {item.label}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.description}
                    </p>
                  </div>
                  {!item.completed && (
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  )}
                </Link>
              );
            })}

            {nextIncompleteItem && (
              <Button asChild className="w-full mt-2" size="sm">
                <Link to={nextIncompleteItem.link} className="gap-2">
                  Continue Setup
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
