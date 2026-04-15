import { Users, Lock, Unlock, PhoneCall, CheckCircle } from "lucide-react";

interface StatsHeaderProps {
  total: number;
  locked: number;
  unlocked: number;
  contacted: number;
  responded: number;
}

export function InquiriesStatsHeader({ total, locked, unlocked, contacted, responded }: StatsHeaderProps) {
  const stats = [
    { label: "Total", value: total, icon: Users, color: "text-foreground" },
    { label: "Locked", value: locked, icon: Lock, color: "text-muted-foreground" },
    { label: "Unlocked", value: unlocked, icon: Unlock, color: "text-amber-600 dark:text-amber-400" },
    { label: "Contacted", value: contacted, icon: PhoneCall, color: "text-blue-600 dark:text-blue-400" },
    { label: "Responded", value: responded, icon: CheckCircle, color: "text-emerald-600 dark:text-emerald-400" },
  ];

  return (
    <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
      {stats.map(({ label, value, icon: Icon, color }) => (
        <div
          key={label}
          className="bg-card border border-border rounded-md px-2 py-1.5 sm:px-3 sm:py-2 text-center"
        >
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <Icon className={`h-3 w-3 ${color}`} />
            <span className="text-[10px] sm:text-xs font-medium text-muted-foreground tracking-wide">
              {label}
            </span>
          </div>
          <p className={`text-base sm:text-lg font-bold leading-tight ${color}`}>{value}</p>
        </div>
      ))}
    </div>
  );
}
