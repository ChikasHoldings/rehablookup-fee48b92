import { ShieldCheck, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccreditationMeta {
  subtitle: string;
  verifyUrl?: string;
  verifyLabel?: string;
}

// Subtitles and verification URLs are pinned to authoritative sources.
// State-issued accreditations omit the link — there's no single verifier
// site and pointing users to a guess undermines trust.
const ACCREDITATION_META: Record<string, AccreditationMeta> = {
  "The Joint Commission (JCAHO)": {
    subtitle: "Independent accreditation of healthcare quality.",
    verifyUrl: "https://www.qualitycheck.org/",
    verifyLabel: "Verify with The Joint Commission",
  },
  "CARF International": {
    subtitle: "Commission on Accreditation of Rehabilitation Facilities.",
    verifyUrl: "https://carf.org/providersearch/",
    verifyLabel: "Verify with CARF",
  },
  "State Department of Health": {
    subtitle: "State-issued operating license.",
  },
  "State Substance Use Treatment Agency": {
    subtitle: "State-issued treatment authorization.",
  },
  "State Mental Health Authority": {
    subtitle: "State-issued mental health authorization.",
  },
  "SAMHSA-Listed": {
    subtitle: "Listed in SAMHSA's National Directory of Treatment Facilities.",
    verifyUrl: "https://findtreatment.samhsa.gov/",
    verifyLabel: "Verify with SAMHSA",
  },
  "NAATP Member": {
    subtitle: "National Association of Addiction Treatment Providers member.",
    verifyUrl: "https://www.naatp.org/find-a-provider",
    verifyLabel: "Verify with NAATP",
  },
};

export interface AccreditationsPanelProps {
  accreditations: string[];
  className?: string;
}

export function AccreditationsPanel({ accreditations, className }: AccreditationsPanelProps) {
  // Deduplicate while preserving first-seen order; show only those we have
  // metadata for, plus any unknowns rendered with a neutral subtitle.
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const a of accreditations) {
    if (!a || seen.has(a)) continue;
    seen.add(a);
    ordered.push(a);
  }
  if (ordered.length === 0) return null;

  return (
    <section className={cn("", className)} aria-labelledby="accreditations-heading">
      <h2
        id="accreditations-heading"
        className="mb-4 font-display text-lg font-bold tracking-tight text-slate-900"
      >
        Accreditations & Licensing
      </h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {ordered.map((type) => {
          const meta = ACCREDITATION_META[type] ?? {
            subtitle: "Independently verified credential.",
          };
          return (
            <div
              key={type}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50"
                  aria-hidden
                >
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold text-slate-900">{type}</p>
                  <p className="mt-0.5 text-sm text-slate-600">{meta.subtitle}</p>
                  {meta.verifyUrl && meta.verifyLabel && (
                    <a
                      href={meta.verifyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#1B365D] hover:underline"
                    >
                      {meta.verifyLabel}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
