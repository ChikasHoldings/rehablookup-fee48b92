import { useEffect, useState } from "react";
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
import { Handshake, Mail, CheckCircle2, XCircle, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface ConciergeIntroductionResponderProps {
  facilityId: string;
}

interface IntroRow {
  id: string;
  created_at: string | null;
  sent_at: string | null;
  provider_response: string | null;
}

// provider_response values that mean "the provider has not acted yet". New
// rows are inserted with 'pending' (see send-concierge-introduction); null is
// included as defence-in-depth for any legacy rows.
const AWAITING = new Set<string>(["pending"]);
const isAwaiting = (r: string | null) => r === null || AWAITING.has(r);

/**
 * Provider self-serve response queue for concierge introductions.
 *
 * When an advisor matches a client to this facility, an introduction row is
 * created and the facility's admissions team is emailed the (de-identified)
 * clinical needs. This card lets the provider respond in-app:
 *   • "We're interested" → provider_response = 'interested'
 *   • "Not available"     → provider_response = 'not_available' (a DB trigger
 *     then releases the slot and flags the advisor to re-match)
 *
 * PII-SAFE: the seeker's identity/contact lives on concierge_inquiries, which
 * RLS hides from the provider until an advisor explicitly discloses it. This
 * surface therefore shows only a case reference + when the intro was sent, and
 * points the provider back to the email for the clinical context.
 *
 * Renders nothing when there are no introductions awaiting a response, so it
 * stays out of the way for facilities that never receive matches.
 */
export function ConciergeIntroductionResponder({ facilityId }: ConciergeIntroductionResponderProps) {
  const queryClient = useQueryClient();
  const [confirmDecline, setConfirmDecline] = useState<IntroRow | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const { data: intros, isLoading, isError, refetch } = useQuery({
    queryKey: ["provider-concierge-introductions", facilityId],
    queryFn: async (): Promise<IntroRow[]> => {
      const { data, error } = await supabase
        .from("concierge_introductions")
        .select("id, created_at, sent_at, provider_response")
        .eq("facility_id", facilityId)
        .order("sent_at", { ascending: false, nullsFirst: false })
        .limit(50);
      if (error) throw error;
      return (data as IntroRow[]) ?? [];
    },
    enabled: !!facilityId,
    staleTime: 1000 * 30,
  });

  // Realtime: refresh the queue when introductions for this facility change
  // (new match arrives, or an advisor sets a response). Per-mount random
  // suffix on the channel name so successive mounts don't collide with a
  // still-registered channel of the same name.
  useEffect(() => {
    if (!facilityId) return;
    const channelName = `provider-concierge-intros-${facilityId}-${Math.random().toString(36).slice(2, 10)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "concierge_introductions",
          filter: `facility_id=eq.${facilityId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["provider-concierge-introductions", facilityId] });
          queryClient.invalidateQueries({ queryKey: ["pending-concierge-count", facilityId] });
        },
      )
      .subscribe();
    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {
        /* channel may already be torn down */
      }
    };
  }, [facilityId, queryClient]);

  const respond = useMutation({
    mutationFn: async ({ introId, response }: { introId: string; response: "interested" | "not_available" }) => {
      setPendingId(introId);
      const { error } = await supabase
        .from("concierge_introductions")
        .update({ provider_response: response, provider_responded_at: new Date().toISOString() })
        .eq("id", introId);
      if (error) throw error;
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
    onSettled: () => {
      setPendingId(null);
    },
  });

  // Don't occupy space while we don't yet know whether there's anything to act on.
  if (isLoading) return null;

  if (isError) {
    return (
      <Card className="border-amber-200 bg-amber-50/40">
        <CardContent className="p-4 flex items-center justify-between gap-3">
          <div className="flex items-start gap-2 text-sm">
            <AlertCircle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" aria-hidden />
            <span className="text-slate-700">Couldn't load your placement introductions.</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const awaiting = (intros ?? []).filter((i) => isAwaiting(i.provider_response));
  if (awaiting.length === 0) return null;

  return (
    <>
      <Card className="border-blue-200 bg-blue-50/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Handshake className="h-4 w-4 text-blue-600" />
            Placement introductions
            <Badge className="bg-blue-600 hover:bg-blue-600 text-[10px]">
              {awaiting.length} awaiting
            </Badge>
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
            <Mail className="h-3 w-3" />
            Your admissions team was emailed each client's needs. Review that email, then respond here.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {awaiting.map((intro) => {
            const when = intro.sent_at || intro.created_at;
            const busy = pendingId === intro.id && respond.isPending;
            return (
              <div
                key={intro.id}
                className="flex flex-col gap-3 rounded-lg border bg-card px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    Case #{intro.id.slice(0, 8).toUpperCase()}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {when
                      ? `Introduced ${formatDistanceToNow(new Date(when), { addSuffix: true })}`
                      : "Recently introduced"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    className="gap-1.5 bg-emerald-600 hover:bg-emerald-600/90"
                    disabled={respond.isPending}
                    onClick={() => respond.mutate({ introId: intro.id, response: "interested" })}
                  >
                    {busy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    We're interested
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-muted-foreground"
                    disabled={respond.isPending}
                    onClick={() => setConfirmDecline(intro)}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Not available
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <AlertDialog
        open={!!confirmDecline}
        onOpenChange={(open) => {
          if (!open && !respond.isPending) setConfirmDecline(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark this introduction as not available?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              This releases{" "}
              <strong>Case #{confirmDecline?.id.slice(0, 8).toUpperCase()}</strong> and notifies
              your advisor to match the client with another facility. You won't be able to respond
              to it again from here.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={respond.isPending}>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (confirmDecline) {
                  respond.mutate({ introId: confirmDecline.id, response: "not_available" });
                }
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
