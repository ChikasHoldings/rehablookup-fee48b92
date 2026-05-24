import { useMemo } from "react";
import {
  BookOpen,
  Sparkles,
  Star,
  Video,
  Globe2,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { usePublicFacilityPrograms } from "@/hooks/useFacilityPrograms";
import { usePublicFacilityAmenities } from "@/hooks/useFacilityAmenities";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface RichProfileSectionsProps {
  facilityId: string;
  videoUrl: string | null;
  virtualTourUrl: string | null;
}

/**
 * Pro-tier rich profile bundle. Each subsection renders only when data
 * is present — there is no client-side `if (isPro)` check because the
 * gate is server-side: the public_* views return empty / NULL for
 * Free facilities, so a tampered SPA still gets nothing to render.
 *
 * Sections, in order:
 *   1. Facility tour video (if video_url present)
 *   2. Virtual tour iframe (if virtual_tour_url present)
 *   3. Programs (one row per facility_programs entry)
 *   4. Amenities (chip list, with highlighted ones first)
 *   5. Highlighted accreditations (showcase row)
 */
export function RichProfileSections({
  facilityId,
  videoUrl,
  virtualTourUrl,
}: RichProfileSectionsProps) {
  const { data: programs = [] } = usePublicFacilityPrograms(facilityId);
  const { data: amenities = [] } = usePublicFacilityAmenities(facilityId);

  const { data: accreditations = [] } = useQuery({
    queryKey: ["public-facility-accreditations", facilityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("public_facility_accreditations")
        .select("id, accreditation_type, issuing_authority, verified, verification_url, is_highlighted")
        .eq("facility_id", facilityId)
        .order("is_highlighted", { ascending: false })
        .order("accreditation_type", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!facilityId,
  });

  const highlightedAccreds = useMemo(
    () => (accreditations as Array<{ is_highlighted: boolean | null }>).filter(
      (a) => !!a.is_highlighted,
    ),
    [accreditations],
  );

  const sortedAmenities = useMemo(
    () => [...amenities].sort((a, b) => {
      const aH = a.is_highlighted ? 1 : 0;
      const bH = b.is_highlighted ? 1 : 0;
      if (aH !== bH) return bH - aH; // highlighted first
      return (a.display_order ?? 0) - (b.display_order ?? 0);
    }),
    [amenities],
  );

  // Render NOTHING when no rich content exists — keeps the public
  // profile clean for Free facilities (or Pro facilities that haven't
  // populated any rich fields yet) and stops empty `<section>`s from
  // leaking into the layout.
  const hasAny =
    !!videoUrl ||
    !!virtualTourUrl ||
    programs.length > 0 ||
    amenities.length > 0 ||
    highlightedAccreds.length > 0;
  if (!hasAny) return null;

  return (
    <>
      {videoUrl && <VideoSection url={videoUrl} />}
      {virtualTourUrl && <VirtualTourSection url={virtualTourUrl} />}
      {programs.length > 0 && <ProgramsSection programs={programs} />}
      {sortedAmenities.length > 0 && <AmenitiesSection amenities={sortedAmenities} />}
      {highlightedAccreds.length > 0 && (
        <HighlightedAccreditationsSection accreditations={highlightedAccreds as Array<{
          id: string;
          accreditation_type: string;
          issuing_authority: string | null;
          verified: boolean | null;
          verification_url: string | null;
        }>} />
      )}
    </>
  );
}

/* ─── Subsections ─── */

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  iconBg = "bg-primary/10",
  iconColor = "text-primary",
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  iconBg?: string;
  iconColor?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className={cn("p-2.5 rounded-xl ring-1 ring-border", iconBg)}>
        <Icon className={cn("h-5 w-5", iconColor)} />
      </div>
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

function VideoSection({ url }: { url: string }) {
  const embed = embeddableVideoUrl(url);
  return (
    <section>
      <SectionHeader icon={Video} title="Facility Tour" subtitle="Take a walk through" />
      {embed ? (
        <div className="aspect-video w-full rounded-2xl overflow-hidden bg-slate-900 ring-1 ring-border shadow-sm">
          <iframe
            src={embed}
            title="Facility tour video"
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-scripts allow-same-origin allow-presentation"
          />
        </div>
      ) : (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-[#1B365D] hover:underline"
        >
          Watch the facility tour
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </a>
      )}
    </section>
  );
}

function VirtualTourSection({ url }: { url: string }) {
  return (
    <section>
      <SectionHeader
        icon={Globe2}
        title="Virtual Tour"
        subtitle="360° interactive walkthrough"
      />
      <div className="aspect-video w-full rounded-2xl overflow-hidden bg-slate-900 ring-1 ring-border shadow-sm">
        <iframe
          src={url}
          title="Facility virtual tour"
          className="w-full h-full"
          allow="xr-spatial-tracking; fullscreen; gyroscope; accelerometer"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-popups"
        />
      </div>
    </section>
  );
}

function ProgramsSection({
  programs,
}: {
  programs: Array<{
    id: string;
    name: string;
    description: string;
    level_of_care: string | null;
    length_text: string | null;
  }>;
}) {
  return (
    <section>
      <SectionHeader icon={BookOpen} title="Programs" subtitle="What we offer" />
      <div className="space-y-3">
        {programs.map((p) => (
          <article
            key={p.id}
            className="rounded-2xl border border-border/60 bg-card p-5 md:p-6 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
              <h3 className="text-base font-semibold text-foreground">{p.name}</h3>
              <div className="flex items-center gap-2 flex-wrap">
                {p.level_of_care && (
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                    {p.level_of_care}
                  </span>
                )}
                {p.length_text && (
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full border border-border text-muted-foreground">
                    {p.length_text}
                  </span>
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {p.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function AmenitiesSection({
  amenities,
}: {
  amenities: Array<{ id: string; amenity_name: string; is_highlighted: boolean | null }>;
}) {
  return (
    <section>
      <SectionHeader icon={Sparkles} title="Amenities" subtitle="What sets us apart" />
      <div className="flex flex-wrap gap-2">
        {amenities.map((a) => (
          <span
            key={a.id}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm",
              a.is_highlighted
                ? "bg-amber-50 border-amber-300 text-amber-900 font-medium"
                : "bg-slate-50 border-slate-200 text-slate-700",
            )}
          >
            {a.is_highlighted && <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" aria-hidden />}
            {a.amenity_name}
          </span>
        ))}
      </div>
    </section>
  );
}

function HighlightedAccreditationsSection({
  accreditations,
}: {
  accreditations: Array<{
    id: string;
    accreditation_type: string;
    issuing_authority: string | null;
    verified: boolean | null;
    verification_url: string | null;
  }>;
}) {
  return (
    <section>
      <SectionHeader
        icon={ShieldCheck}
        title="Featured Accreditations"
        subtitle="Verified credentials we're especially proud of"
        iconBg="bg-emerald-500/10"
        iconColor="text-emerald-600"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {accreditations.map((a) => (
          <a
            key={a.id}
            href={a.verification_url || undefined}
            target={a.verification_url ? "_blank" : undefined}
            rel={a.verification_url ? "noopener noreferrer" : undefined}
            className={cn(
              "flex items-start gap-3 rounded-2xl border border-emerald-200/60 bg-emerald-50/40 p-4 transition-colors",
              a.verification_url && "hover:bg-emerald-50/80 cursor-pointer",
            )}
          >
            <Star className="h-4 w-4 fill-amber-500 text-amber-500 shrink-0 mt-0.5" aria-hidden />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {a.accreditation_type}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {a.issuing_authority || "—"}
                {a.verified && " · Verified"}
              </p>
            </div>
            {a.verification_url && (
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-1" aria-hidden />
            )}
          </a>
        ))}
      </div>
    </section>
  );
}

/* ─── Helpers ─── */

// Convert a watch-style YouTube/Vimeo URL into an embeddable form.
// Returns null for anything we don't recognize so the caller renders
// a plain "Open video" link instead of risking a broken iframe.
function embeddableVideoUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    // YouTube
    if (u.hostname === "youtu.be") {
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    }
    if (/(^|\.)youtube\.com$/.test(u.hostname)) {
      if (u.pathname === "/watch") {
        const v = u.searchParams.get("v");
        if (v) return `https://www.youtube.com/embed/${v}`;
      }
      if (u.pathname.startsWith("/embed/")) return raw;
    }
    // Vimeo
    if (u.hostname === "vimeo.com") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
    }
    if (u.hostname === "player.vimeo.com") return raw;
    // Direct .mp4 / .webm — return as-is for <iframe> playback. Most
    // hosting providers support iframe loading of raw video files.
    if (/\.(mp4|webm|ogv)$/i.test(u.pathname)) return raw;
    return null;
  } catch {
    return null;
  }
}
