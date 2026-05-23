import * as React from "react";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const toggleVariants = cva(
  // Base text color set to `text-foreground` so callers don't need to
  // pass one in — and so the hover state has somewhere readable to
  // come from instead of inheriting whatever the parent set.
  // Previous version used `hover:bg-muted hover:text-muted-foreground`
  // on the base, which produced a gray-on-gray flash when the parent
  // text color was already muted.
  "inline-flex items-center justify-center rounded-md text-sm font-medium text-foreground ring-offset-background transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        // Same mobile/desktop tap-target split as Button: 44px on
        // touch viewports, 40px on ≥sm. `sm` and `lg` already pass
        // the 44px rule (or are explicitly opt-in compact for
        // admin-table densities).
        default: "h-11 px-3 sm:h-10",
        sm: "h-10 px-2.5 sm:h-9",
        lg: "h-11 px-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const Toggle = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants>
>(({ className, variant, size, ...props }, ref) => (
  <TogglePrimitive.Root ref={ref} className={cn(toggleVariants({ variant, size, className }))} {...props} />
));

Toggle.displayName = TogglePrimitive.Root.displayName;

export { Toggle, toggleVariants };
