import { motion } from "framer-motion";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";

interface AnimatedFieldGroupProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

export function AnimatedFieldGroup({ children, delay = 0, className }: AnimatedFieldGroupProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface AnimatedOptionCardProps {
  selected: boolean;
  onClick: () => void;
  icon?: ReactNode;
  label: string;
  description?: string;
  delay?: number;
}

export function AnimatedOptionCard({
  selected,
  onClick,
  icon,
  label,
  description,
  delay = 0,
}: AnimatedOptionCardProps) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-left",
        "hover:border-primary/50 hover:bg-primary/5 active:scale-[0.98]",
        selected
          ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
          : "border-border bg-card hover:shadow-sm"
      )}
    >
      {icon && (
        <div
          className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors",
            selected
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div
          className={cn(
            "font-semibold transition-colors",
            selected ? "text-primary" : "text-foreground"
          )}
        >
          {label}
        </div>
        {description && (
          <div className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
            {description}
          </div>
        )}
      </div>
      <div
        className={cn(
          "w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center transition-all",
          selected ? "border-primary bg-primary" : "border-muted-foreground/30"
        )}
      >
        {selected && <CheckCircle2 className="h-4 w-4 text-primary-foreground" />}
      </div>
    </motion.button>
  );
}

interface AnimatedSelectGroupProps {
  options: { value: string; label: string; description?: string; icon?: ReactNode }[];
  value: string;
  onChange: (value: string) => void;
  columns?: 1 | 2;
}

export function AnimatedSelectGroup({
  options,
  value,
  onChange,
  columns = 1,
}: AnimatedSelectGroupProps) {
  return (
    <div
      className={cn(
        "space-y-3",
        columns === 2 && "grid grid-cols-2 gap-3 space-y-0"
      )}
    >
      {options.map((option, index) => (
        <AnimatedOptionCard
          key={option.value}
          selected={value === option.value}
          onClick={() => onChange(option.value)}
          icon={option.icon}
          label={option.label}
          description={option.description}
          delay={index * 0.05}
        />
      ))}
    </div>
  );
}
