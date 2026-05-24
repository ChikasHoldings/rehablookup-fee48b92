import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  CheckCircle2,
  Clock,
  Eye,
  Mail,
  MousePointerClick,
  Send,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

interface ReviewRequestHistoryProps {
  facilityIds: string[];
  /** Optional: limit visible rows on the page. The "Show more" button
   *  reveals the rest when the list is longer than this. */
  initialLimit?: number;
}

interface RequestRow {
  id: string;
  facility_id: string;
  recipient_name: string;
  recipient_email: string;
  status: string;
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  review_submitted_at: string | null;
  expires_at: string | null;
  created_at: string;
}

/**
 * History of review-requests sent from this provider's facilities.
 * Lists each recipient with the current funnel state — pending (row
 * created but the email send is in-flight), sent, submitted, or
 * expired. PII (email) is shown to the owner only via the
 * RLS-protected raw table.
 */
export function ReviewRequestHistory({
  facilityIds,
  initialLimit = 5,
}: ReviewRequestHistoryProps) {
  const facilityKey = facilityIds.join(",");
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["review-requests", facilityKey],
    enabled: facilityIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("review_requests")
        .select("id, facility_id, recipient_name, recipient_email, status, sent_at, opened_at, clicked_at, review_submitted_at, expires_at, created_at")
        .in("facility_id", facilityIds)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as RequestRow[];
    },
    staleTime: 30 * 1000,
  });

  const [visibleCount, setVisibleCount] = useState(initialLimit);
  const visible = rows.slice(0, visibleCount);
  const summary = useMemo(() => {
    const out = { sent: 0, opened: 0, clicked: 0, submitted: 0, expired: 0, pending: 0 };
    const now = Date.now();
    for (const r of rows) {
      const expired = r.expires_at ? new Date(r.expires_at).getTime() < now : false;
      // Priority order matches the per-row badge selector below so
      // the funnel summary across the top adds up to the row count.
      if (r.review_submitted_at) out.submitted++;
      else if (expired) out.expired++;
      else if (r.clicked_at) out.clicked++;
      else if (r.opened_at) out.opened++;
      else if (r.sent_at) out.sent++;
      else out.pending++;
    }
    return out;
  }, [rows]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" aria-hidden />
            Review requests
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  if (rows.length === 0) {
    // Empty-state copy is intentionally short — the primary CTA is the
    // "Request a review" button next to the page hero, not here. We
    // just confirm the section is wired and waiting.
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" aria-hidden />
            Review requests
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 py-8 text-center">
          <p className="text-sm font-medium text-foreground">No requests sent yet</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Use the "Request a review" button above to email past clients an
            invitation. We'll track delivery and submission status here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" aria-hidden />
          Review requests
        </CardTitle>
        <div className="text-xs text-muted-foreground tabular-nums">
          {summary.submitted} submitted · {summary.clicked + summary.opened} engaged ·{" "}
          {summary.sent} delivered · {summary.expired} expired
        </div>
      </CardHeader>
      <CardContent className="pt-0 divide-y divide-border">
        {visible.map((r) => (
          <RequestRowDisplay key={r.id} row={r} />
        ))}
        {rows.length > visibleCount && (
          <div className="pt-3 flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setVisibleCount((c) => c + 10)}
              className="text-muted-foreground gap-1"
            >
              Show more
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RequestRowDisplay({ row }: { row: RequestRow }) {
  const expired = row.expires_at ? new Date(row.expires_at).getTime() < Date.now() : false;
  let badge: { label: string; icon: React.ElementType; className: string };
  // Priority: Submitted (terminal success) > Expired (terminal failure)
  // > Clicked (engagement signal) > Opened (engagement signal) > Sent
  // (delivered to Resend) > Pending (row created but email not yet
  // out the door). Matches the summary counter at the card head.
  if (row.review_submitted_at) {
    badge = {
      label: "Submitted",
      icon: CheckCircle2,
      className: "bg-emerald-100 text-emerald-700 border-emerald-200",
    };
  } else if (expired) {
    badge = {
      label: "Expired",
      icon: XCircle,
      className: "bg-slate-100 text-slate-600 border-slate-200",
    };
  } else if (row.clicked_at) {
    badge = {
      label: "Clicked",
      icon: MousePointerClick,
      className: "bg-violet-100 text-violet-700 border-violet-200",
    };
  } else if (row.opened_at) {
    badge = {
      label: "Opened",
      icon: Eye,
      className: "bg-indigo-100 text-indigo-700 border-indigo-200",
    };
  } else if (row.sent_at) {
    badge = {
      label: "Sent",
      icon: Send,
      className: "bg-blue-100 text-blue-700 border-blue-200",
    };
  } else {
    badge = {
      label: "Pending",
      icon: Clock,
      className: "bg-amber-100 text-amber-700 border-amber-200",
    };
  }
  const Icon = badge.icon;

  // When-line: prefer review_submitted_at > clicked_at > opened_at >
  // sent_at > created_at so the most informative timestamp surfaces.
  const whenIso =
    row.review_submitted_at ||
    row.clicked_at ||
    row.opened_at ||
    row.sent_at ||
    row.created_at;
  const whenText = (() => {
    try {
      return formatDistanceToNow(new Date(whenIso), { addSuffix: true });
    } catch {
      return null;
    }
  })();

  const whenLabel = row.review_submitted_at
    ? `Submitted ${whenText}`
    : row.clicked_at
      ? `Clicked ${whenText}`
      : row.opened_at
        ? `Opened ${whenText}`
        : row.sent_at
          ? `Sent ${whenText}`
          : `Created ${whenText}`;

  return (
    <div className="py-3 flex items-start justify-between gap-3 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground truncate">
          {row.recipient_name}
        </p>
        <p className="text-xs text-muted-foreground truncate">{row.recipient_email}</p>
        {whenText && (
          <p className="text-[11px] text-muted-foreground/70 mt-0.5">{whenLabel}</p>
        )}
      </div>
      <Badge variant="outline" className={`text-xs shrink-0 gap-1 ${badge.className}`}>
        <Icon className="h-3 w-3" aria-hidden />
        {badge.label}
      </Badge>
    </div>
  );
}

