import { forwardRef, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LayoutDashboard, User, Users, Send, UserCheck, CalendarCheck,
  Clock, Settings, MessageSquare,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { getCaseEventActorType } from "@/lib/caseEventActor";
import { toast } from "sonner";
import { PlacementProgressStepper } from "./concierge/PlacementProgressStepper";
import { CaseSlaDetailBanner } from "./concierge/CaseSlaAlerts";
import { PlacementNextSteps } from "./concierge/PlacementNextSteps";
import { ConciergeOverviewTab } from "./concierge/ConciergeOverviewTab";
import { ConciergeIntakeTab } from "./concierge/ConciergeIntakeTab";
import { ConciergePlacementTab } from "./concierge/ConciergePlacementTab";
import { ConciergeIntroductionsTab } from "./concierge/ConciergeIntroductionsTab";
import { ConciergeDecisionTab } from "./concierge/ConciergeDecisionTab";
import { ConciergeActionsTab } from "./concierge/ConciergeActionsTab";
import { ToursTab } from "./concierge/ToursTab";
import { ConciergeTimelineTab } from "./concierge/ConciergeTimelineTab";
import { MessagesTab } from "./concierge/MessagesTab";
import { StageActionBar } from "./concierge/StageActionBar";
import { STATUS_CONFIG as PIPELINE_STATUS_CONFIG } from "./concierge/placementPipelineConfig";
import type { Database } from "@/integrations/supabase/types";

type ConciergeInquiry = Database["public"]["Tables"]["concierge_inquiries"]["Row"];

interface ConciergeDetailSheetProps {
  caseData: ConciergeInquiry | undefined;
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
  initialTab?: string;
}

export const ConciergeDetailSheet = forwardRef<HTMLDivElement, ConciergeDetailSheetProps>(
  function ConciergeDetailSheet({ caseData, open, onClose, onRefresh, initialTab }) {
  const { adminRole } = useAdminAuth();
  const isAdvisor = adminRole === "advisor";

  const [activeTab, setActiveTab] = useState(initialTab || "overview");

  // Fetch intro and tour counts for next-steps panel
  const { data: introsCount = 0 } = useQuery({
    queryKey: ["intros-count", caseData?.id],
    queryFn: async () => {
      if (!caseData) return 0;
      const { count } = await supabase
        .from("concierge_introductions")
        .select("id", { count: "exact", head: true })
        .eq("inquiry_id", caseData.id);
      return count || 0;
    },
    enabled: open && !!caseData,
  });

  const { data: toursCount = 0 } = useQuery({
    queryKey: ["tours-count", caseData?.id],
    queryFn: async () => {
      if (!caseData) return 0;
      const { count } = await supabase
        .from("concierge_tour_requests")
        .select("id", { count: "exact", head: true })
        .eq("inquiry_id", caseData.id);
      return count || 0;
    },
    enabled: open && !!caseData,
  });

  // Reset tab when sheet opens
  useEffect(() => {
    if (open) {
      setActiveTab(initialTab || "overview");
    }
  }, [open, caseData?.id, initialTab]);

  // Auto-transition: new → reviewing when admin opens case. Pass the granular
  // adminRole so the auto-logged case event records the actual admin role.
  // Errors are surfaced via toast so the admin doesn't silently work against
  // a stale UI — the stepper / status badge will still reflect DB truth.
  useEffect(() => {
    if (!open || !caseData) return;
    if (caseData.status !== "intake_submitted" && caseData.status !== "new") return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.functions.invoke("auto-status-transition", {
        body: {
          inquiryId: caseData.id,
          trigger: "admin_viewed",
          actorType: getCaseEventActorType(adminRole),
        },
      });
      if (cancelled) return;
      if (error || data?.error) {
        const msg = (error as Error | null)?.message || data?.error || "Auto-transition failed";
        toast.error(`Could not advance case status: ${msg}`);
        return;
      }
      onRefresh();
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- onRefresh is a parent callback; including it would cause infinite re-runs if parent doesn't memoize it
  }, [open, caseData?.id, caseData?.status, adminRole]);

  if (!caseData) return null;

  // Build tabs for the case detail sheet. Two flows were removed
  // alongside the paid-placement product retirement: the "billing"
  // tab (placement_invoices was dropped 2026-05-20) and the
  // "admission" tab (admission tracking added complexity that the
  // current Pro-subscription Concierge model doesn't need — the
  // workflow now ends at seeker_confirmed → placed → closed).
  const tabs = [
    { value: "overview", icon: LayoutDashboard, label: "Overview" },
    { value: "seeker", icon: User, label: "Client" },
    { value: "matching", icon: Users, label: "Match" },
    { value: "intros", icon: Send, label: "Intros" },
    { value: "messages", icon: MessageSquare, label: "Msgs" },
    { value: "decision", icon: UserCheck, label: "Decision" },
    { value: "tours", icon: CalendarCheck, label: "Tours" },
    { value: "timeline", icon: Clock, label: "Notes" },
    { value: "actions", icon: Settings, label: "Act" },
  ];

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-hidden flex flex-col">
        <SheetHeader className="flex-shrink-0">
          <div className="flex items-center justify-between gap-2">
            <SheetTitle className="text-xl">{caseData.user_name}</SheetTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={PIPELINE_STATUS_CONFIG[caseData.status]?.color || "bg-muted text-muted-foreground"}>
                {PIPELINE_STATUS_CONFIG[caseData.status]?.label
                  || caseData.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </Badge>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            {caseData.user_email} • {caseData.user_phone}
          </div>
        </SheetHeader>

        {/* SLA Alerts */}
        <div className="flex-shrink-0 mt-3">
          <CaseSlaDetailBanner caseData={caseData} />
        </div>

        {/* Progress Stepper */}
        <div className="flex-shrink-0 mt-3 overflow-x-auto">
          <PlacementProgressStepper
            caseData={{
              status: caseData.status,
              assigned_advisor_id: caseData.assigned_advisor_id,
              match_count: caseData.match_count,
              introductions_sent_count: caseData.introductions_sent_count,
              seeker_confirmed: caseData.seeker_confirmed,
              tour_coordination_status: caseData.tour_coordination_status,
              placement_confirmed: caseData.placement_confirmed,
              closed_at: caseData.closed_at,
            }}
            compact
          />
        </div>

        {/* Next Action Panel */}
        <div className="flex-shrink-0 mt-3">
          <PlacementNextSteps
            caseData={caseData}
            introsCount={introsCount}
            toursCount={toursCount}
            onSwitchTab={setActiveTab}
          />
        </div>

        {/* Stage-Aware Action Buttons */}
        <div className="flex-shrink-0 mt-3">
          <StageActionBar caseData={caseData} onRefresh={onRefresh} onSwitchTab={setActiveTab} />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden mt-3">
          <div className="flex-shrink-0 overflow-x-auto scrollbar-hide">
            <TabsList className="h-9 bg-muted/50 p-0.5 gap-0 w-auto inline-flex">
              {tabs.map(tab => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  aria-label={tab.label}
                  className="gap-1 px-2 py-1.5 text-xs"
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <ScrollArea className="flex-1 mt-4">
            <TabsContent value="overview" className="m-0">
              <ConciergeOverviewTab caseData={caseData} />
            </TabsContent>
            <TabsContent value="seeker" className="m-0">
              <ConciergeIntakeTab caseData={caseData} />
            </TabsContent>
            <TabsContent value="matching" className="m-0">
              <ConciergePlacementTab caseData={caseData} onRefresh={onRefresh} />
            </TabsContent>
            <TabsContent value="intros" className="m-0">
              <ConciergeIntroductionsTab caseData={caseData} onRefresh={onRefresh} />
            </TabsContent>
            <TabsContent value="messages" className="m-0">
              <MessagesTab caseData={caseData} />
            </TabsContent>
            <TabsContent value="decision" className="m-0">
              <ConciergeDecisionTab caseData={caseData} />
            </TabsContent>
            <TabsContent value="tours" className="m-0">
              <ToursTab caseData={caseData} />
            </TabsContent>
            <TabsContent value="timeline" className="m-0">
              <ConciergeTimelineTab caseData={caseData} onRefresh={onRefresh} />
            </TabsContent>
            <TabsContent value="actions" className="m-0">
              <ConciergeActionsTab caseData={caseData} onRefresh={onRefresh} onClose={onClose} isAdvisor={isAdvisor} onSwitchTab={setActiveTab} />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
});

ConciergeDetailSheet.displayName = "ConciergeDetailSheet";
