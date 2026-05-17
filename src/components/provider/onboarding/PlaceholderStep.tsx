import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface PlaceholderStepProps {
  title: string;
  /** Internal step name shown in the placeholder so reviewers can confirm
   *  routing is working before the real step is built in a follow-up. */
  serverStep: string;
  onBack?: () => void;
}

/**
 * Generic placeholder used for the verify_email / verify_phone /
 * find_or_list / plan / build steps until each section's real
 * implementation lands. The shell still routes to + from these
 * placeholders correctly so foundation-PR review can exercise the
 * stepper, the resume guard, and the back-navigation contract.
 */
export function PlaceholderStep({ title, serverStep, onBack }: PlaceholderStepProps) {
  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-xl sm:text-2xl font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-600">
          This step is coming in a follow-up PR. The wizard shell, stepper, and
          resume-on-refresh contract are already wired around it.
        </p>
      </header>

      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600">
        <p>
          <span className="font-medium text-slate-900">Server step:</span>{" "}
          <code className="rounded bg-white px-1.5 py-0.5 text-xs">{serverStep}</code>
        </p>
        <p className="mt-2 text-xs">
          Placeholder for the section build. The stepper above reflects the
          authoritative <code className="text-[10px]">provider_onboarding_state.current_step</code>{" "}
          from the database.
        </p>
      </div>

      {onBack && (
        <div className="flex items-center justify-start pt-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onBack}>
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Back
          </Button>
        </div>
      )}
    </div>
  );
}
