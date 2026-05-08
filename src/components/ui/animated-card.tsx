 import { useRef, useEffect, useState, ReactNode, forwardRef, useCallback } from "react";
import { cn } from "@/lib/utils";

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
   instant?: boolean;
}

 export const AnimatedCard = forwardRef<HTMLDivElement, AnimatedCardProps>(
   ({ children, className, delay = 0, instant = false }, forwardedRef) => {
     const internalRef = useRef<HTMLDivElement>(null);
     const [isVisible, setIsVisible] = useState(instant);

     // Use internal ref for intersection observer
     const elementRef = internalRef;
 
     // Combine refs for forwarding
     const setRefs = useCallback(
       (node: HTMLDivElement | null) => {
         // Set internal ref
         (internalRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
         // Forward ref
         if (typeof forwardedRef === 'function') {
           forwardedRef(node);
         } else if (forwardedRef) {
           (forwardedRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
         }
       },
       [forwardedRef]
     );
 
     useEffect(() => {
       if (instant) return;
       
       const element = elementRef.current;
       if (!element) return;

       const observer = new IntersectionObserver(
         ([entry]) => {
           if (entry.isIntersecting) {
             setIsVisible(true);
             observer.disconnect();
           }
         },
         { threshold: 0.1, rootMargin: "50px" }
       );

       observer.observe(element);
       return () => observer.disconnect();
     // eslint-disable-next-line react-hooks/exhaustive-deps -- elementRef is a stable ref alias for internalRef; instant is the real trigger
     }, [instant]);

     return (
       <div
         ref={setRefs}
         className={cn(
           instant ? "" : "transition-all duration-500 ease-out",
           isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
           className
         )}
         style={{ transitionDelay: instant ? "0ms" : isVisible ? `${delay}ms` : "0ms" }}
       >
         {children}
       </div>
     );
   }
 );
 
 AnimatedCard.displayName = "AnimatedCard";
