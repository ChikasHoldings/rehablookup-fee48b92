import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Upload, Loader2, User, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { JOB_TITLES, type FacilityStaff, type CreateStaffData, type UpdateStaffData } from "@/hooks/useFacilityStaff";

interface StaffFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facilityId: string;
  staff?: FacilityStaff | null;
  onSubmit: (data: CreateStaffData | { id: string; data: UpdateStaffData }) => void;
  isSubmitting: boolean;
  currentStaffCount: number;
  maxStaff: number;
}

const BIO_MAX_LENGTH = 500;

export function StaffFormModal({
  open,
  onOpenChange,
  facilityId,
  staff,
  onSubmit,
  isSubmitting,
  currentStaffCount,
  maxStaff,
}: StaffFormModalProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [name, setName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [customJobTitle, setCustomJobTitle] = useState("");
  const [bio, setBio] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const isEditing = !!staff;
  const isCustomTitle = !JOB_TITLES.includes(jobTitle as typeof JOB_TITLES[number]) && jobTitle !== "";

  // Reset form when modal opens or staff changes
  useEffect(() => {
    if (open) {
      setName(staff?.name || "");
      setJobTitle(staff?.job_title || "");
      setCustomJobTitle("");
      setBio(staff?.bio || "");
      setPhotoUrl(staff?.photo_url || "");
    }
  }, [open, staff]);

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Always reset the file input value so the same filename can be
    // selected twice in a row, and so a failed upload doesn't strand
    // the input on a "selected" file. Done before any early return.
    if (e.target) e.target.value = "";

    if (!file) return;

    // Guard against double-upload race: if a previous upload is still
    // in flight, ignore this one. The button's `disabled={isUploading}`
    // attribute prevents the click in normal use; this is the
    // belt-and-braces for keyboard / programmatic triggers.
    if (isUploading) return;

    // Strict MIME allowlist. `image/*` would accept image/svg+xml,
    // which can carry inline <script> and render as XSS when served
    // back with its native content-type. We accept only raster image
    // formats that browsers render inertly.
    const ALLOWED_MIME = new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ]);
    if (!ALLOWED_MIME.has(file.type)) {
      toast({
        title: "Unsupported image format",
        description: "Please upload a JPG, PNG, WebP, or GIF photo.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 2MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    // Capture the prior in-progress photo so we can clean it up after
    // a successful upload. Only photos uploaded earlier in THIS modal
    // session (i.e. not the persisted staff.photo_url, which the
    // updateStaff mutation will clean up on save) are removed here —
    // otherwise dismissing the modal would orphan the new photo AND
    // delete the saved one.
    const previousInSessionUrl =
      photoUrl && photoUrl !== staff?.photo_url ? photoUrl : null;
    try {
      // Get current user ID for storage policy compliance
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Derive the extension from the (already-allowlisted) MIME, not
      // from the user-supplied filename. A filename like "trojan.svg"
      // would otherwise land at /<uid>/staff/<uuid>.svg even though
      // we accepted it as image/png.
      const EXT_BY_MIME: Record<string, string> = {
        "image/jpeg": "jpg",
        "image/png":  "png",
        "image/webp": "webp",
        "image/gif":  "gif",
      };
      const fileExt = EXT_BY_MIME[file.type] ?? "jpg";
      // Storage policy requires user ID as first folder (auth.uid())
      const fileName = `${user.id}/staff/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("facility-images")
        // Explicit contentType — never let Supabase auto-detect from
        // the path extension. We've already validated the MIME against
        // the allowlist; pass it through verbatim so the served
        // Content-Type matches what we authorized.
        .upload(fileName, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("facility-images")
        .getPublicUrl(fileName);

      setPhotoUrl(publicUrl);

      if (previousInSessionUrl) {
        const marker = "/storage/v1/object/public/facility-images/";
        const idx = previousInSessionUrl.indexOf(marker);
        if (idx !== -1) {
          const path = previousInSessionUrl.slice(idx + marker.length).split("?")[0];
          if (path) {
            await supabase.storage.from("facility-images").remove([path]);
          }
        }
      }
    } catch {
      toast({
        title: "Upload failed",
        description: "Failed to upload photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = () => {
    const finalJobTitle = jobTitle === "Custom" ? customJobTitle : jobTitle;
    
    if (!name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    if (!finalJobTitle.trim()) {
      toast({ title: "Job title is required", variant: "destructive" });
      return;
    }
    if (!photoUrl) {
      toast({ title: "Photo is required", variant: "destructive" });
      return;
    }

    if (isEditing && staff) {
      onSubmit({
        id: staff.id,
        data: {
          name: name.trim(),
          job_title: finalJobTitle.trim(),
          bio: bio.trim() || null,
          photo_url: photoUrl,
        },
      });
    } else {
      onSubmit({
        facility_id: facilityId,
        name: name.trim(),
        job_title: finalJobTitle.trim(),
        bio: bio.trim() || undefined,
        photo_url: photoUrl,
        display_order: currentStaffCount,
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Team Member" : "Add Team Member"}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Update this team member's information."
              : `Add a team member to your facility profile (${currentStaffCount}/${maxStaff}).`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Photo Upload */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <Avatar className="h-24 w-24 border-2 border-border">
                {photoUrl ? (
                  <AvatarImage src={photoUrl} alt={name || "Staff photo"} />
                ) : (
                  <AvatarFallback className="bg-muted text-muted-foreground">
                    {name ? getInitials(name) : <User className="h-8 w-8" />}
                  </AvatarFallback>
                )}
              </Avatar>
              {photoUrl && (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -top-1 -right-1 h-6 w-6 rounded-full"
                  onClick={() => setPhotoUrl("")}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {photoUrl ? "Change Photo" : "Upload Photo *"}
                </>
              )}
            </Button>
            {!photoUrl && (
              <p className="text-xs text-muted-foreground">Photo is required. Max 2MB.</p>
            )}
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="staff-name">Name *</Label>
            <Input
              id="staff-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              maxLength={100}
            />
          </div>

          {/* Job Title */}
          <div className="space-y-2">
            <Label htmlFor="staff-title">Job Title *</Label>
            <Select
              value={isCustomTitle ? "Custom" : jobTitle}
              onValueChange={(value) => {
                setJobTitle(value);
                if (value !== "Custom") {
                  setCustomJobTitle("");
                }
              }}
            >
              <SelectTrigger id="staff-title">
                <SelectValue placeholder="Select job title" />
              </SelectTrigger>
              <SelectContent className="bg-card">
                {JOB_TITLES.map((title) => (
                  <SelectItem key={title} value={title}>
                    {title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {(jobTitle === "Custom" || isCustomTitle) && (
              <Input
                value={isCustomTitle ? jobTitle : customJobTitle}
                onChange={(e) => {
                  if (isCustomTitle) {
                    setJobTitle(e.target.value);
                  } else {
                    setCustomJobTitle(e.target.value);
                  }
                }}
                placeholder="Enter custom job title"
                maxLength={50}
                className="mt-2"
              />
            )}
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="staff-bio">
              Short Bio
              <span className="text-muted-foreground font-normal ml-2">
                ({bio.length}/{BIO_MAX_LENGTH})
              </span>
            </Label>
            <Textarea
              id="staff-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX_LENGTH))}
              placeholder="Brief description of their role and experience..."
              rows={3}
              maxLength={BIO_MAX_LENGTH}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || isUploading || !name.trim() || !photoUrl}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isEditing ? "Saving..." : "Adding..."}
              </>
            ) : (
              isEditing ? "Save Changes" : "Add Team Member"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
