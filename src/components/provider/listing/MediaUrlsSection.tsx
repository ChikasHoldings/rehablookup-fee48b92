import { useEffect, useState } from "react";
import { Loader2, Save, Video, Globe2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ProAuthorNotice } from "./ProAuthorNotice";

interface MediaUrlsSectionProps {
  facilityId: string;
  isPro: boolean;
  initialVideoUrl: string | null;
  initialVirtualTourUrl: string | null;
  onSaved: () => void;
}

const URL_MAX = 500;
// Permissive — we only block obvious garbage. The public profile renders
// these inside an <iframe sandbox> for tour and a thumbnail player for
// video, so a malformed URL surfaces as a broken embed rather than a
// security issue.
const URL_PATTERN = /^https:\/\/[^\s<>"']+$/i;

/**
 * Video + virtual-tour URL inputs. Stored on the facilities row and
 * exposed via the Pro-gated public_facilities view — Free providers can
 * save the URLs here but the public profile will mask them to NULL until
 * Pro is active. No client tampering can flip that gate.
 */
export function MediaUrlsSection({
  facilityId,
  isPro,
  initialVideoUrl,
  initialVirtualTourUrl,
  onSaved,
}: MediaUrlsSectionProps) {
  const { toast } = useToast();
  const [video, setVideo] = useState(initialVideoUrl || "");
  const [tour, setTour] = useState(initialVirtualTourUrl || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setVideo(initialVideoUrl || "");
    setTour(initialVirtualTourUrl || "");
  }, [initialVideoUrl, initialVirtualTourUrl]);

  const dirty = video !== (initialVideoUrl || "") || tour !== (initialVirtualTourUrl || "");
  const videoValid = video.length === 0 || URL_PATTERN.test(video);
  const tourValid = tour.length === 0 || URL_PATTERN.test(tour);
  const canSave = dirty && videoValid && tourValid && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("facilities")
        .update({
          video_url: video.trim() || null,
          virtual_tour_url: tour.trim() || null,
        })
        .eq("id", facilityId);
      if (error) throw error;
      toast({
        title: "Media URLs saved",
        description: isPro
          ? "These are now live on your public profile."
          : "Saved. They'll go live the moment Pro is active.",
      });
      onSaved();
    } catch (err) {
      toast({
        title: "Couldn't save",
        description: err instanceof Error ? err.message : "Try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">Video & Virtual Tour</h2>
        <p className="text-sm text-muted-foreground">
          Embed a facility walkthrough video and an interactive virtual tour
          (Matterport, Google Street View, etc.) on your public profile.
        </p>
      </div>

      {!isPro && <ProAuthorNotice feature="Video & virtual tour links" />}

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="video-url" className="flex items-center gap-1.5">
            <Video className="h-4 w-4 text-muted-foreground" aria-hidden />
            Facility video URL
          </Label>
          <Input
            id="video-url"
            type="url"
            value={video}
            onChange={(e) => setVideo(e.target.value.slice(0, URL_MAX))}
            placeholder="https://www.youtube.com/watch?v=…  or  https://vimeo.com/…"
            maxLength={URL_MAX}
            aria-invalid={!videoValid}
            className={!videoValid ? "border-destructive" : undefined}
          />
          {!videoValid && (
            <p className="text-xs text-destructive">
              Must be a full HTTPS URL (YouTube, Vimeo, or direct MP4 link).
            </p>
          )}
          {videoValid && video && (
            <a
              href={video}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-[#1B365D] hover:underline"
            >
              Preview link <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tour-url" className="flex items-center gap-1.5">
            <Globe2 className="h-4 w-4 text-muted-foreground" aria-hidden />
            Virtual tour URL
          </Label>
          <Input
            id="tour-url"
            type="url"
            value={tour}
            onChange={(e) => setTour(e.target.value.slice(0, URL_MAX))}
            placeholder="https://my.matterport.com/show/?m=…"
            maxLength={URL_MAX}
            aria-invalid={!tourValid}
            className={!tourValid ? "border-destructive" : undefined}
          />
          {!tourValid && (
            <p className="text-xs text-destructive">Must be a full HTTPS URL.</p>
          )}
          {tourValid && tour && (
            <a
              href={tour}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-[#1B365D] hover:underline"
            >
              Preview link <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={!canSave}
          className="gap-2 bg-[#1B365D] hover:bg-[#142a4a]"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save URLs
        </Button>
      </div>
    </div>
  );
}
