import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Loader2 } from "lucide-react";

interface Facility {
  id: string;
  name: string;
  city: string;
  state: string;
}

interface ConfirmAdmissionModalProps {
  open: boolean;
  onClose: () => void;
  inquiryId: string;
  facilities: Facility[];
  onConfirmed: () => void;
}

export function ConfirmAdmissionModal({
  open,
  onClose,
  inquiryId,
  facilities,
  onConfirmed,
}: ConfirmAdmissionModalProps) {
  const { toast } = useToast();
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>("");
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!selectedFacilityId || !confirmed) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("confirm-placement", {
        body: {
          inquiryId,
          facilityId: selectedFacilityId,
          confirmationType: "seeker",
        },
      });

      if (error) throw error;

      if (data?.fullyConfirmed) {
        toast({
          title: "Placement Confirmed! 🎉",
          description: "Both you and the facility have confirmed. Congratulations!",
        });
      } else {
        toast({
          title: "Confirmation Recorded",
          description: "We're waiting for the facility to confirm your admission.",
        });
      }

      onConfirmed();
    } catch (error) {
      console.error("Confirmation error:", error);
      toast({
        title: "Confirmation Failed",
        description: "There was an error confirming your admission. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedFacility = facilities.find(f => f.id === selectedFacilityId);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Confirm Your Admission
          </DialogTitle>
          <DialogDescription>
            Select the facility you've been admitted to and confirm your placement.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Facility Selection */}
          <div className="space-y-2">
            <Label htmlFor="facility">Which facility were you admitted to?</Label>
            <Select value={selectedFacilityId} onValueChange={setSelectedFacilityId}>
              <SelectTrigger id="facility">
                <SelectValue placeholder="Select a facility" />
              </SelectTrigger>
              <SelectContent>
                {facilities.map((facility) => (
                  <SelectItem key={facility.id} value={facility.id}>
                    {facility.name} - {facility.city}, {facility.state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Confirmation Checkbox */}
          {selectedFacilityId && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <Checkbox
                id="confirm"
                checked={confirmed}
                onCheckedChange={(checked) => setConfirmed(checked === true)}
              />
              <Label htmlFor="confirm" className="text-sm leading-relaxed cursor-pointer">
                I confirm that I have been admitted to <strong>{selectedFacility?.name}</strong> and 
                authorize RehabLookup to record this placement.
              </Label>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!selectedFacilityId || !confirmed || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Confirming...
              </>
            ) : (
              "Confirm Admission"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
