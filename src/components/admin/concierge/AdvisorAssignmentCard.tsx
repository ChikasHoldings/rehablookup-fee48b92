import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { User, Loader2, Save } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type ConciergeInquiry = Database["public"]["Tables"]["concierge_inquiries"]["Row"];

interface AdvisorAssignmentCardProps {
  caseData: ConciergeInquiry;
  onRefresh: () => void;
}

export function AdvisorAssignmentCard({ caseData, onRefresh }: AdvisorAssignmentCardProps) {
  const queryClient = useQueryClient();
  const [selectedAdvisor, setSelectedAdvisor] = useState(caseData.assigned_advisor_id || "unassigned");

  // Sync state when caseData changes (e.g., switching between cases)
  useEffect(() => {
    setSelectedAdvisor(caseData.assigned_advisor_id || "unassigned");
  }, [caseData.id, caseData.assigned_advisor_id]);

  // Fetch admin staff for advisor assignment
  const { data: adminStaff, isLoading: staffLoading } = useQuery({
    queryKey: ["admin-staff-advisors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_user_profiles")
        .select("user_id, first_name, last_name, display_name, admin_role")
        .in("admin_role", ["super_admin", "manager", "advisor"])
        .eq("status", "active");
      if (error) throw error;
      return data;
    },
  });

  const assignAdvisorMutation = useMutation({
    mutationFn: async (advisorId: string) => {
      const actualId = advisorId === "unassigned" ? null : advisorId;
      const { error } = await supabase
        .from("concierge_inquiries")
        .update({ assigned_advisor_id: actualId })
        .eq("id", caseData.id);

      if (error) throw error;

      // Log event
      await supabase.from("concierge_case_events").insert({
        inquiry_id: caseData.id,
        event_type: "advisor_assigned",
        event_data: { 
          advisor_id: advisorId === "unassigned" ? null : advisorId,
          previous_advisor_id: caseData.assigned_advisor_id 
        },
        actor_type: "admin",
      });
    },
    onSuccess: () => {
      toast.success("Advisor assigned successfully");
      queryClient.invalidateQueries({ queryKey: ["case-events", caseData.id] });
      onRefresh();
    },
    onError: (error) => {
      toast.error("Failed to assign advisor: " + error.message);
    },
  });

  const handleAssign = () => {
    assignAdvisorMutation.mutate(selectedAdvisor);
  };

  const currentAdvisor = adminStaff?.find(a => a.user_id === caseData.assigned_advisor_id);
  const hasChanged = selectedAdvisor !== (caseData.assigned_advisor_id || "unassigned");

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <User className="h-4 w-4" />
          Assigned Advisor
        </CardTitle>
      </CardHeader>
      <CardContent className="py-2">
        <div className="space-y-3">
          {currentAdvisor && (
            <div className="text-sm text-muted-foreground">
              Currently: <span className="font-medium text-foreground">
                {currentAdvisor.display_name || `${currentAdvisor.first_name} ${currentAdvisor.last_name}`}
              </span>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <Select 
              value={selectedAdvisor} 
              onValueChange={setSelectedAdvisor}
              disabled={staffLoading}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select an advisor..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {adminStaff?.map((staff) => (
                  <SelectItem key={staff.user_id} value={staff.user_id}>
                    {staff.display_name || `${staff.first_name} ${staff.last_name}`}
                    <span className="text-muted-foreground ml-1 text-xs">
                      ({staff.admin_role})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={handleAssign} 
              disabled={assignAdvisorMutation.isPending || !hasChanged}
              size="sm"
            >
              {assignAdvisorMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
