import { useState } from "react";
import {
  Building2,
  Loader2,
  AlertCircle,
  RefreshCw,
  Plus,
  CheckCircle2,
  Clock,
  PauseCircle,
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

export function ListingsLandingPage({ onEditListing, onAddListing }: ListingsLandingPageProps) {
  const { facilities, isLoading, isError, refetch: refetchFacilities } = useProviderFacilities();
  const { setSelectedFacility } = useSelectedFacility();

  const active = facilities.filter((f) => !f.suspended);
  const paused = facilities.filter((f) => f.suspended);
  const live = active.filter((f) => f.status === "approved").length;
  const pending = active.filter((f) => f.status === "pending").length;
  const total = facilities.length;

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFacility, setPreviewFacility] = useState<PreviewState | null>(null);

  const handleSelectFacility = (facilityId: string) => {
    const facility = facilities.find((f) => f.id === facilityId);
    if (!facility) return;
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
      {/* Hero / Page header — white surface with subtle bottom border.
          Gives the page a real "top of the directory" weight before the
          listings grid begins. Stat tiles ride at the bottom of the
          hero so the operator sees the lifecycle of their listings at
          a glance. */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 md:py-9 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#1B365D]/70">
                My Listings
              </p>
              <h1 className="mt-1 font-display text-[28px] font-bold tracking-tight text-slate-900 sm:text-[32px]">
                Manage your facilities
              </h1>
              <p className="mt-1.5 max-w-xl text-[15px] text-slate-600">
                Update profile details, review your status, and add new locations.
                Listings are reviewed within 24-48 hours of submission.
              </p>
            </div>
            {total > 0 && (
              <Button
                onClick={onAddListing}
                className="h-11 gap-2 self-start bg-[#1B365D] px-5 text-[14px] font-semibold text-white shadow-sm hover:bg-[#142a4a] sm:self-auto"
              >
                <Plus className="h-4 w-4" aria-hidden />
                Add a location
              </Button>
            )}
          </div>

          {/* Lifecycle stat strip — only when the operator has at least
              one facility so the band doesn't render zeros to a brand-
              new provider. Three tiles, each a small status pill so the
              hero stays visually quiet. */}
          {total > 0 && (
            <div className="mt-6 grid grid-cols-3 gap-3 sm:max-w-2xl sm:gap-4">
              <StatTile
                label="Live"
                value={live}
                icon={CheckCircle2}
                iconBg="bg-emerald-50"
                iconColor="text-emerald-600"
              />
              <StatTile
                label="Under review"
                value={pending}
                icon={Clock}
                iconBg="bg-amber-50"
                iconColor="text-amber-600"
              />
              <StatTile
                label="Paused"
                value={paused.length}
                icon={PauseCircle}
                iconBg="bg-slate-100"
                iconColor="text-slate-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 md:py-8 lg:px-8">
        {isLoading ? (
          <div
            className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-24 shadow-sm"
            aria-busy="true"
          >
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" aria-hidden />
            <span className="sr-only">Loading your facility listings…</span>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-slate-200 bg-white py-20 shadow-sm">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-50">
              <AlertCircle className="h-7 w-7 text-rose-600" aria-hidden />
            </div>
            <div className="text-center">
              <h2 className="text-[16px] font-semibold text-slate-900">
                Couldn't load your listings
              </h2>
              <p className="mt-1 text-[14px] text-slate-600">
                There was a problem reaching the directory. Try again in a moment.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchFacilities()}
              className="border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="mr-1.5 h-4 w-4" aria-hidden />
              Try again
            </Button>
          </div>
        ) : total === 0 ? (
          <EmptyState onAddListing={onAddListing} />
        ) : (
          <div className="space-y-8">
            {/* Active listings */}
            {active.length > 0 && (
              <section aria-labelledby="active-listings-heading">
                <header className="mb-3 flex items-baseline justify-between">
                  <h2 id="active-listings-heading" className="text-[15px] font-semibold text-slate-900">
                    Your locations
                  </h2>
                  <span className="text-[13px] text-slate-500">
                    {active.length} {active.length === 1 ? "location" : "locations"}
                  </span>
                </header>
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
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
                </div>
              </section>
            )}

            {/* Paused listings */}
            {paused.length > 0 && (
              <section aria-labelledby="paused-listings-heading">
                <header className="mb-3 flex items-baseline justify-between">
                  <h2 id="paused-listings-heading" className="text-[15px] font-semibold text-slate-700">
                    Paused
                  </h2>
                  <span className="text-[13px] text-slate-500">
                    Contact support to reactivate
                  </span>
                </header>
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
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
                </div>
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

function StatTile({
  label,
  value,
  icon: Icon,
  iconBg,
  iconColor,
}: {
  label: string;
  value: number;
  icon: typeof CheckCircle2;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3.5">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${iconBg}`}>
        <Icon className={`h-4 w-4 ${iconColor}`} aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[20px] font-bold leading-tight tabular-nums text-slate-900">
          {value}
        </p>
        <p className="text-[12px] font-medium uppercase tracking-wide text-slate-500">
          {label}
        </p>
      </div>
    </div>
  );
}

function EmptyState({ onAddListing }: { onAddListing: () => void }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="bg-gradient-to-br from-slate-50 to-white px-8 py-16 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[#1B365D]/10">
          <Building2 className="h-7 w-7 text-[#1B365D]" aria-hidden />
        </div>
        <h2 className="text-[20px] font-bold text-slate-900">
          Add your first facility
        </h2>
        <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-slate-600">
          List your treatment center to start receiving inquiries from families.
          The process takes about 10 minutes and our team reviews new listings
          within 24-48 hours.
        </p>
        <Button
          onClick={onAddListing}
          className="mt-6 h-11 gap-2 bg-[#1B365D] px-5 text-[14px] font-semibold text-white shadow-sm hover:bg-[#142a4a]"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add your first listing
        </Button>
      </div>
    </div>
  );
}
