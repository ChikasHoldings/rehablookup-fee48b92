import { Badge } from "@/components/ui/badge";
import { Info, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

export type InquiryType = 'request_info' | 'request_callback';

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
