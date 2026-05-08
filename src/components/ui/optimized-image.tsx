import { useState, useRef, useEffect, memo } from "react";
import { cn } from "@/lib/utils";

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  wrapperClassName?: string;
  placeholderColor?: string;
  aspectRatio?: string;
  priority?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  objectFit?: "cover" | "contain" | "fill" | "none";
}

export const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  className,
  wrapperClassName,
  placeholderColor = "hsl(var(--muted))",
  aspectRatio,
  priority = false,
  width,
  height,
  sizes,
  objectFit = "cover",
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (priority) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: "200px", // Preload images 200px before they enter viewport
        threshold: 0,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  useEffect(() => {
    if (!isInView || !imgRef.current) return;

    if (imgRef.current.complete && imgRef.current.naturalHeight !== 0) {
      setIsLoaded(true);
    }
  }, [isInView]);

  const handleLoad = () => {
    setIsLoaded(true);
    setHasError(false);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(true);
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden", wrapperClassName)}
      style={{ aspectRatio }}
    >
      {/* Placeholder with shimmer effect */}
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-500 ease-out",
          isLoaded ? "opacity-0" : "opacity-100"
        )}
        style={{ backgroundColor: placeholderColor }}
      >
        {!isLoaded && !hasError && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
        )}
      </div>

      {/* Actual image */}
      {isInView && !hasError && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          width={width}
          height={height}
          sizes={sizes}
          loading={priority ? "eager" : "lazy"}
          decoding={priority ? "sync" : "async"}
          // @ts-expect-error - fetchpriority is valid HTML but React warns about casing
          fetchpriority={priority ? "high" : "auto"}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            "transition-opacity duration-500 ease-out",
            isLoaded ? "opacity-100" : "opacity-0",
            objectFit === "cover" && "object-cover",
            objectFit === "contain" && "object-contain",
            objectFit === "fill" && "object-fill",
            className
          )}
        />
      )}

      {/* Error fallback */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <span className="text-xs text-muted-foreground">Failed to load</span>
        </div>
      )}
    </div>
  );
});

// Background image variant with blur-up
interface OptimizedBackgroundProps {
  src: string;
  className?: string;
  children?: React.ReactNode;
  overlayClassName?: string;
  priority?: boolean;
}

export const OptimizedBackground = memo(function OptimizedBackground({
  src,
  className,
  children,
  overlayClassName,
  priority = false,
}: OptimizedBackgroundProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (priority) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px", threshold: 0 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  useEffect(() => {
    if (!isInView) return;

    const img = new Image();
    img.onload = () => setIsLoaded(true);
    img.src = src;

    // Cleanup
    return () => {
      img.onload = null;
    };
  }, [isInView, src]);

  return (
    <div ref={containerRef} className={cn("relative overflow-hidden", className)}>
      {/* Placeholder with shimmer */}
      <div
        className={cn(
          "absolute inset-0 bg-muted transition-opacity duration-700 ease-out",
          isLoaded ? "opacity-0" : "opacity-100"
        )}
      >
        {!isLoaded && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
        )}
      </div>

      {/* Background image */}
      <div
        className={cn(
          "absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-700 ease-out",
          isLoaded ? "opacity-100" : "opacity-0"
        )}
        style={{ backgroundImage: isInView ? `url(${src})` : undefined }}
      />

      {/* Overlay */}
      {overlayClassName && <div className={cn("absolute inset-0", overlayClassName)} />}

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
});

// Simple lazy image for basic use cases
interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  priority?: boolean;
}

export const LazyImage = memo(function LazyImage({ 
  src, 
  alt, 
  className, 
  priority = false,
  ...props 
}: LazyImageProps) {
  return (
    <img
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding={priority ? "sync" : "async"}
      // @ts-expect-error - fetchpriority is valid HTML but React warns about casing
      fetchpriority={priority ? "high" : "auto"}
      className={className}
      {...props}
    />
  );
});

// Gallery image with thumbnail support
interface GalleryImageProps {
  src: string;
  alt: string;
  className?: string;
  wrapperClassName?: string;
  onClick?: () => void;
}

export const GalleryImage = memo(function GalleryImage({
  src,
  alt,
  className,
  wrapperClassName,
  onClick,
}: GalleryImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <div
      className={cn(
        "relative overflow-hidden cursor-pointer group",
        wrapperClassName
      )}
      onClick={onClick}
    >
      {/* Placeholder */}
      <div
        className={cn(
          "absolute inset-0 bg-muted transition-opacity duration-300",
          isLoaded ? "opacity-0" : "opacity-100"
        )}
      >
        {!isLoaded && !hasError && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
        )}
      </div>

      {!hasError && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setIsLoaded(true)}
          onError={() => {
            setHasError(true);
            setIsLoaded(true);
          }}
          className={cn(
            "transition-all duration-300",
            isLoaded ? "opacity-100" : "opacity-0",
            "group-hover:scale-105",
            className
          )}
        />
      )}

      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <span className="text-xs text-muted-foreground">Failed to load</span>
        </div>
      )}
    </div>
  );
});