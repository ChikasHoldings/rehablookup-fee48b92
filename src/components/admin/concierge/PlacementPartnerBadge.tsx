import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ShieldCheck } from "lucide-react";

/**
 * Small "Placement Partner" badge surfaced on match-candidate rows.
 * Informational only — does NOT change ranking unless candidates are
 * otherwise equally qualified (PR-5's ranking handles that).
 *
 * Tooltip carries the EKRA-defensive framing so the advisor sees it
 * inline: partners pay a flat subscription, not per-introduction;
 * non-partner alternatives must still be presented.
 */
export function PlacementPartnerBadge() {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className="bg-[#1B365D] hover:bg-[#1B365D] text-[10px] font-semibold uppercase tracking-wide gap-1 cursor-default">
            <ShieldCheck className="h-3 w-3" aria-hidden />
            Placement Partner
          </Badge>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="start"
          className="max-w-xs text-xs leading-relaxed"
        >
          This facility is a RehabLookup Placement Partner — flat-fee
          subscription, prominently surfaced. Non-partner alternatives
          must still be presented.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
