/**
 * FacilityCard
 * ────────────
 * Premium directory card used on State / City / County / Treatment-type /
 * Insurance / Demographic / Homepage-featured pages.
 *
 * Deliberately NOT used on /search-results — that surface keeps its own
 * SearchResultCard. They serve different intents (browse vs. search).
 *
 * Reads from the public_facilities view (one row prop) plus four
 * side-table arrays (services / insurance / age groups / accreditations).
 * Parent pages should batch those via useFacilityChildData() to avoid
 * N+1 queries.
 */

import { Link } from "react-router-dom";
import { CheckCircle2, Phone, Heart, GitCompare, Star, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

// Subset of fields the card actually reads. Both PublicFacilitySnapshot
// (legacy snapshot rows) and PublicFacility (view rows) satisfy this
// shape after a light adapter — keep this narrow so call sites can pass
// either source.
export interface FacilityCardData {
  id: string;
  name: string;
  slug: string | null;
  city: string;
  state: string;
  facility_type: string | null;
  description: string | null;
  logo_url: string | null;
  phone: string | null;
  verified: boolean | null;
  is_claimed?: boolean;
}

// Levels-of-care taxonomy. Anything from facility_services in this set
// is rendered in the "Levels of Care" row; everything else falls into
// "Specialties".
const LEVELS_OF_CARE = new Set([
  "Outpatient",
  "Intensive Outpatient (IOP)",
  "Partial Hospitalization (PHP)",
  "Detoxification",
  "Sober Living",
  "Telehealth/Virtual",
  "Residential",
]);

// Soft-tinted monogram palette for facilities without a logo. The tile
// color is deterministic from the id hash so the same facility always
// renders the same color (helps with visual recognition on re-visit).
const MONOGRAM_PALETTE: ReadonlyArray<readonly [string, string]> = [
  ["bg-emerald-50", "text-emerald-700"],
  ["bg-sky-50", "text-sky-700"],
  ["bg-amber-50", "text-amber-700"],
  ["bg-rose-50", "text-rose-700"],
  ["bg-violet-50", "text-violet-700"],
  ["bg-teal-50", "text-teal-700"],
  ["bg-orange-50", "text-orange-700"],
  ["bg-indigo-50", "text-indigo-700"],
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function Monogram({ name, id, className }: { name: string; id: string; className?: string }) {
  const palette = MONOGRAM_PALETTE[hashStr(id) % MONOGRAM_PALETTE.length];
  const [bg, fg] = palette;
  const initial = (name?.trim()?.[0] ?? "?").toUpperCase();
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-lg text-2xl font-semibold shrink-0",
        bg,
        fg,
        className,
      )}
      aria-hidden="true"
    >
      {initial}
    </div>
  );
}

// Accreditation labels are long (e.g. "The Joint Commission (JCAHO)"); we
// shorten them to fit the chip. Unknown values pass through unchanged.
function shortenAccreditation(label: string): string {
  switch (label) {
    case "The Joint Commission (JCAHO)":
      return "Joint Commission";
    case "CARF International":
      return "CARF-Accredited";
    case "State Department of Health":
    case "State Substance Use Treatment Agency":
    case "State Mental Health Authority":
      return "State-Licensed";
    case "SAMHSA-Listed":
      return "SAMHSA-Listed";
    case "NAATP Member":
      return "NAATP";
    default:
      return label;
  }
}

function TrustBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700">
      <ShieldCheck className="h-3 w-3 text-emerald-600" />
      {shortenAccreditation(label)}
    </span>
  );
}

function FactRow({ label, values, max = 3 }: { label: string; values: string[]; max?: number }) {
  if (!values.length) return null;
  const shown = values.slice(0, max);
  const more = values.length - shown.length;
  return (
    <div className="grid grid-cols-[110px_1fr] items-baseline gap-2">
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-900">
        {shown.join(" · ")}
        {more > 0 && <span className="ml-1.5 text-xs text-slate-500">+{more} more</span>}
      </dd>
    </div>
  );
}

export interface FacilityCardProps {
  facility: FacilityCardData;
  services?: string[];
  insurance?: string[];
  ageGroups?: string[];
  accreditations?: string[];
  rating?: { value: number; count: number };
  className?: string;
  /** Render the subtle "Featured" badge + tracks impression position.
   *  Optional and defaults off so existing usages render byte-identically. */
  featured?: boolean;
  /** Overrides the facility's default phone for the Call CTA. Used by
   *  Featured rendering to display the facility's verified_phone when
   *  has_facility_verified_contact is true. Falls back to facility.phone
   *  when null/undefined. */
  phoneOverride?: string | null;
  /** Fire-and-forget click handler for the Call CTA. Featured rendering
   *  wires this to log to featured_phone_clicks. MUST NOT block or
   *  preventDefault — the dialer should always open natively. */
  onPhoneClick?: () => void;
}

export function FacilityCard({
  facility,
  services = [],
  insurance = [],
  ageGroups = [],
  accreditations = [],
  rating,
  className,
  featured = false,
  phoneOverride,
  onPhoneClick,
}: FacilityCardProps) {
  const levels = services.filter((s) => LEVELS_OF_CARE.has(s));
  const specialties = services.filter((s) => !LEVELS_OF_CARE.has(s));
  const isUnclaimed = facility.is_claimed === false;
  const profileHref = facility.slug ? `/center/${facility.slug}` : "#";

  return (
    <article
      className={cn(
        "group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-lg",
        className,
      )}
    >
      {/* Header row: logo/monogram + name + meta + utility buttons */}
      <div className="flex items-start gap-4">
        {facility.logo_url ? (
          <img
            src={facility.logo_url}
            alt={`${facility.name} logo`}
            className="h-20 w-20 shrink-0 rounded-lg object-cover"
            width={80}
            height={80}
            loading="lazy"
          />
        ) : (
          <Monogram name={facility.name} id={facility.id} className="h-20 w-20" />
        )}
        <div className="min-w-0 flex-1">
          {featured && (
            <span className="inline-flex items-center rounded-md bg-[#1B365D] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white mb-1.5">
              Featured
            </span>
          )}
          <div className="flex items-start justify-between gap-3">
            <h3 className="truncate text-lg font-semibold text-slate-900">
              <Link to={profileHref} className="hover:text-emerald-700">
                {facility.name}
              </Link>
            </h3>
            <div className="flex shrink-0 items-center gap-1 text-slate-400">
              <button
                type="button"
                aria-label="Save facility"
                className="rounded p-1 hover:bg-slate-100"
              >
                <Heart className="h-4 w-4 hover:text-rose-500" />
              </button>
              <button
                type="button"
                aria-label="Add to compare"
                className="rounded p-1 hover:bg-slate-100"
              >
                <GitCompare className="h-4 w-4 hover:text-emerald-600" />
              </button>
            </div>
          </div>
          <p className="mt-0.5 text-sm text-slate-600">
            {facility.city}, {facility.state}
            {facility.facility_type && (
              <>
                <span className="mx-1.5 text-slate-300">·</span>
                {facility.facility_type}
              </>
            )}
          </p>
          <div className="mt-1.5 flex items-center gap-3 text-xs">
            {rating && (
              <span className="flex items-center gap-1 text-amber-600">
                <Star className="h-3.5 w-3.5 fill-current" />
                <span className="font-medium">{rating.value.toFixed(1)}</span>
                <span className="text-slate-400">({rating.count})</span>
              </span>
            )}
            {facility.verified && (
              <span className="flex items-center gap-1 text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span className="font-medium">Verified</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Trust row */}
      {accreditations.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {accreditations.slice(0, 3).map((a) => (
            <TrustBadge key={a} label={a} />
          ))}
          {accreditations.length > 3 && (
            <span className="self-center text-xs text-slate-500">
              +{accreditations.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Key facts grid — label/value rows. Each row hidden when empty. */}
      <dl className="mt-4 space-y-1.5">
        <FactRow label="Levels of Care" values={levels} max={3} />
        <FactRow label="Specialties" values={specialties} max={3} />
        <FactRow label="Ages" values={ageGroups} max={4} />
        <FactRow label="Insurance" values={insurance} max={4} />
      </dl>

      {/* Description preview — 2-line clamp. */}
      {facility.description && (
        <p className="mt-4 line-clamp-2 text-sm text-slate-600">{facility.description}</p>
      )}

      {/* CTAs */}
      <div className="mt-5 flex gap-2">
        <Link
          to={profileHref}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-[#1B365D] px-4 py-2 text-sm font-medium text-white hover:bg-[#142a4a]"
        >
          View Profile →
        </Link>
        {isUnclaimed ? (
          <Link
            to={
              facility.id
                ? `/provider/onboarding?intent=claim&facility_id=${facility.id}`
                : "/provider/onboarding"
            }
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
          >
            Claim This Listing
          </Link>
        ) : (phoneOverride ?? facility.phone) ? (
          <a
            href={`tel:${phoneOverride ?? facility.phone}`}
            onClick={onPhoneClick}
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
          >
            <Phone className="h-4 w-4" />
            Call
          </a>
        ) : null}
      </div>
    </article>
  );
}
