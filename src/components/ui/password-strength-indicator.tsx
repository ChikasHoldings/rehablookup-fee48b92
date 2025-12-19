import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
  showRequirements?: boolean;
}

interface StrengthResult {
  score: number;
  label: string;
  color: string;
  requirements: {
    label: string;
    met: boolean;
  }[];
}

export function calculatePasswordStrength(password: string): StrengthResult {
  const requirements = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "Contains uppercase letter", met: /[A-Z]/.test(password) },
    { label: "Contains lowercase letter", met: /[a-z]/.test(password) },
    { label: "Contains a number", met: /[0-9]/.test(password) },
    { label: "Contains special character", met: /[^A-Za-z0-9]/.test(password) },
  ];

  const score = requirements.filter((r) => r.met).length;

  let label: string;
  let color: string;

  if (score === 0) {
    label = "";
    color = "bg-muted";
  } else if (score <= 2) {
    label = "Weak";
    color = "bg-destructive";
  } else if (score <= 3) {
    label = "Fair";
    color = "bg-yellow-500";
  } else if (score === 4) {
    label = "Good";
    color = "bg-blue-500";
  } else {
    label = "Strong";
    color = "bg-green-500";
  }

  return { score, label, color, requirements };
}

export function PasswordStrengthIndicator({
  password,
  className,
  showRequirements = true,
}: PasswordStrengthIndicatorProps) {
  const strength = useMemo(() => calculatePasswordStrength(password), [password]);

  if (!password) return null;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Password strength</span>
          {strength.label && (
            <span
              className={cn(
                "text-xs font-medium",
                strength.score <= 2 && "text-destructive",
                strength.score === 3 && "text-yellow-600 dark:text-yellow-400",
                strength.score === 4 && "text-blue-600 dark:text-blue-400",
                strength.score === 5 && "text-green-600 dark:text-green-400"
              )}
            >
              {strength.label}
            </span>
          )}
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((level) => (
            <div
              key={level}
              className={cn(
                "h-1 flex-1 rounded-full transition-all duration-300",
                level <= strength.score ? strength.color : "bg-muted"
              )}
            />
          ))}
        </div>
      </div>

      {/* Requirements Checklist */}
      {showRequirements && (
        <div className="grid grid-cols-1 gap-1">
          {strength.requirements.map((req) => (
            <div
              key={req.label}
              className={cn(
                "flex items-center gap-1.5 text-xs transition-colors duration-200",
                req.met ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
              )}
            >
              {req.met ? (
                <Check className="h-3 w-3" />
              ) : (
                <X className="h-3 w-3" />
              )}
              <span>{req.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
