import { Link } from "react-router-dom";
import { ArrowRight, MapPin, Building2, Shield } from "lucide-react";

interface RelatedLink {
  title: string;
  href: string;
  description?: string;
}

interface RelatedLinksSectionProps {
  title?: string;
  treatmentLinks?: RelatedLink[];
  locationLinks?: RelatedLink[];
  insuranceLinks?: RelatedLink[];
  className?: string;
}

export function RelatedLinksSection({
  title = "Related Resources",
  treatmentLinks = [],
  locationLinks = [],
  insuranceLinks = [],
  className = "",
}: RelatedLinksSectionProps) {
  const hasContent = treatmentLinks.length > 0 || locationLinks.length > 0 || insuranceLinks.length > 0;

  if (!hasContent) return null;

  return (
    <section className={`py-12 bg-muted/30 ${className}`} aria-labelledby="related-resources-heading">
      <div className="container">
        <h2 id="related-resources-heading" className="text-2xl font-bold text-foreground mb-8">
          {title}
        </h2>
        
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {/* Treatment Links */}
          {treatmentLinks.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <Building2 className="h-5 w-5" />
                <h3 className="font-semibold">Treatment Options</h3>
              </div>
              <ul className="space-y-2">
              {treatmentLinks.filter(l => l?.href).map((link) => (
                  <li key={link.href}>
                    <Link
                      to={link.href}
                      className="group flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ArrowRight className="h-3 w-3 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                      <span>{link.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Location Links */}
          {locationLinks.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <MapPin className="h-5 w-5" />
                <h3 className="font-semibold">Nearby Locations</h3>
              </div>
              <ul className="space-y-2">
              {locationLinks.filter(l => l?.href).map((link) => (
                  <li key={link.href}>
                    <Link
                      to={link.href}
                      className="group flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ArrowRight className="h-3 w-3 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                      <span>{link.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Insurance Links */}
          {insuranceLinks.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <Shield className="h-5 w-5" />
                <h3 className="font-semibold">Insurance Coverage</h3>
              </div>
              <ul className="space-y-2">
              {insuranceLinks.filter(l => l?.href).map((link) => (
                  <li key={link.href}>
                    <Link
                      to={link.href}
                      className="group flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ArrowRight className="h-3 w-3 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                      <span>{link.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// Pre-built link sets for common use cases
export const defaultTreatmentLinks: RelatedLink[] = [
  { title: "Detox Programs", href: "/treatment-types/detox-programs" },
  { title: "Inpatient Rehab", href: "/treatment-types/residential-inpatient" },
  { title: "Outpatient Programs", href: "/treatment-types/outpatient-programs" },
  { title: "Dual Diagnosis Treatment", href: "/treatment-types/dual-diagnosis-treatment" },
  { title: "Alcohol Rehabilitation", href: "/treatment-types/alcohol-rehabilitation" },
];

export const defaultInsuranceLinks: RelatedLink[] = [
  { title: "Aetna Coverage", href: "/insurance/aetna-rehab" },
  { title: "Blue Cross Blue Shield", href: "/insurance/bcbs-treatment" },
  { title: "Cigna Rehab Coverage", href: "/insurance/cigna-rehab" },
  { title: "UnitedHealthcare", href: "/insurance/united-healthcare-rehab" },
  { title: "Medicare Coverage", href: "/insurance/medicare-rehab" },
];

export function getStateLocationLinks(stateSlug: string, stateName: string): RelatedLink[] {
  return [
    { title: `Detox in ${stateName}`, href: `/treatment-types/detox-programs/${stateSlug}` },
    { title: `Inpatient Rehab in ${stateName}`, href: `/treatment-types/residential-inpatient/${stateSlug}` },
    { title: `Outpatient in ${stateName}`, href: `/treatment-types/outpatient-programs/${stateSlug}` },
    { title: `All Rehabs in ${stateName}`, href: `/rehab-centers/${stateSlug}` },
  ];
}
