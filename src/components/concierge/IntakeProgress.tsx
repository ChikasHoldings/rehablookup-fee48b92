import { motion } from "framer-motion";

interface IntakeProgressProps {
  currentStep: number;
  totalSteps: number;
}

/**
 * Simple "Step X of Y" progress bar with percentage. Mirrors the visual
 * treatment of `src/components/international/IntakeProgress.tsx` — kept
 * as a separate component so this file's changes don't risk regressions
 * in the international flow.
 */
export function IntakeProgress({ currentStep, totalSteps }: IntakeProgressProps) {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-muted-foreground">
          Step {currentStep} of {totalSteps}
        </span>
        <span className="text-sm font-medium text-primary">
          {Math.round(progress)}%
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-primary rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
