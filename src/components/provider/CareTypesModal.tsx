import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, Stethoscope, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CARE_TYPES = [
  { value: "detox", label: "Detox", description: "Medical detoxification services" },
  { value: "inpatient", label: "Residential Inpatient", description: "24/7 residential treatment" },
  { value: "php", label: "Partial Hospitalization (PHP)", description: "Day treatment programs" },
  { value: "iop", label: "Intensive Outpatient (IOP)", description: "Structured outpatient care" },
  { value: "outpatient", label: "Outpatient", description: "Regular therapy sessions" },
  { value: "mat", label: "Medication-Assisted Treatment", description: "MAT programs" },
  { value: "sober_living", label: "Sober Living", description: "Transitional housing" },
];

interface CareTypesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facilityId: string;
  initialCareTypes?: string[];
}

export function CareTypesModal({
  open,
  onOpenChange,
  facilityId,
  initialCareTypes = [],
}: CareTypesModalProps) {
  const queryClient = useQueryClient();
  const [selectedTypes, setSelectedTypes] = useState<string[]>(initialCareTypes);

  useEffect(() => {
    if (open) {
      setSelectedTypes(initialCareTypes);
    }
  }, [open, initialCareTypes]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("facilities")
        .update({ concierge_accepted_care_types: selectedTypes })
        .eq("id", facilityId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facility-concierge"] });
      toast.success("Care types saved");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Failed to save care types");
    },
  });

  const toggleType = (value: string) => {
    setSelectedTypes((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Stethoscope className="h-4 w-4 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base">Accepted Care Types</DialogTitle>
              <DialogDescription className="text-xs">
                Select the types of care your facility provides
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-2 py-2">
          {CARE_TYPES.map((type) => {
            const isSelected = selectedTypes.includes(type.value);
            return (
              <div
                key={type.value}
                onClick={() => toggleType(type.value)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                  isSelected
                    ? "bg-primary/5 border-primary/30"
                    : "bg-card border-border hover:bg-muted/50"
                )}
              >
                <div
                  className={cn(
                    "h-5 w-5 rounded flex items-center justify-center border transition-colors",
                    isSelected
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-muted-foreground/30"
                  )}
                >
                  {isSelected && <Check className="h-3 w-3" />}
                </div>
                <div className="flex-1">
                  <p className={cn("text-sm font-medium", isSelected && "text-primary")}>
                    {type.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{type.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={selectedTypes.length === 0 || saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
            ) : (
              <Check className="h-3 w-3 mr-1.5" />
            )}
            Save ({selectedTypes.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
