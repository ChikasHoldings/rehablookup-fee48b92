import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  ShieldCheck,
  Star,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { ProviderPageHeader } from "@/components/provider/ProviderPageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import { useProStatus } from "@/hooks/useProStatus";
import { ProgramsManagementSection } from "@/components/provider/listing/ProgramsManagementSection";
import { AmenitiesManagementSection } from "@/components/provider/listing/AmenitiesManagementSection";
import { MediaUrlsSection } from "@/components/provider/listing/MediaUrlsSection";
import { StaffManagementSection } from "@/components/provider/listing/StaffManagementSection";

type Tab = "programs" | "amenities" | "media" | "accreditations" | "staff";

const TABS: { id: Tab; label: string }[] = [
  { id: "programs", label: "Programs" },
  { id: "amenities", label: "Amenities" },
  { id: "media", label: "Video & Tour" },
  { id: "accreditations", label: "Accreditations" },
  { id: "staff", label: "Staff" },
];

/**
 * /provider/listings/profile — rich-profile editor for the currently
 * selected facility. Programs, amenities, video + virtual tour URLs,
 * and accreditation highlight toggles all live here. The base
 * facility-level fields (name, address, services, insurance, staff,
 * etc.) are still edited from /provider/listings.
 *
 * Pro gating: the UI lets Free facilities author content here so they
 * don't lose work — but the public profile only renders it when Pro
 * is active. Gating is enforced server-side by the
 * public_facility_* views; this page renders contextual upgrade
 * prompts only as a UX hint.
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function EnhancedProfile() {
  const { selectedFacility } = useSelectedFacility();
  const [searchParams] = useSearchParams();
  // Prefer ?facility=<uuid> when present (so the "Enhanced profile" link
  // from inside a specific listing editor lands on THAT facility),
  // otherwise fall back to the header-selected facility.
  const urlFacility = searchParams.get("facility");
  const urlFacilityIsValid = !!urlFacility && UUID_PATTERN.test(urlFacility);
  const facilityId = urlFacilityIsValid ? urlFacility : selectedFacility?.id;
  const { data: proStatus } = useProStatus(facilityId);
  const isPro = proStatus?.isPro ?? false;

  const [activeTab, setActiveTab] = useState<Tab>("programs");

  if (!facilityId) {
    // No facility selected → bounce back to the listings page where the
    // facility selector lives. This mirrors the pattern used by the
    // other Pro provider pages (MarketingFeatured, MarketingConcierge).
    return <Navigate to="/provider/listings" replace />;
  }

  return (
    <>
      <Helmet>
        <title>Enhanced profile | RehabLookup Provider</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-full bg-slate-50">
        <ProviderPageHeader
          title="Enhanced profile"
          description="Add programs, amenities, video, and accreditations. Pro facilities show all of this on the public listing."
          icon={<Building2 className="h-4 w-4" />}
          backTo="/provider/listings"
          backLabel="My Listings"
          actions={
            isPro ? (
              <Badge className="bg-emerald-600 hover:bg-emerald-600">Pro · live</Badge>
            ) : (
              <Button asChild size="sm" className="bg-amber-500 hover:bg-amber-600 text-white gap-1.5">
                <Link to="/provider/billing?upgrade=pro">
                  <Sparkles className="h-3.5 w-3.5" />
                  Upgrade to Pro
                </Link>
              </Button>
            )
          }
        />

        <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8 space-y-5">
          {/* Tab strip */}
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <nav
              className="flex gap-1 w-max md:w-full border-b border-border"
              role="tablist"
              aria-label="Profile sections"
            >
              {TABS.map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={activeTab === t.id}
                  aria-controls={`profile-panel-${t.id}`}
                  id={`profile-tab-${t.id}`}
                  onClick={() => setActiveTab(t.id)}
                  className={
                    "px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors " +
                    (activeTab === t.id
                      ? "border-[#1B365D] text-[#1B365D]"
                      : "border-transparent text-slate-600 hover:text-slate-900")
                  }
                >
                  {t.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Panels */}
          <Card>
            <CardContent className="pt-6">
              <div
                id="profile-panel-programs"
                role="tabpanel"
                aria-labelledby="profile-tab-programs"
                hidden={activeTab !== "programs"}
              >
                <ProgramsManagementSection facilityId={facilityId} isPro={isPro} />
              </div>

              <div
                id="profile-panel-amenities"
                role="tabpanel"
                aria-labelledby="profile-tab-amenities"
                hidden={activeTab !== "amenities"}
              >
                <AmenitiesManagementSection facilityId={facilityId} isPro={isPro} />
              </div>

              <div
                id="profile-panel-media"
                role="tabpanel"
                aria-labelledby="profile-tab-media"
                hidden={activeTab !== "media"}
              >
                <MediaUrlsPanel facilityId={facilityId} isPro={isPro} />
              </div>

              <div
                id="profile-panel-accreditations"
                role="tabpanel"
                aria-labelledby="profile-tab-accreditations"
                hidden={activeTab !== "accreditations"}
              >
                <AccreditationHighlightPanel facilityId={facilityId} isPro={isPro} />
              </div>

              <div
                id="profile-panel-staff"
                role="tabpanel"
                aria-labelledby="profile-tab-staff"
                hidden={activeTab !== "staff"}
              >
                {/* Staff is Pro-only on the public profile (the
                    public_facility_staff view filters by has_active_pro).
                    The editor lets Free providers prepare staff entries
                    so nothing is lost on upgrade, mirroring the
                    programs/amenities pattern. The wrapping component
                    was originally collapsible; the tab parent already
                    controls visibility, so we keep it permanently
                    expanded with a no-op toggle. */}
                <StaffManagementSection
                  facilityId={facilityId}
                  isExpanded={true}
                  onToggle={() => {
                    /* tab-controlled — no-op */
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

/* ─── Media URLs panel — wraps the section with a fetch for the
       current values stored on the facilities row. */

function MediaUrlsPanel({ facilityId, isPro }: { facilityId: string; isPro: boolean }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["facility-media-urls", facilityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facilities")
        .select("video_url, virtual_tour_url")
        .eq("id", facilityId)
        .maybeSingle();
      if (error) throw error;
      return data ?? { video_url: null, virtual_tour_url: null };
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <MediaUrlsSection
      facilityId={facilityId}
      isPro={isPro}
      initialVideoUrl={(data?.video_url as string | null) ?? null}
      initialVirtualTourUrl={(data?.virtual_tour_url as string | null) ?? null}
      onSaved={() => {
        queryClient.invalidateQueries({ queryKey: ["facility-media-urls", facilityId] });
        // Public surface caches keyed by facility ID — invalidate so the
        // public profile picks up the new URLs on next navigation.
        queryClient.invalidateQueries({ queryKey: ["facility-by-slug"] });
      }}
    />
  );
}

/* ─── Accreditation highlight panel — toggles is_highlighted on
       existing facility_accreditations rows. We don't manage CRUD here
       (admins ingest and verify accreditations); providers just curate
       which ones to feature on their Pro profile. */

interface AccreditationRow {
  id: string;
  accreditation_type: string;
  issuing_authority: string | null;
  verified: boolean | null;
  verification_url: string | null;
  is_highlighted: boolean;
}

function AccreditationHighlightPanel({
  facilityId,
  isPro,
}: {
  facilityId: string;
  isPro: boolean;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["facility-accreditations-edit", facilityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facility_accreditations")
        .select("id, accreditation_type, issuing_authority, verified, verification_url, is_highlighted")
        .eq("facility_id", facilityId)
        .order("verified", { ascending: false })
        .order("accreditation_type", { ascending: true });
      if (error) throw error;
      return (data ?? []) as AccreditationRow[];
    },
  });

  const highlightCount = useMemo(
    () => rows.filter((r) => r.is_highlighted).length,
    [rows],
  );
  const HIGHLIGHT_CAP = 4;

  const toggle = async (row: AccreditationRow) => {
    if (!row.is_highlighted && highlightCount >= HIGHLIGHT_CAP) {
      toast({
        title: `Up to ${HIGHLIGHT_CAP} highlighted`,
        description: "Unhighlight one first to feature a different accreditation.",
      });
      return;
    }
    const { error } = await supabase
      .from("facility_accreditations")
      .update({ is_highlighted: !row.is_highlighted })
      .eq("id", row.id);
    if (error) {
      toast({
        title: "Couldn't update highlight",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["facility-accreditations-edit", facilityId] });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">Accreditation showcase</h2>
        <p className="text-sm text-muted-foreground">
          Highlight up to {HIGHLIGHT_CAP} of your verified accreditations to
          feature them prominently on your Pro profile. The rest still
          render in the standard accreditations list.
        </p>
      </div>

      {!isPro && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200/60 bg-amber-50/60 p-3 text-sm">
          <Sparkles className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" aria-hidden />
          <p className="text-amber-900 leading-relaxed">
            The showcase row renders on Pro profiles only. You can still
            mark highlights here — they activate when Pro does.
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground border border-dashed rounded-lg">
          <ShieldCheck className="h-10 w-10 mx-auto mb-2 opacity-50" aria-hidden />
          <p className="text-sm font-medium text-foreground">No accreditations on file</p>
          <p className="text-xs mt-1 max-w-sm mx-auto">
            Add accreditations from the Credentials tab on your listing — once
            verified, they'll show up here for highlighting.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground tabular-nums">
            {highlightCount} / {HIGHLIGHT_CAP} highlighted
          </p>
          {rows.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => toggle(r)}
              className={
                "w-full text-left rounded-lg border p-4 flex items-center gap-3 transition-colors " +
                (r.is_highlighted
                  ? "border-amber-300 bg-amber-50/70 hover:bg-amber-100/60"
                  : "border-slate-200 hover:bg-slate-50")
              }
            >
              <Star
                className={
                  "h-4 w-4 shrink-0 " +
                  (r.is_highlighted ? "fill-amber-500 text-amber-500" : "text-slate-300")
                }
                aria-hidden
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {r.accreditation_type}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {r.issuing_authority || "—"}
                  {r.verified ? " · Verified" : " · Pending verification"}
                </p>
              </div>
              {r.verification_url && (
                <a
                  href={r.verification_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-muted-foreground hover:text-[#1B365D]"
                  aria-label="Open verification link"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
              <Badge
                variant={r.is_highlighted ? "default" : "outline"}
                className={
                  "text-xs shrink-0 " +
                  (r.is_highlighted ? "bg-amber-500 hover:bg-amber-500" : "")
                }
              >
                {r.is_highlighted ? "Highlighted" : "Feature"}
              </Badge>
            </button>
          ))}
        </div>
      )}

      {isLoading ? null : (
        <p className="text-xs text-muted-foreground">
          Need to add or update an accreditation?{" "}
          <Link to="/provider/listings" className="text-[#1B365D] underline-offset-2 hover:underline">
            Go to the Credentials tab
          </Link>
          .
        </p>
      )}
    </div>
  );
}
