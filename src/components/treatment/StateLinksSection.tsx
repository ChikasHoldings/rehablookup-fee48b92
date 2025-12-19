import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { usStates } from "@/data/usStates";
import { LucideIcon } from "lucide-react";

interface StateLinksSectionProps {
  title: string;
  subtitle: string;
  basePath: string;
  /** Optional prefix to show before state name in buttons (e.g., "Detox in") */
  buttonPrefix?: string;
  /** Optional className for the section */
  className?: string;
}

export const StateLinksSection = ({
  title,
  subtitle,
  basePath,
  buttonPrefix,
  className = "bg-secondary/30 section-padding",
}: StateLinksSectionProps) => {
  return (
    <section className={className}>
      <div className="container">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-foreground md:text-3xl">
            {title}
          </h2>
          <p className="mt-2 text-muted-foreground">
            {subtitle}
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {usStates.map((state) => (
            <Link key={state.slug} to={`${basePath}/${state.slug}`}>
              <Button variant="outline" size="sm">
                {buttonPrefix ? `${buttonPrefix} ${state.name}` : state.name}
              </Button>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

interface StateLinksGroupProps {
  title: string;
  basePath: string;
  icon: LucideIcon;
  /** Optional className for spacing */
  className?: string;
}

export const StateLinksGroup = ({
  title,
  basePath,
  icon: Icon,
  className = "mb-8",
}: StateLinksGroupProps) => {
  return (
    <div className={className}>
      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <Icon className="h-5 w-5 text-accent" />
        {title}
      </h3>
      <div className="flex flex-wrap gap-2">
        {usStates.map((state) => (
          <Link key={state.slug} to={`${basePath}/${state.slug}`}>
            <Button variant="outline" size="sm">
              {state.name}
            </Button>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default StateLinksSection;
