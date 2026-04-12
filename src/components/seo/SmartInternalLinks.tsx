import { Link } from "react-router-dom";
import { MapPin, Shield, Heart, BookOpen } from "lucide-react";
import { statesData } from "@/data/locationSeoData";
import { stateCountyData } from "@/data/countySeoData";
import { insurerConfigs } from "@/data/seoInsuranceStateConfig";

interface SmartInternalLinksProps {
  pageType: "city" | "state" | "county" | "city-treatment" | "state-treatment" | "insurance-state";
  stateSlug?: string;
  stateName?: string;
  citySlug?: string;
  countySlug?: string;
  treatmentSlug?: string;
  insurerSlug?: string;
  maxLinks?: number;
}

interface LinkGroup {
  title: string;
  icon: React.ReactNode;
  links: { label: string; href: string }[];
}

/**
 * Generates contextual internal links based on the current page type.
 * Each page type gets a different set of related links to create
 * a strong internal linking web without being spammy.
 */
export function SmartInternalLinks({
  pageType,
  stateSlug,
  stateName,
  citySlug,
  countySlug,
  treatmentSlug,
  insurerSlug,
  maxLinks = 8,
}: SmartInternalLinksProps) {
  const groups: LinkGroup[] = [];

  // Find state data
  const stateData = stateSlug
    ? statesData.find((s) => s.slug === stateSlug)
    : null;

  // Find county data
  const countyData = stateSlug
    ? stateCountyData.find((s) => s.stateSlug === stateSlug)
    : null;

  const treatmentTypes = [
    { slug: "alcohol-rehab", label: "Alcohol Rehab" },
    { slug: "drug-rehab", label: "Drug Rehab" },
    { slug: "detox-centers", label: "Detox Programs" },
    { slug: "inpatient-rehab", label: "Inpatient Rehab" },
    { slug: "outpatient-rehab", label: "Outpatient Programs" },
    { slug: "dual-diagnosis-treatment", label: "Dual Diagnosis" },
  ];

  // --- City pages: link to county, state, city+treatment combos, insurance ---
  if (pageType === "city" && stateSlug && citySlug) {
    // City + Treatment combos
    const treatmentLinks = treatmentTypes.slice(0, 4).map((t) => ({
      label: `${t.label} in ${stateName || "this area"}`,
      href: `/${t.slug}-in-${citySlug}`,
    }));
    if (treatmentLinks.length > 0) {
      groups.push({ title: "Treatment Types", icon: <Heart className="h-4 w-4 text-primary" />, links: treatmentLinks });
    }

    // Counties in the same state
    if (countyData) {
      const countyLinks = countyData.counties.slice(0, maxLinks).map((c) => ({
        label: `${c.name} County`,
        href: `/rehab-centers/${stateSlug}/county/${c.slug}`,
      }));
      if (countyLinks.length > 0) {
        groups.push({ title: "Nearby Counties", icon: <MapPin className="h-4 w-4 text-muted-foreground" />, links: countyLinks });
      }
    }

    // Insurance pages for this state
    const topInsurers = insurerConfigs.slice(0, 4);
    const insuranceLinks = topInsurers.map((ins) => ({
      label: `${ins.name} Coverage`,
      href: `/insurance/${ins.slug}/${stateSlug}`,
    }));
    if (insuranceLinks.length > 0) {
      groups.push({ title: "Insurance Coverage", icon: <Shield className="h-4 w-4 text-accent" />, links: insuranceLinks });
    }
  }

  // --- State pages: link to top cities, counties, treatments ---
  if (pageType === "state" && stateSlug) {
    // Top cities in state
    if (stateData) {
      const cityLinks = stateData.cities.slice(0, maxLinks).map((c) => ({
        label: c.city,
        href: `/rehab-centers/${stateSlug}/${c.slug}`,
      }));
      if (cityLinks.length > 0) {
        groups.push({ title: `Cities in ${stateName}`, icon: <MapPin className="h-4 w-4 text-primary" />, links: cityLinks });
      }
    }

    // Treatment types for this state
    const stTreatmentLinks = treatmentTypes.map((t) => ({
      label: `${t.label} in ${stateName}`,
      href: `/${t.slug.replace("-rehab", "-rehabilitation").replace("-centers", "-programs")}-${stateSlug}` ,
    }));
    groups.push({ title: "Treatment Types", icon: <Heart className="h-4 w-4 text-primary" />, links: stTreatmentLinks.slice(0, 6) });
  }

  // --- County pages: link to cities within county, state, nearby counties ---
  if (pageType === "county" && stateSlug && countySlug && countyData) {
    const thisCounty = countyData.counties.find((c) => c.slug === countySlug);
    if (thisCounty) {
      // Cities in this county (match against state city list)
      if (stateData) {
        const countyCityNames = thisCounty.majorCities.map((c) => c.toLowerCase());
        const matchedCities = stateData.cities.filter((c) =>
          countyCityNames.includes(c.city.toLowerCase())
        );
        if (matchedCities.length > 0) {
          groups.push({
            title: `Cities in ${thisCounty.name} County`,
            icon: <MapPin className="h-4 w-4 text-primary" />,
            links: matchedCities.map((c) => ({
              label: c.city,
              href: `/rehab-centers/${stateSlug}/${c.slug}`,
            })),
          });
        }
      }

      // Nearby counties
      const otherCounties = countyData.counties.filter((c) => c.slug !== countySlug).slice(0, 4);
      if (otherCounties.length > 0) {
        groups.push({
          title: `Other ${stateName} Counties`,
          icon: <MapPin className="h-4 w-4 text-muted-foreground" />,
          links: otherCounties.map((c) => ({
            label: `${c.name} County`,
            href: `/rehab-centers/${stateSlug}/county/${c.slug}`,
          })),
        });
      }
    }

    // Insurance pages
    const topIns = insurerConfigs.slice(0, 4);
    groups.push({
      title: "Insurance Coverage",
      icon: <Shield className="h-4 w-4 text-accent" />,
      links: topIns.map((ins) => ({
        label: `${ins.name} in ${stateName}`,
        href: `/insurance/${ins.slug}/${stateSlug}`,
      })),
    });
  }

  // --- Insurance+State pages: link to other insurers in state, cities ---
  if (pageType === "insurance-state" && stateSlug && insurerSlug) {
    // Other insurers in this state
    const otherInsurers = insurerConfigs.filter((i) => i.slug !== insurerSlug).slice(0, 6);
    groups.push({
      title: `Other Insurance in ${stateName}`,
      icon: <Shield className="h-4 w-4 text-accent" />,
      links: otherInsurers.map((ins) => ({
        label: ins.name,
        href: `/insurance/${ins.slug}/${stateSlug}`,
      })),
    });

    // Top cities
    if (stateData) {
      groups.push({
        title: `Treatment in ${stateName}`,
        icon: <MapPin className="h-4 w-4 text-primary" />,
        links: stateData.cities.slice(0, 6).map((c) => ({
          label: `Rehab in ${c.city}`,
          href: `/rehab-centers/${stateSlug}/${c.slug}`,
        })),
      });
    }
  }

  // --- City+Treatment pages: link to other treatments, state treatment, insurance ---
  if (pageType === "city-treatment" && stateSlug && citySlug && treatmentSlug) {
    const otherTreatments = treatmentTypes.filter((t) => !treatmentSlug.includes(t.slug.split("-")[0])).slice(0, 4);
    groups.push({
      title: "Other Treatments",
      icon: <Heart className="h-4 w-4 text-primary" />,
      links: otherTreatments.map((t) => ({
        label: t.label,
        href: `/${t.slug}-in-${citySlug}`,
      })),
    });

    // Insurance
    const topIns = insurerConfigs.slice(0, 4);
    groups.push({
      title: "Insurance Coverage",
      icon: <Shield className="h-4 w-4 text-accent" />,
      links: topIns.map((ins) => ({
        label: `${ins.name} in ${stateName}`,
        href: `/insurance/${ins.slug}/${stateSlug}`,
      })),
    });
  }

  // --- State+Treatment pages: link to city+treatment combos ---
  if (pageType === "state-treatment" && stateSlug && treatmentSlug && stateData) {
    const prefix = treatmentTypes.find((t) => treatmentSlug.includes(t.slug.split("-")[0]));
    if (prefix) {
      groups.push({
        title: `${prefix.label} by City`,
        icon: <MapPin className="h-4 w-4 text-primary" />,
        links: stateData.cities.slice(0, 6).map((c) => ({
          label: `${prefix.label} in ${c.city}`,
          href: `/${prefix.slug}-in-${c.slug}`,
        })),
      });
    }

    groups.push({
      title: "Resources",
      icon: <BookOpen className="h-4 w-4 text-muted-foreground" />,
      links: [
        { label: "Treatment Types Guide", href: "/treatment-types" },
        { label: "Insurance Coverage", href: "/insurance" },
        { label: "Find a Rehab Center", href: "/rehab-centers" },
        { label: "Get Matched Free", href: "/concierge" },
      ],
    });
  }

  if (groups.length === 0) return null;

  return (
    <section className="py-10 bg-muted/30">
      <div className="container max-w-5xl">
        <h2 className="text-xl font-bold text-foreground mb-6">Related Resources</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <div key={group.title}>
              <div className="flex items-center gap-2 mb-3">
                {group.icon}
                <h3 className="text-sm font-semibold text-foreground">{group.title}</h3>
              </div>
              <ul className="space-y-1.5">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      to={link.href}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link.label}
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
}
