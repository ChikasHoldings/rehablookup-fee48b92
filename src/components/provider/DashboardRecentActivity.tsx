import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Bell, Star, Users, CreditCard, ShieldCheck, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useProviderNotifications } from "@/hooks/useProviderNotifications";

/**
 * Dashboard "Recent activity" feed — the provider's latest notifications
 * (reviews, inquiries, billing, verification, system updates). Read-only
 * preview of the 5 most recent; full management lives at /provider/notifications.
 */
function iconFor(type: string): { Icon: React.ElementType; cls: string } {
  const t = type.toLowerCase();
  if (t.includes("review")) return { Icon: Star, cls: "bg-amber-100 text-amber-600" };
  if (t.includes("lead") || t.includes("inquiry") || t.includes("concierge"))
    return { Icon: Users, cls: "bg-emerald-100 text-emerald-700" };
  if (t.includes("bill") || t.includes("subscription") || t.includes("payment") || t.includes("pro"))
    return { Icon: CreditCard, cls: "bg-violet-100 text-violet-700" };
  if (t.includes("verif") || t.includes("approv") || t.includes("claim"))
    return { Icon: ShieldCheck, cls: "bg-sky-100 text-sky-700" };
  return { Icon: Bell, cls: "bg-slate-100 text-slate-500" };
}

export function DashboardRecentActivity() {
  const { notifications, isLoading } = useProviderNotifications();
  const recent = (notifications ?? []).slice(0, 5);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b py-3.5">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Bell className="h-4 w-4 text-[#1B365D]" aria-hidden />
          Recent activity
        </CardTitle>
        <Button asChild variant="ghost" size="sm" className="h-7 gap-1 text-xs text-[#1B365D]">
          <Link to="/provider/notifications">
            View all <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : recent.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Bell className="mx-auto h-7 w-7 text-slate-300" aria-hidden />
            <p className="mt-2 text-sm font-medium text-slate-700">No activity yet</p>
            <p className="mt-0.5 text-xs text-slate-500">
              New reviews, inquiries, and account updates will show up here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recent.map((n) => {
              const { Icon, cls } = iconFor(n.type);
              return (
                <li key={n.id} className="flex items-start gap-3 px-4 py-3">
                  <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", cls)}>
                    <Icon className="h-4 w-4" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-slate-900">{n.title}</p>
                      {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#1B365D]" aria-label="unread" />}
                    </div>
                    {n.message && <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{n.message}</p>}
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
