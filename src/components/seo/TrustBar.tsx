import { Shield, CheckCircle, Lock, Clock } from "lucide-react";
import { Link } from "react-router-dom";

type TrustItem = {
  icon: typeof Shield;
  text: string;
  href?: string;
  ariaLabel?: string;
};

const trustItems: TrustItem[] = [
  { icon: Shield, text: "No Placement Fees for Clients" },
  {
    icon: CheckCircle,
    text: "Verified Rehab Facilities",
    href: "/editorial-policy",
    ariaLabel: "Learn how RehabLookup verifies treatment facilities",
  },
  { icon: Lock, text: "Private & Secure Inquiries" },
  { icon: Clock, text: "Fast Provider Response" },
];

export function TrustBar() {
  return (
    <section className="border-b bg-card/80 backdrop-blur-sm">
      <div className="container py-3">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 md:gap-x-10">
          {trustItems.map(({ icon: Icon, text, href, ariaLabel }) => {
            const content = (
              <>
                <Icon className="h-4 w-4 text-accent shrink-0" />
                <span>{text}</span>
              </>
            );
            const baseClass =
              "flex items-center gap-2 text-xs md:text-sm font-medium text-muted-foreground";

            if (href) {
              return (
                <Link
                  key={text}
                  to={href}
                  aria-label={ariaLabel ?? text}
                  className={`${baseClass} underline-offset-4 hover:text-foreground hover:underline transition-colors`}
                >
                  {content}
                </Link>
              );
            }
            return (
              <div key={text} className={baseClass}>
                {content}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
