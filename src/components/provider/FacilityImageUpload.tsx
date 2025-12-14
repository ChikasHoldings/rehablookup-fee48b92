import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { compressImage, validateImageFile } from "@/lib/imageUtils";

interface FacilityImageUploadProps {
  type: "logo" | "gallery";
  currentImages: string[];
  userId: string;
  facilityId: string;
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
  className?: string;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function FacilityImageUpload({
  type,
  currentImages,
  userId,
  facilityId,
  onImagesChange,
  maxImages = type === "logo" ? 1 : 5,
  className,
}: FacilityImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const { toast } = useToast();

  const uploadFile = async (file: File): Promise<string | null> => {
    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast({
        title: "Invalid file",
        description: validation.error,
        variant: "destructive",
      });
      return null;
    }

    try {
      // Compress the image
      setUploadProgress("Compressing...");
      const compressedFile = await compressImage(file, type);

      // Upload to storage
      setUploadProgress("Uploading...");
      const fileName = `${userId}/${facilityId}/${type}/${Date.now()}.webp`;

      const { error: uploadError } = await supabase.storage
        .from("facility-images")
        .upload(fileName, compressedFile, { upsert: true });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        toast({
          title: "Upload failed",
          description: uploadError.message,
          variant: "destructive",
        });
        return null;
      }

      const { data: urlData } = supabase.storage
        .from("facility-images")
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error) {
      console.error("Processing error:", error);
      toast({
        title: "Processing failed",
        description: "Failed to process image. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  };

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      // Check max images
      const remainingSlots = maxImages - currentImages.length;
      if (files.length > remainingSlots) {
        toast({
          title: "Too many images",
          description: `You can only upload ${remainingSlots} more image${remainingSlots !== 1 ? "s" : ""}.`,
          variant: "destructive",
        });
        return;
      }

      setIsUploading(true);

      try {
        const uploadedUrls: string[] = [];

        for (const file of files) {
          const url = await uploadFile(file);
          if (url) {
            uploadedUrls.push(url);
          }
        }

        if (uploadedUrls.length > 0) {
          const newImages = type === "logo" 
            ? uploadedUrls 
            : [...currentImages, ...uploadedUrls];
          onImagesChange(newImages);
          toast({
            title: "Upload successful",
            description: `${uploadedUrls.length} image${uploadedUrls.length !== 1 ? "s" : ""} uploaded.`,
          });
        }
      } finally {
        setIsUploading(false);
        // Reset input
        e.target.value = "";
      }
    },
    [currentImages, maxImages, type, userId, facilityId, onImagesChange, toast]
  );

  const handleRemoveImage = useCallback(
    async (imageUrl: string) => {
      // Extract file path from URL
      const urlParts = imageUrl.split("/facility-images/");
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from("facility-images").remove([filePath]);
      }

      const newImages = currentImages.filter((img) => img !== imageUrl);
      onImagesChange(newImages);
      toast({
        title: "Image removed",
        description: "The image has been deleted.",
      });
    },
    [currentImages, onImagesChange, toast]
  );

  const canUploadMore = currentImages.length < maxImages;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Current Images Grid */}
      {currentImages.length > 0 && (
        <div className={cn(
          "grid gap-3",
          type === "logo" ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-5"
        )}>
          {currentImages.map((imageUrl, index) => (
            <div
              key={imageUrl}
              className={cn(
                "relative group rounded-lg overflow-hidden border border-border bg-muted",
                type === "logo" ? "w-32 h-32" : "aspect-square"
              )}
            >
              <img
                src={imageUrl}
                alt={type === "logo" ? "Facility logo" : `Gallery image ${index + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <button
                type="button"
                onClick={() => handleRemoveImage(imageUrl)}
                className="absolute top-1 right-1 p-1.5 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                aria-label="Remove image"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              {type === "gallery" && index === 0 && (
                <span className="absolute bottom-1 left-1 px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground rounded">
                  Primary
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Button */}
      {canUploadMore && (
        <div
          className={cn(
            "border-2 border-dashed border-border rounded-lg transition-colors hover:border-primary/50 hover:bg-muted/50",
            type === "logo" && currentImages.length === 0 ? "w-32 h-32" : "p-6"
          )}
        >
          <label className="flex flex-col items-center justify-center cursor-pointer h-full gap-2">
            <input
              type="file"
              accept={ACCEPTED_TYPES.join(",")}
              multiple={type === "gallery"}
              onChange={handleFileSelect}
              disabled={isUploading}
              className="sr-only"
            />
            {isUploading ? (
              <>
                <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                <span className="text-sm text-muted-foreground">{uploadProgress || "Processing..."}</span>
              </>
            ) : (
              <>
                {type === "logo" ? (
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                ) : (
                  <Upload className="h-8 w-8 text-muted-foreground" />
                )}
                <span className="text-sm text-muted-foreground text-center">
                  {type === "logo" 
                    ? "Upload logo" 
                    : `Add images (${currentImages.length}/${maxImages})`}
                </span>
                <span className="text-xs text-muted-foreground">
                  PNG, JPG, or WebP up to 5MB
                </span>
              </>
            )}
          </label>
        </div>
      )}

      {/* Max reached message */}
      {!canUploadMore && type === "gallery" && (
        <p className="text-sm text-muted-foreground">
          Maximum of {maxImages} gallery images reached.
        </p>
      )}
    </div>
  );
}
