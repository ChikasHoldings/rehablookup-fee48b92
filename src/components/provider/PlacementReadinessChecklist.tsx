import { Check, Circle, ListChecks } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

  return (
    <Card className="mb-8 border-border">
      <CardHeader className="pb-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-950 flex items-center justify-center shrink-0">
            <ListChecks className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <CardTitle className="text-base">Setup Checklist</CardTitle>
            <CardDescription className="mt-0.5">
              Complete these steps to join the network
            </CardDescription>
          </div>
        </div>
        
        {/* Progress indicator */}
        <div className="flex items-center gap-2 mt-4">
          {requiredChecks.map((check, i) => (
            <div
              key={check.key}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                check.complete ? "bg-emerald-500" : "bg-muted"
              )}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {completedRequired} of {requiredChecks.length} complete
        </p>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-2">
        {checks.map((check, index) => (
          <div
            key={check.key}
            className={cn(
              "flex items-center justify-between p-3 rounded-lg border transition-colors",
              check.complete
                ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900"
                : "bg-card border-border hover:bg-muted/50"
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-xs font-medium",
                check.complete 
                  ? "bg-emerald-500 text-white" 
                  : "bg-muted text-muted-foreground"
              )}>
                {check.complete ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  index + 1
                )}
              </div>
              <div>
                <p className={cn(
                  "font-medium text-sm",
                  check.complete ? "text-emerald-700 dark:text-emerald-400" : "text-foreground"
                )}>
                  {check.label}
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
          <div className="pt-3">
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
