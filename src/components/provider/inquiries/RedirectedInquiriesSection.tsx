import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Inbox, Sparkles, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useRedirectedInquiries } from "@/hooks/useRedirectedInquiries";

interface RedirectedInquiriesSectionProps {
  facilityId: string | null | undefined;
}

/**
 * Section shown to Free-tier providers on their dashboard: a redacted
 * count + preview of the inquiries that arrived on their listing in
 * the last 30 days, all of which were routed through the concierge.
 * Each row shows ONLY non-PII fields (LoC / insurance / urgency /
 * location / date). The upgrade-to-Pro banner sits at the top so the
 * provider can see exactly how many leads they'd receive directly if
 * they upgraded.
 *
 * The component renders nothing on Pro-tier dashboards — those have
 * their own direct-leads inbox. The consumer decides whether to mount
 * this; the hook isn't tier-aware.
 */
export function RedirectedInquiriesSection({
  facilityId,
}: RedirectedInquiriesSectionProps) {
  const { data: inquiries, isLoading } = useRedirectedInquiries(facilityId);

  const count = inquiries?.length ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Inbox className="h-5 w-5 text-[#1B365D]" aria-hidden />
          Inquiries on your listing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upsell banner */}
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
          <p className="font-semibold text-slate-900 text-sm">
            {isLoading
              ? "Loading inquiries…"
              : count === 0
                ? "No redirected inquiries yet — but you'd be the first to know."
                : `You've had ${count} ${count === 1 ? "inquiry" : "inquiries"} this month routed through our concierge.`}
          </p>
          <p className="mt-1 text-xs text-slate-700 leading-relaxed">
            Upgrade to Pro to receive these directly with full seeker contact
            info, before our concierge team even reaches out.
          </p>
          <Button asChild className="mt-3 bg-[#1B365D] hover:bg-[#142a4a] gap-2" size="sm">
            <Link to="/provider/subscription">
              <Sparkles className="h-3.5 w-3.5" />
              Upgrade to Pro
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {/* PII-redacted preview */}
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : count === 0 ? (
          <p className="text-sm text-slate-500 italic">
            When a seeker submits on your listing, they'll appear here
            (redacted) with a link to upgrade for full details.
          </p>
        ) : (
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-slate-200">
                  <th className="px-4 py-2 font-medium text-slate-700">Date</th>
                  <th className="px-4 py-2 font-medium text-slate-700">Level of care</th>
                  <th className="px-4 py-2 font-medium text-slate-700">Insurance</th>
                  <th className="px-4 py-2 font-medium text-slate-700">Urgency</th>
                  <th className="px-4 py-2 font-medium text-slate-700">Location</th>
                  <th className="px-4 py-2 font-medium text-slate-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inquiries?.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(row.created_at).toLocaleDateString("en-US", {
                        month: "short", day: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {row.level_of_care ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {row.insurance ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {row.urgency ? (
                        <Badge variant="outline" className="font-normal text-xs">
                          {row.urgency}
                        </Badge>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {row.location ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="font-normal text-xs">
                        Routed to concierge
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 px-4 text-xs text-slate-500 leading-relaxed">
              <strong>Upgrade to Pro to receive these directly</strong> with full
              seeker contact info. We never share seeker PII with Free-tier
              listings — that's why these rows are redacted.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
