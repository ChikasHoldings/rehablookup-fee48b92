import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { User, Phone, Zap, Clock, HeartHandshake, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface AdvisorTrustCardProps {
  advisorId: string | null;
  caseStatus: string;
}

export function AdvisorTrustCard({ advisorId, caseStatus }: AdvisorTrustCardProps) {
  // Fetch advisor display info
  const { data: advisor } = useQuery({
    queryKey: ["placement-advisor", advisorId],
    queryFn: async () => {
      if (!advisorId) return null;
      const { data, error } = await supabase
        .from("admin_user_profiles")
        .select("first_name, last_name, display_name, avatar_url")
        .eq("user_id", advisorId)
        .maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: !!advisorId,
    staleTime: 1000 * 60 * 10,
  });

  // Don't show if no advisor assigned yet or case is closed
  if (caseStatus === "closed" || caseStatus === "placed") return null;

  const advisorName = advisor
    ? advisor.display_name || `${advisor.first_name || ""} ${advisor.last_name || ""}`.trim()
    : null;

  const isAssigned = !!advisorId && !!advisorName;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-card to-primary/5 overflow-hidden">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start gap-3 sm:gap-4">
            {/* Advisor Avatar */}
            <div className="relative shrink-0">
              <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-primary/10 flex items-center justify-center">
                {advisor?.avatar_url ? (
                  <img src={advisor.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                ) : (
                  <User className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
                )}
              </div>
              {/* Online indicator */}
              <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-success border-2 border-background" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 space-y-2">
              {isAssigned ? (
                <>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      Your Placement Advisor
                    </p>
                    <p className="text-base sm:text-lg font-semibold text-foreground">
                      👤 {advisorName}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-success font-medium">
                    <Sparkles className="h-3.5 w-3.5" />
                    Actively working on your placement
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      Placement Team
                    </p>
                    <p className="text-base sm:text-lg font-semibold text-foreground">
                      📞 We're reviewing your case
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-primary font-medium">
                    <Clock className="h-3.5 w-3.5" />
                    An advisor will be assigned shortly
                  </div>
                </>
              )}

              {/* Trust signals */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Zap className="h-3 w-3 text-warning" />
                  <span>Avg placement: <strong className="text-foreground">24–72 hours</strong></span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <HeartHandshake className="h-3 w-3 text-primary" />
                  <span>500+ successful placements</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
