import { Badge } from "@/components/ui/badge";
import { Info, Phone, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

// `tour_request` added 2026-05-24 — previously the union was missing
// this value and tour-request leads silently fell through to the
// "Request Info" default, so the provider couldn't visually
// distinguish tour requests from generic info requests. See also
// InquiryDetailPanel.tsx which now branches on the same value to
// route tour confirmations through send-tour-notifications instead of
// the generic facility-contacted-you path.
export type InquiryType = 'request_info' | 'request_callback' | 'tour_request';

interface InquiryTypeBadgeProps {
  type: InquiryType | string | null | undefined;
  size?: "sm" | "md";
  className?: string;
}

const INQUIRY_CONFIG: Record<InquiryType, {
  label: string;
  icon: typeof Info;
  className: string;
}> = {
  request_info: {
    label: "Request Info",
    icon: Info,
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-100",
  },
  request_callback: {
    label: "Request Callback",
    icon: Phone,
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 hover:bg-emerald-100",
  },
  tour_request: {
    label: "Tour Request",
    icon: Calendar,
    className: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 hover:bg-violet-100",
  },
};

export function InquiryTypeBadge({ type, size = "sm", className }: InquiryTypeBadgeProps) {
  const inquiryType = (type || 'request_info') as InquiryType;
  const config = INQUIRY_CONFIG[inquiryType] || INQUIRY_CONFIG.request_info;
  const Icon = config.icon;

  return (
    <Badge 
      variant="secondary" 
      className={cn(
        "font-medium gap-1 border-0",
        config.className,
        size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-2.5 py-1",
        className
      )}
    >
      <Icon className={cn(size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} />
      {config.label}
    </Badge>
  );
}

export function getInquiryTypeLabel(type: InquiryType | string | null | undefined): string {
  const inquiryType = (type || 'request_info') as InquiryType;
  return INQUIRY_CONFIG[inquiryType]?.label || "Request Info";
}
