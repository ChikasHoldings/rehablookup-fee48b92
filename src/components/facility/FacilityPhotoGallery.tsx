import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface FacilityPhotoGalleryProps {
  images: string[];
  facilityName: string;
}

export function FacilityPhotoGallery({ images, facilityName }: FacilityPhotoGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  if (images.length === 0) return null;

  const displayImages = images.slice(0, 5);
  const remainingCount = images.length - 5;

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const navigateLightbox = (direction: "prev" | "next") => {
    if (direction === "prev") {
      setLightboxIndex(lightboxIndex === 0 ? images.length - 1 : lightboxIndex - 1);
    } else {
      setLightboxIndex(lightboxIndex === images.length - 1 ? 0 : lightboxIndex + 1);
    }
  };

  return (
    <>
      {/* Mobile: Horizontal scroll gallery.
          The first (hero) image gets eager loading + high fetchpriority
          for LCP. Off-screen images stay lazy so the network burst on
          mount stays small. */}
      <div className="sm:hidden">
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-hide">
          {images.slice(0, 8).map((img, idx) => (
            <button
              key={idx}
              onClick={() => openLightbox(idx)}
              className={cn(
                "relative shrink-0 snap-start overflow-hidden rounded-lg bg-muted",
                idx === 0 ? "w-[70vw] aspect-[4/3]" : "w-32 aspect-square"
              )}
            >
              <img
                src={img}
                alt={`${facilityName} - Photo ${idx + 1}`}
                className="w-full h-full object-cover"
                loading={idx === 0 ? "eager" : "lazy"}
                fetchPriority={idx === 0 ? "high" : "auto"}
                decoding={idx === 0 ? "sync" : "async"}
              />
              {idx === 7 && images.length > 8 && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-white font-bold text-base">
                    +{images.length - 8}
                  </span>
                </div>
              )}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Swipe to see more • Tap to enlarge
        </p>
      </div>

      {/* Desktop: Grid layout (1 large + 4 small).
          Main image is the LCP candidate — eager + high priority + sync
          decode so it paints with the rest of the layout instead of
          arriving a beat late. */}
      <div className="grid grid-cols-2 sm:grid-cols-4 grid-rows-2 sm:grid-rows-2 gap-2 h-[220px] md:h-[260px] rounded-xl overflow-hidden">
        {/* Main large image */}
        <button
          onClick={() => openLightbox(0)}
          className="col-span-2 row-span-2 relative group overflow-hidden bg-muted"
        >
          <img
            src={displayImages[0]}
            alt={`${facilityName} - Photo 1`}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="eager"
            fetchPriority="high"
            decoding="sync"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
        </button>

        {/* Small images grid (2x2) — lazy-loaded so they don't compete
            with the hero for initial bandwidth. */}
        {[1, 2, 3, 4].map((idx) => (
          <button
            key={idx}
            onClick={() => displayImages[idx] && openLightbox(idx)}
            className={cn(
              "relative group overflow-hidden bg-muted",
              !displayImages[idx] && "cursor-default"
            )}
          >
            {displayImages[idx] ? (
              <>
                <img
                  src={displayImages[idx]}
                  alt={`${facilityName} - Photo ${idx + 1}`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />

                {/* Show +X overlay on last visible image if there are more */}
                {idx === 4 && remainingCount > 0 && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">
                      +{remainingCount}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="h-5 w-5 text-muted-foreground/30" />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox Dialog */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-4xl w-[95vw] sm:w-[90vw] p-0 bg-black/95 border-none">
          <VisuallyHidden>
            <DialogTitle>{facilityName} Photo Gallery</DialogTitle>
          </VisuallyHidden>
          
          <div className="relative aspect-[4/3] sm:aspect-[16/10] w-full">
            <img
              src={images[lightboxIndex]}
              alt={`${facilityName} - Photo ${lightboxIndex + 1}`}
              className="w-full h-full object-contain"
            />
            
            {/* Navigation */}
            {images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigateLightbox("prev")}
                  className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white"
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigateLightbox("next")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white"
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}
            
            {/* Counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/60 text-white text-sm font-medium">
              {lightboxIndex + 1} / {images.length}
            </div>
            
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLightboxOpen(false)}
              className="absolute top-2 right-2 h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 text-white"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Thumbnail strip - hidden on mobile for cleaner UX */}
          {images.length > 1 && (
            <div className="hidden sm:flex gap-1.5 p-3 overflow-x-auto bg-black/80">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setLightboxIndex(idx)}
                  className={cn(
                    "shrink-0 w-14 h-10 rounded overflow-hidden transition-all",
                    idx === lightboxIndex
                      ? "ring-2 ring-white opacity-100"
                      : "opacity-50 hover:opacity-75"
                  )}
                >
                  <img src={img} alt={`${facilityName} - Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
