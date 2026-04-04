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
  { href: "/resources/signs-of-addiction", label: "Signs of Addiction", icon: Heart },
  { href: "/resources/what-to-expect-in-rehab", label: "What to Expect in Rehab", icon: FileText },
  { href: "/resources/insurance-coverage-guide", label: "Insurance Coverage Guide", icon: Shield },
  { href: "/resources/paying-for-rehab", label: "Paying for Rehab", icon: DollarSign },
  { href: "/resources/detox-timeline", label: "Detox Timeline", icon: Sparkles },
  { href: "/resources/choosing-right-program", label: "Choosing the Right Program", icon: BookOpen },
];

const tools = [
  { href: "/cost-estimator", label: "Cost Estimator", icon: Calculator },
  { href: "/insurance", label: "Insurance Checker", icon: Shield },
  { href: "/faq", label: "FAQ", icon: HelpCircle },
  { href: "/how-it-works", label: "How It Works", icon: Info },
];

export function ResourcesMegaMenu({ onNavigate }: MegaMenuProps) {
  return (
    <div className="w-[600px] max-w-[90vw] p-6">
      <div className="grid grid-cols-[1fr_200px] gap-6">
        {/* Guides */}
        <div>
          <h3 className="text-[11px] font-bold text-accent uppercase tracking-[0.15em] mb-3 flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5 text-accent" />
            Guides & Articles
          </h3>
          <div className="grid grid-cols-2 gap-0.5">
            {guides.map((guide) => (
              <PrefetchLink
                key={guide.href}
                to={guide.href}
                onClick={onNavigate}
                className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-accent/[0.06] transition-all duration-200"
              >
                <div className="h-7 w-7 rounded-md bg-accent/10 flex items-center justify-center shrink-0 group-hover:bg-accent/20 transition-all">
                  <guide.icon className="h-3.5 w-3.5 text-accent" />
                </div>
                <span className="text-[13px] font-medium text-foreground group-hover:text-primary transition-colors">{guide.label}</span>
              </PrefetchLink>
            ))}
          </div>
          <PrefetchLink
            to="/resources"
            onClick={onNavigate}
            className="flex items-center gap-1.5 px-2.5 py-2 text-[13px] font-medium text-primary hover:underline mt-1"
          >
            All Articles <ArrowRight className="h-3.5 w-3.5" />
          </PrefetchLink>
        </div>

        {/* Tools + CTA */}
        <div className="border-l border-border/60 pl-5 flex flex-col">
          <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-3">
            Tools
          </h3>
          <div className="space-y-0.5 mb-5">
            {tools.map((tool) => (
              <PrefetchLink
                key={tool.href}
                to={tool.href}
                onClick={onNavigate}
                className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
              >
                <tool.icon className="h-4 w-4 text-accent/70 group-hover:text-accent transition-colors" />
                {tool.label}
              </PrefetchLink>
            ))}
          </div>

          <div className="mt-auto rounded-xl bg-gradient-to-br from-primary/[0.07] to-accent/[0.07] border border-primary/10 p-3">
            <p className="text-sm font-bold text-foreground mb-1">Need Help Now?</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
              Free, confidential treatment matching.
            </p>
            <Link to="/concierge" onClick={onNavigate}>
              <Button size="sm" className="w-full gap-1.5 h-8 bg-accent text-accent-foreground hover:bg-accent/90 text-[12px] font-semibold">
                Get Help <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ResourcesMegaMenuMobile({ onNavigate }: MegaMenuProps) {
  return (
    <div className="space-y-4 px-1">
      <div>
        <p className="text-[11px] font-bold text-accent uppercase tracking-[0.15em] px-3 mb-2">Popular Guides</p>
        {guides.slice(0, 4).map((guide) => (
          <PrefetchLink key={guide.href} to={guide.href} onClick={onNavigate}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <guide.icon className="h-4 w-4 text-accent" />
            {guide.label}
          </PrefetchLink>
        ))}
        <PrefetchLink to="/resources" onClick={onNavigate}
          className="flex items-center gap-2 px-3 py-2 text-sm text-primary font-medium">
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
