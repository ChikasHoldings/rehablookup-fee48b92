import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Loader2, CheckCircle2, DollarSign } from "lucide-react";
import { toast } from "sonner";

interface ProviderConfirmPlacementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inquiry: {
    id: string;
    user_name: string;
    seeker_confirmed?: boolean;
  };
  facilityId: string;
  hasPro?: boolean;
}

// Fee structure
const PLACEMENT_FEES = {
  flat_fee: {
    standard: 100000, // $1,000 in cents
    pro: 80000, // $800 (20% off)
  },
};

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function ProviderConfirmPlacementModal({
  open,
  onOpenChange,
  inquiry,
  facilityId,
  hasPro = false,
}: ProviderConfirmPlacementModalProps) {
  const [admittedDate, setAdmittedDate] = useState<Date>(new Date());
  const [acknowledged, setAcknowledged] = useState(false);
  const queryClient = useQueryClient();

  const feeCents = hasPro ? PLACEMENT_FEES.flat_fee.pro : PLACEMENT_FEES.flat_fee.standard;

  const confirmMutation = useMutation({
    mutationFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("confirm-placement", {
        body: {
          inquiryId: inquiry.id,
          facilityId,
          confirmationType: "provider",
          admittedAt: admittedDate.toISOString(),
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      if (data.fullyConfirmed) {
        toast.success("Placement confirmed!", {
          description: "The placement has been confirmed by both parties. A fee invoice has been generated.",
        });
      } else {
        toast.success("Confirmation recorded", {
          description: "Waiting for patient to confirm admission.",
        });
      }
      queryClient.invalidateQueries({ queryKey: ["placement-introductions"] });
      queryClient.invalidateQueries({ queryKey: ["facility-placements"] });
      queryClient.invalidateQueries({ queryKey: ["placement-invoices"] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Failed to confirm placement", {
        description: error.message,
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            Confirm Placement
          </DialogTitle>
          <DialogDescription>
            Confirm that <strong>{inquiry.user_name}</strong> has been admitted to your facility.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Admission Date */}
          <div className="space-y-2">
            <Label>Admission Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !admittedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {admittedDate ? format(admittedDate, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={admittedDate}
                  onSelect={(date) => date && setAdmittedDate(date)}
                  disabled={(date) => date > new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Fee Summary */}
          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Placement Fee
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold">{formatCurrency(feeCents)}</span>
              {hasPro && (
                <span className="text-sm text-emerald-600 font-medium">Pro Discount Applied</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Due within 14 days of confirmation
            </p>
          </div>

          {/* Patient confirmation status */}
          {inquiry.seeker_confirmed ? (
            <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg p-3">
              <CheckCircle2 className="h-4 w-4" />
              Patient has confirmed admission
            </div>
          ) : (
            <div className="text-sm text-muted-foreground bg-muted rounded-lg p-3">
              Patient has not yet confirmed admission. Once both parties confirm, the placement will be finalized.
            </div>
          )}

          {/* Acknowledgment */}
          <div className="flex items-start gap-3 p-3 rounded-lg border">
            <Checkbox
              id="acknowledge"
              checked={acknowledged}
              onCheckedChange={(checked) => setAcknowledged(checked === true)}
            />
            <Label htmlFor="acknowledge" className="text-sm leading-relaxed cursor-pointer">
              I confirm this patient has been admitted and acknowledge that I will be charged the
              placement fee once both parties confirm.
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => confirmMutation.mutate()}
            disabled={!acknowledged || confirmMutation.isPending}
          >
            {confirmMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Placement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
