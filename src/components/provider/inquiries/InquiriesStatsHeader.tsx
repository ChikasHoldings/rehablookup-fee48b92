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
    <div className="grid grid-cols-5 gap-2 sm:gap-4">
      {stats.map(({ label, value, icon: Icon, color }) => (
        <div
          key={label}
          className="bg-card border border-border rounded-lg p-3 sm:p-4 text-center transition-shadow hover:shadow-sm"
        >
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${color}`} />
            <span className="text-xs sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {label}
            </span>
          </div>
          <p className={`text-xl sm:text-2xl font-bold ${color}`}>{value}</p>
        </div>
      ))}
    </div>
  );
}
