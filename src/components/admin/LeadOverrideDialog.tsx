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
import { CheckCircle, Send, ShieldCheck, Building2, AlertTriangle } from "lucide-react";

type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  qualified: boolean | null;
  qualification_reason: string | null;
  assignment_status: string | null;
  facility_id: string | null;
  validation_status: string | null;
  quality_flag: string | null;
};

type Facility = {
  id: string;
  name: string;
  city: string;
  state: string;
};

interface LeadOverrideDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const LeadOverrideDialog = forwardRef<HTMLDivElement, LeadOverrideDialogProps>(
  function LeadOverrideDialog({ lead, open, onOpenChange }, ref) {
  const queryClient = useQueryClient();
  const [action, setAction] = useState<"qualify" | "route" | null>(null);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>("");
  const [overrideReason, setOverrideReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch approved facilities for routing
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

  const handleQualifyLead = async () => {
    if (!lead || !overrideReason.trim()) {
      toast.error("Please provide a reason for the override");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("leads")
        .update({
          qualified: true,
          validation_status: "valid",
          quality_flag: null,
          qualification_reason: `Admin override: ${overrideReason}`,
          assignment_status: "pending",
        })
        .eq("id", lead.id);

      if (error) throw error;

      await logAdminAction({
        actionType: AdminAuditActions.LEAD_QUALIFIED,
        targetType: "lead",
        targetId: lead.id,
        details: {
          lead_name: lead.name,
          lead_email: lead.email,
          override_reason: overrideReason,
          previous_qualified: lead.qualified,
          previous_validation_status: lead.validation_status,
          previous_quality_flag: lead.quality_flag,
        },
      });

      queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
      queryClient.invalidateQueries({ queryKey: ["admin-leads-count"] });
      queryClient.invalidateQueries({ queryKey: ["admin-blocked-leads-count"] });

      toast.success("Lead qualified successfully", {
        description: "The lead is now marked as qualified and can be routed to a provider.",
      });

      resetAndClose();
    } catch (error) {
      console.error("Error qualifying lead:", error);
      toast.error("Failed to qualify lead");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRouteLead = async () => {
    if (!lead || !selectedFacilityId || !overrideReason.trim()) {
      toast.error("Please select a provider and provide a reason");
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedFacility = facilities?.find(f => f.id === selectedFacilityId);

      // First, qualify the lead if not already qualified
      const { error: updateError } = await supabase
        .from("leads")
        .update({
          qualified: true,
          validation_status: "valid",
          quality_flag: null,
          qualification_reason: `Admin override & manual route: ${overrideReason}`,
          assignment_status: "assigned",
          assignment_reason: `Manual admin assignment: ${overrideReason}`,
          facility_id: selectedFacilityId,
          assigned_at: new Date().toISOString(),
        })
        .eq("id", lead.id);

      if (updateError) throw updateError;

      // Log the routing decision
      const { error: routingError } = await supabase
        .from("lead_routing_logs")
        .insert({
          lead_id: lead.id,
          assigned_provider_id: selectedFacilityId,
          assignment_reason: `Manual admin override: ${overrideReason}`,
          routing_source: "admin_manual",
          provider_routing_order: 1,
          exclusivity: "exclusive",
        });

      if (routingError) {
        console.error("Error logging routing:", routingError);
      }

      // Create notification for the provider
      const { data: facilityData } = await supabase
        .from("facilities")
        .select("user_id")
        .eq("id", selectedFacilityId)
        .single();

      if (facilityData?.user_id) {
        await supabase.from("provider_notifications").insert({
          user_id: facilityData.user_id,
          facility_id: selectedFacilityId,
          type: "lead_received",
          title: `🎉 You have a new lead!`,
          message: `${lead.name} is interested in your facility. Respond quickly for the best results!`,
          metadata: { lead_id: lead.id },
        });
      }

      await logAdminAction({
        actionType: AdminAuditActions.LEAD_ASSIGNED,
        targetType: "lead",
        targetId: lead.id,
        details: {
          lead_name: lead.name,
          lead_email: lead.email,
          assigned_to_facility_id: selectedFacilityId,
          assigned_to_facility_name: selectedFacility?.name,
          override_reason: overrideReason,
          previous_qualified: lead.qualified,
          previous_assignment_status: lead.assignment_status,
          manual_override: true,
        },
      });

      queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
      queryClient.invalidateQueries({ queryKey: ["admin-leads-count"] });
      queryClient.invalidateQueries({ queryKey: ["admin-blocked-leads-count"] });

      toast.success("Lead routed successfully", {
        description: `Lead assigned to ${selectedFacility?.name}. Provider has been notified.`,
      });

      resetAndClose();
    } catch (error) {
      console.error("Error routing lead:", error);
      toast.error("Failed to route lead");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setAction(null);
    setSelectedFacilityId("");
    setOverrideReason("");
    onOpenChange(false);
  };

  if (!lead) return null;

  const isBlocked = !lead.qualified || lead.assignment_status === "unqualified_not_routed";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Override Lead Status
          </DialogTitle>
          <DialogDescription>
            Manually override qualification status or route this lead to a provider.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Lead Summary */}
          <div className="p-3 rounded-lg bg-muted/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">{lead.name}</span>
              {isBlocked ? (
                <Badge variant="destructive" className="text-xs">Blocked</Badge>
              ) : lead.qualified ? (
                <Badge variant="default" className="text-xs bg-green-600">Qualified</Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">Pending</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{lead.email}</p>
            {lead.qualification_reason && (
              <p className="text-xs text-muted-foreground italic">
                Reason: {lead.qualification_reason}
              </p>
            )}
          </div>

          <Separator />

          {/* Action Selection */}
          {!action && (
            <div className="space-y-3">
              <Label>Select Action</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => setAction("qualify")}
                >
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium">Qualify Lead</span>
                  <span className="text-xs text-muted-foreground text-center">
                    Mark as qualified without routing
                  </span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => setAction("route")}
                >
                  <Send className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">Qualify & Route</span>
                  <span className="text-xs text-muted-foreground text-center">
                    Assign to a specific provider
                  </span>
                </Button>
              </div>
            </div>
          )}

          {/* Qualify Action */}
          {action === "qualify" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-medium">Qualify Lead</span>
              </div>
              
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
                <div className="flex gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p>
                    This will override the automatic qualification checks and mark the lead as valid.
                    The lead will be available for routing.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="qualify-reason">Override Reason *</Label>
                <Textarea
                  id="qualify-reason"
                  placeholder="Explain why this lead should be qualified despite failing checks..."
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
            </div>
          )}

          {/* Route Action */}
          {action === "route" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <Send className="h-4 w-4 text-blue-600" />
                <span className="font-medium">Qualify & Route to Provider</span>
              </div>

              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
                <div className="flex gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p>
                    This will override qualification checks AND assign the lead to a provider.
                    The lead will count toward the provider's monthly cap.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="facility-select">Select Provider *</Label>
                <Select value={selectedFacilityId} onValueChange={setSelectedFacilityId}>
                  <SelectTrigger id="facility-select">
                    <SelectValue placeholder="Choose a provider..." />
                  </SelectTrigger>
                  <SelectContent>
                    {facilities?.map((facility) => (
                      <SelectItem key={facility.id} value={facility.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span>{facility.name}</span>
                          <span className="text-muted-foreground">
                            ({facility.city}, {facility.state})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="route-reason">Override Reason *</Label>
                <Textarea
                  id="route-reason"
                  placeholder="Explain why this lead should be routed to this provider..."
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {action && (
            <Button variant="ghost" onClick={() => setAction(null)} disabled={isSubmitting}>
              Back
            </Button>
          )}
          <Button variant="outline" onClick={resetAndClose} disabled={isSubmitting}>
            Cancel
          </Button>
          {action === "qualify" && (
            <Button 
              onClick={handleQualifyLead} 
              disabled={isSubmitting || !overrideReason.trim()}
            >
              {isSubmitting ? "Qualifying..." : "Qualify Lead"}
            </Button>
          )}
          {action === "route" && (
            <Button 
              onClick={handleRouteLead}
              disabled={isSubmitting || !selectedFacilityId || !overrideReason.trim()}
            >
              {isSubmitting ? "Routing..." : "Qualify & Route"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

LeadOverrideDialog.displayName = "LeadOverrideDialog";
