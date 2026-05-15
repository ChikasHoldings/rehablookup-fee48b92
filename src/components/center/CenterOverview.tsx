/**
 * CenterOverview
 * ──────────────
 * "About" section. Renders facility.description verbatim — the SAMHSA
 * import generates a 7-sentence custom paragraph per facility, so we
 * surface it as-is. No marketing prose layer on top.
 */
interface CenterOverviewProps {
  name: string;
  description: string | null;
  city: string;
  state: string;
  facilityType: string | null;
}

export function CenterOverview({
  name,
  description,
  city,
  state,
  facilityType,
}: CenterOverviewProps) {
  // Defensive fallback for facilities without a generated description.
  // Keeps it factual: no "Take the first step toward recovery!" filler.
  const fallback = `${name} provides addiction treatment services${facilityType ? ` as a ${facilityType.toLowerCase()}` : ""} in ${city}, ${state}.`;

  return (
    <section id="overview" className="scroll-mt-24">
      <h2 className="text-xl font-semibold text-slate-900 mb-3">About {name}</h2>
      <div className="prose prose-slate max-w-none text-base leading-relaxed text-slate-700">
        <p>{description || fallback}</p>
      </div>
    </section>
  );
}
