import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RotateCcw, Gift, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ManageLeadCapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facility: {
    id: string;
    name: string;
    user_id: string;
    bonus_leads?: number;
    leads_reset_at?: string | null;
  } | null;
  currentUsage?: {
    usedLeads: number;
    leadLimit: number;
  };
}

export function ManageLeadCapDialog({
  open,
  onOpenChange,
  facility,
  currentUsage,
}: ManageLeadCapDialogProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"reset" | "bonus">("reset");
  const [bonusLeads, setBonusLeads] = useState("10");

  const resetLeadCount = useMutation({
    mutationFn: async () => {
      if (!facility) throw new Error("No facility selected");

      const now = new Date().toISOString();
      
      // Update the facility with new reset timestamp
      const { error } = await supabase
        .from("facilities")
        .update({ 
          leads_reset_at: now,
          bonus_leads: 0 // Reset bonus leads too
        })
        .eq("id", facility.id);

      if (error) throw error;

      // Log admin action
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        await supabase.from("admin_audit_log").insert({
          admin_user_id: user.id,
          action_type: "reset_lead_count",
          target_type: "facility",
          target_id: facility.id,
          details: {
            facility_name: facility.name,
            previous_usage: currentUsage?.usedLeads,
            reset_at: now,
          },
        });
      }

      // Send notification to provider
      await supabase.from("provider_notifications").insert({
        user_id: facility.user_id,
        facility_id: facility.id,
        type: "lead_cap",
        title: "Monthly Lead Count Reset",
        message: "Your monthly lead count has been reset by an administrator. You can now receive new leads.",
        metadata: { action: "reset" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-lead-cap-monitor"] });
      queryClient.invalidateQueries({ queryKey: ["admin-providers"] });
      toast.success("Lead count reset successfully");
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Failed to reset lead count:", error);
      toast.error("Failed to reset lead count");
    },
  });

  const grantBonusLeads = useMutation({
    mutationFn: async () => {
      if (!facility) throw new Error("No facility selected");
      
      const bonus = parseInt(bonusLeads, 10);
      if (isNaN(bonus) || bonus <= 0) throw new Error("Invalid bonus amount");

      const currentBonus = facility.bonus_leads || 0;
      const newBonus = currentBonus + bonus;

      // Update bonus leads
      const { error } = await supabase
        .from("facilities")
        .update({ bonus_leads: newBonus })
        .eq("id", facility.id);

      if (error) throw error;

      // Log admin action
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        await supabase.from("admin_audit_log").insert({
          admin_user_id: user.id,
          action_type: "grant_bonus_leads",
          target_type: "facility",
          target_id: facility.id,
          details: {
            facility_name: facility.name,
            bonus_granted: bonus,
            new_total_bonus: newBonus,
          },
        });
      }

      // Send notification to provider
      await supabase.from("provider_notifications").insert({
        user_id: facility.user_id,
        facility_id: facility.id,
        type: "lead_cap",
        title: "Bonus Leads Granted",
        message: `You've been granted ${bonus} bonus leads! Your effective lead limit has been increased.`,
        metadata: { action: "bonus", amount: bonus },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-lead-cap-monitor"] });
      queryClient.invalidateQueries({ queryKey: ["admin-providers"] });
      toast.success(`Granted ${bonusLeads} bonus leads`);
      onOpenChange(false);
      setBonusLeads("10");
    },
    onError: (error) => {
      console.error("Failed to grant bonus leads:", error);
      toast.error("Failed to grant bonus leads");
    },
  });

  const isLoading = resetLeadCount.isPending || grantBonusLeads.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Lead Cap</DialogTitle>
          <DialogDescription>
            {facility?.name}
          </DialogDescription>
        </DialogHeader>

        {currentUsage && (
          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current Usage:</span>
              <span className="font-medium">
                {currentUsage.usedLeads} / {currentUsage.leadLimit + (facility?.bonus_leads || 0)} leads
              </span>
            </div>
            {facility?.bonus_leads ? (
              <div className="flex justify-between mt-1">
                <span className="text-muted-foreground">Bonus Leads:</span>
                <span className="font-medium text-primary">+{facility.bonus_leads}</span>
              </div>
            ) : null}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "reset" | "bonus")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="reset" className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Reset Count
            </TabsTrigger>
            <TabsTrigger value="bonus" className="gap-2">
              <Gift className="h-4 w-4" />
              Grant Bonus
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reset" className="space-y-4 pt-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This will reset the provider's monthly lead count to zero. 
                Leads received before the reset will no longer count against their limit.
                Bonus leads will also be cleared.
              </AlertDescription>
            </Alert>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button 
                onClick={() => resetLeadCount.mutate()} 
                disabled={isLoading}
                variant="destructive"
              >
                {resetLeadCount.isPending ? "Resetting..." : "Reset Lead Count"}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="bonus" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="bonus-leads">Number of Bonus Leads</Label>
              <Input
                id="bonus-leads"
                type="number"
                min="1"
                max="500"
                value={bonusLeads}
                onChange={(e) => setBonusLeads(e.target.value)}
                placeholder="Enter number of bonus leads"
              />
              <p className="text-xs text-muted-foreground">
                Bonus leads are added to the provider's monthly limit. 
                They reset at the end of the billing cycle.
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button 
                onClick={() => grantBonusLeads.mutate()} 
                disabled={isLoading || !bonusLeads || parseInt(bonusLeads, 10) <= 0}
              >
                {grantBonusLeads.isPending ? "Granting..." : `Grant ${bonusLeads} Leads`}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}