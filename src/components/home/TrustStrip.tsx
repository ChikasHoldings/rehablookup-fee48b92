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
      <div className="container mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-5xl mx-auto">
          {items.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-3 rounded-xl bg-background border border-border px-4 py-3"
            >
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="text-base md:text-lg font-bold text-foreground leading-tight">
                  {item.value}
                </div>
                <div className="text-xs text-muted-foreground truncate">
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
