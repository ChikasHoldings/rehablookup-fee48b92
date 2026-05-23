import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";
import { Shield, MapPin } from "lucide-react";

interface InsuranceCarrierHeroProps {
  carrierName: string;
  carrierSlug?: string;
  logoSrc?: string;
  description?: string;
  headline?: string;
}

/**
 * InsuranceCarrierHero — shared directory-style hero for the 16
 * /insurance/<carrier>-rehab pages. Uses the same teal/cyan
 * financial-trust palette as the Insurance hub (src/pages/Insurance.tsx)
 * so each carrier page reads as a sibling of the index. Carrier logo
 * sits in a white tile inside the eyebrow chip for high contrast.
 *
 * Smaller hero footprint than the State hero per the brief
 * (py-6 md:py-8).
 */
export function InsuranceCarrierHero({
  carrierName,
  logoSrc,
  description,
  headline,
}: InsuranceCarrierHeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-white/5 bg-gradient-to-br from-slate-950 via-teal-900/80 to-cyan-700/55">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA0KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-100" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(20,184,166,0.12),_transparent_55%)]" />

      <div className="container relative z-10 py-6 md:py-8">
        <BreadcrumbNav
          className="mb-3 [&_*]:!text-white/70 [&_a:hover]:!text-white"
          items={[
            { label: "Insurance", href: "/insurance" },
            { label: `${carrierName} Rehab Coverage` },
          ]}
        />
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/95 px-2 py-1 ring-1 ring-teal-400/30 shadow-sm">
            {logoSrc && (
              <img
                src={logoSrc}
                alt={`${carrierName} logo`}
                className="h-5 w-auto max-w-[80px] object-contain"
              />
            )}
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-700 px-1">
              Major Insurance Carrier
            </span>
          </div>
          <h1 className="mb-2 font-display text-2xl font-bold text-white md:text-3xl lg:text-4xl">
            {headline ?? `${carrierName} Rehab Coverage`}
          </h1>
          {description && (
            <p className="text-sm md:text-base text-white/85 max-w-xl mx-auto">
              {description}
            </p>
          )}
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-2.5">
            <Button asChild size="default" variant="secondary" className="font-semibold gap-2 shadow-lg shadow-black/20">
              <Link to="/search-results">
                <MapPin className="h-4 w-4" />
                Find {carrierName}-Accepting Centers
              </Link>
            </Button>
            <Button asChild size="default" variant="outline" className="border-white/25 bg-white/5 text-white hover:bg-white/15 backdrop-blur-sm gap-2">
              <Link to="/insurance">
                <Shield className="h-4 w-4" />
                All Insurance Options
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
