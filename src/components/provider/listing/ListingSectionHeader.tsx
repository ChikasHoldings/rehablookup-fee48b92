import { CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ListingSectionHeaderProps {
  icon: React.ElementType;
  iconColor: string;
  title: string;
  description: string;
  badge?: React.ReactNode;
}

export function ListingSectionHeader({
  icon: Icon,
  iconColor,
  title,
  description,
  badge
}: ListingSectionHeaderProps) {
  return (
    <div className="flex items-start gap-3">
      <div className={cn(
        "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105",
        iconColor
      )}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          {badge}
        </div>
        <CardDescription className="text-xs mt-0.5">{description}</CardDescription>
      </div>
    </div>
  );
}
