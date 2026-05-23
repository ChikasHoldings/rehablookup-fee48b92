import { CheckCircle2, ShieldCheck, MapPin, Lock } from "lucide-react";
import { useCountUp } from "@/hooks/useCountUp";
import { useDirectoryStats } from "@/hooks/useDirectoryStats";

/**
 * Quiet reassurance bar rendered directly under the hero. NOT a
 * marketing surface — slate-50 background, small uppercase facts.
 *
 * Both the facility count here and the hero trust-bar count above
 * source from `useDirectoryStats`, which reads a build-time-inlined
 * `<meta name="rl:stats">` for instant first paint then refreshes
 * from `public.get_directory_stats`. No more drift between the two
 * surfaces — they always agree.
 */
export function TrustRibbon() {
  const { stats } = useDirectoryStats();
  const count = useCountUp({ to: stats?.facilityCount ?? 0 });
  return (
    <section
      aria-label="Trust signals"
      className="bg-slate-50 border-y border-slate-200"
    >
      <div className="container mx-auto px-4 md:px-6 lg:px-8 py-3">
        <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs sm:text-sm text-slate-700">
          <li
            ref={count.ref as React.RefObject<HTMLLIElement>}
            className="flex items-center gap-1.5"
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-[#1B365D]" aria-hidden />
            <strong
              className="font-semibold tabular-nums text-slate-900"
              aria-busy={!stats}
            >
              {stats ? `${count.value.toLocaleString()}+` : (
                <span className="inline-block h-[1em] w-[3em] align-middle rounded bg-slate-200" aria-hidden />
              )}
            </strong>
            <span>verified facilities</span>
          </li>
          <li className="hidden sm:block w-px h-4 bg-slate-300" aria-hidden />
          <li className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-[#1B365D]" aria-hidden />
            <span>
              {stats && stats.stateCount < 50
                ? `${stats.stateCount} states covered`
                : "All 50 states + D.C. covered"}
            </span>
          </li>
          <li className="hidden sm:block w-px h-4 bg-slate-300" aria-hidden />
          <li className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-[#1B365D]" aria-hidden />
            <span>Joint Commission · CARF · SAMHSA listed</span>
          </li>
          <li className="hidden sm:block w-px h-4 bg-slate-300" aria-hidden />
          <li className="flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-[#1B365D]" aria-hidden />
            <span>100% Free &amp; Confidential</span>
          </li>
        </ul>
      </div>
    </section>
  );
}
