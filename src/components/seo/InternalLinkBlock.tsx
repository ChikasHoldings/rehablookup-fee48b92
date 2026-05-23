import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { statesData } from "@/data/locationSeoData";

interface InternalLinkBlockProps {
  title?: string;
  variant?: "states" | "treatments" | "insurance" | "nearme";
  limit?: number;
  className?: string;
  currentPath?: string;
}

const treatmentTypes = [
  // 2026-05-23: canonical slug is "drug-addiction-treatment" (matches the
  // homepage hero CTA + the treatment-types route in App.tsx). The previous
  // "/treatment-types/drug-addiction" entry triggered a redirect hop on
  // every footer click, diluting crawl efficiency.
  { name: "Drug Addiction Treatment", slug: "/treatment-types/drug-addiction-treatment" },
  { name: "Alcohol Rehabilitation", slug: "/treatment-types/alcohol-rehabilitation" },
  { name: "Detox Programs", slug: "/treatment-types/detox-programs" },
  { name: "Inpatient Rehab", slug: "/treatment-types/residential-inpatient" },
  { name: "Outpatient Programs", slug: "/treatment-types/outpatient-programs" },
  { name: "Dual Diagnosis", slug: "/treatment-types/dual-diagnosis-treatment" },
  { name: "Holistic Therapy", slug: "/treatment-types/holistic-therapy" },
];

const insuranceProviders = [
  { name: "Aetna", slug: "/insurance/aetna-rehab" },
  { name: "Blue Cross Blue Shield", slug: "/insurance/bcbs-treatment" },
  { name: "Cigna", slug: "/insurance/cigna-rehab" },
  { name: "UnitedHealthcare", slug: "/insurance/united-healthcare-rehab" },
  { name: "Humana", slug: "/insurance/humana-rehab" },
  { name: "Kaiser Permanente", slug: "/insurance/kaiser-rehab" },
  { name: "Medicare", slug: "/insurance/medicare-rehab" },
  { name: "Medicaid", slug: "/insurance/medicaid-rehab" },
  { name: "Anthem", slug: "/insurance/anthem-rehab" },
];

const nearMePages = [
  { name: "Drug Rehab Near Me", slug: "/drug-rehab-near-me" },
  { name: "Alcohol Rehab Near Me", slug: "/alcohol-rehab-near-me" },
  { name: "Detox Near Me", slug: "/detox-near-me" },
  { name: "Dual Diagnosis Near Me", slug: "/dual-diagnosis-near-me" },
  { name: "Inpatient Rehab Near Me", slug: "/inpatient-rehab-near-me" },
  // 2026-05-23: canonical near-me slug is "outpatient-rehab-near-me"
  // (App.tsx routes /outpatient-near-me → /outpatient-rehab-near-me).
  // Using the canonical avoids a 301 hop on every footer click.
  { name: "Outpatient Near Me", slug: "/outpatient-rehab-near-me" },
];

export const InternalLinkBlock = forwardRef<HTMLDivElement, InternalLinkBlockProps>(function InternalLinkBlock({
  title,
  variant = "states",
  limit,
  className = "",
  currentPath,
}, ref) {
  let links: { name: string; slug: string }[] = [];
  let defaultTitle = "";

  switch (variant) {
    case "states":
      links = statesData.map((state) => ({
        name: `${state.name} Rehab Centers`,
        slug: `/rehab-centers/${state.slug}`,
      }));
      defaultTitle = "Find Treatment by State";
      break;
    case "treatments":
      links = treatmentTypes;
      defaultTitle = "Treatment Types";
      break;
    case "insurance":
      links = insuranceProviders;
      defaultTitle = "Insurance Coverage";
      break;
    case "nearme":
      links = nearMePages;
      defaultTitle = "Find Treatment Near You";
      break;
  }

  // Filter out current page and apply limit
  const filteredLinks = links
    .filter((link) => link.slug !== currentPath)
    .slice(0, limit || links.length);

  return (
    <div ref={ref} className={`${className}`}>
      <h3 className="text-lg font-semibold text-foreground mb-4">
        {title || defaultTitle}
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {filteredLinks.map((link) => (
          <Link
            key={link.slug}
            to={link.slug}
            className="text-sm text-muted-foreground hover:text-primary transition-colors py-1"
          >
            {link.name}
          </Link>
        ))}
      </div>
    </div>
  );
});

// Compact version for sidebars
export function InternalLinkList({
  title,
  variant = "treatments",
  limit = 6,
  className = "",
}: Omit<InternalLinkBlockProps, "currentPath">) {
  let links: { name: string; slug: string }[] = [];

  switch (variant) {
    case "states":
      // Top states by population
      links = ["california", "texas", "florida", "new-york", "pennsylvania", "illinois"]
        .map((slug) => {
          const state = statesData.find((s) => s.slug === slug);
          return state ? { name: state.name, slug: `/rehab-centers/${state.slug}` } : null;
        })
        .filter(Boolean) as { name: string; slug: string }[];
      break;
    case "treatments":
      links = treatmentTypes;
      break;
    case "insurance":
      links = insuranceProviders;
      break;
    case "nearme":
      links = nearMePages;
      break;
  }

  return (
    <div className={`${className}`}>
      {title && (
        <h4 className="text-sm font-semibold text-foreground mb-3">{title}</h4>
      )}
      <ul className="space-y-2">
        {links.slice(0, limit).map((link) => (
          <li key={link.slug}>
            <Link
              to={link.slug}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {link.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
