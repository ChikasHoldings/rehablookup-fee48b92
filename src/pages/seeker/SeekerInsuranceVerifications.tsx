import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  Plus,
  Loader2,
  DollarSign,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSeekerSession } from "@/hooks/useSeekerSession";
import { AuthPrompt } from "@/components/seeker/AuthPrompt";

interface VOBRow {
  id: string;
  status: string;
  carrier: string;
  urgency: string;
  coverage_summary: string | null;
  estimated_out_of_pocket_cents: number | null;
  created_at: string;
  updated_at: string;
  verified_at: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; tone: string; icon: React.ReactNode }> = {
  new: { label: "Received", tone: "bg-blue-100 text-blue-800", icon: <Clock className="h-4 w-4" /> },
  in_progress: { label: "Verifying", tone: "bg-amber-100 text-amber-800", icon: <Loader2 className="h-4 w-4" /> },
  verified: { label: "Verified", tone: "bg-emerald-100 text-emerald-800", icon: <CheckCircle2 className="h-4 w-4" /> },
  no_coverage: { label: "No Coverage", tone: "bg-rose-100 text-rose-800", icon: <XCircle className="h-4 w-4" /> },
  unable_to_verify: { label: "Unable to Verify", tone: "bg-slate-100 text-slate-700", icon: <AlertCircle className="h-4 w-4" /> },
  closed: { label: "Closed", tone: "bg-slate-100 text-slate-700", icon: <Clock className="h-4 w-4" /> },
};

function statusBadge(status: string) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.new;
  return (
    <Badge className={`gap-1 border-0 ${cfg.tone}`}>
      {cfg.icon}
      {cfg.label}
    </Badge>
  );
}

function dollars(cents: number | null): string | null {
  if (cents == null) return null;
  return `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export default function SeekerInsuranceVerifications() {
  const { userId, isReady, isAuthenticated } = useSeekerSession();
  const queryClient = useQueryClient();

  const { data: rows, isLoading, isError } = useQuery({
    queryKey: ["seeker-insurance-verifications", userId],
    queryFn: async (): Promise<VOBRow[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("insurance_verification_requests")
        .select("id, status, carrier, urgency, coverage_summary, estimated_out_of_pocket_cents, created_at, updated_at, verified_at")
        .eq("linked_user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as VOBRow[];
    },
    enabled: !!userId,
  });

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`vob-seeker-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "insurance_verification_requests",
          filter: `linked_user_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["seeker-insurance-verifications", userId] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  if (isReady && !isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <AuthPrompt
          title="Sign in to view your insurance verifications"
          description="Create a free account to track your insurance verification requests."
          icon="lock"
          returnTo="/account/insurance-verifications"
        />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Insurance Verifications | RehabLookup</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10">
              <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-display font-bold">Insurance Verifications</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Track requests submitted to our care team
              </p>
            </div>
          </div>
          <Button asChild size="sm">
            <Link to="/insurance-verification" className="gap-1">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New request</span>
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : isError ? (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="p-6 text-sm text-destructive">
              We couldn't load your verifications. Please refresh and try again.
            </CardContent>
          </Card>
        ) : !rows || rows.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <div className="p-3 rounded-full bg-muted w-fit mx-auto mb-4">
                <ShieldCheck className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">No verifications yet</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                Submit a free verification of benefits request and our care team will confirm what
                your plan covers for rehab — usually within one business day.
              </p>
              <Button asChild>
                <Link to="/insurance-verification" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Verify my insurance
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => {
              const oop = dollars(row.estimated_out_of_pocket_cents);
              const showSummary = row.status === "verified" && (row.coverage_summary || oop);
              return (
                <Card key={row.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <CardTitle className="text-base font-semibold">
                          {row.carrier}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Submitted {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
                          {" · "}
                          Ref&nbsp;<span className="font-mono">{row.id.slice(0, 8).toUpperCase()}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {row.urgency === "immediate" && (
                          <Badge variant="outline" className="border-rose-200 text-rose-700">
                            Urgent
                          </Badge>
                        )}
                        {statusBadge(row.status)}
                      </div>
                    </div>
                  </CardHeader>
                  {showSummary && (
                    <CardContent className="pt-0">
                      <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 space-y-2">
                        {row.coverage_summary && (
                          <p className="text-sm text-emerald-900 whitespace-pre-wrap">
                            {row.coverage_summary}
                          </p>
                        )}
                        {oop && (
                          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
                            <DollarSign className="h-4 w-4" />
                            Estimated out-of-pocket: {oop}
                          </div>
                        )}
                        {row.verified_at && (
                          <p className="text-xs text-emerald-700">
                            Verified {format(new Date(row.verified_at), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  )}
                  {row.status === "no_coverage" && (
                    <CardContent className="pt-0">
                      <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-900">
                        Our team couldn't confirm coverage for this plan. We may have already reached
                        out about alternatives — including self-pay and scholarship options.
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}

            <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
              <CardContent className="p-3 sm:p-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm sm:text-base">
                    Need to verify another carrier?
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Submit another request — free and confidential.
                  </p>
                </div>
                <Button asChild size="sm" className="shrink-0">
                  <Link to="/insurance-verification" className="gap-2">
                    Verify
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}
