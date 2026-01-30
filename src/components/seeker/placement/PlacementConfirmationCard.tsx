import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle, 
  ArrowRight, 
  Clock,
  Sparkles,
  PartyPopper
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PlacementConfirmationCardProps {
  type: "ready" | "awaiting_provider" | "confirmed";
  onConfirm?: () => void;
  facilityName?: string;
}

export function PlacementConfirmationCard({ type, onConfirm, facilityName }: PlacementConfirmationCardProps) {
  if (type === "confirmed") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur">
                <PartyPopper className="h-8 w-8" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  Successfully Placed
                  <Sparkles className="h-5 w-5" />
                </h3>
                <p className="text-emerald-100 mt-1">
                  Congratulations! You've been admitted to {facilityName || "your chosen facility"}.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (type === "awaiting_provider") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/20 dark:border-amber-900">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/50 rounded-2xl">
              <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-800 dark:text-amber-300">
                Awaiting Facility Confirmation
              </h3>
              <p className="text-sm text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                You've confirmed your admission. We're waiting for the facility to confirm as well.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // type === "ready"
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <CheckCircle className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">Ready to Confirm?</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Have you been admitted to one of the matched facilities? Let us know!
              </p>
            </div>
            <Button onClick={onConfirm} className="gap-2 shrink-0">
              Confirm My Admission
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
