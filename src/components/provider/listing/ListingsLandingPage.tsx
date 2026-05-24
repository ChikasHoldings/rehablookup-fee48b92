import { useState } from "react";
import {
  Building2,
  Loader2,
  AlertCircle,
  RefreshCw,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProviderFacilities } from "@/hooks/useProviderFacilities";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import { ListingCard } from "./ListingCard";
import { ListingPreviewModal } from "./ListingPreviewModal";

interface ListingsLandingPageProps {
  onEditListing: (facilityId: string) => void;
  onAddListing: () => void;
}

interface PreviewState {
  name: string;
  slug: string;
}

/**
 * Provider "My Listings" index — directory-style layout.
 *
 * Each facility renders as a compact row inside a single rounded
 * panel with hairline dividers (Healthgrades / Yelp pattern), instead
 * of separate floating cards. Header is a left-aligned eyebrow + h1
 * + count, with a right-aligned "Add a location" CTA. Paused
 * listings render in a second panel below a thin section divider
 * so the active set reads first.
 */
export function ListingsLandingPage({ onEditListing, onAddListing }: ListingsLandingPageProps) {
  const { facilities, isLoading, isError, refetch: refetchFacilities } = useProviderFacilities();
  const { setSelectedFacility } = useSelectedFacility();

  const active = facilities.filter((f) => !f.suspended);
  const paused = facilities.filter((f) => f.suspended);
  const total = facilities.length;

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFacility, setPreviewFacility] = useState<PreviewState | null>(null);

  const handleSelectFacility = (facilityId: string) => {
    const facility = facilities.find((f) => f.id === facilityId);
    if (!facility) return;
    // Suspended listings are read-only via the editor — block the
    // click so the user doesn't see a half-rendered editor then hit
    // the paused banner.
    if (facility.suspended) return;
    setSelectedFacility(facility);
    onEditListing(facilityId);
  };

  const handlePreview = (facility: { name: string; slug: string }) => {
    setPreviewFacility(facility);
    setPreviewOpen(true);
  };

  return (
    <div className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 md:py-8 lg:px-8">
        {/* Header strip */}
        <header className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Provider · Listings
            </p>
            <h1 className="mt-1 font-display text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              My listings
            </h1>
            <p className="mt-1 text-[13px] text-slate-600">
              {total === 0
                ? "Add your first facility to start receiving inquiries."
                : `${total} ${total === 1 ? "listing" : "listings"} · ${active.length} active${
                    paused.length > 0 ? ` · ${paused.length} paused` : ""
                  }`}
            </p>
          </div>
          {total > 0 && (
            <Button
              onClick={onAddListing}
              size="sm"
              className="self-start gap-1.5 bg-[#1B365D] text-white hover:bg-[#142a4a] sm:self-auto"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Add a location
            </Button>
          )}
        </header>

        {/* Body */}
        {isLoading ? (
          <div
            className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-20"
            aria-busy="true"
          >
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" aria-hidden />
            <span className="sr-only">Loading your facility listings…</span>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-16">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50">
              <AlertCircle className="h-6 w-6 text-rose-600" aria-hidden />
            </div>
            <div className="text-center">
              <h2 className="text-sm font-semibold text-slate-900">Couldn't load your listings</h2>
              <p className="mt-0.5 text-[13px] text-slate-600">
                There was a problem reaching the directory. Try again.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchFacilities()}
              className="border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Try again
            </Button>
          </div>
        ) : total === 0 ? (
          <EmptyState onAddListing={onAddListing} />
        ) : (
          <div className="space-y-6">
            {/* Active listings panel */}
            {active.length > 0 && (
              <section
                aria-labelledby="active-listings-heading"
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
              >
                <h2 id="active-listings-heading" className="sr-only">
                  Active listings
                </h2>
                <ul className="divide-y divide-slate-200">
                  {active.map((facility) => (
                    <li key={facility.id}>
                      <ListingCard
                        facility={facility}
                        onSelect={handleSelectFacility}
                        onPreview={handlePreview}
                        withinList
                      />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Paused listings panel — legacy state. Owners reactivate
                via support; kept visible so the rows aren't lost from
                the index. */}
            {paused.length > 0 && (
              <section
                aria-labelledby="paused-listings-heading"
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
              >
                <header className="flex items-center gap-2 border-b border-slate-200 bg-slate-50/60 px-4 py-2.5 sm:px-5">
                  <AlertCircle className="h-3.5 w-3.5 text-slate-500" aria-hidden />
                  <h2
                    id="paused-listings-heading"
                    className="text-[12px] font-semibold uppercase tracking-wider text-slate-600"
                  >
                    Paused listings
                  </h2>
                  <span className="text-[12px] text-slate-500">
                    (contact support to reactivate)
                  </span>
                </header>
                <ul className="divide-y divide-slate-200">
                  {paused.map((facility) => (
                    <li key={facility.id}>
                      <ListingCard
                        facility={facility}
                        onSelect={handleSelectFacility}
                        onPreview={handlePreview}
                        withinList
                      />
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>

      {previewFacility && (
        <ListingPreviewModal
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          facilityName={previewFacility.name}
          facilitySlug={previewFacility.slug}
        />
      )}
    </div>
  );
}

function EmptyState({ onAddListing }: { onAddListing: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
        <Building2 className="h-6 w-6 text-slate-500" aria-hidden />
      </div>
      <h2 className="text-base font-semibold text-slate-900">No listings yet</h2>
      <p className="mx-auto mt-1 max-w-md text-[13px] text-slate-600">
        Add your first facility to start receiving inquiries. The process
        takes about 10 minutes and our team reviews new listings within
        24-48 hours.
      </p>
      <Button
        onClick={onAddListing}
        className="mt-5 gap-1.5 bg-[#1B365D] text-white hover:bg-[#142a4a]"
      >
        <Plus className="h-4 w-4" aria-hidden />
        Add your first listing
      </Button>
    </div>
  );
}
