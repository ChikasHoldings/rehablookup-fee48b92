import { Check, Circle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ReadinessCheck {
  key: string;
  label: string;
  description: string;
  complete: boolean;
  required: boolean;
  action?: () => void;
  actionLabel?: string;
}

interface PlacementReadinessChecklistProps {
  checks: ReadinessCheck[];
  onComplete?: () => void;
}

export function PlacementReadinessChecklist({
  checks,
  onComplete,
}: PlacementReadinessChecklistProps) {
  const requiredChecks = checks.filter((c) => c.required);
  const completedRequired = requiredChecks.filter((c) => c.complete).length;
  const allRequiredComplete = completedRequired === requiredChecks.length;
  const progress = requiredChecks.length > 0 ? (completedRequired / requiredChecks.length) * 100 : 0;

  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              Complete Setup to Receive Placements
            </CardTitle>
            <CardDescription className="mt-1">
              {allRequiredComplete
                ? "All requirements met! You're ready to receive placements."
                : `Complete the following steps to join the placement network`}
            </CardDescription>
          </div>
        </div>
        <div className="pt-2">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {completedRequired} of {requiredChecks.length} complete
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {checks.map((check) => (
          <div
            key={check.key}
            className={cn(
              "flex items-center justify-between p-3 rounded-lg border transition-colors",
              check.complete
                ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900"
                : "bg-card border-border"
            )}
          >
            <div className="flex items-center gap-3">
              {check.complete ? (
                <div className="h-6 w-6 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                  <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
              ) : (
                <div className="h-6 w-6 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center">
                  <Circle className="h-3 w-3 text-muted-foreground/30" />
                </div>
              )}
              <div>
                <p
                  className={cn(
                    "font-medium text-sm",
                    check.complete && "text-emerald-700 dark:text-emerald-400"
                  )}
                >
                  {check.label}
                  {check.required && !check.complete && (
                    <span className="text-destructive ml-1">*</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">{check.description}</p>
              </div>
            </div>
            {!check.complete && check.action && (
              <Button size="sm" variant="outline" onClick={check.action}>
                {check.actionLabel || "Complete"}
              </Button>
            )}
          </div>
        ))}

        {allRequiredComplete && onComplete && (
          <div className="pt-4">
            <Button onClick={onComplete} className="w-full">
              <Check className="h-4 w-4 mr-2" />
              Enable Placement Network
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
