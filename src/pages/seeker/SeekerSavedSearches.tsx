import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import {
  Bookmark,
  Bell,
  BellOff,
  Trash2,
  ExternalLink,
  Search,
  Loader2,
  Plus,
  Pencil,
  Check,
  X,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { SummaryChips } from "@/components/seeker/SavedSearchSummaryChips";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AuthPrompt } from "@/components/seeker/AuthPrompt";
import { useSavedSearches, AlertFrequency, SavedSearch } from "@/hooks/useSavedSearches";
import { useSeekerSession } from "@/hooks/useSeekerSession";
import { toast } from "sonner";

function frequencyLabel(f: AlertFrequency): string {
  if (f === "daily") return "Daily emails";
  if (f === "weekly") return "Weekly digest";
  return "Alerts off";
}

function frequencyToneClass(f: AlertFrequency): string {
  if (f === "daily") return "bg-emerald-100 text-emerald-800 border-0";
  if (f === "weekly") return "bg-blue-100 text-blue-800 border-0";
  return "bg-slate-100 text-slate-700 border-0";
}

function FrequencyBadge({ f }: { f: AlertFrequency }) {
  const Icon = f === "off" ? BellOff : Bell;
  return (
    <Badge className={`${frequencyToneClass(f)} gap-1`}>
      <Icon className="h-3 w-3" />
      {frequencyLabel(f)}
    </Badge>
  );
}

function SavedSearchCard({ s }: { s: SavedSearch }) {
  const { update, remove } = useSavedSearches();
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(s.name);

  const onFrequencyChange = async (value: string) => {
    try {
      await update.mutateAsync({ id: s.id, patch: { alert_frequency: value as AlertFrequency } });
      toast.success(
        value === "off"
          ? "Email alerts turned off"
          : `You'll get ${value} emails for this search`
      );
    } catch (err) {
      console.error("[SeekerSavedSearches] update freq error", err);
      toast.error("Couldn't update alerts. Try again.");
    }
  };

  const onSaveName = async () => {
    const trimmed = draftName.trim();
    if (!trimmed || trimmed === s.name) {
      setEditing(false);
      setDraftName(s.name);
      return;
    }
    try {
      await update.mutateAsync({ id: s.id, patch: { name: trimmed } });
      setEditing(false);
    } catch (err) {
      console.error("[SeekerSavedSearches] rename error", err);
      toast.error("Couldn't rename. Try again.");
    }
  };

  const onDelete = async () => {
    try {
      await remove.mutateAsync(s.id);
      toast.success("Saved search removed");
    } catch (err) {
      console.error("[SeekerSavedSearches] delete error", err);
      toast.error("Couldn't delete. Try again.");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            {editing ? (
              <div className="flex items-center gap-2">
                <Input
                  autoFocus
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  maxLength={80}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void onSaveName();
                    if (e.key === "Escape") {
                      setEditing(false);
                      setDraftName(s.name);
                    }
                  }}
                />
                <Button size="icon" variant="ghost" onClick={onSaveName} aria-label="Save name">
                  <Check className="h-4 w-4 text-primary" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => { setEditing(false); setDraftName(s.name); }}
                  aria-label="Cancel rename"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-semibold leading-tight">
                  {s.name}
                </CardTitle>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => setEditing(true)}
                  aria-label="Rename saved search"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Saved {formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}
              {s.last_alert_sent_at && (
                <>
                  {" · Last email "}
                  {formatDistanceToNow(new Date(s.last_alert_sent_at), { addSuffix: true })}
                </>
              )}
              {s.last_match_count > 0 && <> · {s.last_match_count} matches in last run</>}
            </p>
          </div>
          <FrequencyBadge f={s.alert_frequency} />
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <SummaryChips criteria={s.criteria} />
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <Select value={s.alert_frequency} onValueChange={onFrequencyChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily emails</SelectItem>
              <SelectItem value="weekly">Weekly digest</SelectItem>
              <SelectItem value="off">Alerts off</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to={s.search_url} className="gap-1.5">
                <ExternalLink className="h-3.5 w-3.5" />
                Run search
              </Link>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground hover:text-rose-600"
                  aria-label="Delete saved search"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this saved search?</AlertDialogTitle>
                  <AlertDialogDescription>
                    "{s.name}" will be removed and its email alerts will stop.
                    You can save it again any time.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep it</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete search
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SeekerSavedSearches() {
  const { isReady, isAuthenticated } = useSeekerSession();
  const { searches, isLoading, isError } = useSavedSearches();

  if (isReady && !isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <AuthPrompt
          title="Sign in to view your saved searches"
          description="Save searches and get email alerts when new facilities match."
          icon="lock"
          returnTo="/account/saved-searches"
        />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Saved Searches | RehabLookup</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10">
              <Bookmark className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-display font-bold">Saved searches</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Pin search filters and get email alerts when new facilities match
              </p>
            </div>
          </div>
          <Button asChild size="sm">
            <Link to="/rehab-centers" className="gap-1">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New search</span>
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : isError ? (
          <Card className="border-destructive/40 bg-destructive/5" role="alert">
            <CardContent className="p-6 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-destructive">
                  Couldn't load your saved searches
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Check your connection and try again. Email alerts continue
                  to run from the server even if this page can't load.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                className="shrink-0"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry
              </Button>
            </CardContent>
          </Card>
        ) : searches.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <div className="p-3 rounded-full bg-muted w-fit mx-auto mb-4">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="font-semibold text-foreground mb-2">No saved searches yet</h2>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                Run a search with filters that matter to you, then tap{" "}
                <span className="font-semibold text-foreground">Save search</span> to get email alerts
                when new facilities match.
              </p>
              <Button asChild>
                <Link to="/rehab-centers" className="gap-2">
                  <Search className="h-4 w-4" />
                  Start searching
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {searches.map((s) => (
              <SavedSearchCard key={s.id} s={s} />
            ))}
          </div>
        )}

        <Card className="bg-muted/20 border-dashed">
          <CardContent className="p-4 text-xs text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">How alerts work:</span> we email you a digest
              of new or recently updated facilities matching your filters — daily (max one email per day)
              or weekly. You can pause any time. Manage all email preferences in{" "}
              <Link to="/account/notification-preferences" className="text-primary hover:underline">
                Notifications
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
