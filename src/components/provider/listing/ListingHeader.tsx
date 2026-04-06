import { Save, Eye, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ListingHeaderProps {
  facilitySlug: string | null;
  status: string;
  statusLabel: string;
  statusClassName: string;
  statusIcon: React.ElementType;
  hasChanges: boolean;
  isSaving: boolean;
  isAutoSaving: boolean;
  showSaved: boolean;
  onSave: () => void;
  onPreview?: () => void;
}

export function ListingHeader({
  facilitySlug,
  status,
  statusLabel,
  statusClassName,
  statusIcon: StatusIcon,
  hasChanges,
  isSaving,
  isAutoSaving,
  showSaved,
  onSave,
  onPreview
}: ListingHeaderProps) {
  const statusDescriptions: Record<string, string> = {
    approved: "Your listing is live and visible to families searching for treatment",
    pending: "Our team is reviewing your listing. This usually takes 24-48 hours.",
    draft: "Complete all required fields and submit for review"
  };

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="font-display text-2xl font-bold text-foreground">
            My Listing
          </h1>
          <Badge className={cn("gap-1.5 px-3 py-1", statusClassName)}>
            <StatusIcon className="h-3.5 w-3.5" />
            {statusLabel}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground max-w-lg">
          {statusDescriptions[status] || statusDescriptions.draft}
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {/* Save status indicators */}
        <div className="flex items-center gap-2 text-xs">
          {isAutoSaving && (
            <span className="text-muted-foreground flex items-center gap-1.5 animate-pulse bg-muted/50 px-3 py-1.5 rounded-full">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Auto-saving...
            </span>
          )}
          {showSaved && !isAutoSaving && !hasChanges && (
            <span className="text-green-600 flex items-center gap-1.5 bg-green-500/10 px-3 py-1.5 rounded-full">
              <CheckCircle className="h-3.5 w-3.5" />
              All changes saved
            </span>
          )}
          {hasChanges && !isAutoSaving && (
            <span className="text-amber-600 flex items-center gap-1.5 bg-amber-500/10 px-3 py-1.5 rounded-full">
              <AlertCircle className="h-3.5 w-3.5" />
              Unsaved changes
            </span>
          )}
        </div>

        {facilitySlug && onPreview && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={onPreview}
          >
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">Preview</span>
          </Button>
        )}

        <Button
          onClick={onSave}
          disabled={isSaving || isAutoSaving || !hasChanges}
          size="sm"
          className="gap-2 min-w-[100px]"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
