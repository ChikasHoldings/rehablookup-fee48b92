import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Switch — pill-shaped on/off toggle.
 *
 * Sizing notes:
 *   - `default` (24×44) is the new baseline (was 20×36). The previous
 *     20px height + 36px width gave a sub-44px tap area on mobile,
 *     which caused mis-toggles on the seeker notification-preference
 *     page and the provider Settings page (per the buttons-and-
 *     toggles audit 2026-05-23). 24×44 matches the shadcn / iOS
 *     default and clears the 44px iOS tap-target rule horizontally.
 *   - `sm` (20×36) is the legacy size, available for desktop-dense
 *     admin tables where the new default crowds the row.
 *   - `lg` (28×52) is for hero / settings surfaces where the switch
 *     IS the primary control on the screen.
 */
const switchTrackVariants = cva(
  "peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-inner transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
  {
    variants: {
      size: {
        sm: "h-5 w-9",
        default: "h-6 w-11",
        lg: "h-7 w-[52px]",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

const switchThumbVariants = cva(
  "pointer-events-none block rounded-full bg-background shadow-md ring-0 transition-transform duration-200 ease-in-out",
  {
    variants: {
      size: {
        // Thumb diameter = track height − 4 (2px border each side).
        sm: "h-3.5 w-3.5 data-[state=checked]:translate-x-[14px] data-[state=unchecked]:translate-x-0",
        default: "h-5 w-5 data-[state=checked]:translate-x-[20px] data-[state=unchecked]:translate-x-0",
        lg: "h-6 w-6 data-[state=checked]:translate-x-[24px] data-[state=unchecked]:translate-x-0",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

interface SwitchProps
  extends React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>,
    VariantProps<typeof switchTrackVariants> {}

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  SwitchProps
>(({ className, size, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(switchTrackVariants({ size }), className)}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb className={cn(switchThumbVariants({ size }))} />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
