import { motion, HTMLMotionProps, Variants } from "framer-motion";
import { ReactNode, forwardRef } from "react";
import { fadeInUp, fadeIn, scaleFadeIn, staggerContainer, viewportOnce } from "@/lib/animations";

interface MotionDivProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  className?: string;
}

// Fade in from bottom
export const FadeInUp = forwardRef<HTMLDivElement, MotionDivProps>(
  ({ children, className, ...props }, ref) => (
    <motion.div
      ref={ref}
      variants={fadeInUp}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
);
FadeInUp.displayName = "FadeInUp";

// Simple fade in
export const FadeIn = forwardRef<HTMLDivElement, MotionDivProps>(
  ({ children, className, ...props }, ref) => (
    <motion.div
      ref={ref}
      variants={fadeIn}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
);
FadeIn.displayName = "FadeIn";

// Scale and fade in
export const ScaleFadeIn = forwardRef<HTMLDivElement, MotionDivProps>(
  ({ children, className, ...props }, ref) => (
    <motion.div
      ref={ref}
      variants={scaleFadeIn}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
);
ScaleFadeIn.displayName = "ScaleFadeIn";

// Stagger container for child animations
export const StaggerContainer = forwardRef<HTMLDivElement, MotionDivProps>(
  ({ children, className, ...props }, ref) => (
    <motion.div
      ref={ref}
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
);
StaggerContainer.displayName = "StaggerContainer";

// Stagger child (used inside StaggerContainer)
export const StaggerItem = forwardRef<HTMLDivElement, MotionDivProps>(
  ({ children, className, ...props }, ref) => (
    <motion.div
      ref={ref}
      variants={fadeInUp}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
);
StaggerItem.displayName = "StaggerItem";

// Page transition wrapper
export const PageTransition = forwardRef<HTMLDivElement, MotionDivProps>(
  ({ children, className, ...props }, ref) => (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
);
PageTransition.displayName = "PageTransition";

// Hover scale wrapper
export const HoverScale = forwardRef<HTMLDivElement, MotionDivProps>(
  ({ children, className, ...props }, ref) => (
    <motion.div
      ref={ref}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
);
HoverScale.displayName = "HoverScale";
