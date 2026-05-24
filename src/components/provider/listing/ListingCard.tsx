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
  /**
   * Render as a row inside a container that already has its own border
   * (the ListingsLandingPage wraps the rows in a single rounded panel
   * with hairline dividers). When false the row carries its own border —
   * use that mode for standalone usage outside the listings index.
   */
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
        label: "Pending",
        icon: Clock,
        dotColor: "bg-amber-500",
        pillClass: "bg-amber-50 text-amber-700 ring-amber-200",
      };
    default:
      return {
        label: "Draft",
        icon: AlertCircle,
        dotColor: "bg-slate-400",
        pillClass: "bg-slate-50 text-slate-600 ring-slate-200",
      };
  }
};

/**
 * Compact directory-style row for a single owned facility.
 *
 * Visual contract — Healthgrades / Yelp / Zocdoc reference: hairline
 * borders, small thumbnail, a single horizontal row of name + meta +
 * stats + actions, no shadow lift on hover. Hover warms the row's
 * background tint instead of raising the card. Status renders as a
 * tiny pill at top-right, not as a label over an image.
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
        pillClass: "bg-slate-50 text-slate-600 ring-slate-200",
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
        "group relative bg-white transition-colors",
        withinList
          ? "px-4 py-3.5 sm:px-5 hover:bg-slate-50"
          : "rounded-lg border border-slate-200 px-4 py-3.5 sm:px-5 hover:border-slate-300",
        isSuspended && "opacity-70",
      )}
    >
      <div className="flex items-start gap-3.5 sm:gap-4">
        {/* Thumbnail — small, square, hairline border. No hover scale. */}
        <div className="relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
          {mainImage ? (
            <img
              src={mainImage}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Building2 className="h-5 w-5 text-slate-400" aria-hidden />
            </div>
          )}
        </div>

        {/* Body */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-[15px] font-semibold text-slate-900 group-hover:text-slate-900">
                {facility.name}
              </h3>
              <p className="mt-0.5 flex items-center gap-1 truncate text-[13px] text-slate-600">
                <MapPin className="h-3 w-3 shrink-0 text-slate-400" aria-hidden />
                <span className="truncate">{fullAddress}</span>
              </p>
            </div>

            {/* Status pill — tiny, ring-style, no animation by default. */}
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
                statusConfig.pillClass,
              )}
              aria-label={`Status: ${statusConfig.label}`}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", statusConfig.dotColor)} aria-hidden />
              <StatusIcon className="hidden h-3 w-3 sm:inline-block" aria-hidden />
              {statusConfig.label}
            </span>
          </div>

          {/* Meta strip — small typography, separators */}
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-slate-500">
            <span>{facility.facility_type || "Treatment Center"}</span>
            <span className="hidden text-slate-300 sm:inline">·</span>
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" aria-hidden />
              {viewsData ?? 0} views
            </span>
            <span className="text-slate-300">·</span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" aria-hidden />
              {leadsData ?? 0} leads
            </span>
            <span className="hidden text-slate-300 sm:inline">·</span>
            <span className="hidden sm:inline">Added {createdDate}</span>
          </p>

          {/* Actions row — inline, small, directory-style */}
          <div className="mt-2.5 flex items-center gap-2">
            {isSuspended ? (
              <span className="inline-flex items-center gap-1 text-[12px] text-slate-500">
                <Lock className="h-3 w-3" aria-hidden />
                Contact support to reactivate
              </span>
            ) : (
              <Button
                size="sm"
                className="h-7 gap-1 bg-[#1B365D] px-2.5 text-[12px] font-medium text-white hover:bg-[#142a4a]"
                onClick={() => onSelect(facility.id)}
                aria-label={`Edit ${facility.name}`}
              >
                <Edit3 className="h-3 w-3" aria-hidden />
                Edit
              </Button>
            )}
            {facility.slug && onPreview && !isSuspended && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 border-slate-200 px-2.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => onPreview({ name: facility.name, slug: facility.slug! })}
                aria-label={`Preview ${facility.name}'s public profile`}
              >
                <Eye className="h-3 w-3" aria-hidden />
                Preview
              </Button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
