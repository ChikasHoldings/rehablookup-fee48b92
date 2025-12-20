import React, { useState, forwardRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { logAdminAction, AdminAuditActions } from "@/hooks/useAdminAuditLog";
import { ArrowRightLeft, Building2, AlertTriangle } from "lucide-react";

type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  qualified: boolean | null;
  facility_id: string | null;
  exclusivity: string | null;
};

type Facility = {
  id: string;
  name: string;
  city: string;
  state: string;
};

interface LeadReassignDialogProps {
  lead: Lead | null;
  currentFacility: Facility | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const LeadReassignDialog = forwardRef<HTMLDivElement, LeadReassignDialogProps>(
  function LeadReassignDialog({ lead, currentFacility, open, onOpenChange }, ref) {
  const queryClient = useQueryClient();
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>("");
  const [reassignReason, setReassignReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch approved facilities for reassignment
  const { data: facilities } = useQuery({
    queryKey: ["admin-approved-facilities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facilities")
        .select("id, name, city, state")
        .eq("status", "approved")
        .order("name");
      if (error) throw error;
      return data as Facility[];
    },
    enabled: open,
  });

  // Filter out the current facility from options
  const availableFacilities = facilities?.filter(f => f.id !== lead?.facility_id) || [];

  const handleReassign = async () => {
    if (!lead || !selectedFacilityId || !reassignReason.trim()) {
      toast.error("Please select a provider and provide a reason");
      return;
    }

    setIsSubmitting(true);
    try {
      const newFacility = facilities?.find(f => f.id === selectedFacilityId);
      const previousFacilityId = lead.facility_id;

      // Update the lead with new facility
      const { error: updateError } = await supabase
        .from("leads")
        .update({
          facility_id: selectedFacilityId,
          assignment_reason: `Reassigned by admin: ${reassignReason}`,
          assigned_at: new Date().toISOString(),
        })
        .eq("id", lead.id);

      if (updateError) throw updateError;

      // Log the reassignment in routing logs
      const { error: routingError } = await supabase
        .from("lead_routing_logs")
        .insert({
          lead_id: lead.id,
          assigned_provider_id: selectedFacilityId,
          requested_facility_id: previousFacilityId,
          assignment_reason: `Admin reassignment from ${currentFacility?.name || "unknown"}: ${reassignReason}`,
          routing_source: "admin_reassign",
          provider_routing_order: 1,
          exclusivity: lead.exclusivity || "exclusive",
        });

      if (routingError) {
        console.error("Error logging routing:", routingError);
      }

      // Notify the NEW provider
      const { data: newFacilityData } = await supabase
        .from("facilities")
        .select("user_id")
        .eq("id", selectedFacilityId)
        .single();

      if (newFacilityData?.user_id) {
        await supabase.from("provider_notifications").insert({
          user_id: newFacilityData.user_id,
          facility_id: selectedFacilityId,
          type: "new_lead",
          title: "Lead Reassigned to You",
          message: `A lead (${lead.name}) has been reassigned to your facility by an admin.`,
          metadata: { lead_id: lead.id, reassigned: true, from_facility: previousFacilityId },
        });
      }

      // Notify the PREVIOUS provider
      if (previousFacilityId) {
        const { data: prevFacilityData } = await supabase
          .from("facilities")
          .select("user_id")
          .eq("id", previousFacilityId)
          .single();

        if (prevFacilityData?.user_id) {
          await supabase.from("provider_notifications").insert({
            user_id: prevFacilityData.user_id,
            facility_id: previousFacilityId,
            type: "lead_update",
            title: "Lead Reassigned",
            message: `A lead (${lead.name}) has been reassigned to another facility by an admin.`,
            metadata: { lead_id: lead.id, reassigned: true, to_facility: selectedFacilityId },
          });
        }
      }

      // Audit log
      await logAdminAction({
        actionType: AdminAuditActions.LEAD_ASSIGNED,
        targetType: "lead",
        targetId: lead.id,
        details: {
          lead_name: lead.name,
          lead_email: lead.email,
          previous_facility_id: previousFacilityId,
          previous_facility_name: currentFacility?.name,
          new_facility_id: selectedFacilityId,
          new_facility_name: newFacility?.name,
          reassign_reason: reassignReason,
          action: "reassign",
        },
      });

      queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
      queryClient.invalidateQueries({ queryKey: ["admin-leads-count"] });

      toast.success("Lead reassigned successfully", {
        description: `Lead moved from ${currentFacility?.name || "unassigned"} to ${newFacility?.name}. Both providers have been notified.`,
      });

      resetAndClose();
    } catch (error) {
      console.error("Error reassigning lead:", error);
      toast.error("Failed to reassign lead");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setSelectedFacilityId("");
    setReassignReason("");
    onOpenChange(false);
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            Reassign Lead
          </DialogTitle>
          <DialogDescription>
            Move this lead from the current provider to a different one.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Lead Summary */}
          <div className="p-3 rounded-lg bg-muted/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">{lead.name}</span>
              <Badge variant="secondary" className="text-xs">
                {lead.exclusivity === "exclusive" ? "Exclusive" : "Shared"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{lead.email}</p>
          </div>

          {/* Current Assignment */}
          {currentFacility && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Currently Assigned To</Label>
              <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{currentFacility.name}</p>
                  <p className="text-xs text-muted-foreground">{currentFacility.city}, {currentFacility.state}</p>
                </div>
              </div>
            </div>
          )}

          <Separator />

          {/* Warning */}
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
            <div className="flex gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <p>
                Reassigning this lead will notify both the current and new provider. 
                This action is logged in the audit trail.
              </p>
            </div>
          </div>

          {/* New Provider Selection */}
          <div className="space-y-2">
            <Label htmlFor="new-facility-select">Reassign To *</Label>
            <Select value={selectedFacilityId} onValueChange={setSelectedFacilityId}>
              <SelectTrigger id="new-facility-select">
                <SelectValue placeholder="Choose a new provider..." />
              </SelectTrigger>
              <SelectContent>
                {availableFacilities.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    No other providers available
                  </div>
                ) : (
                  availableFacilities.map((facility) => (
                    <SelectItem key={facility.id} value={facility.id}>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span>{facility.name}</span>
                        <span className="text-muted-foreground">
                          ({facility.city}, {facility.state})
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reassign-reason">Reason for Reassignment *</Label>
            <Textarea
              id="reassign-reason"
              placeholder="Explain why this lead is being reassigned..."
              value={reassignReason}
              onChange={(e) => setReassignReason(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={resetAndClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleReassign}
            disabled={isSubmitting || !selectedFacilityId || !reassignReason.trim()}
          >
            {isSubmitting ? "Reassigning..." : "Reassign Lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

LeadReassignDialog.displayName = "LeadReassignDialog";
