import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // Size below is the visual height. Tap-target compliance is enforced
  // via `min-h-[44px]` on touch viewports — see size variants. Default
  // text color is set per variant so `ghost` / `link` don't silently
  // inherit a color that hover would then invert into a same-color
  // collision.
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-accent text-accent-foreground shadow-md hover:bg-accent/90 active:scale-[0.98]",
        primary:
          "bg-primary text-white shadow-md hover:bg-primary/90 active:scale-[0.98]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-md hover:bg-destructive/90",
        outline:
          // `text-foreground` at rest (was `text-accent`) so the button
          // is readable on both light and dark surfaces. `hover:text-
          // accent-foreground` paired with `hover:bg-accent` keeps high
          // contrast on hover (white-on-gold). Prior version had
          // gold-on-card at rest which washed out on the gold-tinted
          // hero card.
          "border-2 border-accent bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost:
          // Explicit baseline text color (was relying on inheritance).
          // Prevents the "ghost button on a muted card flashes
          // muted-on-muted on hover" failure mode the audit found at
          // CustomerRepDashboard / AdvisorInbox / SmokeTestRunner.
          "text-foreground hover:bg-secondary hover:text-secondary-foreground",
        link:
          "text-accent underline-offset-4 hover:underline",
        success:
          "bg-accent text-accent-foreground shadow-md hover:bg-accent/90 active:scale-[0.98]",
        warning:
          "bg-warning text-warning-foreground shadow-md hover:bg-warning/90 active:scale-[0.98]",
        hero:
          "bg-accent text-accent-foreground shadow-lg hover:bg-accent/90 active:scale-[0.98]",
        "hero-secondary":
          // Hover bg bumped from primary/5 → primary/10 so the text
          // visibly settles on hover instead of feeling like nothing
          // happened. Still light enough that the blue text stays
          // readable.
          "bg-transparent text-primary border-2 border-primary hover:bg-primary/10",
        "hero-light":
          "bg-card text-accent shadow-lg hover:bg-card/90 active:scale-[0.98]",
      },
      size: {
        // Default: mobile gets 44px (iOS tap-target minimum), desktop
        // tightens to 40px to keep dense form rows from feeling chunky.
        default: "h-11 px-5 py-2.5 sm:h-10",
        // sm: secondary actions; bumped from h-9 → h-10 on mobile so
        // even compact buttons hit ~40px (still below 44px, but the
        // ones using `size="sm"` are almost always desktop-leaning
        // controls — bulk listing actions, admin tables).
        sm: "h-10 rounded-md px-4 text-xs sm:h-9",
        lg: "h-11 rounded-lg px-6 text-sm",
        xl: "h-12 rounded-xl px-8 text-base",
        // Icon button gets the same mobile / desktop split as default.
        icon: "h-11 w-11 sm:h-10 sm:w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
