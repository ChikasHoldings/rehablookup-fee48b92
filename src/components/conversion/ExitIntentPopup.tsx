import { useState } from "react";
import { useLocation } from "react-router-dom";
import { useExitIntent } from "@/hooks/useExitIntent";
import { QuickStartModal } from "./QuickStartModal";

/**
 * Routes where the exit-intent popup should NOT appear.
 * We suppress it on the concierge flow, provider dashboard, admin, and auth pages
 * to avoid interrupting users who are already converting.
 */
const SUPPRESSED_ROUTES = [
  "/concierge",
  "/provider",
  "/admin",
  "/account",
  "/login",
  "/signup",
  "/seeker/signup",
  "/provider-signup",
  "/provider/onboarding",
  "/lp/",
];

/**
 * Drop this component once anywhere in the app tree (e.g. inside the root layout
 * or App.tsx) and it will automatically show a quick-start modal when exit intent
 * is detected on eligible pages.
 */
export function ExitIntentPopup() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const isSuppressed = SUPPRESSED_ROUTES.some((r) =>
    location.pathname.startsWith(r)
  );

  useExitIntent({
    enabled: !isSuppressed,
    minTimeOnPage: 15000, // 15 seconds minimum on page
    storageKey: "exit_intent_shown",
    onExitIntent: () => setOpen(true),
  });

  if (isSuppressed) return null;

  return (
    <QuickStartModal
      open={open}
      onOpenChange={setOpen}
      source="exit_intent"
      headline="Wait — Don't Leave Without Getting Help"
      subheadline="Finding the right treatment center is hard. Let a free advisor do it for you — just leave your number and we'll call you back within minutes."
    />
  );
}
