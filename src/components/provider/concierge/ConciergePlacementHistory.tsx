import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { History, AlertCircle } from "lucide-react";
import { useFacilityConciergePlacements } from "@/hooks/useFacilityConciergePlacements";

interface ConciergePlacementHistoryProps {
  facilityId: string;
}

const STATUS_LABEL: Record<string, string> = {
  admitted: "Admitted",
  billed: "Billed",
  completed: "Completed",
};

const STATUS_COLOR: Record<string, string> = {
  admitted: "bg-emerald-100 text-emerald-800 border-emerald-300",
  billed: "bg-sky-100 text-sky-800 border-sky-300",
  completed: "bg-slate-100 text-slate-700 border-slate-300",
};

/**
 * Read-only history of concierge placements that landed at this
 * facility. Rendered inside `ConciergeManagementPanel` so Concierge
 * subscribers can see the seekers our advisors placed with them.
 *
 * Names shown are first-name only by design — full PII stays in the
 * concierge inbox (admin/advisor surface), and the placement row only
 * exposes the columns the SECURITY DEFINER RPC chose to return.
 */
export function ConciergePlacementHistory({ facilityId }: ConciergePlacementHistoryProps) {
  const { data: placements, isLoading, isError, refetch } = useFacilityConciergePlacements(facilityId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4" />
          Placement history
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : isError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between gap-2">
              <span className="text-sm">Couldn't load placement history.</span>
              <button
                type="button"
                className="text-xs underline"
                onClick={() => refetch()}
              >
                Retry
              </button>
            </AlertDescription>
          </Alert>
        ) : !placements || placements.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            <History className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>No placements yet.</p>
            <p className="text-xs mt-1">
              When our advisors place a client at your facility and admission
              is confirmed, the case will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-slate-200">
                  <th className="px-4 py-2 font-medium text-slate-700">Name</th>
                  <th className="px-4 py-2 font-medium text-slate-700">Level of care</th>
                  <th className="px-4 py-2 font-medium text-slate-700">Status</th>
                  <th className="px-4 py-2 font-medium text-slate-700">Confirmed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {placements.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {p.user_name || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {p.level_of_care || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={`text-xs font-normal ${STATUS_COLOR[p.status] ?? ""}`}
                      >
                        {STATUS_LABEL[p.status] ?? p.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {p.placement_confirmed_at
                        ? new Date(p.placement_confirmed_at).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
