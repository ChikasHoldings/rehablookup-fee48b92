import { useEffect, useRef, useState } from "react";
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

  // Mobile snap-carousel state: which image is currently centered in
  // the scroll-snap viewport, so the dots and counter update as the
  // user swipes. Updated on scroll via the snapped item's clientWidth
  // (rather than IntersectionObserver — simpler, no observer plumbing
  // for what is effectively a 1-axis snap container).
  const [mobileIndex, setMobileIndex] = useState(0);
  const mobileScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = mobileScrollRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      // Coalesce scroll events through rAF — `scroll` fires every frame
      // on iOS momentum scroll, and setState on every one of those would
      // thrash React for no benefit.
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const w = el.clientWidth || 1;
        const idx = Math.min(images.length - 1, Math.max(0, Math.round(el.scrollLeft / w)));
        setMobileIndex(idx);
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [images.length]);

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
      {/* Mobile: single-image snap carousel.
          ONE image visible at a time, full-width within the gallery
          container. Horizontal-snap means the swipe rests on the next
          image's edge rather than scrolling fluidly past it
          (Instagram / Airbnb / Yelp pattern, what users expect on
          phones). Tap any image to open the lightbox at that index.
          The first image is the LCP candidate so it gets eager loading
          + high fetchpriority; off-screen images stay lazy. */}
      <div className="sm:hidden">
        <div
          ref={mobileScrollRef}
          className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide rounded-xl bg-muted"
          style={{ scrollbarWidth: "none" }}
          aria-label={`${facilityName} photo gallery — swipe to navigate`}
        >
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => openLightbox(idx)}
              className="relative shrink-0 snap-center w-full aspect-[4/3] overflow-hidden"
              aria-label={`Open photo ${idx + 1} of ${images.length}`}
            >
              <img
                src={img}
                alt={`${facilityName} - Photo ${idx + 1}`}
                className="w-full h-full object-cover"
                loading={idx === 0 ? "eager" : "lazy"}
                fetchPriority={idx === 0 ? "high" : "auto"}
                decoding={idx === 0 ? "sync" : "async"}
                draggable={false}
              />
            </button>
          ))}
        </div>

        {/* Pagination — dots + counter. Dots widen on the active
            position (Instagram-style "expanded pill") so the active
            position is visible without color reliance. */}
        {images.length > 1 && (
          <div className="flex flex-col items-center gap-1.5 mt-2.5">
            <div className="flex items-center gap-1.5" role="presentation" aria-hidden="true">
              {images.map((_, idx) => (
                <span
                  key={idx}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-200",
                    idx === mobileIndex ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30",
                  )}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="tabular-nums font-medium text-foreground">
                {mobileIndex + 1}
              </span>{" "}
              of {images.length} · Swipe to navigate, tap to enlarge
            </p>
          </div>
        )}
      </div>

      {/* Desktop: Grid layout (1 large + 4 small). HIDDEN on mobile —
          previously this branch was missing `hidden sm:grid` and the
          two layouts were stacking on mobile, doubling render cost
          and producing a strange "swipe strip then 2×2 thumbnails"
          presentation.
          Main image is the LCP candidate — eager + high priority +
          sync decode so it paints with the rest of the layout. */}
      <div className="hidden sm:grid sm:grid-cols-4 sm:grid-rows-2 gap-2 h-[220px] md:h-[260px] rounded-xl overflow-hidden">
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
