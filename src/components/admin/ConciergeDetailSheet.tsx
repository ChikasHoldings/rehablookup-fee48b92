import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ClipboardList, Users, Send, Settings } from "lucide-react";
import { ConciergeIntakeTab } from "./concierge/ConciergeIntakeTab";
import { ConciergeMatchingTab } from "./concierge/ConciergeMatchingTab";
import { ConciergeIntroductionsTab } from "./concierge/ConciergeIntroductionsTab";
import { ConciergeActionsTab } from "./concierge/ConciergeActionsTab";
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
  matching: { label: "Matching", variant: "secondary" },
  matched: { label: "Matched", variant: "outline" },
  introductions_sent: { label: "Intros Sent", variant: "outline" },
  in_contact: { label: "In Contact", variant: "secondary" },
  placed: { label: "Placed", variant: "default" },
  closed: { label: "Closed", variant: "destructive" },
};

export function ConciergeDetailSheet({ caseData, open, onClose, onRefresh }: ConciergeDetailSheetProps) {
  const [activeTab, setActiveTab] = useState("intake");

  if (!caseData) return null;

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-hidden flex flex-col">
        <SheetHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl">{caseData.user_name}</SheetTitle>
            <Badge variant={STATUS_CONFIG[caseData.status]?.variant || "secondary"}>
              {STATUS_CONFIG[caseData.status]?.label || caseData.status}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            {caseData.user_email} • {caseData.user_phone}
          </div>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden mt-4">
          <TabsList className="grid grid-cols-4 flex-shrink-0">
            <TabsTrigger value="intake" className="gap-1">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Intake</span>
            </TabsTrigger>
            <TabsTrigger value="matching" className="gap-1">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Matching</span>
            </TabsTrigger>
            <TabsTrigger value="introductions" className="gap-1">
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Intros</span>
            </TabsTrigger>
            <TabsTrigger value="actions" className="gap-1">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Actions</span>
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            <TabsContent value="intake" className="m-0">
              <ConciergeIntakeTab caseData={caseData} />
            </TabsContent>
            <TabsContent value="matching" className="m-0">
              <ConciergeMatchingTab caseData={caseData} onRefresh={onRefresh} />
            </TabsContent>
            <TabsContent value="introductions" className="m-0">
              <ConciergeIntroductionsTab caseData={caseData} onRefresh={onRefresh} />
            </TabsContent>
            <TabsContent value="actions" className="m-0">
              <ConciergeActionsTab caseData={caseData} onRefresh={onRefresh} onClose={onClose} />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
