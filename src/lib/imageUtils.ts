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
