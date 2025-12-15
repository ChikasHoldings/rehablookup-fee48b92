import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { 
  CheckCircle2, 
  Circle, 
  Building2, 
  FileText, 
  Image as ImageIcon,
  Stethoscope,
  CreditCard,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

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

export function OnboardingChecklist({ facilityId, facilityData }: OnboardingChecklistProps) {
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

  // Don't show if 100% complete
  if (isComplete) {
    return null;
  }

  return (
    <Card className="border-l-4 border-l-primary bg-gradient-to-r from-primary/5 to-background">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">
                Complete Your Profile
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
      <CardContent className="pt-0 space-y-2">
        {checklistItems.slice(0, 5).map((item) => {
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
                "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
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
        
        {checklistItems.length > 5 && (
          <Button variant="ghost" size="sm" asChild className="w-full text-xs">
            <Link to="/provider/listing">
              View all {totalCount - completedCount} remaining tasks
              <ChevronRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        )}

        {nextIncompleteItem && (
          <Button asChild className="w-full mt-2" size="sm">
            <Link to={nextIncompleteItem.link} className="gap-2">
              Continue Setup
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
