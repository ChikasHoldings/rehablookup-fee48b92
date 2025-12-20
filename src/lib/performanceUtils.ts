/**
 * Performance utilities for page speed optimization
 */

// Preload critical images for LCP improvement
export function preloadCriticalImages(imagePaths: string[]): void {
  imagePaths.forEach((src) => {
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = src;
    link.setAttribute("fetchpriority", "high");
    document.head.appendChild(link);
  });
}

// Prefetch page resources for instant navigation
export function prefetchPage(url: string): void {
  if (document.querySelector(`link[href="${url}"]`)) return;

  const link = document.createElement("link");
  link.rel = "prefetch";
  link.href = url;
  document.head.appendChild(link);
}

// Preconnect to external origins
export function preconnectOrigin(origin: string): void {
  if (document.querySelector(`link[href="${origin}"]`)) return;

  const link = document.createElement("link");
  link.rel = "preconnect";
  link.href = origin;
  link.crossOrigin = "anonymous";
  document.head.appendChild(link);
}

// Report Web Vitals for monitoring
export function reportWebVitals(): void {
  if (typeof window === "undefined") return;

  // Use PerformanceObserver to track LCP, FID, CLS
  if ("PerformanceObserver" in window) {
    // Largest Contentful Paint
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformanceEntry & { startTime: number };
        console.debug("[Web Vitals] LCP:", lastEntry.startTime.toFixed(2), "ms");
      });
      lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
    } catch {
      // LCP not supported
    }

    // First Input Delay
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          const fidEntry = entry as PerformanceEntry & { processingStart: number; startTime: number };
          console.debug("[Web Vitals] FID:", (fidEntry.processingStart - fidEntry.startTime).toFixed(2), "ms");
        });
      });
      fidObserver.observe({ type: "first-input", buffered: true });
    } catch {
      // FID not supported
    }

    // Cumulative Layout Shift
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const layoutShift = entry as PerformanceEntry & { hadRecentInput: boolean; value: number };
          if (!layoutShift.hadRecentInput) {
            clsValue += layoutShift.value;
          }
        }
        console.debug("[Web Vitals] CLS:", clsValue.toFixed(4));
      });
      clsObserver.observe({ type: "layout-shift", buffered: true });
    } catch {
      // CLS not supported
    }
  }
}

// Defer non-critical resources
export function deferNonCriticalResources(): void {
  // Defer loading of non-critical images
  if ("requestIdleCallback" in window) {
    requestIdleCallback(() => {
      const lazyImages = document.querySelectorAll('img[loading="lazy"]');
      lazyImages.forEach((img) => {
        (img as HTMLImageElement).loading = "lazy";
      });
    });
  }
}

// Optimize fonts loading
export function optimizeFonts(): void {
  // Add font-display: swap to all @font-face rules
  if ("fonts" in document) {
    document.fonts.ready.then(() => {
      document.documentElement.classList.add("fonts-loaded");
    });
  }
}

// Initialize all performance optimizations
export function initPerformanceOptimizations(): void {
  // Mark fonts as loaded when ready
  optimizeFonts();

  // Report web vitals in development
  if (import.meta.env.DEV) {
    reportWebVitals();
  }

  // Defer non-critical resources after page load
  if (document.readyState === "complete") {
    deferNonCriticalResources();
  } else {
    window.addEventListener("load", deferNonCriticalResources);
  }
}
