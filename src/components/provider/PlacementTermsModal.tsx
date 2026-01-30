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
import { Separator } from "@/components/ui/separator";
import { Loader2, FileSignature, Scale } from "lucide-react";
import { format } from "date-fns";

const TERMS_VERSION = "1.0";
const EFFECTIVE_DATE = "January 1, 2025";

interface AgreementSection {
  title: string;
  content: string[];
}

const AGREEMENT_SECTIONS: AgreementSection[] = [
  {
    title: "1. Definitions",
    content: [
      '"Network" refers to the Placement Network operated by RehabLookup.',
      '"Provider" refers to the treatment facility entering into this Agreement.',
      '"Placement" refers to a confirmed patient admission resulting from a Network referral.',
      '"Seeker" refers to a family or individual seeking treatment through the Network.',
      '"Introduction" refers to a matched referral sent from the Network to the Provider.',
    ],
  },
  {
    title: "2. Fee Structure",
    content: [
      "Provider agrees to pay one of the following fees upon confirmed placement:",
      "",
      "Flat Fee Option:",
      "• Standard Rate: $1,200 per placement",
      "• Pro Subscriber Rate: $960 per placement (20% discount)",
      "",
      "Commission Option:",
      "• Standard Rate: 8% of first month's treatment cost",
      "• Pro Subscriber Rate: 6.4% of first month's treatment cost",
      "• Maximum Cap: $1,500 per placement regardless of treatment cost",
      "",
      "Provider may select their preferred fee arrangement in their Network profile settings. The Network reserves the right to modify fee structures with 30 days written notice to all participating Providers.",
    ],
  },
  {
    title: "3. Payment Terms",
    content: [
      "3.1. Fees are due upon placement confirmation by both the Seeker and Provider.",
      "3.2. Payment will be automatically charged to Provider's saved payment method within 3 business days of placement confirmation.",
      "3.3. If no valid payment method is available, an invoice will be issued with Net 14 payment terms.",
      "3.4. Late payments (beyond 14 days) may incur a 1.5% monthly interest charge.",
      "3.5. Accounts with outstanding balances exceeding 30 days may be suspended from receiving new Introductions.",
      "3.6. Provider is responsible for maintaining a valid payment method on file.",
    ],
  },
  {
    title: "4. Placement Confirmation Process",
    content: [
      "4.1. A placement is considered confirmed when all of the following occur:",
      "   (a) The patient is physically admitted to the facility",
      "   (b) The Seeker confirms the admission through the Network platform",
      "   (c) The Provider confirms the admission through the Network platform",
      "   (d) The admission date is documented in the system",
      "",
      "4.2. Provider must confirm placements within 48 hours of patient admission.",
      "4.3. Failure to confirm within 48 hours may result in automatic confirmation based on Seeker's report.",
      "4.4. Disputes regarding placement confirmation must be submitted within 7 calendar days.",
    ],
  },
  {
    title: "5. Refund and Dispute Policy",
    content: [
      "5.1. Early Departure: If a patient leaves treatment within 72 hours of admission, Provider may request a fee waiver by submitting documentation within 7 days.",
      "5.2. Fee waivers are reviewed on a case-by-case basis and are not guaranteed.",
      "5.3. Factors considered for fee waivers include: reason for departure, documentation provided, and Provider's history with the Network.",
      "5.4. The Network's decision on fee waiver requests is final.",
      "5.5. No refunds will be issued for placements where the patient remained in treatment beyond 72 hours.",
    ],
  },
  {
    title: "6. Provider Obligations",
    content: [
      "Provider agrees to:",
      "• Respond to all Introductions within 24 hours",
      "• Maintain accurate and up-to-date availability status",
      "• Provide honest assessments of patient fit and treatment appropriateness",
      "• Uphold ethical treatment practices and industry standards",
      "• Maintain all required licenses, certifications, and accreditations",
      "• Immediately notify the Network of any changes to licensure status",
      "• Treat all Seekers with respect and professionalism",
      "• Not directly solicit Seekers outside of the Network platform for referrals received through the Network",
    ],
  },
  {
    title: "7. Network Rights and Responsibilities",
    content: [
      "The Network reserves the right to:",
      "• Remove Providers who violate these terms or engage in unethical practices",
      "• Adjust matching algorithms based on Provider performance metrics",
      "• Modify fee structures with 30 days advance notice",
      "• Suspend Providers with unresolved payment issues",
      "• Request documentation to verify facility credentials",
      "",
      "The Network agrees to:",
      "• Pre-screen Seekers for treatment readiness",
      "• Provide accurate information about Seeker needs and preferences",
      "• Process payments and invoices in a timely manner",
      "• Provide support for platform-related issues",
    ],
  },
  {
    title: "8. Confidentiality and HIPAA Compliance",
    content: [
      "8.1. Provider agrees to maintain confidentiality of all patient information shared through the Network in accordance with HIPAA regulations.",
      "8.2. Provider shall implement appropriate administrative, physical, and technical safeguards to protect patient information.",
      "8.3. Provider shall immediately notify the Network of any suspected or actual breach of patient information.",
      "8.4. Provider acknowledges that Seeker information is provided solely for the purpose of evaluating treatment fit and facilitating admissions.",
    ],
  },
  {
    title: "9. Term and Termination",
    content: [
      "9.1. This Agreement remains in effect while Provider actively participates in the Network.",
      "9.2. Either party may terminate participation with 30 days written notice.",
      "9.3. The Network may immediately terminate Provider participation for:",
      "   • Violation of these terms",
      "   • Loss of required licensure",
      "   • Substantiated complaints of unethical conduct",
      "   • Fraud or misrepresentation",
      "9.4. Upon termination, Provider remains responsible for fees on any confirmed placements.",
      "9.5. Termination does not release Provider from payment obligations incurred prior to termination.",
    ],
  },
  {
    title: "10. Limitation of Liability",
    content: [
      "10.1. The Network provides matching and referral services only. Provider maintains full responsibility for:",
      "   • All clinical decisions",
      "   • Treatment quality and outcomes",
      "   • Patient safety and care",
      "   • Compliance with applicable laws and regulations",
      "",
      "10.2. The Network makes no guarantees regarding the number of Introductions or placements.",
      "10.3. The Network is not liable for any claims arising from Provider's treatment of patients.",
      "10.4. In no event shall the Network's liability exceed the fees paid by Provider in the 12 months preceding the claim.",
    ],
  },
  {
    title: "11. Amendments",
    content: [
      "11.1. The Network may amend these terms with 30 days notice to Provider.",
      "11.2. Continued participation after the notice period constitutes acceptance of amended terms.",
      "11.3. Provider may terminate participation if they do not accept amended terms.",
    ],
  },
  {
    title: "12. Governing Law",
    content: [
      "This Agreement shall be governed by and construed in accordance with applicable federal laws and the laws of the state in which the Network is headquartered, without regard to conflicts of law principles.",
    ],
  },
];

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
      toast.success("Placement Network Agreement accepted");
      onOpenChange(false);
      setAgreed(false);
      setSignatureName("");
      onSuccess?.();
    },
    onError: () => {
      toast.error("Failed to accept agreement");
    },
  });

  const canSubmit = agreed && signatureName.trim().length >= 2;

  const handleClose = () => {
    setAgreed(false);
    setSignatureName("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Scale className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg">Placement Network Agreement</DialogTitle>
              <DialogDescription>
                Version {TERMS_VERSION} • Effective {EFFECTIVE_DATE}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[400px]">
          <div className="p-6 space-y-6">
            {/* Preamble */}
            <div className="text-sm text-muted-foreground leading-relaxed">
              <p>
                This Placement Network Agreement ("Agreement") is entered into between{" "}
                <strong className="text-foreground">{facilityName}</strong> ("Provider") 
                and the Placement Network operated by RehabLookup ("Network").
              </p>
              <p className="mt-3">
                By signing below, Provider agrees to participate in the Network and 
                abide by all terms and conditions set forth in this Agreement.
              </p>
            </div>

            <Separator />

            {/* Agreement Sections */}
            {AGREEMENT_SECTIONS.map((section, index) => (
              <div key={index} className="space-y-2">
                <h3 className="font-semibold text-foreground text-sm">
                  {section.title}
                </h3>
                <div className="text-sm text-muted-foreground leading-relaxed space-y-1">
                  {section.content.map((paragraph, pIndex) => (
                    <p key={pIndex} className={paragraph === "" ? "h-2" : ""}>
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            ))}

            <Separator />

            {/* Signature Block */}
            <div className="text-sm text-muted-foreground">
              <p>
                By signing below, Provider acknowledges that they have read, understood, 
                and agree to be bound by all terms and conditions of this Agreement.
              </p>
            </div>
          </div>
        </ScrollArea>

        <div className="p-6 pt-4 border-t bg-muted/30 space-y-4">
          {/* Agreement Checkbox */}
          <Label
            htmlFor="agree-checkbox"
            className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors"
          >
            <Checkbox
              id="agree-checkbox"
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked === true)}
              className="mt-0.5"
            />
            <span className="text-sm leading-relaxed">
              I have read and agree to the Placement Network Agreement on behalf of{" "}
              <strong>{facilityName}</strong>. I am authorized to enter into this 
              agreement on behalf of the facility.
            </span>
          </Label>

          {/* Digital Signature */}
          <div className="space-y-2">
            <Label htmlFor="signature" className="text-sm font-medium">
              Digital Signature
            </Label>
            <Input
              id="signature"
              placeholder="Type your full legal name"
              value={signatureName}
              onChange={(e) => setSignatureName(e.target.value)}
              className="font-medium"
            />
            <p className="text-xs text-muted-foreground">
              By typing your name above, you acknowledge this constitutes a legally 
              binding electronic signature under applicable law. 
              Date: {format(new Date(), "MMMM d, yyyy")}
            </p>
          </div>
        </div>

        <DialogFooter className="p-6 pt-0 bg-muted/30">
          <Button variant="outline" onClick={handleClose}>
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
            Sign Agreement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
