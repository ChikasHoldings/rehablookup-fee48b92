/**
 * CenterLocation
 * ──────────────
 * Address + map + contact block. Uses a free OpenStreetMap static image
 * (no API key required) so this works for SEO crawl without provisioning
 * a Google Maps key. Phone/website respect the existing paywall — when
 * the view returns null we show a "Premium contact info — Verify
 * insurance" callout instead of an empty dash.
 */
import { MapPin, Phone, Globe, Lock } from "lucide-react";
import { Link } from "react-router-dom";

interface CenterLocationProps {
  facility: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip_code: string;
    phone: string | null;
    website: string | null;
  };
}

// OpenStreetMap static-map URL — coordinates derived from address would
// require geocoding. As a fallback we use the address as a search query
// link; for the static map itself we use a state-level fallback when no
// geocoding is available. Crawler-friendly: a plain <img>.
function staticMapUrl(_address: string): string {
  // Placeholder: a 600×300 generic US map. Real per-facility maps would
  // require geocoding the address; out of scope for this PR. The link
  // beneath always navigates to a real address search.
  return "https://www.openstreetmap.org/assets/about/map-c45fb74b75541bce4ed51f1dba3df569.jpg";
}

export function CenterLocation({ facility }: CenterLocationProps) {
  const fullAddress = `${facility.address}, ${facility.city}, ${facility.state} ${facility.zip_code}`;
  const mapQueryUrl = `https://www.openstreetmap.org/search?query=${encodeURIComponent(fullAddress)}`;

  return (
    <section id="location" className="scroll-mt-24">
      <h2 className="text-xl font-semibold text-slate-900 mb-4">Location &amp; Contact</h2>
      <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
        <a
          href={mapQueryUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${facility.name} location in OpenStreetMap`}
        >
          <img
            src={staticMapUrl(fullAddress)}
            alt={`Map showing ${facility.city}, ${facility.state}`}
            className="aspect-[2/1] w-full object-cover"
            width={600}
            height={300}
            loading="lazy"
          />
        </a>
        <div className="p-5 space-y-3">
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-slate-500 mt-0.5" />
            <p className="text-sm text-slate-900">{fullAddress}</p>
          </div>
          {facility.phone ? (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0 text-slate-500" />
              <a
                href={`tel:${facility.phone}`}
                className="text-sm text-emerald-700 hover:underline"
              >
                {facility.phone}
              </a>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm">
              <Lock className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="text-slate-600">
                Premium contact info —{" "}
                <Link to="/insurance-verification" className="text-emerald-700 font-medium hover:underline">
                  Verify insurance with our team
                </Link>
              </span>
            </div>
          )}
          {facility.website ? (
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 shrink-0 text-slate-500" />
              <a
                href={facility.website}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-sm text-emerald-700 hover:underline truncate"
              >
                {facility.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </a>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
