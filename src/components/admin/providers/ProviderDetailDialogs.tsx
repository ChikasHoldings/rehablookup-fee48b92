import {
  Ban,
  RefreshCw,
  Trash2,
  X,
  Flag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Facility } from "./ProviderListItem";

// Image Preview Dialog
interface ImagePreviewDialogProps {
  imageUrl: string | null;
  onClose: () => void;
}

export function ImagePreviewDialog({ imageUrl, onClose }: ImagePreviewDialogProps) {
  return (
    <Dialog open={!!imageUrl} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/95">
        <DialogTitle className="sr-only">Image preview</DialogTitle>
        <div className="relative">
          <Button
            size="icon"
            variant="ghost"
            className="absolute top-2 right-2 z-10 text-white hover:bg-white/20"
            onClick={onClose}
            aria-label="Close image preview"
          >
            <X className="h-5 w-5" />
          </Button>
          {imageUrl && (
            <img
              src={imageUrl}
              alt="Full-size facility image preview"
              className="w-full max-h-[80vh] object-contain"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Flag Image Dialog
interface FlagImageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  reason: string;
  onReasonChange: (reason: string) => void;
  onSubmit: () => void;
  isPending: boolean;
}

export function FlagImageDialog({
  open,
  onOpenChange,
  imageUrl,
  reason,
  onReasonChange,
  onSubmit,
  isPending,
}: FlagImageDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <div className="space-y-4">
          <DialogTitle className="flex items-center gap-2 text-destructive font-semibold">
            <Flag className="h-5 w-5" />
            Flag Inappropriate Image
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Flag this image for review. The provider will be notified.
          </p>
          
          {imageUrl && (
            <div className="flex justify-center">
              <img
                src={imageUrl}
                alt="Facility image being flagged for review"
                className="max-w-48 max-h-48 object-contain rounded-lg border"
              />
            </div>
          )}
          
          <div className="space-y-2">
            <Label>Reason for flagging</Label>
            <Select value={reason} onValueChange={onReasonChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inappropriate">Inappropriate content</SelectItem>
                <SelectItem value="misleading">Misleading or fake image</SelectItem>
                <SelectItem value="low_quality">Low quality / unprofessional</SelectItem>
                <SelectItem value="copyright">Copyright violation</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={onSubmit}
              disabled={!reason || isPending}
            >
              {isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Flagging...
                </>
              ) : (
                <>
                  <Flag className="h-4 w-4 mr-2" />
                  Flag Image
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Confirmation Dialog for Destructive Actions
interface ConfirmActionDialogProps {
  action: "suspend" | "reactivate" | "delete" | null;
  provider: Facility | null;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
  isDeleting: boolean;
  deleteWithUser: boolean;
  onDeleteWithUserChange: (value: boolean) => void;
}

export function ConfirmActionDialog({
  action,
  provider,
  onConfirm,
  onCancel,
  isPending,
  isDeleting,
  deleteWithUser,
  onDeleteWithUserChange,
}: ConfirmActionDialogProps) {
  return (
    <AlertDialog open={!!action && !!provider} onOpenChange={() => !isDeleting && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {action === "suspend" && (
              <>
                <Ban className="h-5 w-5 text-destructive" />
                Suspend Provider
              </>
            )}
            {action === "reactivate" && (
              <>
                <RefreshCw className="h-5 w-5 text-emerald-500" />
                Reactivate Provider
              </>
            )}
            {action === "delete" && (
              <>
                <Trash2 className="h-5 w-5 text-destructive" />
                Delete Provider Permanently
              </>
            )}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              {action === "suspend" && (
                <p>
                  Are you sure you want to suspend <strong>{provider?.name}</strong>?
                  Their listing will be hidden from search results.
                </p>
              )}
              {action === "reactivate" && (
                <p>
                  Reactivate <strong>{provider?.name}</strong>?
                  Their listing will be visible again.
                </p>
              )}
              {action === "delete" && (
                <>
                  <p>
                    Are you sure you want to <strong className="text-destructive">permanently delete</strong>{" "}
                    <strong>{provider?.name}</strong>?
                  </p>
                  <p className="text-sm text-muted-foreground">
                    This will permanently remove the facility and all associated data.
                  </p>
                  <div className="flex items-center space-x-2 pt-2">
                    <Checkbox
                      id="deleteUser"
                      checked={deleteWithUser}
                      onCheckedChange={(checked) => onDeleteWithUserChange(checked === true)}
                    />
                    <label
                      htmlFor="deleteUser"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Also delete the provider's user account (if no other facilities)
                    </label>
                  </div>
                  <p className="text-sm font-semibold text-destructive">
                    This action cannot be undone.
                  </p>
                </>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={cn(
              action === "suspend" && "bg-destructive hover:bg-destructive/90",
              action === "reactivate" && "bg-emerald-600 hover:bg-emerald-700",
              action === "delete" && "bg-destructive hover:bg-destructive/90"
            )}
            disabled={isPending || isDeleting}
          >
            {isDeleting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : isPending ? (
              "Processing..."
            ) : action === "delete" ? (
              "Delete Permanently"
            ) : (
              "Confirm"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
