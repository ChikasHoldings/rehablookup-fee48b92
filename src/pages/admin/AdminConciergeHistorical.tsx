import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Archive, Info, AlertTriangle } from "lucide-react";

/**
 * /admin/concierge — historical, read-only.
 *
 * RehabLookup retired the Concierge / placement / advisor product. It was an
 * operator-run pipeline: intake a seeker, assign an advisor, match facilities,
 * send introductions, coordinate tours and admissions. None of that is part of
 * the product any more — seekers search the directory and contact the one
 * facility they choose, and their inquiry stays pinned to that facility.
 *
 * Production still holds a small number of records from when that product ran.
 * Destroying them would destroy an audit trail, so this page keeps them
 * readable — and nothing else. There is deliberately no action here: no claim,
 * no assign, no match, no introduce, no tour, no admit, no reassign. The
 * interactive workspace (AdminConcierge + everything under
 * components/admin/concierge/) is unmounted from the router.
 *
 * The tables, edge functions, cron jobs, and the `advisor` admin role behind
 * this data are Stage-4 debt — see
 * docs/directory-cutover-stage-03-provider-admin.md.
 */

const PAGE_SIZE = 50;

interface HistoricalCase {
  id: string;
  user_name: string | null;
  status: string | null;
  created_at: string;
  closed_at: string | null;
  preferred_state: string | null;
  level_of_care: string | null;
}

export default function AdminConciergeHistorical() {
  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["admin-concierge-historical"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const [casesRes, caseCountRes, eventCountRes] = await Promise.all([
        supabase
          .from("concierge_inquiries")
          .select("id, user_name, status, created_at, closed_at, preferred_state, level_of_care")
          .order("created_at", { ascending: false })
          .limit(PAGE_SIZE),
        supabase
          .from("concierge_inquiries")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("concierge_case_events")
          .select("id", { count: "exact", head: true }),
      ]);
      if (casesRes.error) throw casesRes.error;
      return {
        cases: (casesRes.data ?? []) as HistoricalCase[],
        totalCases: caseCountRes.count ?? 0,
        totalEvents: eventCountRes.count ?? 0,
      };
    },
  });

  const truncated = (data?.totalCases ?? 0) > PAGE_SIZE;

  return (
    <>
      <Helmet>
        <title>Historical Placement Records | RehabLookup Admin</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <AdminPageHeader
        icon={Archive}
        iconGradient="bg-gradient-to-br from-slate-500 to-slate-700"
        title="Historical Placement Records"
        subtitle="Read-only archive of the retired Concierge product — no active workflow"
      />

      <div className="mx-auto max-w-6xl space-y-5 px-4 py-5 sm:px-6 lg:px-8">
        {/* Why this page exists and what it is not. */}
        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden />
          <div className="min-w-0 text-sm text-amber-900">
            <p className="font-semibold">This workflow has been retired</p>
            <p className="mt-1 text-amber-900/80">
              RehabLookup is a directory, not a placement, advisor, or concierge
              service. Seekers search, compare, and contact the facility they
              select; every inquiry stays pinned to that one facility and is
              never matched, reassigned, or redistributed.
            </p>
            <p className="mt-2 text-amber-900/80">
              These records are preserved for audit only. No case here can be
              claimed, assigned, matched, introduced, or advanced — the actions
              that drove this pipeline no longer exist in the product.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-3 border-amber-300 bg-white">
              <Link to="/admin/leads">Go to current inquiries</Link>
            </Button>
          </div>
        </div>

        {/* Record counts */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Archived cases
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-bold tabular-nums">
                  {data?.totalCases.toLocaleString() ?? "—"}
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Archived case events
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-bold tabular-nums">
                  {data?.totalEvents.toLocaleString() ?? "—"}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* The archive itself */}
        <Card>
          <CardHeader className="border-b py-3.5">
            <CardTitle className="text-sm font-semibold">Archived cases</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-2 p-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center gap-3 p-8 text-center">
                <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden />
                <p className="text-sm text-muted-foreground">
                  Couldn't load the archive.
                </p>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  Try again
                </Button>
              </div>
            ) : (data?.cases.length ?? 0) === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">
                No historical placement records exist.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/40 text-left">
                    <tr>
                      <th className="px-4 py-2 font-medium text-muted-foreground">Name</th>
                      <th className="px-4 py-2 font-medium text-muted-foreground">Status</th>
                      <th className="px-4 py-2 font-medium text-muted-foreground">Level of care</th>
                      <th className="px-4 py-2 font-medium text-muted-foreground">State</th>
                      <th className="px-4 py-2 font-medium text-muted-foreground">Created</th>
                      <th className="px-4 py-2 font-medium text-muted-foreground">Closed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data?.cases.map((c) => (
                      <tr key={c.id}>
                        <td className="px-4 py-2">{c.user_name || "—"}</td>
                        <td className="px-4 py-2">
                          <Badge variant="secondary" className="font-normal">
                            {c.status || "unknown"}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">
                          {c.level_of_care || "—"}
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">
                          {c.preferred_state || "—"}
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">
                          {new Date(c.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">
                          {c.closed_at ? new Date(c.closed_at).toLocaleDateString() : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Never let a cap read as "that's everything". */}
        {truncated && (
          <p className="text-xs text-muted-foreground">
            Showing the {PAGE_SIZE} most recent of{" "}
            {data?.totalCases.toLocaleString()} archived cases. The full set
            remains in the database for audit.
          </p>
        )}
      </div>
    </>
  );
}
