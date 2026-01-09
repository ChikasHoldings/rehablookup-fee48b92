import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, FileSignature } from "lucide-react";

const TERMS_VERSION = "1.0";

const PLACEMENT_TERMS = `
PLACEMENT NETWORK AGREEMENT

This Placement Network Agreement ("Agreement") is entered into between the Treatment Facility ("Provider") and the Placement Network operated by this platform ("Network").

1. PLACEMENT FEE STRUCTURE

Provider agrees to pay the following fees upon confirmed placement:

a) Flat Fee Option: $1,200 per placement
   - Pro Subscribers: $960 per placement (20% discount)

b) Commission Option: 8% of first month's treatment cost
   - Pro Subscribers: 6.4% of first month's treatment cost
   - Commission Cap: Maximum of $1,500 per placement

2. PAYMENT TERMS

a) Fees are due upon placement confirmation by both parties
b) Payment will be automatically charged to Provider's saved payment method
c) If no payment method is available, an invoice will be issued with Net 14 terms
d) Late payments may incur additional fees and suspension from the network

3. PLACEMENT CONFIRMATION

a) A placement is considered confirmed when:
   - The patient is admitted to the facility
   - Both the family and Provider confirm the admission
   - The admission date is documented

b) Provider must report placements within 48 hours of admission

4. REFUND POLICY

a) If a patient leaves within 72 hours of admission, Provider may request a fee waiver
b) Fee waivers are subject to review and approval
c) Disputes must be submitted within 7 days of placement

5. NETWORK PARTICIPATION

a) Provider agrees to:
   - Respond to introductions within 24 hours
   - Maintain accurate availability status
   - Provide honest assessments of patient fit
   - Uphold ethical treatment practices

b) Network reserves the right to:
   - Remove Providers who violate terms
   - Adjust matching algorithms based on performance
   - Modify fee structures with 30 days notice

6. CONFIDENTIALITY

Provider agrees to maintain confidentiality of all patient information shared through the network in accordance with HIPAA regulations.

7. TERM AND TERMINATION

This Agreement remains in effect while Provider participates in the network. Either party may terminate with 30 days written notice.

8. LIMITATION OF LIABILITY

Network provides matching services only. Provider maintains full responsibility for clinical decisions, treatment quality, and patient outcomes.

By signing below, Provider acknowledges reading, understanding, and agreeing to these terms.
`;

interface PlacementTermsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facilityId: string;
  facilityName: string;
  onSuccess?: () => void;
}

export function PlacementTermsModal({
  open,
  onOpenChange,
  facilityId,
  facilityName,
  onSuccess,
}: PlacementTermsModalProps) {
  const queryClient = useQueryClient();
  const [agreed, setAgreed] = useState(false);
  const [signatureName, setSignatureName] = useState("");

  const acceptTermsMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("facilities")
        .update({
          concierge_terms_accepted_at: new Date().toISOString(),
          concierge_terms_version: TERMS_VERSION,
          concierge_terms_accepted_by: user.id,
        })
        .eq("id", facilityId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facility-concierge"] });
      toast.success("Placement terms accepted");
      onOpenChange(false);
      setAgreed(false);
      setSignatureName("");
      onSuccess?.();
    },
    onError: () => {
      toast.error("Failed to accept terms");
    },
  });

  const canSubmit = agreed && signatureName.trim().length >= 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5" />
            Placement Network Agreement
          </DialogTitle>
          <DialogDescription>
            Please review and accept the terms to participate in the placement network
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[400px] border rounded-lg p-4 bg-muted/30">
          <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed">
            {PLACEMENT_TERMS}
          </pre>
        </ScrollArea>

        <div className="space-y-4 pt-4">
          <Label
            htmlFor="agree-checkbox"
            className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border bg-card hover:bg-muted/50"
          >
            <Checkbox
              id="agree-checkbox"
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked === true)}
              className="mt-0.5"
            />
            <span className="text-sm">
              I have read and agree to the Placement Network Agreement on behalf of{" "}
              <strong>{facilityName}</strong>
            </span>
          </Label>

          <div className="space-y-2">
            <Label htmlFor="signature">Digital Signature (Type your full name)</Label>
            <Input
              id="signature"
              placeholder="Your full name"
              value={signatureName}
              onChange={(e) => setSignatureName(e.target.value)}
              className="font-medium"
            />
            <p className="text-xs text-muted-foreground">
              By typing your name, you acknowledge this constitutes a legal electronic signature
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => acceptTermsMutation.mutate()}
            disabled={!canSubmit || acceptTermsMutation.isPending}
          >
            {acceptTermsMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileSignature className="h-4 w-4 mr-2" />
            )}
            Accept & Sign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
