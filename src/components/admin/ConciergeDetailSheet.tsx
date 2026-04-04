import { forwardRef, useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ClipboardList, Users, Send, Settings, DollarSign, MessageSquare, CalendarCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ConciergeIntakeTab } from "./concierge/ConciergeIntakeTab";
import { ConciergePlacementTab } from "./concierge/ConciergePlacementTab";
import { ConciergeIntroductionsTab } from "./concierge/ConciergeIntroductionsTab";
import { ConciergeActionsTab } from "./concierge/ConciergeActionsTab";
import { InvoiceManagementTab } from "./concierge/InvoiceManagementTab";
import { MessagesTab } from "./concierge/MessagesTab";
import { ToursTab } from "./concierge/ToursTab";
import type { Database } from "@/integrations/supabase/types";

type ConciergeInquiry = Database["public"]["Tables"]["concierge_inquiries"]["Row"];

interface ConciergeDetailSheetProps {
  caseData: ConciergeInquiry | undefined;
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  new: { label: "New", variant: "default" },
  reviewing: { label: "Reviewing", variant: "secondary" },
  matching: { label: "Placing", variant: "secondary" },
  matched: { label: "Facilities Found", variant: "outline" },
  introductions_sent: { label: "Intros Sent", variant: "outline" },
  in_contact: { label: "In Contact", variant: "secondary" },
  placed: { label: "Placed", variant: "default" },
  closed: { label: "Closed", variant: "destructive" },
};

export const ConciergeDetailSheet = forwardRef<HTMLDivElement, ConciergeDetailSheetProps>(
  function ConciergeDetailSheet({ caseData, open, onClose, onRefresh }, ref) {
  const [activeTab, setActiveTab] = useState("intake");

  // Auto-transition: new → reviewing when admin opens case
  useEffect(() => {
    if (open && caseData?.status === "new") {
      supabase.functions.invoke("auto-status-transition", {
        body: {
          inquiryId: caseData.id,
          trigger: "admin_viewed",
          actorType: "admin",
        },
      }).then(() => {
        onRefresh();
      }).catch((err) => {
        console.error("[ConciergeDetailSheet] Auto-transition failed:", err);
      });
    }
  }, [open, caseData?.id, caseData?.status]);

  if (!caseData) return null;

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-hidden flex flex-col">
        <SheetHeader className="flex-shrink-0">
          <div className="flex items-center justify-between gap-2">
            <SheetTitle className="text-xl">{caseData.user_name}</SheetTitle>
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className={
                  (caseData.payment_status === 'paid' || caseData.payment_status === 'succeeded') 
                    ? "bg-success/10 text-success border-success/30" 
                    : "bg-destructive/10 text-destructive border-destructive/30"
                }
              >
                {(caseData.payment_status === 'paid' || caseData.payment_status === 'succeeded') ? '✓ Paid' : '⚠ Unpaid'}
              </Badge>
              <Badge variant={STATUS_CONFIG[caseData.status]?.variant || "secondary"}>
                {STATUS_CONFIG[caseData.status]?.label || caseData.status}
              </Badge>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            {caseData.user_email} • {caseData.user_phone}
          </div>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden mt-4">
          <TabsList className="grid grid-cols-7 flex-shrink-0">
            <TabsTrigger value="intake" className="gap-1 px-2">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Intake</span>
            </TabsTrigger>
            <TabsTrigger value="placement" className="gap-1 px-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Place</span>
            </TabsTrigger>
            <TabsTrigger value="introductions" className="gap-1 px-2">
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Intros</span>
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-1 px-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Coord</span>
            </TabsTrigger>
            <TabsTrigger value="tours" className="gap-1 px-2">
              <CalendarCheck className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Tours</span>
            </TabsTrigger>
            <TabsTrigger value="billing" className="gap-1 px-2">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Bill</span>
            </TabsTrigger>
            <TabsTrigger value="actions" className="gap-1 px-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Act</span>
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            <TabsContent value="intake" className="m-0">
              <ConciergeIntakeTab caseData={caseData} />
            </TabsContent>
            <TabsContent value="placement" className="m-0">
              <ConciergePlacementTab caseData={caseData} onRefresh={onRefresh} />
            </TabsContent>
            <TabsContent value="introductions" className="m-0">
              <ConciergeIntroductionsTab caseData={caseData} onRefresh={onRefresh} />
            </TabsContent>
            <TabsContent value="messages" className="m-0">
              <MessagesTab caseData={caseData} />
            </TabsContent>
            <TabsContent value="tours" className="m-0">
              <ToursTab caseData={caseData} />
            </TabsContent>
            <TabsContent value="billing" className="m-0">
              <InvoiceManagementTab caseData={caseData} />
            </TabsContent>
            <TabsContent value="actions" className="m-0">
              <ConciergeActionsTab caseData={caseData} onRefresh={onRefresh} onClose={onClose} />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
});

ConciergeDetailSheet.displayName = "ConciergeDetailSheet";
