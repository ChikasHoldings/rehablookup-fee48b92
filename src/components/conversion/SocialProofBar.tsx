import { Building2, MapPin, ShieldCheck, Users, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatItem {
  icon: typeof Building2;
  value: string;
  label: string;
}

const STATS: StatItem[] = [
  { icon: Building2, value: "15,000+", label: "Verified Facilities" },
  { icon: MapPin, value: "All 50", label: "States Covered" },
  { icon: Users, value: "Free", label: "For Clients" },
  { icon: ShieldCheck, value: "HIPAA", label: "Compliant" },
  { icon: Star, value: "4.8★", label: "Advisor Rating" },
];

interface SocialProofBarProps {
  className?: string;
  /** Show a compact single-row version (default) or a larger grid version */
  variant?: "bar" | "grid";
}

/**
 * A compact social proof bar showing real platform statistics.
 * Use on the homepage hero, SEO landing pages, and the concierge landing page
 * to build immediate trust with first-time visitors.
 */
export function SocialProofBar({ className, variant = "bar" }: SocialProofBarProps) {
  if (variant === "grid") {
    return (
      <div
        className={cn(
          "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4",
          className
        )}
        aria-label="Platform statistics"
      >
        {STATS.map(({ icon: Icon, value, label }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-1 rounded-xl border bg-card p-4 text-center shadow-sm"
          >
            <Icon className="h-5 w-5 text-primary" aria-hidden />
            <span className="text-xl font-bold text-foreground">{value}</span>
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    );
  }

  // Default: compact horizontal bar.
  // min-h reserves vertical space BEFORE the icons + numbers paint, so the
  // homepage doesn't shift the Featured-Facilities section downward as this
  // bar hydrates. Was contributing to CLS on slow connections.
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-6 gap-y-2 py-3 min-h-[52px]",
        className
      )}
      aria-label="Platform statistics"
    >
      {STATS.map(({ icon: Icon, value, label }, i) => (
        <span key={label} className="flex items-center gap-1.5 text-sm text-muted-foreground">
          {i > 0 && (
            <span className="hidden sm:inline text-border" aria-hidden>·</span>
          )}
          <Icon className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden />
          <strong className="font-semibold text-foreground">{value}</strong>
          <span>{label}</span>
        </span>
      ))}
    </div>
  );
}
