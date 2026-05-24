import {
  Building2,
  MapPin,
  CheckCircle,
  Clock,
  AlertCircle,
  Edit3,
  Eye,
  Users,
  Lock,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fromLeadsProviderView } from "@/lib/leadsProviderView";

interface ListingCardProps {
  facility: {
    id: string;
    name: string;
    slug: string | null;
    status: string;
    address?: string;
    city: string;
    state: string;
    zip_code?: string;
    facility_type?: string;
    logo_url: string | null;
    gallery_urls?: string[] | null;
    created_at: string;
    suspended?: boolean;
  };
  onSelect: (facilityId: string) => void;
  onPreview?: (facility: { name: string; slug: string }) => void;
  withinList?: boolean;
}

const getStatusConfig = (status: string) => {
  switch (status) {
    case "approved":
      return {
        label: "Live",
        icon: CheckCircle,
        dotColor: "bg-emerald-500",
        pillClass: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      };
    case "pending":
      return {
        label: "Under Review",
        icon: Clock,
        dotColor: "bg-amber-500",
        pillClass: "bg-amber-50 text-amber-800 ring-amber-200",
      };
    default:
      return {
        label: "Draft",
        icon: AlertCircle,
        dotColor: "bg-slate-400",
        pillClass: "bg-slate-100 text-slate-700 ring-slate-200",
      };
  }
};

/**
 * Directory-style facility row. Healthgrades / Yelp reference: bigger
 * thumbnail with real hover affordance, generous spacing, clear
 * visual hierarchy through type scale + color (not just hairlines).
 *
 * Layout (desktop):
 *   ┌──────┐  Facility Name             [Live]
 *   │ 96px │  123 Address St · Dallas, TX 75244
 *   │ img  │  Luxury Rehab · Added May 23
 *   └──────┘  ┌─────────┐ ┌─────────┐    [Preview] [Edit Profile]
 *             │ 42 views│ │ 8 leads │
 *             └─────────┘ └─────────┘
 *
 * On mobile the thumbnail shrinks to 64px and actions wrap below.
 */
export function ListingCard({
  facility,
  onSelect,
  onPreview,
  withinList = true,
}: ListingCardProps) {
  const isSuspended = facility.suspended === true;
  const statusConfig = isSuspended
    ? {
        label: "Paused",
        icon: Lock,
        dotColor: "bg-slate-400",
        pillClass: "bg-slate-100 text-slate-700 ring-slate-200",
      }
    : getStatusConfig(facility.status);
  const StatusIcon = statusConfig.icon;

  const mainImage = facility.gallery_urls?.[0] || facility.logo_url;
  const createdDate = format(new Date(facility.created_at), "MMM d, yyyy");
  const addressParts = [
    facility.address,
    facility.city,
    facility.state && facility.zip_code
      ? `${facility.state} ${facility.zip_code}`
      : facility.state,
  ].filter(Boolean);
  const fullAddress = addressParts.length > 0 ? addressParts.join(", ") : `${facility.city}, ${facility.state}`;

  const { data: viewsData } = useQuery({
    queryKey: ["facility-views-count", facility.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("provider_events")
        .select("id", { count: "exact", head: true })
        .eq("facility_id", facility.id)
        .eq("event_type", "profile_view");
      if (error) throw error;
      return count || 0;
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  const { data: leadsData } = useQuery({
    queryKey: ["facility-leads-count", facility.id],
    queryFn: async () => {
      const { count, error } = await fromLeadsProviderView()
        .select("id", { count: "exact", head: true })
        .eq("facility_id", facility.id);
      if (error) throw error;
      return count || 0;
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  return (
    <article
      className={cn(
        "group relative bg-white transition-all",
        withinList
          ? "px-5 py-5 sm:px-6 sm:py-6 hover:bg-slate-50/60"
          : "rounded-xl border border-slate-200 px-5 py-5 sm:px-6 sm:py-6 shadow-sm hover:border-slate-300 hover:shadow",
        isSuspended && "opacity-75",
      )}
    >
      <div className="flex flex-col sm:flex-row gap-5">
        {/* Thumbnail — 96px on desktop, 64 on mobile. Real hover scale
            on the image itself, not the whole card. */}
        <div className="relative h-20 w-20 sm:h-24 sm:w-24 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
          {mainImage ? (
            <img
              src={mainImage}
              alt=""
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-50">
              <Building2 className="h-8 w-8 text-slate-400" aria-hidden />
            </div>
          )}
        </div>

        {/* Body */}
        <div className="min-w-0 flex-1">
          {/* Title row: name + status pill */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-[17px] font-semibold leading-tight text-slate-900">
                {facility.name}
              </h3>
              <p className="mt-1 flex items-center gap-1.5 text-[14px] text-slate-600">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                <span className="truncate">{fullAddress}</span>
              </p>
              <p className="mt-1 text-[13px] text-slate-500">
                {facility.facility_type || "Treatment Center"} · Added {createdDate}
              </p>
            </div>
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold ring-1 ring-inset",
                statusConfig.pillClass,
              )}
              aria-label={`Status: ${statusConfig.label}`}
            >
              <StatusIcon className="h-3 w-3" aria-hidden />
              {statusConfig.label}
            </span>
          </div>

          {/* Stats + actions row */}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Stat icon={Eye} label="views" value={viewsData ?? 0} />
              <Stat icon={Users} label="leads" value={leadsData ?? 0} accent={(leadsData ?? 0) > 0} />
            </div>

            {isSuspended ? (
              <span className="inline-flex items-center gap-1.5 text-[13px] text-slate-500">
                <Lock className="h-3.5 w-3.5" aria-hidden />
                Contact support to reactivate
              </span>
            ) : (
              <div className="flex items-center gap-2">
                {facility.slug && onPreview && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1.5 border-slate-300 px-3 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
                    onClick={() => onPreview({ name: facility.name, slug: facility.slug! })}
                    aria-label={`Preview ${facility.name}'s public profile`}
                  >
                    <Eye className="h-3.5 w-3.5" aria-hidden />
                    Preview
                  </Button>
                )}
                <Button
                  size="sm"
                  className="h-9 gap-1.5 bg-[#1B365D] px-3.5 text-[13px] font-semibold text-white hover:bg-[#142a4a]"
                  onClick={() => onSelect(facility.id)}
                  aria-label={`Edit ${facility.name}`}
                >
                  <Edit3 className="h-3.5 w-3.5" aria-hidden />
                  Edit Profile
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

/**
 * Small stat chip used in the row footer. Mild background fill +
 * subtle ring so the numbers carry visual weight without dominating.
 * `accent=true` warms the chip when the value is non-zero (highlights
 * the row that has active leads).
 */
function Stat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Eye;
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5",
        accent
          ? "border-emerald-200 bg-emerald-50/70"
          : "border-slate-200 bg-slate-50",
      )}
    >
      <Icon
        className={cn("h-3.5 w-3.5", accent ? "text-emerald-700" : "text-slate-500")}
        aria-hidden
      />
      <span className={cn("text-[13px] font-semibold tabular-nums", accent ? "text-emerald-900" : "text-slate-900")}>
        {value.toLocaleString()}
      </span>
      <span className={cn("text-[12px]", accent ? "text-emerald-700" : "text-slate-500")}>
        {label}
      </span>
      {accent && value > 0 && <TrendingUp className="h-3 w-3 text-emerald-600" aria-hidden />}
    </div>
  );
}
