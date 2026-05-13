import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bookmark, BookmarkCheck, Bell, BellOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useSavedSearches, AlertFrequency } from "@/hooks/useSavedSearches";

interface SaveSearchButtonProps {
  /** Current filter state captured as plain JSON */
  criteria: Record<string, unknown>;
  /** Suggested name (e.g. "Detox in California with Aetna") */
  suggestedName: string;
  /** Full pathname + search to deep-link back to this exact result set */
  searchUrl: string;
  /** Number of matches in the current run — shown to the user when saving */
  resultCount?: number;
  className?: string;
  size?: "default" | "sm" | "lg";
}

export function SaveSearchButton({
  criteria,
  suggestedName,
  searchUrl,
  resultCount,
  className,
  size = "sm",
}: SaveSearchButtonProps) {
  const navigate = useNavigate();
  const { isAuthenticated, searches, create, findByUrl } = useSavedSearches();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(suggestedName);
  const [frequency, setFrequency] = useState<AlertFrequency>("daily");

  const existing = useMemo(() => findByUrl(searchUrl), [findByUrl, searchUrl]);

  const handleOpen = () => {
    if (!isAuthenticated) {
      // Send the user to sign-in then back to the same search to save it
      const returnTo = encodeURIComponent(searchUrl + "&saveSearch=1");
      navigate(`/login?returnTo=${returnTo}`);
      return;
    }
    setName(suggestedName);
    setFrequency("daily");
    setOpen(true);
  };

  const handleSubmit = async () => {
    try {
      await create.mutateAsync({
        name: name.trim() || suggestedName,
        criteria,
        search_url: searchUrl,
        alert_frequency: frequency,
      });
      toast.success(
        frequency === "off"
          ? "Search saved"
          : `Search saved — we'll email you ${frequency}`,
        {
          description: "Manage it any time from Saved searches in your account.",
        }
      );
      setOpen(false);
    } catch (err) {
      console.error("[SaveSearchButton] create error", err);
      toast.error("Couldn't save this search. Please try again.");
    }
  };

  const isSaved = !!existing;
  const Icon = isSaved ? BookmarkCheck : Bookmark;

  return (
    <>
      <Button
        type="button"
        variant={isSaved ? "secondary" : "outline"}
        size={size}
        onClick={handleOpen}
        className={className}
        aria-label={isSaved ? "This search is saved" : "Save this search"}
      >
        <Icon className="h-4 w-4 mr-1.5" />
        {isSaved ? (
          <>
            Saved
            {existing.alert_frequency !== "off" && (
              <Bell className="h-3.5 w-3.5 ml-1.5 text-primary" aria-label={`Alert ${existing.alert_frequency}`} />
            )}
          </>
        ) : (
          "Save search"
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Save this search</DialogTitle>
            <DialogDescription>
              {typeof resultCount === "number"
                ? `${resultCount} facilities match right now. We'll let you know when new ones do.`
                : "We'll let you know when new facilities match your filters."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="saved-search-name">Search name</Label>
              <Input
                id="saved-search-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                placeholder="e.g. Aetna detox in San Diego"
              />
            </div>

            <div className="space-y-2">
              <Label>Email alerts</Label>
              <RadioGroup value={frequency} onValueChange={(v) => setFrequency(v as AlertFrequency)}>
                <FrequencyChoice
                  value="daily"
                  current={frequency}
                  label="Daily"
                  description="Email me when matches appear, at most once a day."
                />
                <FrequencyChoice
                  value="weekly"
                  current={frequency}
                  label="Weekly"
                  description="A weekly digest of new matches."
                />
                <FrequencyChoice
                  value="off"
                  current={frequency}
                  label="Off"
                  description="Save the search without email alerts."
                />
              </RadioGroup>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={create.isPending}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={create.isPending}>
              {create.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving
                </>
              ) : (
                <>
                  <Bookmark className="h-4 w-4 mr-2" />
                  Save search
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function FrequencyChoice({
  value,
  current,
  label,
  description,
}: {
  value: AlertFrequency;
  current: AlertFrequency;
  label: string;
  description: string;
}) {
  const selected = value === current;
  const Icon = value === "off" ? BellOff : Bell;
  return (
    <label
      htmlFor={`freq-${value}`}
      className={
        "flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-colors " +
        (selected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/40")
      }
    >
      <RadioGroupItem id={`freq-${value}`} value={value} className="mt-0.5" />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </label>
  );
}
