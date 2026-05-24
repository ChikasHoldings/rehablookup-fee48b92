import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Globe, Loader2, Save, Star } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface GoogleReviewsConfigCardProps {
  facilityId: string;
  facilityName: string;
}

interface ConfigRow {
  facility_id: string;
  google_place_id: string | null;
  google_place_url: string | null;
  google_rating: number | null;
  google_review_count: number | null;
  show_on_profile: boolean | null;
  last_updated_at: string | null;
}

const URL_MAX = 500;
const PLACE_ID_MAX = 200;

// Google "Share → Copy link" produces URLs that embed the place ID in
// the !1s<id> token of the data= segment. We surface this in the
// helper text so providers know where to find it; the parser is
// best-effort — if the regex misses, the provider can paste the bare
// place_id into the dedicated input.
const PLACE_ID_REGEX = /!1s(0x[0-9a-fA-F]+:[0-9a-fA-Fx]+)!/;

function extractPlaceIdFromUrl(url: string): string | null {
  // String.match never throws even for malformed regex / unicode input,
  // so the previous try/catch was pure noise. Just guard against the
  // null match.
  const m = url.match(PLACE_ID_REGEX);
  return m && m[1] ? m[1] : null;
}

export function GoogleReviewsConfigCard({ facilityId, facilityName }: GoogleReviewsConfigCardProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: row, isLoading } = useQuery({
    queryKey: ["facility-reviews-config", facilityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facility_reviews_config")
        .select("facility_id, google_place_id, google_place_url, google_rating, google_review_count, show_on_profile, last_updated_at")
        .eq("facility_id", facilityId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as ConfigRow | null;
    },
  });

  const [placeUrl, setPlaceUrl] = useState("");
  const [placeId, setPlaceId] = useState("");
  const [showOnProfile, setShowOnProfile] = useState(true);

  useEffect(() => {
    if (row) {
      setPlaceUrl(row.google_place_url ?? "");
      setPlaceId(row.google_place_id ?? "");
      setShowOnProfile(row.show_on_profile ?? true);
    }
  }, [row]);

  // If the provider pastes a URL and the place-id field is empty,
  // attempt extraction from the URL once. Don't clobber an existing
  // value — they may want to override.
  useEffect(() => {
    if (placeId.length > 0) return;
    if (placeUrl.length === 0) return;
    const auto = extractPlaceIdFromUrl(placeUrl);
    if (auto) setPlaceId(auto);
  }, [placeUrl, placeId.length]);

  // Track whether the inline sync after save is currently running, so
  // the UI can show a "Syncing rating from Google…" hint without
  // blocking the form. The sync is fire-and-forget from the user's
  // perspective — failures fall back to the nightly cron.
  const [isSyncing, setIsSyncing] = useState(false);

  const save = useMutation({
    mutationFn: async () => {
      const cleanUrl = placeUrl.trim().slice(0, URL_MAX);
      const cleanId = placeId.trim().slice(0, PLACE_ID_MAX);
      // Upsert — facility_id is unique per row per RLS pattern, but
      // there's no DB-level UNIQUE on the table today, so check for
      // an existing row first to keep INSERT/UPDATE paths separate.
      // This avoids a 23505 if the table ever gains the constraint.
      const { data: existing } = await supabase
        .from("facility_reviews_config")
        .select("facility_id")
        .eq("facility_id", facilityId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("facility_reviews_config")
          .update({
            google_place_url: cleanUrl || null,
            google_place_id: cleanId || null,
            show_on_profile: showOnProfile,
            // Touch last_updated_at when the provider edits config so
            // the future sync cron can detect which configs changed
            // since its last run.
            last_updated_at: new Date().toISOString(),
          })
          .eq("facility_id", facilityId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("facility_reviews_config")
          .insert({
            facility_id: facilityId,
            google_place_url: cleanUrl || null,
            google_place_id: cleanId || null,
            show_on_profile: showOnProfile,
          });
        if (error) throw error;
      }
      return { hasPlaceId: cleanId.length > 0 };
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ["facility-reviews-config", facilityId] });
      toast({
        title: "Google reviews settings saved",
        description: result.hasPlaceId
          ? "Syncing your rating from Google now — it'll appear in a moment."
          : "Configuration cleared.",
      });

      // Fire-and-forget immediate sync so the provider sees their
      // rating + count populate within seconds instead of waiting up
      // to 24 h for the nightly cron. Failures here are silent — the
      // cron will catch up on its next run, and the underlying save
      // already succeeded so the provider doesn't need to know.
      if (result.hasPlaceId) {
        setIsSyncing(true);
        try {
          await supabase.functions.invoke("sync-google-reviews", {
            body: { facility_id: facilityId },
          });
          queryClient.invalidateQueries({ queryKey: ["facility-reviews-config", facilityId] });
        } catch (err) {
          if (import.meta.env.DEV) {
            console.warn("[GoogleReviewsConfigCard] immediate sync failed:", err);
          }
        } finally {
          setIsSyncing(false);
        }
      }
    },
    onError: (err: Error) =>
      toast({
        title: "Couldn't save settings",
        description: err.message,
        variant: "destructive",
      }),
  });

  const lastUpdated = row?.last_updated_at
    ? new Date(row.last_updated_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const dirty =
    placeUrl !== (row?.google_place_url ?? "") ||
    placeId !== (row?.google_place_id ?? "") ||
    showOnProfile !== (row?.show_on_profile ?? true);

  const hasConfig = !!(row?.google_place_id || row?.google_place_url);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" aria-hidden />
          Google reviews integration
          {hasConfig && (
            <Badge variant="outline" className="text-xs ml-1 bg-emerald-50 border-emerald-200 text-emerald-700">
              Connected
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Pull your existing Google reviews onto the {facilityName} profile.
          Configure once; we sync the aggregate rating + count nightly.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <>
            {isSyncing ? (
              <div className="rounded-lg border bg-slate-50 px-3 py-2.5 flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                Syncing rating from Google…
              </div>
            ) : row?.google_rating != null ? (
              <div className="rounded-lg border bg-slate-50 px-3 py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />
                  <span className="text-sm font-semibold text-foreground tabular-nums">
                    {Number(row.google_rating).toFixed(1)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    · {row.google_review_count ?? 0} Google reviews
                  </span>
                </div>
                {lastUpdated && (
                  <span className="text-[11px] text-muted-foreground">
                    Synced {lastUpdated}
                  </span>
                )}
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="g-url">Google Maps share URL</Label>
              <Input
                id="g-url"
                type="url"
                value={placeUrl}
                onChange={(e) => setPlaceUrl(e.target.value.slice(0, URL_MAX))}
                placeholder="https://www.google.com/maps/place/…"
                maxLength={URL_MAX}
              />
              <p className="text-xs text-muted-foreground">
                On Google Maps, find your facility, hit <strong>Share</strong>, copy
                the link, and paste it here. We'll extract the place ID for you.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="g-pid">Place ID (optional)</Label>
              <Input
                id="g-pid"
                value={placeId}
                onChange={(e) => setPlaceId(e.target.value.slice(0, PLACE_ID_MAX))}
                placeholder="0x..."
                maxLength={PLACE_ID_MAX}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Auto-detected from the share URL above. Paste a different one to override.{" "}
                <a
                  href="https://developers.google.com/maps/documentation/places/web-service/place-id"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#1B365D] underline-offset-2 hover:underline inline-flex items-center gap-0.5"
                >
                  Where do I find this?
                  <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  Show Google reviews on profile
                </p>
                <p className="text-xs text-muted-foreground">
                  Surfaces aggregate rating + a "View on Google" link below your
                  RehabLookup reviews.
                </p>
              </div>
              <Switch
                checked={showOnProfile}
                onCheckedChange={setShowOnProfile}
                aria-label="Show Google reviews on profile"
              />
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => save.mutate()}
                disabled={!dirty || save.isPending}
                className="gap-2 bg-[#1B365D] hover:bg-[#142a4a]"
              >
                {save.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
