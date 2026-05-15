/**
 * CenterHero
 * ──────────
 * Full-width hero band beneath the breadcrumb. Two-column layout: gallery
 * (or large monogram fallback) on the left, name + meta + trust row on
 * the right. NO marketing copy in the hero — facts only.
 */
import { CheckCircle2, Star, ShieldCheck } from "lucide-react";
import { CenterMonogram } from "./CenterMonogram";

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

interface CenterHeroProps {
  facility: {
    id: string;
    name: string;
    city: string;
    state: string;
    facility_type: string | null;
    logo_url: string | null;
    gallery_urls: string[] | null;
    verified: boolean | null;
  };
  accreditations: string[];
  rating?: { value: number; count: number };
}

export function CenterHero({ facility, accreditations, rating }: CenterHeroProps) {
  const gallery = facility.gallery_urls ?? [];
  const hasImages = gallery.length > 0;
  const heroImage = hasImages ? gallery[0] : facility.logo_url ?? null;

  return (
    <section className="bg-slate-50 border-b border-slate-200">
      <div className="container mx-auto px-4 py-6 md:py-8">
        <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-8">
          {/* Left — gallery or monogram */}
          <div className="rounded-xl overflow-hidden bg-white border border-slate-200">
            {heroImage ? (
              <img
                src={heroImage}
                alt={`${facility.name} facility`}
                className="aspect-[4/3] w-full object-cover"
                width={640}
                height={480}
                loading="eager"
              />
            ) : (
              <CenterMonogram
                name={facility.name}
                id={facility.id}
                className="aspect-[4/3] w-full text-7xl"
              />
            )}
            {/* Gallery thumbnails — show up to 4 more if available */}
            {gallery.length > 1 && (
              <div className="grid grid-cols-4 gap-1 p-1">
                {gallery.slice(1, 5).map((url, i) => (
                  <img
                    key={url + i}
                    src={url}
                    alt=""
                    className="aspect-square w-full rounded object-cover"
                    width={120}
                    height={120}
                    loading="lazy"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right — name + meta + trust row */}
          <div className="flex flex-col justify-center">
            <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">
              {facility.name}
            </h1>
            <p className="mt-2 text-base text-slate-600">
              {facility.city}, {facility.state}
              {facility.facility_type && (
                <>
                  <span className="mx-2 text-slate-300">·</span>
                  {facility.facility_type}
                </>
              )}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              {facility.verified && (
                <span className="inline-flex items-center gap-1 text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-medium">Verified</span>
                </span>
              )}
              {rating && (
                <span className="inline-flex items-center gap-1 text-amber-600">
                  <Star className="h-4 w-4 fill-current" />
                  <span className="font-medium">{rating.value.toFixed(1)}</span>
                  <span className="text-slate-500">({rating.count})</span>
                </span>
              )}
            </div>
            {/* Trust row — up to 4 accreditation chips */}
            {accreditations.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {accreditations.slice(0, 4).map((a) => (
                  <span
                    key={a}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
                  >
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    {shortenAccreditation(a)}
                  </span>
                ))}
                {accreditations.length > 4 && (
                  <span className="self-center text-xs text-slate-500">
                    +{accreditations.length - 4} more
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
