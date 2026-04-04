import { PrefetchLink } from "@/components/PrefetchLink";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  BookOpen, ArrowRight, Shield, DollarSign, HelpCircle, FileText,
  Sparkles, Calculator, Heart, Info,
} from "lucide-react";
import megaMenuImg from "@/assets/mega-menu-resources.jpg";

interface MegaMenuProps {
  onNavigate?: () => void;
}

const guides = [
  { href: "/resources/signs-of-addiction", label: "Signs of Addiction", icon: Heart },
  { href: "/resources/what-to-expect-in-rehab", label: "What to Expect in Rehab", icon: FileText },
  { href: "/resources/insurance-coverage-guide", label: "Insurance Coverage", icon: Shield },
  { href: "/resources/paying-for-rehab", label: "Paying for Rehab", icon: DollarSign },
  { href: "/resources/detox-timeline", label: "Detox Timeline", icon: Sparkles },
  { href: "/resources/choosing-right-program", label: "Choosing a Program", icon: BookOpen },
];

const tools = [
  { href: "/cost-estimator", label: "Cost Estimator", icon: Calculator },
  { href: "/insurance", label: "Insurance Checker", icon: Shield },
  { href: "/faq", label: "FAQ", icon: HelpCircle },
  { href: "/how-it-works", label: "How It Works", icon: Info },
];

export function ResourcesMegaMenu({ onNavigate }: MegaMenuProps) {
  return (
    <div className="w-[620px] max-w-[92vw]">
      <div className="flex">
        {/* Guides */}
        <div className="flex-1 p-4">
          <p className="text-[10px] font-bold text-accent uppercase tracking-[0.15em] px-2 mb-2 flex items-center gap-1.5">
            <BookOpen className="h-3 w-3 text-accent" />
            Guides & Articles
          </p>
          <div className="grid grid-cols-2 gap-x-1 gap-y-0.5">
            {guides.map((guide) => (
              <PrefetchLink
                key={guide.href}
                to={guide.href}
                onClick={onNavigate}
                className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-primary/[0.04] transition-colors"
              >
                <div className="h-7 w-7 rounded-md bg-accent/10 flex items-center justify-center shrink-0 group-hover:bg-accent/15 transition-colors">
                  <guide.icon className="h-3.5 w-3.5 text-accent" />
                </div>
                <span className="text-[13px] font-medium text-foreground/90 group-hover:text-foreground">{guide.label}</span>
              </PrefetchLink>
            ))}
          </div>
          <PrefetchLink to="/resources" onClick={onNavigate}
            className="inline-flex items-center gap-1 px-2.5 pt-2 text-[12px] font-semibold text-primary hover:text-primary/80">
            All articles <ArrowRight className="h-3 w-3" />
          </PrefetchLink>

          <div className="border-t border-border/40 mt-3 pt-3">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] px-2 mb-2">Tools</p>
            <div className="grid grid-cols-2 gap-x-1 gap-y-0.5">
              {tools.map((tool) => (
                <PrefetchLink
                  key={tool.href}
                  to={tool.href}
                  onClick={onNavigate}
                  className="group flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <tool.icon className="h-3.5 w-3.5 text-accent/70 group-hover:text-accent" />
                  {tool.label}
                </PrefetchLink>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="w-[190px] border-l border-border/40 p-4 flex flex-col gap-3 bg-muted/30">
          <img
            src={megaMenuImg}
            alt="Recovery resources"
            className="w-full h-24 object-cover rounded-lg"
            loading="lazy"
            width={190}
            height={96}
          />
          <div>
            <p className="text-[13px] font-bold text-foreground leading-tight">Need Help Now?</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
              Free, confidential matching.
            </p>
          </div>
          <Link to="/concierge" onClick={onNavigate}>
            <Button size="sm" className="w-full gap-1 h-8 bg-accent text-accent-foreground hover:bg-accent/90 text-[12px] font-semibold">
              Get Help <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export function ResourcesMegaMenuMobile({ onNavigate }: MegaMenuProps) {
  return (
    <div className="space-y-3 px-1">
      <div>
        <p className="text-[10px] font-bold text-accent uppercase tracking-[0.15em] px-3 mb-1.5">Guides</p>
        {guides.slice(0, 4).map((guide) => (
          <PrefetchLink key={guide.href} to={guide.href} onClick={onNavigate}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <guide.icon className="h-4 w-4 text-accent" />
            {guide.label}
          </PrefetchLink>
        ))}
        <PrefetchLink to="/resources" onClick={onNavigate}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-primary font-medium">
          All Resources <ArrowRight className="h-3.5 w-3.5" />
        </PrefetchLink>
      </div>
      <div>
        {tools.slice(0, 3).map((tool) => (
          <PrefetchLink key={tool.href} to={tool.href} onClick={onNavigate}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <tool.icon className="h-4 w-4 text-accent" />
            {tool.label}
          </PrefetchLink>
        ))}
      </div>
    </div>
  );
}
