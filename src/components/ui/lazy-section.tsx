import { useRef, useState, useEffect, ReactNode } from "react";

interface LazySectionProps {
  children: ReactNode;
  rootMargin?: string;
  className?: string;
  fallbackHeight?: string;
}

/**
 * Renders children only when the section scrolls into view.
 * Uses IntersectionObserver for zero-cost until visible.
 */
export function LazySection({ 
  children, 
  rootMargin = "200px", 
  className,
  fallbackHeight = "200px" 
}: LazySectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  return (
    <div ref={ref} className={className}>
      {isVisible ? children : <div style={{ minHeight: fallbackHeight }} />}
    </div>
  );
}
