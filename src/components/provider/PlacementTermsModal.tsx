import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, FileSignature, Shield, AlertCircle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

const TERMS_VERSION = "1.0";

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

  // Fetch current agreement status
  const { data: agreementData, isLoading: isLoadingAgreement } = useQuery({
    queryKey: ["facility-agreement", facilityId],
    queryFn: async () => {
      if (!facilityId) return null;
      const { data, error } = await supabase
        .from("facilities")
        .select("concierge_terms_accepted_at, concierge_terms_version, concierge_terms_accepted_by")
        .eq("id", facilityId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!facilityId && open,
  });

  const isAlreadySigned = !!agreementData?.concierge_terms_accepted_at;

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
      queryClient.invalidateQueries({ queryKey: ["facility-agreement", facilityId] });
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
      <DialogContent className="max-w-3xl w-[95vw] sm:w-full h-[90vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b bg-muted/30 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">Placement Network Agreement</DialogTitle>
              <DialogDescription className="mt-0.5">
                Version {TERMS_VERSION} • {isAlreadySigned ? "Signed" : "Please review carefully before accepting"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Agreement Content - Main Focus */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 py-5">
            <div className="prose prose-sm max-w-none text-foreground">
              {/* Introduction */}
              <div className="mb-6 p-4 bg-muted/50 rounded-lg border">
                <p className="text-sm text-muted-foreground m-0">
                  This Placement Network Agreement ("Agreement") is entered into between the Treatment Facility ("Provider") and the Placement Network operated by this platform ("Network"). By accepting this agreement, you agree to participate in the Network and comply with all terms outlined below.
                </p>
              </div>

              {/* Section 1 */}
              <section className="mb-6">
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">1</span>
                  Placement Fee Structure
                </h3>
                <div className="pl-8 space-y-3">
                  <p className="text-sm text-muted-foreground">Provider agrees to pay the following flat fee upon confirmed placement:</p>
                  
                  <div className="p-3 bg-muted/30 rounded-lg border">
                    <h4 className="font-medium text-sm mb-2">Domestic Placements</h4>
                    <p className="text-xs text-muted-foreground mb-2">US-based individuals and families seeking treatment</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-none pl-0 m-0 mb-0">
                      <li>• Standard Rate: <strong className="text-foreground">$1,000</strong> per placement</li>
                      <li>• Pro Subscribers: <strong className="text-foreground">$800</strong> per placement (20% discount)</li>
                    </ul>
                  </div>

                  <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                    <h4 className="font-medium text-sm mb-2 text-primary">International Placements</h4>
                    <p className="text-xs text-muted-foreground mb-2">Global clients seeking treatment in the United States</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-none pl-0 m-0 mb-0">
                      <li>• Standard Rate: <strong className="text-foreground">$3,000</strong> per placement</li>
                      <li>• Pro Subscribers: <strong className="text-foreground">$2,400</strong> per placement (20% discount)</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Section 2 */}
              <section className="mb-6">
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">2</span>
                  Payment Terms
                </h3>
                <div className="pl-8">
                  <ul className="text-sm text-muted-foreground space-y-2 list-none pl-0 m-0">
                    <li className="flex gap-2">
                      <span className="text-primary">a.</span>
                      Fees are due upon placement confirmation by both parties
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">b.</span>
                      Payment will be automatically charged to Provider's saved payment method
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">c.</span>
                      If no payment method is available, an invoice will be issued with Net 14 terms
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">d.</span>
                      Late payments may incur additional fees and suspension from the network
                    </li>
                  </ul>
                </div>
              </section>

              {/* Section 3 */}
              <section className="mb-6">
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">3</span>
                  Placement Confirmation
                </h3>
                <div className="pl-8 space-y-3">
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">A placement is considered confirmed when:</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-none pl-0 m-0">
                      <li>• The patient is admitted to the facility</li>
                      <li>• Both the family and Provider confirm the admission</li>
                      <li>• The admission date is documented</li>
                    </ul>
                  </div>
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <p className="text-sm text-amber-700 dark:text-amber-400 m-0 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      Provider must report placements within 48 hours of admission
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 4 */}
              <section className="mb-6">
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">4</span>
                  Refund Policy
                </h3>
                <div className="pl-8">
                  <ul className="text-sm text-muted-foreground space-y-2 list-none pl-0 m-0">
                    <li className="flex gap-2">
                      <span className="text-primary">a.</span>
                      If a patient leaves within 72 hours of admission, Provider may request a fee waiver
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">b.</span>
                      Fee waivers are subject to review and approval
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">c.</span>
                      Disputes must be submitted within 7 days of placement
                    </li>
                  </ul>
                </div>
              </section>

              {/* Section 5 */}
              <section className="mb-6">
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">5</span>
                  Network Participation
                </h3>
                <div className="pl-8 space-y-4">
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">Provider agrees to:</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-none pl-0 m-0">
                      <li>• Respond to introductions within 24 hours</li>
                      <li>• Maintain accurate availability status</li>
                      <li>• Provide honest assessments of patient fit</li>
                      <li>• Uphold ethical treatment practices</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">Network reserves the right to:</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-none pl-0 m-0">
                      <li>• Remove Providers who violate terms</li>
                      <li>• Adjust matching algorithms based on performance</li>
                      <li>• Modify fee structures with 30 days notice</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Section 6 */}
              <section className="mb-6">
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">6</span>
                  Confidentiality
                </h3>
                <div className="pl-8">
                  <p className="text-sm text-muted-foreground m-0">
                    Provider agrees to maintain confidentiality of all patient information shared through the network in accordance with HIPAA regulations. Any breach of patient confidentiality may result in immediate termination from the network and potential legal action.
                  </p>
                </div>
              </section>

              {/* Section 7 */}
              <section className="mb-6">
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">7</span>
                  Term and Termination
                </h3>
                <div className="pl-8">
                  <p className="text-sm text-muted-foreground m-0">
                    This Agreement remains in effect while Provider participates in the network. Either party may terminate with 30 days written notice. Outstanding fees remain due upon termination.
                  </p>
                </div>
              </section>

              {/* Section 8 */}
              <section className="mb-4">
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">8</span>
                  Limitation of Liability
                </h3>
                <div className="pl-8">
                  <p className="text-sm text-muted-foreground m-0">
                    Network provides placement services only. Provider maintains full responsibility for clinical decisions, treatment quality, and patient outcomes. Network shall not be liable for any claims arising from treatment provided by Provider.
                  </p>
                </div>
              </section>
            </div>
          </div>
        </ScrollArea>

        {/* Footer - Show signed status OR acceptance form */}
        <div className="border-t bg-muted/20 px-6 py-4 flex-shrink-0">
          {isLoadingAgreement ? (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : isAlreadySigned ? (
            // Already Signed View
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    Agreement Signed
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Signed on {format(new Date(agreementData.concierge_terms_accepted_at), "MMM d, yyyy 'at' h:mm a")}
                    {agreementData.concierge_terms_version && ` • Version ${agreementData.concierge_terms_version}`}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          ) : (
            // Acceptance Form
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                <Checkbox
                  checked={agreed}
                  onCheckedChange={(checked) => setAgreed(checked === true)}
                  className="flex-shrink-0"
                />
                <span className="text-sm text-muted-foreground">
                  I agree on behalf of <strong className="text-foreground">{facilityName}</strong>
                </span>
              </label>
              
              <div className="flex items-center gap-3 sm:flex-shrink-0">
                <Input
                  placeholder="Type your full name"
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  className="w-48 h-9 text-sm"
                />
                <Button
                  size="sm"
                  onClick={() => acceptTermsMutation.mutate()}
                  disabled={!canSubmit || acceptTermsMutation.isPending}
                  className="h-9"
                >
                  {acceptTermsMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileSignature className="h-4 w-4 mr-1.5" />
                  )}
                  Sign
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
