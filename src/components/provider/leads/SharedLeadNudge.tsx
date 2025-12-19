import { Link } from "react-router-dom";
import { Star } from "lucide-react";

interface SharedLeadNudgeProps {
  className?: string;
}

/**
 * Soft inline upgrade nudge shown when a Professional plan user receives a shared lead.
 * Per spec: No modal, no pressure. Let experience sell it.
 */
export function SharedLeadNudge({ className }: SharedLeadNudgeProps) {
  return (
    <div className={className}>
      <p className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
        <Star className="h-3 w-3 text-amber-500 flex-shrink-0" />
        <span>
          This lead was shared.{" "}
          <Link 
            to="/provider/billing" 
            className="text-primary hover:underline font-medium"
          >
            Upgrade to Featured
          </Link>
          {" "}to receive exclusive leads only.
        </span>
      </p>
    </div>
  );
}
