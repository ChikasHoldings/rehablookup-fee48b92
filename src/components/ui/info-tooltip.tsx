import type { ReactNode } from "react";
import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface InfoTooltipProps {
  /** Tooltip body — kept short and plain so buyers aren't confused. */
  children: ReactNode;
  /** Accessible label for the trigger button. */
  label?: string;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  className?: string;
}

/**
 * Small "?" disclosure tooltip used across the marketing/add-on surfaces so
 * providers understand exactly what each option includes before they buy.
 * Tap/click + hover both open it (Radix handles focus + touch).
 */
export function InfoTooltip({
  children,
  label = "More information",
  side = "top",
  align = "center",
  className,
}: InfoTooltipProps) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={label}
            className={cn(
              "inline-flex items-center justify-center rounded p-0.5 text-slate-400 align-middle hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B365D]",
              className,
            )}
          >
            <HelpCircle className="h-3.5 w-3.5" aria-hidden />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side={side}
          align={align}
          className="max-w-xs text-xs leading-relaxed"
        >
          {children}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
