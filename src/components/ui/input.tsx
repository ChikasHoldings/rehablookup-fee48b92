import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // text-base on mobile (>=16px) blocks iOS Safari's tap-to-focus
          // auto-zoom — the page zooms in on focus but never snaps back,
          // which is the most common source of "page is jumping" reports
          // from iPhone users. md:text-sm preserves the tighter desktop
          // density. <Textarea> and <SelectTrigger> apply the same trick.
          "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-base md:text-sm shadow-sm transition-colors ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
