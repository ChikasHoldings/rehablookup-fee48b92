/**
 * CenterServices
 * ──────────────
 * Two-column chip grid:
 *   Left  — Evidence-Based Therapies (CBT, MAT, Dual Diagnosis, Trauma,
 *           Family/Group therapy, etc.)
 *   Right — Recovery Supports (Aftercare, 12-Step, etc.)
 *
 * Plus inline rows for Ages Served and Genders Served. Hides the whole
 * section if no services are populated.
 */

const LEVELS_OF_CARE = new Set([
  "Outpatient",
  "Intensive Outpatient (IOP)",
  "Partial Hospitalization (PHP)",
  "Detoxification",
  "Sober Living",
  "Telehealth/Virtual",
  "Residential",
]);

// Heuristic: anything that mentions a therapy modality / MAT / dual
// diagnosis goes in "Evidence-Based"; the rest (Aftercare, 12-Step,
// peer support) goes in "Recovery Supports".
function isEvidenceBased(service: string): boolean {
  return /CBT|cognitive|behavioral|trauma|family|group therapy|MAT|medication-assisted|dual diagnosis|EMDR|DBT|motivational/i.test(
    service,
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
      {label}
    </span>
  );
}

interface CenterServicesProps {
  services: string[];
  ageGroups: string[];
  genderServed: string | null;
}

export function CenterServices({ services, ageGroups, genderServed }: CenterServicesProps) {
  const supportServices = services.filter((s) => !LEVELS_OF_CARE.has(s));
  const therapies = supportServices.filter(isEvidenceBased);
  const supports = supportServices.filter((s) => !isEvidenceBased(s));

  if (
    therapies.length === 0 &&
    supports.length === 0 &&
    ageGroups.length === 0 &&
    !genderServed
  ) {
    return null;
  }

  return (
    <section id="services" className="scroll-mt-24">
      <h2 className="text-xl font-semibold text-slate-900 mb-4">Services &amp; Approaches</h2>
      <div className="grid gap-6 md:grid-cols-2">
        {therapies.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
              Evidence-Based Therapies
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {therapies.map((s) => (
                <Chip key={s} label={s} />
              ))}
            </div>
          </div>
        )}
        {supports.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
              Recovery Supports
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {supports.map((s) => (
                <Chip key={s} label={s} />
              ))}
            </div>
          </div>
        )}
      </div>
      {(ageGroups.length > 0 || genderServed) && (
        <div className="mt-5 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
          {ageGroups.length > 0 && (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Ages Served
              </dt>
              <dd className="mt-1 flex flex-wrap gap-1.5">
                {ageGroups.map((a) => (
                  <Chip key={a} label={a} />
                ))}
              </dd>
            </div>
          )}
          {genderServed && (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Genders Served
              </dt>
              <dd className="mt-1 text-sm text-slate-900">{genderServed}</dd>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
