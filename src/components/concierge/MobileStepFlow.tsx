import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import { scrollToTopSmooth } from "@/hooks/useScrollToTop";

interface MobileStepFlowProps {
  currentStep: number;
  totalSteps: number;
  stepTitle: string;
  stepDescription?: string;
  stepIcon?: string;
  children: ReactNode;
  onNext: () => void;
  onPrev: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  isSubmitting?: boolean;
  canProceed?: boolean;
  nextLabel?: string;
}

export function MobileStepFlow({
  currentStep,
  totalSteps,
  stepTitle,
  stepDescription,
  stepIcon,
  children,
  onNext,
  onPrev,
  isFirstStep,
  isLastStep,
  isSubmitting,
  canProceed = true,
  nextLabel,
}: MobileStepFlowProps) {
  const progress = (currentStep / totalSteps) * 100;

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? "100%" : "-100%",
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? "100%" : "-100%",
      opacity: 0,
    }),
  };

  return (
    <div className="flex flex-col min-h-[60vh]">
      {/* Progress Bar - Sleek animated */}
      <div className="mb-6">
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
        <div className="flex items-center justify-between mt-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={currentStep}
            className="flex items-center gap-2"
          >
            {stepIcon && <span className="text-xl">{stepIcon}</span>}
            <span className="text-sm font-semibold text-foreground">{stepTitle}</span>
          </motion.div>
          <span className="text-xs text-muted-foreground font-medium">
            {currentStep} of {totalSteps}
          </span>
        </div>
      </div>

      {/* Step Description */}
      {stepDescription && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          key={`desc-${currentStep}`}
          className="text-sm text-muted-foreground mb-6"
        >
          {stepDescription}
        </motion.p>
      )}

      {/* Content Area with Animation */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait" custom={1}>
          <motion.div
            key={currentStep}
            custom={1}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            className="h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center gap-3 mt-6 pt-4 border-t">
        <Button
          type="button"
          variant="ghost"
          size="lg"
          onClick={() => {
            onPrev();
            scrollToTopSmooth();
          }}
          disabled={isFirstStep || isSubmitting}
          className={cn(
            "flex-1 h-12 rounded-xl transition-all",
            isFirstStep && "opacity-0 pointer-events-none"
          )}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        <Button
          type="button"
          size="lg"
          onClick={() => {
            onNext();
            scrollToTopSmooth();
          }}
          disabled={!canProceed || isSubmitting}
          className="flex-[2] h-12 rounded-xl font-semibold shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : isLastStep ? (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {nextLabel || "Submit"}
            </>
          ) : (
            <>
              {nextLabel || "Continue"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
