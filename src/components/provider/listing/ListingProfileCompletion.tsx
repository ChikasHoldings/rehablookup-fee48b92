import { Sparkles, CheckCircle, CircleCheck, CircleDashed } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface CompletionItem {
  key: string;
  label: string;
  completed: boolean;
}

interface ListingProfileCompletionProps {
  percentage: number;
  items: CompletionItem[];
  onItemClick?: (key: string) => void;
}

function CompletionItemRow({
  label,
  completed,
  onClick
}: {
  label: string;
  completed: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 w-full text-left py-2 px-3 rounded-lg transition-all duration-200",
        completed
          ? "text-muted-foreground"
          : "text-foreground hover:bg-muted/50 hover:translate-x-0.5"
      )}
    >
      {completed ? (
        <CircleCheck className="h-4 w-4 text-green-600 shrink-0" />
      ) : (
        <CircleDashed className="h-4 w-4 text-muted-foreground shrink-0" />
      )}
      <span className={cn("text-xs font-medium", completed && "line-through opacity-60")}>
        {label}
      </span>
    </button>
  );
}

export function ListingProfileCompletion({
  percentage,
  items,
  onItemClick
}: ListingProfileCompletionProps) {
  const incompleteItems = items.filter(item => !item.completed);
  const completeItems = items.filter(item => item.completed);

  return (
    <Card className="border-border/60 shadow-sm overflow-hidden">
      <CardHeader className="pb-4 bg-gradient-to-br from-primary/5 via-transparent to-accent/5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <span>Profile Strength</span>
          </CardTitle>
          <Badge
            variant={percentage === 100 ? "default" : "secondary"}
            className={cn(
              "text-sm font-bold px-3 py-1",
              percentage === 100 && "bg-green-500 hover:bg-green-500/90"
            )}
          >
            {percentage}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="space-y-2">
          <Progress
            value={percentage}
            className="h-2.5"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{completeItems.length} of {items.length} completed</span>
            {percentage < 100 && (
              <span className="text-primary font-medium">
                {incompleteItems.length} remaining
              </span>
            )}
          </div>
        </div>

        {percentage < 100 ? (
          <div className="space-y-1 pt-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Incomplete Items
            </p>
            <div className="space-y-0.5 max-h-[200px] overflow-y-auto">
              {incompleteItems.map((item) => (
                <CompletionItemRow
                  key={item.key}
                  label={item.label}
                  completed={item.completed}
                  onClick={() => onItemClick?.(item.key)}
                />
              ))}
            </div>
            {completeItems.length > 0 && (
              <>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-4 mb-3">
                  Completed
                </p>
                <div className="space-y-0.5">
                  {completeItems.slice(0, 3).map((item) => (
                    <CompletionItemRow
                      key={item.key}
                      label={item.label}
                      completed={item.completed}
                    />
                  ))}
                  {completeItems.length > 3 && (
                    <p className="text-xs text-muted-foreground pl-3 py-1">
                      +{completeItems.length - 3} more completed
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-200 dark:border-green-800">
            <div className="h-10 w-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                Profile Complete!
              </p>
              <p className="text-xs text-green-600 dark:text-green-500">
                Your listing is fully optimized for visibility
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
