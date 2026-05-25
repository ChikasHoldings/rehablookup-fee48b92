import { useState, forwardRef } from "react";
import { Flag, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ReportImageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facilityId: string;
  imageUrl: string;
  imageType: "logo" | "gallery";
}

const REPORT_REASONS = [
  { value: "inappropriate", label: "Inappropriate content", description: "Contains nudity, violence, or offensive material" },
  { value: "misleading", label: "Misleading or fake", description: "Image doesn't represent the actual facility" },
  { value: "low_quality", label: "Low quality", description: "Blurry, distorted, or unprofessional" },
  { value: "copyright", label: "Copyright violation", description: "Uses copyrighted material without permission" },
  { value: "other", label: "Other", description: "Another issue not listed above" },
];

export const ReportImageDialog = forwardRef<HTMLDivElement, ReportImageDialogProps>(
  function ReportImageDialog({ open, onOpenChange, facilityId, imageUrl, imageType }, ref) {
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason) {
      toast.error("Please select a reason for reporting");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("report-image", {
        body: {
          facility_id: facilityId,
          image_url: imageUrl,
          image_type: imageType,
          reason,
          details: details.trim() || null,
        },
      });

      if (error) throw error;

      toast.success("Report submitted", {
        description: "Thank you for helping us maintain quality. We'll review this image.",
      });
      onOpenChange(false);
      setReason("");
      setDetails("");
    } catch (error) {
      console.error("Failed to report image:", error);
      toast.error("Failed to submit report", {
        description: error instanceof Error ? error.message : "Please try again later",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent ref={ref} className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-destructive" />
            Report Image
          </DialogTitle>
          <DialogDescription>
            Help us maintain quality by reporting inappropriate or misleading images.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image Preview */}
          <div className="relative aspect-video rounded-lg overflow-hidden bg-muted border">
            <img
              src={imageUrl}
              alt="Facility image being reported for review"
              className="w-full h-full object-contain"
            />
          </div>

          {/* Reason Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Why are you reporting this image?</Label>
            <RadioGroup value={reason} onValueChange={setReason}>
              {REPORT_REASONS.map((option) => (
                <div
                  key={option.value}
                  className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                    reason === option.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/30"
                  }`}
                  onClick={() => setReason(option.value)}
                >
                  <RadioGroupItem value={option.value} id={option.value} className="mt-0.5" />
                  <div className="flex-1">
                    <Label htmlFor={option.value} className="font-medium cursor-pointer">
                      {option.label}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {option.description}
                    </p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Additional Details */}
          {reason && (
            <div className="space-y-2">
              <Label htmlFor="details" className="text-sm font-medium">
                Additional details (optional)
              </Label>
              <Textarea
                id="details"
                placeholder="Provide any additional context..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={2}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">
                {details.length}/500
              </p>
            </div>
          )}

          {/* Info Notice */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Reports are reviewed by our team. False reports may result in action against your account.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSubmit}
              disabled={!reason || isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit Report"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

ReportImageDialog.displayName = "ReportImageDialog";
