/**
 * Performance Optimization Utilities
 * Focused on achieving < 3 second load times and Core Web Vitals
 */

/**
 * Preload critical images for LCP improvement
 */
export function preloadCriticalImages(imagePaths: string[]): void {
  if (typeof document === "undefined") return;

  imagePaths.forEach((path) => {
    // Check if already preloaded
    const existing = document.querySelector(`link[rel="preload"][href="${path}"]`);
    if (existing) return;

    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = path;
    link.setAttribute("fetchpriority", "high");
    document.head.appendChild(link);
  });
}

/**
 * Prefetch page resources for faster navigation
 */
export function prefetchPage(url: string): void {
  if (typeof document === "undefined") return;

  const existing = document.querySelector(`link[rel="prefetch"][href="${url}"]`);
  if (existing) return;

  const link = document.createElement("link");
  link.rel = "prefetch";
  link.href = url;
  document.head.appendChild(link);
}

/**
 * Preconnect to external origins to reduce latency
 */
export function preconnectOrigin(origin: string): void {
  if (typeof document === "undefined") return;

  const existing = document.querySelector(`link[rel="preconnect"][href="${origin}"]`);
  if (existing) return;

  const link = document.createElement("link");
  link.rel = "preconnect";
  link.href = origin;
  link.crossOrigin = "anonymous";
  document.head.appendChild(link);
}

/**
 * DNS prefetch for external resources
 */
export function dnsPrefetch(origin: string): void {
  if (typeof document === "undefined") return;

  const existing = document.querySelector(`link[rel="dns-prefetch"][href="${origin}"]`);
  if (existing) return;

  const link = document.createElement("link");
  link.rel = "dns-prefetch";
  link.href = origin;
  document.head.appendChild(link);
}

/**
 * Performance metrics tracking
 */
interface PerformanceMetrics {
  lcp: number | null;
  fid: number | null;
  cls: number | null;
  fcp: number | null;
  ttfb: number | null;
}

const metricsCache: PerformanceMetrics = {
  lcp: null,
  fid: null,
  cls: null,
  fcp: null,
  ttfb: null,
};

/**
 * Report Web Vitals metrics
 */
export function reportWebVitals(): void {
  if (typeof window === "undefined" || typeof PerformanceObserver === "undefined") return;

  const isDev = import.meta.env.DEV;

  // Largest Contentful Paint
  try {
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1] as PerformanceEntry & { renderTime?: number; loadTime?: number };
      metricsCache.lcp = lastEntry.renderTime || lastEntry.loadTime || lastEntry.startTime;
      if (isDev) console.log(`📊 LCP: ${metricsCache.lcp?.toFixed(0)}ms`);
    });
    lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
  } catch {
    // LCP not supported
  }

  // First Input Delay
  try {
    const fidObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const firstEntry = entries[0] as PerformanceEntry & { processingStart?: number };
      if (firstEntry.processingStart) {
        metricsCache.fid = firstEntry.processingStart - firstEntry.startTime;
        if (isDev) console.log(`📊 FID: ${metricsCache.fid?.toFixed(0)}ms`);
      }
    });
    fidObserver.observe({ type: "first-input", buffered: true });
  } catch {
    // FID not supported
  }

  // Cumulative Layout Shift
  try {
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        const layoutShift = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
        if (!layoutShift.hadRecentInput && layoutShift.value) {
          clsValue += layoutShift.value;
          metricsCache.cls = clsValue;
        }
      }
    });
    clsObserver.observe({ type: "layout-shift", buffered: true });
  } catch {
    // CLS not supported
  }

  // First Contentful Paint
  try {
    const fcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const fcpEntry = entries.find((e) => e.name === "first-contentful-paint");
      if (fcpEntry) {
        metricsCache.fcp = fcpEntry.startTime;
        if (isDev) console.log(`📊 FCP: ${metricsCache.fcp?.toFixed(0)}ms`);
      }
    });
    fcpObserver.observe({ type: "paint", buffered: true });
  } catch {
    // FCP not supported
  }

  // Time to First Byte
  try {
    const navEntries = performance.getEntriesByType("navigation");
    if (navEntries.length > 0) {
      const navEntry = navEntries[0] as PerformanceNavigationTiming;
      metricsCache.ttfb = navEntry.responseStart - navEntry.requestStart;
      if (isDev) console.log(`📊 TTFB: ${metricsCache.ttfb?.toFixed(0)}ms`);
    }
  } catch {
    // Navigation timing not supported
  }
}

/**
 * Get current performance metrics
 */
export function getPerformanceMetrics(): PerformanceMetrics {
  return { ...metricsCache };
}

/**
 * Defer non-critical resources using requestIdleCallback
 */
export function deferNonCriticalResources(): void {
  if (typeof window === "undefined") return;

  const callback = () => {
    // Load lazy images that are visible
    const lazyImages = document.querySelectorAll('img[loading="lazy"]');
    lazyImages.forEach((img) => {
      if (img instanceof HTMLImageElement && img.dataset.src) {
        img.src = img.dataset.src;
      }
    });
  };

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(callback, { timeout: 2000 });
  } else {
    setTimeout(callback, 200);
  }
}

/**
 * Optimize font loading with font-display: swap
 */
export function optimizeFonts(): void {
  if (typeof window === "undefined") return;
  
  const docElement = document.documentElement;
  
  if ("fonts" in document && document.fonts) {
    document.fonts.ready.then(() => {
      docElement.classList.add("fonts-loaded");
    });
  } else {
    docElement.classList.add("fonts-loaded");
  }
}

/**
 * Check if connection is slow (for adaptive loading)
 */
export function isSlowConnection(): boolean {
  if (typeof navigator === "undefined") return false;

  const connection = (navigator as Navigator & { 
    connection?: { 
      effectiveType?: string; 
      saveData?: boolean;
    } 
  }).connection;

  if (!connection) return false;

  return (
    connection.saveData === true ||
    connection.effectiveType === "slow-2g" ||
    connection.effectiveType === "2g"
  );
}

/**
 * Preload critical resources for the homepage
 */
export function preloadHomepageCriticalResources(): void {
  // Preconnect to Supabase
  preconnectOrigin("https://mldbxpntzcjalgjmwnqa.supabase.co");
  
  // DNS prefetch for fonts
  dnsPrefetch("https://fonts.googleapis.com");
  dnsPrefetch("https://fonts.gstatic.com");
}

/**
 * Initialize all performance optimizations
 */
export function initPerformanceOptimizations(): void {
  // Immediate optimizations
  optimizeFonts();
  preloadHomepageCriticalResources();

  // Deferred optimizations
  if (document.readyState === "complete") {
    reportWebVitals();
    deferNonCriticalResources();
  } else {
    window.addEventListener("load", () => {
      reportWebVitals();
      deferNonCriticalResources();
    });
  }

  // Log performance summary after page is interactive
  if (import.meta.env.DEV) {
    setTimeout(() => {
      const metrics = getPerformanceMetrics();
      console.log("📊 Performance Summary:", metrics);
      
      if (metrics.lcp && metrics.lcp > 2500) {
        console.warn("⚠️ LCP > 2.5s - Consider optimizing images");
      }
      if (metrics.cls && metrics.cls > 0.1) {
        console.warn("⚠️ CLS > 0.1 - Add explicit dimensions to images");
      }
    }, 5000);
  }
}