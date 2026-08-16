import { ShieldCheck, Scale, Users, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { useDirectoryStats } from "@/hooks/useDirectoryStats";

/**
 * Phase 5: homepage trust strip.
 *
 * COUNT SOURCE — public-safe by construction.
 * ──────────────────────────────────────────
 * This used to count `facilities` directly from the browser:
 *
 *   supabase.from("facilities").select("id", {count:"exact", head:true})
 *           .eq("verified", true)
 *
 * That was the last public anonymous consumer of the RAW base table, and it
 * was the reason the Pro-phone migration originally tried to keep an anon
 * "count-only safety net" grant on an internal provider record. It reads
 * through `useDirectoryStats` now — the same `public.get_directory_stats()`
 * RPC the hero badge and TrustRibbon already use, which counts
 * `public_facilities` and therefore needs no raw-table access at all.
 *
 * WHY THE METRIC CHANGED TOO.
 * The old query was also making a claim the data does not support. It counted
 * `facilities.verified = true` across every status, which is 5 rows on
 * production (3 of them approved and unsuspended) — so the strip rendered
 * "3+ Vetted treatment centers" against a 3,794-facility directory. And
 * `public_facilities.verified` is itself Pro-gated, so pointing the identical
 * `.eq("verified", true)` filter at the view would have silently turned a
 * directory count into an active-Pro count — currently zero. The honest,
 * already-canonical metric is directory size, which is what this now shows.
 * "Verified" as a listing badge stays what it is: a Pro-gated per-facility
 * signal, not a claim about the whole directory.
 */
export function TrustStrip() {
  const { stats } = useDirectoryStats();

  // Numbers we can stand behind even before inventory grows.
  const items: {
    icon: typeof ShieldCheck;
    value: string;
    label: string;
    href?: string;
    ariaLabel?: string;
  }[] = [
    {
      icon: ShieldCheck,
      value: stats ? `${stats.facilityCount.toLocaleString()}+` : "Nationwide",
      label: "Treatment centers listed",
    },
    {
      icon: MapPin,
      value: stats && stats.stateCount < 50 ? `${stats.stateCount}` : "All 50 + D.C.",
      label: "States covered",
    },
    { icon: Users, value: "Free", label: "Free to search" },
    {
      icon: Scale,
      value: "Transparent",
      label: "How we make money →",
      href: "/how-we-make-money",
      ariaLabel: "How RehabLookup makes money — EKRA transparency",
    },
  ];

  return (
    <section
      aria-labelledby="trust-strip-heading"
      className="border-y border-border bg-muted/40"
    >
      <div className="container mx-auto px-4 md:px-6 lg:px-8 py-8 sm:py-10 md:py-12">
        <header className="text-center mb-6 sm:mb-8 max-w-2xl mx-auto">
          <p className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-wide mb-2">
            Why families trust us
          </p>
          <h2
            id="trust-strip-heading"
            className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground"
          >
            A free, transparent treatment directory
          </h2>
        </header>
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6 max-w-5xl mx-auto">
          {items.map((item) => {
            const inner = (
              <>
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
              </>
            );
            const baseClass =
              "flex items-center gap-2.5 sm:gap-3 rounded-xl bg-background border border-border px-3 py-3 sm:px-4 sm:py-3.5";
            if (item.href) {
              return (
                <Link
                  key={item.label}
                  to={item.href}
                  aria-label={item.ariaLabel ?? item.label}
                  className={`${baseClass} hover:border-primary/40 hover:bg-primary/5 transition-colors`}
                >
                  {inner}
                </Link>
              );
            }
            return (
              <div key={item.label} className={baseClass}>
                {inner}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
