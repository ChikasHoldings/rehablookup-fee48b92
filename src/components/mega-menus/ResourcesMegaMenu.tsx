import { PrefetchLink } from "@/components/PrefetchLink";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  BookOpen, ArrowRight, Shield, DollarSign, HelpCircle, FileText,
  Sparkles, Calculator, Heart, Info,
} from "lucide-react";

interface MegaMenuProps {
  onNavigate?: () => void;
}

const guides = [
  { href: "/resources/signs-of-addiction", label: "Signs of Addiction", desc: "Recognize warning signs", icon: Heart },
  { href: "/resources/what-to-expect-in-rehab", label: "What to Expect", desc: "Step-by-step journey", icon: FileText },
  { href: "/resources/insurance-coverage-guide", label: "Insurance Coverage", desc: "Understanding benefits", icon: Shield },
  { href: "/resources/paying-for-rehab", label: "Paying for Rehab", desc: "Financing options", icon: DollarSign },
  { href: "/resources/detox-timeline", label: "Detox Timeline", desc: "What happens in detox", icon: Sparkles },
  { href: "/resources/choosing-right-program", label: "Choosing a Program", desc: "Match your needs", icon: BookOpen },
];

const tools = [
  { href: "/cost-estimator", label: "Cost Estimator", icon: Calculator },
  { href: "/insurance", label: "Insurance Checker", icon: Shield },
  { href: "/faq", label: "FAQ", icon: HelpCircle },
  { href: "/how-it-works", label: "How It Works", icon: Info },
];

export function ResourcesMegaMenu({ onNavigate }: MegaMenuProps) {
  return (
    <div className="w-[560px] max-w-[92vw] p-3.5">
      {/* Guides — compact 2-col list */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-0">
        {guides.map((guide) => (
          <PrefetchLink
            key={guide.href}
            to={guide.href}
            onClick={onNavigate}
            className="group flex items-center gap-2.5 rounded-md px-2 py-[6px] hover:bg-accent/[0.05] transition-colors"
          >
            <div className="h-6 w-6 rounded-md bg-accent/10 flex items-center justify-center shrink-0 group-hover:bg-accent/15 transition-colors">
              <guide.icon className="h-3 w-3 text-accent" />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-foreground/90 group-hover:text-foreground leading-tight">{guide.label}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{guide.desc}</p>
            </div>
          </PrefetchLink>
        ))}
      </div>

      <PrefetchLink to="/resources" onClick={onNavigate}
        className="inline-flex items-center gap-1 px-2 pt-1.5 text-[11px] font-semibold text-primary hover:text-primary/80">
        All articles <ArrowRight className="h-2.5 w-2.5" />
      </PrefetchLink>

      {/* Bottom: Tools row + CTA */}
      <div className="flex items-center gap-3 border-t border-border/40 mt-2 pt-2.5">
        <div className="flex-1 flex flex-wrap gap-1.5">
          {tools.map((tool) => (
            <PrefetchLink
              key={tool.href}
              to={tool.href}
              onClick={onNavigate}
              className="group inline-flex items-center gap-1.5 rounded-full border border-border/50 px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:border-accent/40 hover:bg-accent/[0.04] transition-all"
            >
              <tool.icon className="h-3 w-3 text-accent/60 group-hover:text-accent" />
              {tool.label}
            </PrefetchLink>
          ))}
        </div>
        <Link to="/concierge" onClick={onNavigate}>
          <Button size="sm" className="gap-1 h-7 bg-accent text-accent-foreground hover:bg-accent/90 text-[11px] font-semibold shadow-sm whitespace-nowrap px-4">
            Get Help <ArrowRight className="h-2.5 w-2.5" />
          </Button>
        </Link>
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
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] px-3 mb-1.5">Tools</p>
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
