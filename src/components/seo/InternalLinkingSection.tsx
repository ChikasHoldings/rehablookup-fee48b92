import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { 
  ArrowRight, 
  MapPin, 
  Pill, 
  Activity, 
  Brain, 
  Shield, 
  Sparkles, 
  Building2,
  BookOpen,
  CreditCard,
  Heart,
  Users,
  LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LinkItem {
  title: string;
  href: string;
  description?: string;
  icon?: LucideIcon;
}

interface LinkGroup {
  title: string;
  links: LinkItem[];
}

// Pre-defined link groups for SEO cross-linking
export const treatmentTypeLinks: LinkItem[] = [
  { title: "Detox Programs", href: "/treatment-types/detox-programs", icon: Sparkles },
  { title: "Inpatient Rehab", href: "/treatment-types/residential-inpatient", icon: Building2 },
  { title: "Outpatient Programs", href: "/treatment-types/outpatient-programs", icon: Users },
  { title: "Dual Diagnosis", href: "/treatment-types/dual-diagnosis-treatment", icon: Brain },
  { title: "Alcohol Rehab", href: "/treatment-types/alcohol-rehabilitation", icon: Activity },
  { title: "Drug Addiction", href: "/treatment-types/drug-addiction-treatment", icon: Pill },
];

export const nearMeLinks: LinkItem[] = [
  { title: "Drug Rehab Near Me", href: "/drug-rehab-near-me", icon: Pill },
  { title: "Alcohol Rehab Near Me", href: "/alcohol-rehab-near-me", icon: Activity },
  { title: "Detox Near Me", href: "/detox-near-me", icon: Sparkles },
  { title: "Dual Diagnosis Near Me", href: "/dual-diagnosis-near-me", icon: Brain },
  { title: "Inpatient Rehab Near Me", href: "/inpatient-rehab-near-me", icon: Building2 },
  { title: "Outpatient Near Me", href: "/outpatient-near-me", icon: Users },
  { title: "Free Rehab Near Me", href: "/free-rehab-near-me", icon: Heart },
  { title: "Luxury Rehab Near Me", href: "/luxury-rehab-near-me", icon: Sparkles },
];

export const insuranceLinks: LinkItem[] = [
  { title: "Aetna Rehab Coverage", href: "/insurance/aetna-rehab", icon: Shield },
  { title: "BCBS Treatment", href: "/insurance/bcbs-treatment", icon: Shield },
  { title: "Cigna Rehab", href: "/insurance/cigna-rehab", icon: Shield },
  { title: "UnitedHealthcare", href: "/insurance/united-healthcare-rehab", icon: Shield },
  { title: "Medicare Rehab", href: "/insurance/medicare-rehab", icon: Shield },
  { title: "Medicaid Rehab", href: "/insurance/medicaid-rehab", icon: CreditCard },
];

export const topStateLinks: LinkItem[] = [
  { title: "California Rehab", href: "/rehab-centers/california", icon: MapPin },
  { title: "Florida Rehab", href: "/rehab-centers/florida", icon: MapPin },
  { title: "Texas Rehab", href: "/rehab-centers/texas", icon: MapPin },
  { title: "New York Rehab", href: "/rehab-centers/new-york", icon: MapPin },
  { title: "Arizona Rehab", href: "/rehab-centers/arizona", icon: MapPin },
  { title: "Colorado Rehab", href: "/rehab-centers/colorado", icon: MapPin },
];

export const resourceLinks: LinkItem[] = [
  { title: "Types of Treatment", href: "/resources/types-of-addiction-treatment", icon: BookOpen },
  { title: "Choosing a Rehab", href: "/resources/choosing-rehab-center", icon: BookOpen },
  // Phase AD: canonical published article (insurance-coverage-guide
  // didn't exist; legacy redirect handles other in-flight references).
  { title: "Insurance Guide", href: "/resources/insurance-appeal-rehab-denial", icon: BookOpen },
  { title: "Dual Diagnosis Guide", href: "/resources/understanding-dual-diagnosis", icon: Brain },
  { title: "What to Expect", href: "/resources/first-week-treatment", icon: BookOpen },
  { title: "Supporting a Loved One", href: "/resources/supporting-loved-one", icon: Heart },
];

interface InternalLinkingSectionProps {
  title?: string;
  description?: string;
  groups: LinkGroup[];
  variant?: "default" | "compact" | "grid";
  className?: string;
}

export const InternalLinkingSection = forwardRef<HTMLElement, InternalLinkingSectionProps>(
  function InternalLinkingSection({
    title = "Related Resources",
    description,
    groups,
    variant = "default",
    className,
  }, ref) {
  if (variant === "compact") {
    return (
      <section ref={ref} className={cn("py-8 md:py-10", className)}>
        <div className="container">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-foreground">{title}</h2>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {groups.flatMap((group) =>
              group.links.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                >
                  {link.icon && <link.icon className="h-3.5 w-3.5" />}
                  {link.title}
                </Link>
              ))
            )}
          </div>
        </div>
      </section>
    );
  }

  if (variant === "grid") {
    return (
      <section ref={ref} className={cn("border-t border-border bg-secondary/30 py-10 md:py-14", className)}>
        <div className="container">
          <div className="mb-6 text-center">
            <h2 className="text-lg font-bold text-foreground md:text-xl">{title}</h2>
            {description && (
              <p className="text-sm text-muted-foreground mt-1 max-w-xl mx-auto">{description}</p>
            )}
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <div key={group.title} className="rounded-xl border border-border bg-card p-5">
                <h3 className="font-semibold text-foreground mb-3 text-sm uppercase tracking-wider text-primary">
                  {group.title}
                </h3>
                <div className="space-y-2">
                  {group.links.slice(0, 5).map((link) => (
                    <Link
                      key={link.href}
                      to={link.href}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group"
                    >
                      {link.icon && <link.icon className="h-4 w-4 shrink-0" />}
                      <span className="truncate">{link.title}</span>
                      <ArrowRight className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Default variant
  return (
    <section ref={ref} className={cn("border-t border-border py-10 md:py-14", className)}>
      <div className="container">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-foreground md:text-xl">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <div key={group.title}>
              <h3 className="font-semibold text-foreground mb-3 text-sm">
                {group.title}
              </h3>
              <ul className="space-y-2">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      to={link.href}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group"
                    >
                      {link.icon && <link.icon className="h-4 w-4 shrink-0 text-primary/60" />}
                      <span>{link.title}</span>
                      <ArrowRight className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});

// Quick cross-link bar for top of pages
export function QuickLinksBar({ 
  currentPage,
  className 
}: { 
  currentPage: "treatment" | "near-me" | "insurance" | "resources" | "locations";
  className?: string;
}) {
  const links = [
    { label: "Treatment Types", href: "/treatment-types", active: currentPage === "treatment" },
    { label: "Near Me", href: "/drug-rehab-near-me", active: currentPage === "near-me" },
    { label: "Insurance", href: "/insurance", active: currentPage === "insurance" },
    { label: "Resources", href: "/resources", active: currentPage === "resources" },
    { label: "Locations", href: "/locations", active: currentPage === "locations" },
  ];

  return (
    <nav className={cn("border-b border-border bg-card/50 py-2 overflow-x-auto", className)}>
      <div className="container">
        <div className="flex items-center gap-1 min-w-max">
          <span className="text-xs text-muted-foreground mr-2 shrink-0">Explore:</span>
          {links.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                link.active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
