import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Users, Sparkles, ArrowRight, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConciergeCTACardProps {
  className?: string;
  compact?: boolean;
}

export function ConciergeCTACard({ className, compact = false }: ConciergeCTACardProps) {
  return (
    <div 
      className={cn(
        "rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-primary/10 to-accent/5 p-5 shadow-sm overflow-hidden relative",
        className
      )}
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-10" />
      
      <div className="relative">
        <div className={cn("flex items-start gap-3", compact ? "mb-3" : "mb-4")}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-md shrink-0">
            <Users className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className={cn("font-display font-bold text-foreground", compact ? "text-sm" : "text-base")}>
              Need Help Choosing?
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Find the right treatment facility
            </p>
          </div>
        </div>

        {!compact && (
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>Personalized recommendations</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>Insurance verification included</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>Free facility tours coordination</span>
            </div>
          </div>
        )}

        <Link to="/concierge">
          <Button 
            size={compact ? "sm" : "default"}
            className={cn(
              "w-full gap-2 font-semibold shadow-md group",
              compact ? "h-9" : "h-11"
            )}
          >
            <Sparkles className="h-4 w-4" />
            Find Treatment
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Button>
        </Link>

        <p className="text-xs text-center text-muted-foreground mt-3">
          Our placement specialists are here to help
        </p>
      </div>
    </div>
  );
}
