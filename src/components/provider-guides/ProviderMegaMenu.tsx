import { Link } from "react-router-dom";
import { PrefetchLink } from "@/components/PrefetchLink";
import { Button } from "@/components/ui/button";
import {
  Building2, BookOpen, HelpCircle, Headphones, ArrowRight, CheckCircle, Zap,
} from "lucide-react";
import megaMenuImg from "@/assets/mega-menu-providers.jpg";

interface MegaMenuProps {
  onNavigate?: () => void;
}

// Canonical public provider jobs. This menu describes DIRECTORY PARTICIPATION
// — list, claim, keep the profile accurate — not the retired lead-broker
// product.
//
// Two things were removed here and must not come back:
//   • the 8-card "Growth Guides" catalogue. Those /provider-guides/* pages are
//     still live SEO content and are still linked from /provider-resources;
//     they just don't belong in a global mega-menu, which turned the public
//     provider surface into a lead-generation marketing wall.
//   • /providers/resources. That path resolves to a DIFFERENT component
//     (ProviderResourceHub) than the canonical public provider resource page
//     (/provider-resources → ProviderResources). Global nav links the
//     canonical route directly.
const providerLinks = [
  { href: "/for-providers", label: "Why List With Us", desc: "How the directory works", icon: Building2 },
  { href: "/provider-resources", label: "Provider Resources", desc: "Guides and playbooks", icon: BookOpen },
  { href: "/provider-faq", label: "Provider FAQ", desc: "Listing, Pro, and billing", icon: HelpCircle },
  { href: "/provider-support", label: "Provider Support", desc: "Get help with your listing", icon: Headphones },
];

// Directory-safe listing facts only. The previous list marketed "Verified
// patient leads" and "Concierge placement" — both retired, and neither is
// something a provider can buy. Providers pay for visibility and tools, never
// for trust or for patients.
const listingFacts = [
  "Free listing",
  "Claim and update your profile",
  "Optional Pro tools",
  "Optional Featured add-on",
];

export function ProviderMegaMenu({ onNavigate }: MegaMenuProps) {
  return (
    <div className="w-[min(560px,calc(100vw-2rem))]">
      <div className="flex">
        {/* Left: canonical provider destinations */}
        <div className="flex-1 p-5">
          <p className="text-[10px] font-bold text-accent uppercase tracking-[0.18em] px-1 mb-2.5 flex items-center gap-1.5">
            <Building2 className="h-3 w-3" />
            For Providers
          </p>
          <div className="space-y-0">
            {providerLinks.map((link) => (
              <PrefetchLink
                key={link.href}
                to={link.href}
                onClick={onNavigate}
                className="group flex items-center gap-2.5 rounded-lg px-2 py-[7px] hover:bg-accent/[0.06] transition-colors"
              >
                <div className="h-7 w-7 rounded-md bg-accent/10 flex items-center justify-center shrink-0 group-hover:bg-accent/15 transition-colors">
                  <link.icon className="h-3.5 w-3.5 text-accent" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight">{link.label}</p>
                  <p className="text-xs text-muted-foreground/90 leading-tight">{link.desc}</p>
                </div>
              </PrefetchLink>
            ))}
          </div>
        </div>

        {/* Right: CTA card with image */}
        <div className="w-[230px] border-l border-border/30 bg-gradient-to-b from-primary/[0.04] to-transparent">
          <div className="relative h-[100px] overflow-hidden">
            <img
              src={megaMenuImg}
              alt="Provider dashboard"
              className="w-full h-full object-cover"
              loading="lazy"
              width={230}
              height={100}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          </div>

          <div className="px-4 pb-4 -mt-4 relative">
            <p className="text-[14px] font-bold text-foreground mb-2">List Your Facility</p>
            <div className="space-y-1.5 mb-3">
              {listingFacts.map((f) => (
                <div key={f} className="flex items-center gap-1.5">
                  <CheckCircle className="h-3 w-3 text-accent shrink-0" />
                  <span className="text-xs text-muted-foreground">{f}</span>
                </div>
              ))}
            </div>
            <Link to="/provider/onboarding" onClick={onNavigate}>
              <Button size="sm" className="w-full gap-1.5 h-9 bg-accent text-accent-foreground hover:bg-accent/90 text-[12px] font-semibold shadow-sm">
                List Your Facility <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProviderMegaMenuMobile({ onNavigate }: MegaMenuProps) {
  return (
    <div className="space-y-1">
      <div>
        <p className="text-[10px] font-bold text-accent uppercase tracking-[0.18em] px-3 mb-1.5 flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5" />
          For Providers
        </p>
        {providerLinks.map((link) => (
          <PrefetchLink key={link.href} to={link.href} onClick={onNavigate}
            className="group flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-accent/[0.06] active:bg-accent/[0.1] transition-colors">
            <div className="h-9 w-9 rounded-md bg-accent/10 flex items-center justify-center shrink-0 group-hover:bg-accent/15 transition-colors">
              <link.icon className="h-4 w-4 text-accent" />
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-medium text-foreground leading-tight">{link.label}</p>
              <p className="text-xs text-muted-foreground/70 leading-tight mt-0.5">{link.desc}</p>
            </div>
          </PrefetchLink>
        ))}
      </div>

      {/* CTA */}
      <div className="mx-2 mt-1 border-t border-border/30 pt-2">
        <Link to="/provider/onboarding" onClick={onNavigate} className="block">
          <div className="rounded-lg bg-gradient-to-r from-accent/[0.08] to-primary/[0.06] border border-accent/15 p-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
              <Zap className="h-4 w-4 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground leading-tight">List Your Facility</p>
              <p className="text-xs text-muted-foreground leading-tight">Free listing • Update your profile anytime</p>
            </div>
            <ArrowRight className="h-4 w-4 text-accent shrink-0" />
          </div>
        </Link>
      </div>
    </div>
  );
}
