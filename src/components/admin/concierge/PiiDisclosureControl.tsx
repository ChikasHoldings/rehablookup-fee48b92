import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Eye,
  EyeOff,
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Lock,
  Unlock,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Introduction {
  id: string;
  facility_id: string;
  inquiry_id: string;
  provider_response: string | null;
  admin_disclosed_pii_at: string | null;
  pii_disclosure_level: string | null;
  pii_disclosure_expires_at: string | null;
  admission_report_deadline: string | null;
  provider_admission_reported: boolean;
  bypass_flag: boolean;
  facility?: { id: string; name: string; placement_network_standing: string; placement_compliance_score: number };
}

interface PiiDisclosureControlProps {
  caseId: string;
  introductions: Introduction[];
  onRefresh: () => void;
}

const DISCLOSURE_LEVELS = [
  { value: "none", label: "No PII", icon: EyeOff, description: "First name only, clinical summary" },
  { value: "partial", label: "Partial PII", icon: Eye, description: "Full name + phone (no email/insurance details)" },
  { value: "full", label: "Full PII", icon: Unlock, description: "All contact details, insurance, emergency contacts" },
];

export function PiiDisclosureControl({ caseId, introductions, onRefresh }: PiiDisclosureControlProps) {
  const queryClient = useQueryClient();
  const [selectedLevel, setSelectedLevel] = useState<string>("full");
  const [reason, setReason] = useState("");

  const discloseMutation = useMutation({
    mutationFn: async ({ introId, level }: { introId: string; level: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
      const reportDeadline = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours

      const { error } = await supabase
        .from("concierge_introductions")
        .update({
          admin_disclosed_pii_at: now.toISOString(),
          disclosed_by_admin_user_id: user.id,
          pii_disclosure_level: level,
          pii_disclosure_expires_at: expiresAt.toISOString(),
          pii_disclosure_reason: reason || null,
          admission_report_deadline: reportDeadline.toISOString(),
        })
        .eq("id", introId);

      if (error) throw error;

      // Log the event
      await supabase.from("concierge_case_events").insert({
        inquiry_id: caseId,
        event_type: "pii_disclosed",
        event_data: {
          introduction_id: introId,
          disclosure_level: level,
          expires_at: expiresAt.toISOString(),
          report_deadline: reportDeadline.toISOString(),
          reason: reason || null,
        },
        actor_id: user.id,
        actor_type: "super_admin",
      });

      // Create audit log
      await supabase.from("admin_audit_log").insert({
        admin_user_id: user.id,
        action_type: "pii_disclosure",
        target_type: "concierge_introduction",
        target_id: introId,
        details: { reason: `PII disclosed (${level}) for concierge case ${caseId}` },
      });
    },
    onSuccess: () => {
      toast.success("PII disclosed to provider. 48h admission report deadline set.");
      setReason("");
      onRefresh();
      queryClient.invalidateQueries({ queryKey: ["admin-case-detail"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const revokeMutation = useMutation({
    mutationFn: async (introId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("concierge_introductions")
        .update({
          pii_disclosure_level: "none",
          pii_disclosure_expires_at: new Date().toISOString(), // Expired immediately
        })
        .eq("id", introId);

      if (error) throw error;

      await supabase.from("concierge_case_events").insert({
        inquiry_id: caseId,
        event_type: "pii_revoked",
        event_data: { introduction_id: introId },
        actor_id: user.id,
        actor_type: "super_admin",
      });
    },
    onSuccess: () => {
      toast.success("PII access revoked");
      onRefresh();
    },
    onError: (e) => toast.error(e.message),
  });

  const acceptedIntros = introductions.filter(i => i.provider_response === "interested");

  if (acceptedIntros.length === 0) {
    return (
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lock className="h-4 w-4" />
            PII Disclosure Control
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <p className="text-xs text-muted-foreground">
            No providers have accepted this case yet. PII can only be disclosed after acceptance.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="h-4 w-4" />
          PII Disclosure Control
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Control what client information providers can see. Disclosure triggers a 48h admission report deadline.
        </p>
      </CardHeader>
      <CardContent className="py-2 space-y-3">
        {acceptedIntros.map(intro => {
          const facility = intro.facility as any;
          const isDisclosed = !!intro.admin_disclosed_pii_at;
          const isExpired = intro.pii_disclosure_expires_at && new Date(intro.pii_disclosure_expires_at) < new Date();
          const hasReported = intro.provider_admission_reported;
          const isBypassed = intro.bypass_flag;
          const deadlinePassed = intro.admission_report_deadline && new Date(intro.admission_report_deadline) < new Date();

          return (
            <div
              key={intro.id}
              className={cn(
                "rounded-lg border p-3 space-y-2",
                isBypassed && "border-red-300 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20",
                hasReported && "border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{facility?.name || "Unknown"}</span>
                  {facility?.placement_network_standing && facility.placement_network_standing !== "good" && (
                    <Badge variant="destructive" className="text-[10px]">
                      {facility.placement_network_standing}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {isDisclosed && !isExpired && (
                    <Badge className="text-[10px] bg-amber-100 text-amber-800">
                      <Eye className="h-2.5 w-2.5 mr-1" />
                      {intro.pii_disclosure_level || "full"} access
                    </Badge>
                  )}
                  {isExpired && (
                    <Badge className="text-[10px] bg-gray-100 text-gray-600">Expired</Badge>
                  )}
                  {hasReported && (
                    <Badge className="text-[10px] bg-emerald-100 text-emerald-800">
                      <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> Reported
                    </Badge>
                  )}
                  {isBypassed && (
                    <Badge variant="destructive" className="text-[10px]">
                      <AlertTriangle className="h-2.5 w-2.5 mr-1" /> Bypass Flag
                    </Badge>
                  )}
                </div>
              </div>

              {/* Status details */}
              {isDisclosed && (
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <p>Disclosed: {format(new Date(intro.admin_disclosed_pii_at!), "MMM d, h:mm a")}</p>
                  {intro.admission_report_deadline && (
                    <p className={cn(deadlinePassed && !hasReported ? "text-red-600 font-medium" : "")}>
                      Report deadline: {format(new Date(intro.admission_report_deadline), "MMM d, h:mm a")}
                      {deadlinePassed && !hasReported && " (OVERDUE)"}
                    </p>
                  )}
                  {intro.pii_disclosure_expires_at && (
                    <p>Access expires: {format(new Date(intro.pii_disclosure_expires_at), "MMM d, h:mm a")}</p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                {!isDisclosed && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" className="h-7 text-xs gap-1">
                        <Unlock className="h-3 w-3" /> Disclose PII
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Disclose Client PII to {facility?.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will share client contact details with the provider. A 48-hour admission report deadline will be enforced.
                          The provider's compliance score is {facility?.placement_compliance_score || 100}/100.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="space-y-3 py-2">
                        <div>
                          <label className="text-sm font-medium">Disclosure Level</label>
                          <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DISCLOSURE_LEVELS.filter(l => l.value !== "none").map(l => (
                                <SelectItem key={l.value} value={l.value}>
                                  <div className="flex items-center gap-2">
                                    <l.icon className="h-3.5 w-3.5" />
                                    <span>{l.label}</span>
                                    <span className="text-muted-foreground text-xs">— {l.description}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Reason (optional)</label>
                          <Textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="e.g., Provider confirmed bed availability, insurance verified..."
                            className="mt-1"
                            rows={2}
                          />
                        </div>
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => discloseMutation.mutate({ introId: intro.id, level: selectedLevel })}
                          disabled={discloseMutation.isPending}
                        >
                          {discloseMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                          Disclose & Set Deadline
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                {isDisclosed && !isExpired && !hasReported && (
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-7 text-xs gap-1"
                    onClick={() => revokeMutation.mutate(intro.id)}
                    disabled={revokeMutation.isPending}
                  >
                    <EyeOff className="h-3 w-3" /> Revoke Access
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
