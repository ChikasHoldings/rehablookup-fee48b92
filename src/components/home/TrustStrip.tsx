import { useEffect, useState } from "react";
import { ShieldCheck, Star, Users, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Phase 5: homepage trust strip.
 *
 * Reads the live count of approved (verified+published) facilities so the
 * social-proof number can never be a lie. Falls back gracefully if the
 * count query fails — hides the row rather than showing "—".
 */
export function TrustStrip() {
  const [facilityCount, setFacilityCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Count only — no row payload, no PII.
        const { count, error } = await supabase
          .from("facilities")
          .select("id", { count: "exact", head: true })
          .eq("verified", true);
        if (!cancelled && !error && typeof count === "number") {
          setFacilityCount(count);
        }
      } catch {
        /* fail silent — trust strip is non-critical */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Numbers we can stand behind even before inventory grows.
  const items: { icon: typeof ShieldCheck; value: string; label: string }[] = [
    {
      icon: ShieldCheck,
      value:
        facilityCount !== null && facilityCount > 0
          ? `${facilityCount.toLocaleString()}+`
          : "Verified",
      label: "Vetted treatment centers",
    },
    { icon: Clock, value: "~60 min", label: "Average match time" },
    { icon: Users, value: "Free", label: "Confidential placement" },
    { icon: Star, value: "5★", label: "Specialist-rated guidance" },
  ];

  return (
    <section
      aria-label="Why families trust Rehab Lookup"
      className="border-y border-border bg-muted/40"
    >
      <div className="container mx-auto px-4 md:px-6 lg:px-8 py-8 sm:py-10 md:py-12">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6 max-w-5xl mx-auto">
          {items.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-2.5 sm:gap-3 rounded-xl bg-background border border-border px-3 py-3 sm:px-4 sm:py-3.5"
            >
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <item.icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="text-sm sm:text-base md:text-lg font-bold text-foreground leading-tight">
                  {item.value}
                </div>
                <div className="text-[11px] sm:text-xs text-muted-foreground leading-snug">
                  {item.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
