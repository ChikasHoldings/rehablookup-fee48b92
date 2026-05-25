import { Link } from "react-router-dom";
import { ArrowRight, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  treatmentTypeLinks,
  nearMeLinks,
  insuranceLinks,
  topStateLinks,
  resourceLinks,
} from "./InternalLinkingSection";

interface CategoryLinksConfig {
  title: string;
  description: string;
  primaryLinks: { title: string; href: string; icon?: LucideIcon }[];
  secondaryLinks: { title: string; href: string; icon?: LucideIcon }[];
}

// Category-to-links mapping for smart internal linking
const categoryLinksMap: Record<string, CategoryLinksConfig> = {
  treatment: {
    title: "Explore Treatment Options",
    description: "Find the right treatment approach for your recovery journey.",
    primaryLinks: treatmentTypeLinks.slice(0, 4),
    secondaryLinks: nearMeLinks.slice(0, 4),
  },
  recovery: {
    title: "Recovery Resources",
    description: "Tools and guides to support your ongoing recovery.",
    primaryLinks: [
      ...resourceLinks.filter(l => l.href.includes("relapse") || l.href.includes("support")),
      ...treatmentTypeLinks.slice(0, 2),
    ],
    secondaryLinks: nearMeLinks.slice(0, 4),
  },
  insurance: {
    title: "Insurance & Payment Options",
    description: "Understand your coverage and find affordable treatment.",
    primaryLinks: insuranceLinks.slice(0, 4),
    secondaryLinks: treatmentTypeLinks.slice(0, 4),
  },
  "family-support": {
    title: "Family Resources",
    description: "Support for families navigating a loved one's recovery.",
    primaryLinks: resourceLinks.filter(l => l.href.includes("family") || l.href.includes("loved-one")),
    secondaryLinks: treatmentTypeLinks.slice(0, 4),
  },
  "mental-health": {
    title: "Mental Health & Treatment",
    description: "Dual diagnosis and co-occurring disorder resources.",
    primaryLinks: [
      ...treatmentTypeLinks.filter(l => l.href.includes("dual-diagnosis")),
      ...resourceLinks.slice(0, 2),
    ],
    secondaryLinks: nearMeLinks.filter(l => l.href.includes("dual")),
  },
  locations: {
    title: "Find Treatment by Location",
    description: "Search for rehab centers in your state or city.",
    primaryLinks: topStateLinks.slice(0, 4),
    secondaryLinks: nearMeLinks.slice(0, 4),
  },
  international: {
    title: "International Treatment Options",
    description: "Resources for international patients seeking treatment in the USA.",
    primaryLinks: [
      ...treatmentTypeLinks.filter(l => l.href.includes("luxury") || l.href.includes("inpatient")),
      ...resourceLinks.slice(0, 2),
    ],
    secondaryLinks: topStateLinks.slice(0, 4),
  },
  default: {
    title: "Helpful Resources",
    description: "Explore more guides and treatment information.",
    primaryLinks: treatmentTypeLinks.slice(0, 4),
    secondaryLinks: insuranceLinks.slice(0, 4),
  },
};

interface ArticleCategoryLinksProps {
  category: string;
  className?: string;
  variant?: "sidebar" | "inline" | "footer";
}

export function ArticleCategoryLinks({
  category,
  className,
  variant = "sidebar",
}: ArticleCategoryLinksProps) {
  const config = categoryLinksMap[category] || categoryLinksMap.default;

  if (variant === "inline") {
    // Compact inline version for within article content
    return (
      <div className={cn("my-8 rounded-xl border border-border/60 bg-muted/30 p-5", className)}>
        <p className="text-sm font-medium text-foreground mb-3">{config.title}</p>
        <div className="flex flex-wrap gap-2">
          {config.primaryLinks.slice(0, 4).map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
            >
              {link.icon && <link.icon className="h-3 w-3" />}
              {link.title}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  if (variant === "footer") {
    // Footer version with two columns
    return (
      <div className={cn("border-t border-border pt-8 mt-8", className)}>
        <h3 className="text-sm font-semibold text-foreground mb-1">{config.title}</h3>
        <p className="text-xs text-muted-foreground mb-4">{config.description}</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          {[...config.primaryLinks.slice(0, 3), ...config.secondaryLinks.slice(0, 3)].map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors group py-1"
            >
              {link.icon && <link.icon className="h-3.5 w-3.5 shrink-0" />}
              <span className="truncate">{link.title}</span>
              <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    );
  }

  // Default sidebar variant
  return (
    <div className={cn("rounded-2xl border border-border/50 bg-card p-5 shadow-sm", className)}>
      <h3 className="font-display text-base font-semibold text-foreground mb-1">
        {config.title}
      </h3>
      <p className="text-xs text-muted-foreground mb-4">{config.description}</p>
      
      <div className="space-y-1.5 mb-4">
        {config.primaryLinks.slice(0, 4).map((link) => (
          <Link
            key={link.href}
            to={link.href}
            className="flex items-center gap-2 py-1.5 px-2 text-sm text-muted-foreground hover:text-primary hover:bg-muted/50 rounded-lg transition-colors group"
          >
            {link.icon && <link.icon className="h-4 w-4 shrink-0 text-primary/60" />}
            <span className="flex-1 truncate">{link.title}</span>
            <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </Link>
        ))}
      </div>
      
      <div className="pt-3 border-t border-border/50">
        <p className="text-xs font-medium text-muted-foreground mb-2">Also explore:</p>
        <div className="flex flex-wrap gap-1.5">
          {config.secondaryLinks.slice(0, 3).map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/30 px-2.5 py-1 text-xs text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
            >
              {link.title}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

