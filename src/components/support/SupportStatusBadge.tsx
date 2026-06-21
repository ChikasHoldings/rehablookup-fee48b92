import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SupportTicketStatus } from "@/lib/support/useSupportTickets";

interface StatusConfig {
  label: string;
  className: string;
}

// Tailwind palette tokens used so the badge reads the same in light/dark.
const STATUS_MAP: Record<string, StatusConfig> = {
  open: { label: "Open", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  waiting_on_admin: { label: "Awaiting support", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  waiting_on_user: { label: "Your reply needed", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" },
  resolved: { label: "Resolved", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
  closed: { label: "Closed", className: "bg-muted text-muted-foreground" },
  // Legacy statuses on older rows.
  new: { label: "Open", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  in_progress: { label: "In progress", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
};

const FALLBACK: StatusConfig = { label: "Open", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" };

export function SupportStatusBadge({
  status,
  className,
}: {
  status: SupportTicketStatus | string;
  className?: string;
}) {
  const config = STATUS_MAP[status] || FALLBACK;
  return (
    <Badge variant="secondary" className={cn("text-xs font-medium shrink-0", config.className, className)}>
      {config.label}
    </Badge>
  );
}
