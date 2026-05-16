import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

/**
 * Reusable disclosure tooltip for Featured placements. The same copy
 * appears in the rail header (and could appear per-card if we ever
 * decide to), so it lives in a single component to keep the wording
 * consistent.
 */
export function FeaturedTooltip() {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="About Featured placements"
            className="inline-flex items-center justify-center rounded p-0.5 text-slate-400 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B365D]"
          >
            <HelpCircle className="h-3.5 w-3.5" aria-hidden />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          align="start"
          className="max-w-xs text-xs leading-relaxed"
        >
          Featured facilities are paid placements. We don't take referral fees;
          facilities pay a flat monthly subscription for this slot. Calls go
          directly to them.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
