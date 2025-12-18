import { useState, useRef, useEffect } from "react";
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
}

export function OptimizedImage({
  src,
  alt,
  className,
  wrapperClassName,
  placeholderColor = "hsl(var(--muted))",
  aspectRatio,
  priority = false,
  width,
  height,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
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
        rootMargin: "100px", // Increased for earlier loading
        threshold: 0.01,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  useEffect(() => {
    if (!isInView || !imgRef.current) return;

    if (imgRef.current.complete) {
      setIsLoaded(true);
    }
  }, [isInView]);

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden", wrapperClassName)}
      style={{ aspectRatio }}
    >
      {/* Placeholder with blur effect */}
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-300",
          isLoaded ? "opacity-0" : "opacity-100"
        )}
        style={{ backgroundColor: placeholderColor }}
      />

      {/* Actual image */}
      {isInView && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => setIsLoaded(true)}
          className={cn(
            "transition-opacity duration-300",
            isLoaded ? "opacity-100" : "opacity-0",
            className
          )}
        />
      )}
    </div>
  );
}

// Background image variant with blur-up
interface OptimizedBackgroundProps {
  src: string;
  className?: string;
  children?: React.ReactNode;
  overlayClassName?: string;
  priority?: boolean;
}

export function OptimizedBackground({
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
      { rootMargin: "100px", threshold: 0.01 }
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
  }, [isInView, src]);

  return (
    <div ref={containerRef} className={cn("relative overflow-hidden", className)}>
      {/* Placeholder */}
      <div
        className={cn(
          "absolute inset-0 bg-muted transition-opacity duration-500",
          isLoaded ? "opacity-0" : "opacity-100"
        )}
      />

      {/* Background image */}
      <div
        className={cn(
          "absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-500",
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
}

// Simple lazy image for basic use cases
interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
}

export function LazyImage({ src, alt, className, ...props }: LazyImageProps) {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={className}
      {...props}
    />
  );
}
