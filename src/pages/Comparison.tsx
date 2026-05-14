import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  GitCompare,
  MapPin,
  Phone,
  Globe,
  Star,
  CheckCircle2,
  Building2,
  ShieldCheck,
  X,
  Trash2,
  ArrowLeft,
  Plus,
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";
import { supabase } from "@/integrations/supabase/client";
import { useCompareList, MAX_COMPARE } from "@/hooks/useCompareList";

interface CompareFacility {
  id: string;
  name: string;
  slug: string | null;
  city: string | null;
  state: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  description: string | null;
  facility_type: string | null;
  gender_served: string | null;
  bed_count: string | null;
  year_established: number | null;
  verified: boolean | null;
  is_claimed: boolean | null;
  is_pro: boolean | null;
  logo_url: string | null;
  gallery_urls: string[] | null;
}

interface CompareDetails {
  facility: CompareFacility;
  services: string[];
  insurance: string[];
  accreditations: string[];
}

async function fetchCompareData(ids: string[]): Promise<CompareDetails[]> {
  if (ids.length === 0) return [];

  const [facilitiesRes, servicesRes, insuranceRes, accreditationsRes] = await Promise.all([
    supabase
      .from("public_facilities")
      .select(
        "id, name, slug, city, state, address, phone, website, description, facility_type, gender_served, bed_count, year_established, verified, is_claimed, is_pro, logo_url, gallery_urls"
      )
      .in("id", ids)
      .eq("status", "active"),
    supabase.from("facility_services").select("facility_id, service_name").in("facility_id", ids),
    supabase.from("facility_insurance").select("facility_id, insurance_name").in("facility_id", ids),
    supabase
      .from("facility_accreditations")
      .select("facility_id, accreditation_type, verified")
      .in("facility_id", ids)
      .eq("verified", true),
  ]);

  const fmap = new Map<string, CompareFacility>(
    (facilitiesRes.data ?? []).map((f) => [f.id, f as CompareFacility])
  );

  const groupBy = <T extends { facility_id: string }>(
    rows: T[] | null,
    key: keyof T
  ): Record<string, string[]> => {
    const out: Record<string, string[]> = {};
    for (const r of rows ?? []) {
      const v = r[key];
      if (typeof v !== "string") continue;
      (out[r.facility_id] ??= []).push(v);
    }
    return out;
  };

  const servicesByFacility = groupBy(servicesRes.data as Array<{ facility_id: string; service_name: string }> | null, "service_name");
  const insuranceByFacility = groupBy(insuranceRes.data as Array<{ facility_id: string; insurance_name: string }> | null, "insurance_name");
  const accredByFacility = groupBy(accreditationsRes.data as Array<{ facility_id: string; accreditation_type: string }> | null, "accreditation_type");

  // Preserve the selection order from compareIds
  return ids
    .map((id) => {
      const f = fmap.get(id);
      if (!f) return null;
      return {
        facility: f,
        services: Array.from(new Set(servicesByFacility[id] ?? [])).sort(),
        insurance: Array.from(new Set(insuranceByFacility[id] ?? [])).sort(),
        accreditations: Array.from(new Set(accredByFacility[id] ?? [])).sort(),
      };
    })
    .filter((v): v is CompareDetails => v !== null);
}

function FacilityHeader({
  details,
  onRemove,
}: {
  details: CompareDetails;
  onRemove: () => void;
}) {
  const { facility } = details;
  const facilityPath = facility.slug ? `/center/${facility.slug}` : "#";
  return (
    <div className="flex flex-col gap-2 p-3 sm:p-4 border-b border-border bg-card sticky top-0 z-10">
      <div className="flex items-start justify-between gap-2">
        {facility.logo_url ? (
          <img
            src={facility.logo_url}
            alt={`${facility.name} logo`}
            className="h-10 w-10 sm:h-12 sm:w-12 rounded-md object-contain bg-white border border-border shrink-0"
            loading="lazy"
          />
        ) : (
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-md bg-muted shrink-0 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        <button
          type="button"
          onClick={onRemove}
          className="text-muted-foreground hover:text-rose-500 transition-colors"
          aria-label={`Remove ${facility.name} from compare`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <Link to={facilityPath} className="block group">
        <h3 className="text-sm sm:text-base font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-tight">
          {facility.name}
        </h3>
        {(facility.city || facility.state) && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <MapPin className="h-3 w-3 shrink-0" />
            {[facility.city, facility.state].filter(Boolean).join(", ")}
          </p>
        )}
      </Link>
      <div className="flex items-center gap-1.5 flex-wrap">
        {facility.verified && (
          <Badge variant="outline" className="gap-1 border-emerald-300 text-emerald-700 text-[10px] px-1.5 py-0">
            <ShieldCheck className="h-2.5 w-2.5" />
            Verified
          </Badge>
        )}
        {facility.is_pro && (
          <Badge variant="outline" className="border-amber-300 text-amber-700 text-[10px] px-1.5 py-0">
            Pro
          </Badge>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  children,
  count,
}: {
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className="grid items-stretch border-b border-border last:border-b-0"
      style={{ gridTemplateColumns: `minmax(120px, 200px) repeat(${count}, minmax(180px, 1fr))` }}
    >
      <div className="bg-muted/30 p-3 sm:p-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground border-r border-border">
        {label}
      </div>
      {children}
    </div>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return <div className="p-3 sm:p-4 text-sm text-foreground border-r border-border last:border-r-0">{children}</div>;
}

function NullCell() {
  return (
    <Cell>
      <span className="text-xs text-muted-foreground italic">Not listed</span>
    </Cell>
  );
}

function TagList({ items, max = 6 }: { items: string[]; max?: number }) {
  if (items.length === 0) return <span className="text-xs text-muted-foreground italic">Not listed</span>;
  const visible = items.slice(0, max);
  const remainder = items.length - visible.length;
  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((t) => (
        <Badge key={t} variant="secondary" className="text-[11px] font-medium">
          {t}
        </Badge>
      ))}
      {remainder > 0 && (
        <Badge variant="outline" className="text-[11px]">
          +{remainder} more
        </Badge>
      )}
    </div>
  );
}

function SkeletonGrid({ count }: { count: number }) {
  return (
    <div
      className="grid border border-border rounded-xl overflow-hidden bg-card"
      style={{ gridTemplateColumns: `minmax(120px, 200px) repeat(${count}, minmax(180px, 1fr))` }}
    >
      {Array.from({ length: 6 * (count + 1) }).map((_, i) => (
        <div key={i} className="p-3 sm:p-4 border-b border-r border-border last:border-r-0">
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
}

export default function Comparison() {
  const [params, setParams] = useSearchParams();
  const { compareIds, removeFromCompare, clearCompare } = useCompareList();

  // Allow ?ids=a,b,c as a deep-link / share-friendly fallback so that
  // someone sending a link doesn't depend on the recipient's localStorage.
  const queryIds = useMemo(() => {
    const raw = params.get("ids");
    if (!raw) return [] as string[];
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => /^[0-9a-f-]{36}$/i.test(s))
      .slice(0, MAX_COMPARE);
  }, [params]);

  const effectiveIds = queryIds.length > 0 ? queryIds : compareIds;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["compare-data", effectiveIds],
    queryFn: () => fetchCompareData(effectiveIds),
    enabled: effectiveIds.length > 0,
  });

  const facilities = data ?? [];
  const count = facilities.length;

  // Build a shareable canonical url with the current ids (deduplicates
  // bookmarking + sharing). We don't push history on every change to avoid
  // back-button noise.
  const handleShare = () => {
    const url = `${window.location.origin}/compare?ids=${effectiveIds.join(",")}`;
    if (navigator.share) {
      navigator.share({ title: "Compare rehab facilities — RehabLookup", url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).catch(() => {});
    }
  };

  const handleRemove = (id: string) => {
    if (queryIds.length > 0) {
      // When operating on a deep link, mutate the URL instead of the user's list.
      const next = effectiveIds.filter((x) => x !== id);
      if (next.length === 0) {
        setParams({});
      } else {
        setParams({ ids: next.join(",") });
      }
    } else {
      void removeFromCompare(id);
    }
  };

  return (
    <Layout>
      <SEO
        title="Compare Rehab Centers Side-by-Side | RehabLookup"
        description="Compare addiction-treatment facilities side-by-side — levels of care, insurance accepted, accreditations, and contact info — to find the right fit."
        canonical="/compare"
        noindex
      />

      <section className="bg-muted/30 border-b border-border">
        <div className="container py-6 sm:py-8">
          <BreadcrumbNav
            className="mb-3"
            items={[
              { label: "Home", href: "/" },
              { label: "Compare" },
            ]}
          />
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground flex items-center gap-2">
                <GitCompare className="h-6 w-6 text-primary" />
                Compare Treatment Centers
              </h1>
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                Side-by-side view of levels of care, accepted insurance, accreditations, and contact details.
                Compare up to {MAX_COMPARE} at a time.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild size="sm" variant="outline">
                <Link to="/rehab-centers" className="gap-1.5">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Browse facilities
                </Link>
              </Button>
              {count > 0 && (
                <>
                  <Button size="sm" variant="outline" onClick={handleShare}>
                    Share
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => clearCompare()} className="gap-1.5">
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="container py-6 sm:py-8">
        {effectiveIds.length === 0 ? (
          <EmptyState />
        ) : isLoading ? (
          <SkeletonGrid count={effectiveIds.length} />
        ) : isError || count === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Couldn't load the selected facilities. They may have been removed or set to inactive.
            </CardContent>
          </Card>
        ) : (
          <div className="border border-border rounded-xl overflow-x-auto bg-card">
            <div className="min-w-fit">
              {/* Header row */}
              <div
                className="grid"
                style={{ gridTemplateColumns: `minmax(120px, 200px) repeat(${count}, minmax(220px, 1fr))` }}
              >
                <div className="bg-muted/30 p-3 sm:p-4 border-r border-border border-b">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Facility</p>
                </div>
                {facilities.map((d) => (
                  <div key={d.facility.id} className="border-r border-border last:border-r-0 border-b">
                    <FacilityHeader details={d} onRemove={() => handleRemove(d.facility.id)} />
                  </div>
                ))}
              </div>

              <Row label="Location" count={count}>
                {facilities.map((d) => (
                  <Cell key={d.facility.id}>
                    {d.facility.address ? (
                      <div className="space-y-0.5">
                        <p>{d.facility.address}</p>
                        {(d.facility.city || d.facility.state) && (
                          <p className="text-xs text-muted-foreground">
                            {[d.facility.city, d.facility.state].filter(Boolean).join(", ")}
                          </p>
                        )}
                      </div>
                    ) : (d.facility.city || d.facility.state) ? (
                      <p>{[d.facility.city, d.facility.state].filter(Boolean).join(", ")}</p>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Not listed</span>
                    )}
                  </Cell>
                ))}
              </Row>

              <Row label="Facility type" count={count}>
                {facilities.map((d) =>
                  d.facility.facility_type ? (
                    <Cell key={d.facility.id}>
                      <span className="capitalize">{d.facility.facility_type.replace(/[-_]/g, " ")}</span>
                    </Cell>
                  ) : (
                    <NullCell key={d.facility.id} />
                  )
                )}
              </Row>

              <Row label="Gender served" count={count}>
                {facilities.map((d) =>
                  d.facility.gender_served ? (
                    <Cell key={d.facility.id}>
                      <span className="capitalize">{d.facility.gender_served.replace(/[-_]/g, " ")}</span>
                    </Cell>
                  ) : (
                    <NullCell key={d.facility.id} />
                  )
                )}
              </Row>

              <Row label="Bed count" count={count}>
                {facilities.map((d) =>
                  d.facility.bed_count ? (
                    <Cell key={d.facility.id}>{d.facility.bed_count}</Cell>
                  ) : (
                    <NullCell key={d.facility.id} />
                  )
                )}
              </Row>

              <Row label="Year established" count={count}>
                {facilities.map((d) =>
                  d.facility.year_established ? (
                    <Cell key={d.facility.id}>{d.facility.year_established}</Cell>
                  ) : (
                    <NullCell key={d.facility.id} />
                  )
                )}
              </Row>

              <Row label="Levels of care" count={count}>
                {facilities.map((d) => (
                  <Cell key={d.facility.id}>
                    <TagList items={d.services} />
                  </Cell>
                ))}
              </Row>

              <Row label="Insurance accepted" count={count}>
                {facilities.map((d) => (
                  <Cell key={d.facility.id}>
                    <TagList items={d.insurance} />
                  </Cell>
                ))}
              </Row>

              <Row label="Accreditations" count={count}>
                {facilities.map((d) =>
                  d.accreditations.length > 0 ? (
                    <Cell key={d.facility.id}>
                      <div className="flex flex-col gap-1">
                        {d.accreditations.map((a) => (
                          <div key={a} className="flex items-center gap-1.5 text-xs">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                            <span>{a}</span>
                          </div>
                        ))}
                      </div>
                    </Cell>
                  ) : (
                    <NullCell key={d.facility.id} />
                  )
                )}
              </Row>

              <Row label="Contact" count={count}>
                {facilities.map((d) => (
                  <Cell key={d.facility.id}>
                    <div className="flex flex-col gap-1.5">
                      {d.facility.phone ? (
                        <a
                          href={`tel:${d.facility.phone}`}
                          className="text-sm text-primary hover:underline flex items-center gap-1.5"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          {d.facility.phone}
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground italic flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5" />
                          Not listed
                        </span>
                      )}
                      {d.facility.website ? (
                        <a
                          href={d.facility.website}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="text-sm text-primary hover:underline flex items-center gap-1.5 truncate"
                        >
                          <Globe className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">Website</span>
                        </a>
                      ) : null}
                    </div>
                  </Cell>
                ))}
              </Row>

              <Row label="Description" count={count}>
                {facilities.map((d) =>
                  d.facility.description ? (
                    <Cell key={d.facility.id}>
                      <p className="text-sm text-foreground line-clamp-6">{d.facility.description}</p>
                    </Cell>
                  ) : (
                    <NullCell key={d.facility.id} />
                  )
                )}
              </Row>

              {/* Action row */}
              <Row label="Take action" count={count}>
                {facilities.map((d) => {
                  const path = d.facility.slug ? `/center/${d.facility.slug}` : "#";
                  return (
                    <Cell key={d.facility.id}>
                      <div className="flex flex-col gap-1.5">
                        <Button asChild size="sm" className="w-full">
                          <Link to={path}>View profile</Link>
                        </Button>
                        <Button asChild size="sm" variant="outline" className="w-full">
                          <Link to={`/concierge?facility=${encodeURIComponent(d.facility.id)}`}>
                            Get matched
                          </Link>
                        </Button>
                      </div>
                    </Cell>
                  );
                })}
              </Row>
            </div>
          </div>
        )}

        {effectiveIds.length > 0 && effectiveIds.length < MAX_COMPARE && (
          <Card className="mt-4 border-dashed bg-muted/10">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Plus className="h-4 w-4" />
                You can add {MAX_COMPARE - effectiveIds.length} more to compare.
              </div>
              <Button asChild size="sm" variant="outline">
                <Link to="/rehab-centers">Browse facilities</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </section>
    </Layout>
  );
}

function EmptyState() {
  return (
    <Card className="border-dashed">
      <CardContent className="p-10 text-center">
        <div className="p-3 rounded-full bg-primary/10 w-fit mx-auto mb-4">
          <GitCompare className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-lg font-semibold mb-2">No facilities to compare yet</h2>
        <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
          Browse treatment centers and tap the compare icon to add up to {MAX_COMPARE} facilities.
          We'll show their levels of care, insurance, and accreditations side-by-side.
        </p>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <Button asChild>
            <Link to="/rehab-centers" className="gap-2">
              <Building2 className="h-4 w-4" />
              Browse all centers
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/locations" className="gap-2">
              <MapPin className="h-4 w-4" />
              Browse by state
            </Link>
          </Button>
        </div>
        <div className="mt-6 text-xs text-muted-foreground flex items-center justify-center gap-1.5">
          <Star className="h-3.5 w-3.5" />
          Tip: your selection is saved in your browser and your account.
        </div>
      </CardContent>
    </Card>
  );
}
