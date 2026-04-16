import { Badge } from "@/components/ui/badge";

export type LeadStatus = "new" | "unlocked" | "contacted" | "in_progress" | "responding" | "converted" | "lost" | "closed" | "expired";

interface LeadStatusBadgeProps {
  status: LeadStatus;
  size?: "sm" | "default";
}

const statusConfig: Record<LeadStatus, { label: string; className: string }> = {
  new: {
    label: "New",
    className: "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-blue-500/20",
  },
  unlocked: {
    label: "Unlocked",
    className: "bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20 border-indigo-500/20",
  },
  contacted: {
    label: "Contacted",
    className: "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-500/20",
  },
  in_progress: {
    label: "In Progress",
    className: "bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 border-purple-500/20",
  },
  responding: {
    label: "Responding",
    className: "bg-teal-500/10 text-teal-600 hover:bg-teal-500/20 border-teal-500/20",
  },
  converted: {
    label: "Converted",
    className: "bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20",
  },
  lost: {
    label: "Lost",
    className: "bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-500/20",
  },
  closed: {
    label: "Closed",
    className: "bg-muted text-muted-foreground hover:bg-muted/80 border-muted-foreground/20",
  },
  expired: {
    label: "Expired",
    className: "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20 border-gray-500/20",
  },
};

export function LeadStatusBadge({ status, size = "default" }: LeadStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.new;
  
  return (
    <Badge 
      variant="outline" 
      className={`font-medium ${config.className} ${size === "sm" ? "text-[10px] px-1.5 py-0" : ""}`}
    >
      {config.label}
    </Badge>
  );
}

/**
 * Returns the valid status options a provider can manually set,
 * based on the current status. Matches DB trigger rules.
 */
export function getStatusOptions(currentStatus?: LeadStatus): { value: LeadStatus; label: string }[] {
  // Provider-selectable statuses (excludes system-managed: new, unlocked, expired)
  const allManual: { value: LeadStatus; label: string }[] = [
    { value: "contacted", label: "Contacted" },
    { value: "in_progress", label: "In Progress" },
    { value: "responding", label: "Responding" },
    { value: "converted", label: "Converted" },
    { value: "lost", label: "Lost" },
    { value: "closed", label: "Closed" },
  ];

  if (!currentStatus) return allManual;

  // Filter to only transitions the DB will accept
  const allowedMap: Record<string, string[]> = {
    new: ["contacted", "closed"],
    unlocked: ["contacted", "in_progress", "responding", "converted", "lost", "closed"],
    contacted: ["in_progress", "responding", "converted", "lost", "closed"],
    in_progress: ["contacted", "responding", "converted", "lost", "closed"],
    responding: ["in_progress", "contacted", "converted", "lost", "closed"],
    converted: ["closed"],
    lost: ["contacted", "in_progress", "closed"],
    closed: [],
    expired: ["closed"],
  };

  const allowed = allowedMap[currentStatus] || [];
  return allManual.filter(o => allowed.includes(o.value));
}
