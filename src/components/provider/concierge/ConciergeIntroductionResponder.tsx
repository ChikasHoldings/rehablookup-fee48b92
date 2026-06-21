import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Handshake, CheckCircle2, XCircle, Loader2, AlertCircle,
  Shield, MapPin, Clock, User, HeartPulse, Mail, Phone,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface ConciergeIntroductionResponderProps {
  facilityId: string;
}

interface IntroCase {
  introduction_id: string;
  inquiry_id: string;
  sent_at: string | null;
  created_at: string | null;
  provider_response: string | null;
  provider_responded_at: string | null;
  response_deadline_at: string | null;
  status: string | null;
  level_of_care: string | null;
  primary_concern: string | null;
  insurance_carrier: string | null;
  payment_type: string | null;
  preferred_city: string | null;
  preferred_state: string | null;
  gender: string | null;
  age_range: string | null;
  timeline_urgency: string | null;
  pii_disclosed: boolean;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
}

const isAwaiting = (r: string | null) => r === null || r === "pending";
const titleCase = (s: string | null) => (s ? s.replace(/_/g, " ") : "—");

// get_provider_introduction_cases isn't in the generated types yet.
const supabaseRelaxed = supabase as unknown as {
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
};

/**
 * Provider self-serve queue for concierge placement introductions.
 *
 * Shows each matched case's full de-identified clinical summary in-app (via
 * the get_provider_introduction_cases RPC — same detail as the introduction
 * email) so the partner can decide without leaving the dashboard, respond
 * (interested / not available), and — once the advisor discloses or the
 * client selects them — see the client's contact details to proceed.
 */
export function ConciergeIntroductionResponder({ facilityId }: ConciergeIntroductionResponderProps) {
  const queryClient = useQueryClient();
  const [confirmDecline, setConfirmDecline] = useState<IntroCase | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const { data: cases, isLoading, isError, refetch } = useQuery({
    queryKey: ["provider-concierge-introductions", facilityId],
    queryFn: async (): Promise<IntroCase[]> => {
      const { data, error } = await supabaseRelaxed.rpc("get_provider_introduction_cases", {
        p_facility_id: facilityId,
      });
      if (error) throw error;
      return (data as IntroCase[]) ?? [];
    },
    enabled: !!facilityId,
    staleTime: 1000 * 30,
    // concierge_introductions is intentionally NOT in the realtime publication
    // (it carries seeker PII — migration 20260414131447 removed it to prevent
    // PII broadcast), so postgres_changes can never stream new introductions to
    // the provider. Poll instead so the inbox stays current without a manual
    // refresh; the provider's own response already invalidates on mutation.
    refetchInterval: 1000 * 60,
    refetchOnWindowFocus: true,
  });

  const respond = useMutation({
    mutationFn: async ({ introId, response }: { introId: string; response: "interested" | "not_available" }) => {
      setPendingId(introId);
      // .select().maybeSingle() so an RLS 0-row block (e.g. facility
      // ownership transferred, or the intro already closed) surfaces as an
      // error instead of a false "saved" toast.
      const { data: updated, error } = await supabase
        .from("concierge_introductions")
        .update({ provider_response: response, provider_responded_at: new Date().toISOString() })
        .eq("id", introId)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!updated) {
        throw new Error("This introduction couldn't be updated — it may have been reassigned or closed. Refresh and try again.");
      }
      return response;
    },
    onSuccess: (response) => {
      toast.success(
        response === "interested"
          ? "Marked interested — your advisor will share the client's details and next steps."
          : "Marked not available — the advisor has been notified to re-match this client.",
      );
      queryClient.invalidateQueries({ queryKey: ["provider-concierge-introductions", facilityId] });
      queryClient.invalidateQueries({ queryKey: ["pending-concierge-count", facilityId] });
      queryClient.invalidateQueries({ queryKey: ["concierge-analytics-provider", facilityId] });
      setConfirmDecline(null);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Couldn't save your response. Please try again.");
    },
    onSettled: () => setPendingId(null),
  });

  if (isLoading) return null;

  if (isError) {
    return (
      <Card className="border-amber-200 bg-amber-50/40">
        <CardContent className="p-4 flex items-center justify-between gap-3">
          <div className="flex items-start gap-2 text-sm">
            <AlertCircle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" aria-hidden />
            <span className="text-slate-700">Couldn't load your placement introductions.</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  const all = cases ?? [];
  const awaiting = all.filter((c) => isAwaiting(c.provider_response));
  const interested = all.filter((c) => c.provider_response === "interested");
  if (awaiting.length === 0 && interested.length === 0) return null;

  return (
    <>
      <Card className="border-blue-200 bg-blue-50/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Handshake className="h-4 w-4 text-blue-600" />
            Placement introductions
            {awaiting.length > 0 && (
              <Badge className="bg-blue-600 hover:bg-blue-600 text-[10px]">{awaiting.length} awaiting</Badge>
            )}
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Clients our advisors matched to your facility. Review each case and respond.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {awaiting.map((c) => (
            <CaseRow
              key={c.introduction_id}
              c={c}
              busy={pendingId === c.introduction_id && respond.isPending}
              disabled={respond.isPending}
              onInterested={() => respond.mutate({ introId: c.introduction_id, response: "interested" })}
              onDecline={() => setConfirmDecline(c)}
            />
          ))}

          {interested.length > 0 && (
            <div className="pt-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-2">
                Interested — in progress
              </p>
              <div className="space-y-3">
                {interested.map((c) => (
                  <CaseRow key={c.introduction_id} c={c} interestedView />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={!!confirmDecline}
        onOpenChange={(open) => { if (!open && !respond.isPending) setConfirmDecline(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark this introduction as not available?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              This releases{" "}
              <strong>Case #{confirmDecline?.introduction_id.slice(0, 8).toUpperCase()}</strong> and
              notifies your advisor to match the client with another facility. You won't be able to
              respond to it again from here.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={respond.isPending}>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (confirmDecline) respond.mutate({ introId: confirmDecline.introduction_id, response: "not_available" });
              }}
              disabled={respond.isPending}
              className="gap-2"
            >
              {respond.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Mark not available
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function CaseRow({
  c, busy, disabled, onInterested, onDecline, interestedView,
}: {
  c: IntroCase;
  busy?: boolean;
  disabled?: boolean;
  onInterested?: () => void;
  onDecline?: () => void;
  interestedView?: boolean;
}) {
  const when = c.sent_at || c.created_at;
  const location = c.preferred_state
    ? `${c.preferred_city || "Any city"}, ${c.preferred_state}`
    : "Flexible";
  const insurance = c.insurance_carrier || (c.payment_type === "self_pay" ? "Self-Pay" : titleCase(c.payment_type));

  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">
            Case #{c.introduction_id.slice(0, 8).toUpperCase()}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {when ? `Introduced ${formatDistanceToNow(new Date(when), { addSuffix: true })}` : "Recently introduced"}
          </p>
        </div>
        {c.timeline_urgency && (
          <Badge variant="outline" className="text-[10px] gap-1 shrink-0">
            <Clock className="h-3 w-3" />
            {titleCase(c.timeline_urgency)}
          </Badge>
        )}
      </div>

      {/* De-identified clinical summary */}
      <div className="mt-2.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        <Detail icon={HeartPulse} label="Level of care" value={titleCase(c.level_of_care)} />
        <Detail icon={AlertCircle} label="Primary concern" value={titleCase(c.primary_concern)} />
        <Detail icon={Shield} label="Insurance / payment" value={insurance} />
        <Detail icon={MapPin} label="Preferred location" value={location} />
        <Detail icon={User} label="Gender" value={titleCase(c.gender)} />
        <Detail icon={User} label="Age range" value={c.age_range || "—"} />
      </div>

      {/* Disclosed client contact (after advisor discloses / client selects) */}
      {c.pii_disclosed && (c.client_name || c.client_email || c.client_phone) && (
        <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50/60 p-2.5">
          <p className="text-[11px] font-semibold text-emerald-800 mb-1">Client contact</p>
          <div className="space-y-1 text-xs text-emerald-900">
            {c.client_name && <p className="font-medium">{c.client_name}</p>}
            {c.client_phone && (
              <a href={`tel:${c.client_phone}`} className="inline-flex items-center gap-1.5 hover:underline">
                <Phone className="h-3 w-3" /> {c.client_phone}
              </a>
            )}
            {c.client_email && (
              <a href={`mailto:${c.client_email}`} className="flex items-center gap-1.5 hover:underline">
                <Mail className="h-3 w-3 shrink-0" /> <span className="truncate">{c.client_email}</span>
              </a>
            )}
          </div>
        </div>
      )}

      {interestedView ? (
        <p className={cn("mt-2.5 text-xs", c.pii_disclosed ? "text-emerald-700" : "text-muted-foreground")}>
          {c.pii_disclosed
            ? "Client confirmed — reach out to coordinate admission."
            : "You're marked interested. Your advisor will share the client's contact details and next steps."}
        </p>
      ) : (
        <div className="mt-3 flex items-center gap-2">
          <Button
            size="sm"
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-600/90"
            disabled={disabled}
            onClick={onInterested}
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            We're interested
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-muted-foreground" disabled={disabled} onClick={onDecline}>
            <XCircle className="h-3.5 w-3.5" />
            Not available
          </Button>
        </div>
      )}
    </div>
  );
}

function Detail({ icon: Icon, label, value }: { icon: typeof Shield; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" aria-hidden />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-xs font-medium text-foreground capitalize truncate">{value}</p>
      </div>
    </div>
  );
}
