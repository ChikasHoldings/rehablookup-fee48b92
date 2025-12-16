/**
 * Image compression and resizing utilities
 */

const MAX_LOGO_DIMENSION = 512;
const MAX_GALLERY_DIMENSION = 1200;
const COMPRESSION_QUALITY = 0.85;

/**
 * Compress and resize an image file
 */
export async function compressImage(
  file: File,
  type: "logo" | "gallery"
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Could not get canvas context"));
      return;
    }

    img.onload = () => {
      try {
        const maxDimension = type === "logo" ? MAX_LOGO_DIMENSION : MAX_GALLERY_DIMENSION;
        
        let { width, height } = img;

        // Calculate new dimensions while maintaining aspect ratio
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Use better image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        // Draw the resized image
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Failed to compress image"));
              return;
            }

            // Create a new file from the blob
            const compressedFile = new File(
              [blob],
              file.name.replace(/\.[^.]+$/, ".webp"),
              { type: "image/webp" }
            );

            console.log(
              `Image compressed: ${(file.size / 1024).toFixed(1)}KB → ${(compressedFile.size / 1024).toFixed(1)}KB`
            );

            resolve(compressedFile);
          },
          "image/webp",
          COMPRESSION_QUALITY
        );
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error("Failed to load image"));
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * Validate image file
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB before compression

  if (!ACCEPTED_TYPES.includes(file.type)) {
    return { valid: false, error: "Please upload a PNG, JPG, or WebP image." };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: "Please upload an image under 10MB." };
  }

  return { valid: true };
}

/**
 * Image quality assessment result
 */
export interface ImageQualityResult {
  width: number;
  height: number;
  isLowResolution: boolean;
  warning?: string;
  recommendation?: string;
}

/**
 * Minimum recommended dimensions for quality images
 */
const MIN_LOGO_DIMENSION = 200;
const MIN_GALLERY_WIDTH = 800;
const MIN_GALLERY_HEIGHT = 600;

/**
 * Check image quality and resolution
 */
export function checkImageQuality(
  file: File,
  type: "logo" | "gallery"
): Promise<ImageQualityResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const { width, height } = img;
      let isLowResolution = false;
      let warning: string | undefined;
      let recommendation: string | undefined;

      if (type === "logo") {
        if (width < MIN_LOGO_DIMENSION || height < MIN_LOGO_DIMENSION) {
          isLowResolution = true;
          warning = `Logo resolution (${width}×${height}px) is below recommended minimum.`;
          recommendation = `For best quality, use an image at least ${MIN_LOGO_DIMENSION}×${MIN_LOGO_DIMENSION}px.`;
        }
      } else {
        if (width < MIN_GALLERY_WIDTH || height < MIN_GALLERY_HEIGHT) {
          isLowResolution = true;
          warning = `Image resolution (${width}×${height}px) is below recommended minimum.`;
          recommendation = `For best quality, use images at least ${MIN_GALLERY_WIDTH}×${MIN_GALLERY_HEIGHT}px.`;
        }
      }

      // Clean up
      URL.revokeObjectURL(img.src);

      resolve({
        width,
        height,
        isLowResolution,
        warning,
        recommendation,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error("Failed to load image for quality check"));
    };

    img.src = URL.createObjectURL(file);
  });
}
