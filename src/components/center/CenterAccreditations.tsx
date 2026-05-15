/**
 * CenterAccreditations
 * ────────────────────
 * Badge grid showing each accreditation row with the issuing authority
 * subtitle and a "Verify with [authority] →" external link when a
 * public verifier exists. Cites the source so the credentials don't
 * look fabricated.
 */
import { ShieldCheck, ExternalLink } from "lucide-react";

interface VerifierLink {
  url: string;
  label: string;
}

// External public verifiers per accreditation. Pages without one show
// only the issuing-authority subtitle.
const VERIFIERS: Record<string, VerifierLink> = {
  "The Joint Commission (JCAHO)": {
    url: "https://www.qualitycheck.org/",
    label: "Verify with The Joint Commission",
  },
  "CARF International": {
    url: "https://carf.org/providersearch/",
    label: "Verify with CARF",
  },
  "SAMHSA-Listed": {
    url: "https://findtreatment.gov/",
    label: "Verify with SAMHSA",
  },
  "NAATP Member": {
    url: "https://www.naatp.org/membership/find-member",
    label: "Verify with NAATP",
  },
};

const AUTHORITIES: Record<string, string> = {
  "The Joint Commission (JCAHO)":
    "Independent healthcare accreditor — gold-standard for U.S. clinical facilities.",
  "CARF International":
    "Non-profit accreditor of health and human services worldwide.",
  "State Department of Health":
    "State-level health department licensure.",
  "State Substance Use Treatment Agency":
    "State agency licensure for substance-use treatment.",
  "State Mental Health Authority":
    "State mental-health authority licensure.",
  "SAMHSA-Listed":
    "Listed in the U.S. SAMHSA national treatment locator.",
  "NAATP Member":
    "Member of the National Association of Addiction Treatment Providers.",
};

interface CenterAccreditationsProps {
  accreditations: string[];
}

export function CenterAccreditations({ accreditations }: CenterAccreditationsProps) {
  if (accreditations.length === 0) return null;

  return (
    <section id="accreditations" className="scroll-mt-24">
      <h2 className="text-xl font-semibold text-slate-900 mb-4">Accreditations</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {accreditations.map((a) => {
          const verifier = VERIFIERS[a];
          const authority = AUTHORITIES[a] ?? "Issuing authority verifies provider standing.";
          return (
            <div key={a} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-start gap-2">
                <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-slate-900">{a}</h3>
                  <p className="mt-1 text-xs text-slate-600">{authority}</p>
                  {verifier && (
                    <a
                      href={verifier.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline"
                    >
                      {verifier.label}
                      <ExternalLink className="h-3 w-3" />
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
