import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { getCaseEventActorType } from "@/lib/caseEventActor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Save, Loader2, StickyNote } from "lucide-react";
import { CaseTimelineEvents } from "./CaseTimelineEvents";
import type { Database } from "@/integrations/supabase/types";

type ConciergeInquiry = Database["public"]["Tables"]["concierge_inquiries"]["Row"];

interface ConciergeTimelineTabProps {
  caseData: ConciergeInquiry;
  onRefresh: () => void;
}

export function ConciergeTimelineTab({ caseData, onRefresh }: ConciergeTimelineTabProps) {
  const { user, adminRole } = useAdminAuth();
  const queryClient = useQueryClient();
  const [adminNotes, setAdminNotes] = useState(caseData.admin_notes || "");
  const [notes, setNotes] = useState(caseData.notes || "");

  const saveNotes = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("concierge_inquiries")
        .update({ admin_notes: adminNotes, notes })
        .eq("id", caseData.id);
      if (error) throw error;

      // Log the event
      await supabase.from("concierge_case_events").insert({
        inquiry_id: caseData.id,
        event_type: "notes_updated",
        event_data: { updated_by: user?.id },
        actor_id: user?.id,
        actor_type: getCaseEventActorType(adminRole),
      });
    },
    onSuccess: () => {
      toast.success("Notes saved");
      queryClient.invalidateQueries({ queryKey: ["case-events", caseData.id] });
      onRefresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const hasChanges = adminNotes !== (caseData.admin_notes || "") || notes !== (caseData.notes || "");

  return (
    <div className="space-y-4">
      {/* Admin Notes */}
      <Card>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <StickyNote className="h-4 w-4" /> Admin Notes
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              onClick={() => saveNotes.mutate()}
              disabled={!hasChanges || saveNotes.isPending}
            >
              {saveNotes.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              Save
            </Button>
          </div>
        </CardHeader>
        <CardContent className="py-2 space-y-3">
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1 block">Internal Admin Notes</label>
            <Textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Internal notes visible only to admin staff..."
              rows={3}
              className="text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1 block">Advisor / Operational Notes</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes about coordination, seeker preferences, etc..."
              rows={3}
              className="text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Activity Timeline */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium">Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <CaseTimelineEvents caseData={caseData} />
        </CardContent>
      </Card>
    </div>
  );
}
