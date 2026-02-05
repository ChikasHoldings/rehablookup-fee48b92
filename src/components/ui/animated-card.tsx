 import { useRef, useEffect, useState, ReactNode, forwardRef } from "react";
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
     const ref = (forwardedRef as React.RefObject<HTMLDivElement>) || internalRef;
     const [isVisible, setIsVisible] = useState(instant);

     useEffect(() => {
       if (instant) return;
       
       const element = typeof ref === 'function' ? null : ref.current;
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
     }, [instant, ref]);

     return (
       <div
         ref={ref}
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
