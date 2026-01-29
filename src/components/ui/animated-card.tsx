import { ReactNode, forwardRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export const AnimatedCard = forwardRef<HTMLDivElement, AnimatedCardProps>(
  function AnimatedCard({ children, className, delay = 0 }, ref) {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ 
          duration: 0.5, 
          delay: delay / 1000, // Convert ms to seconds
          ease: [0.25, 0.46, 0.45, 0.94] 
        }}
        className={cn(className)}
      >
        {children}
      </motion.div>
    );
  }
);
