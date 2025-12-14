import { Badge } from "@/components/ui/badge";

export type LeadStatus = "new" | "contacted" | "in_progress" | "closed";

interface LeadStatusBadgeProps {
  status: LeadStatus;
}

const statusConfig: Record<LeadStatus, { label: string; className: string }> = {
  new: {
    label: "New",
    className: "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-blue-500/20",
  },
  contacted: {
    label: "Contacted",
    className: "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-500/20",
  },
  in_progress: {
    label: "In Progress",
    className: "bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 border-purple-500/20",
  },
  closed: {
    label: "Closed",
    className: "bg-muted text-muted-foreground hover:bg-muted/80 border-muted-foreground/20",
  },
};

export function LeadStatusBadge({ status }: LeadStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.new;
  
  return (
    <Badge variant="outline" className={`font-medium ${config.className}`}>
      {config.label}
    </Badge>
  );
}

export function getStatusOptions(): { value: LeadStatus; label: string }[] {
  return [
    { value: "new", label: "New" },
    { value: "contacted", label: "Contacted" },
    { value: "in_progress", label: "In Progress" },
    { value: "closed", label: "Closed" },
  ];
}
