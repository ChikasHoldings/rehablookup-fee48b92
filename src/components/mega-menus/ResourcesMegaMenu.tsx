import { PrefetchLink } from "@/components/PrefetchLink";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  BookOpen, ArrowRight, Shield, DollarSign, HelpCircle, FileText,
  Sparkles, Calculator, Heart, Info, ChevronRight,
} from "lucide-react";

interface MegaMenuProps {
  onNavigate?: () => void;
}

const guides = [
  { href: "/resources/signs-of-addiction", label: "Signs of Addiction", desc: "Recognize warning signs early", icon: Heart },
  { href: "/resources/what-to-expect-in-rehab", label: "What to Expect in Rehab", desc: "Your treatment journey", icon: FileText },
  { href: "/resources/insurance-coverage-guide", label: "Insurance Coverage", desc: "Understanding your benefits", icon: Shield },
  { href: "/resources/paying-for-rehab", label: "Paying for Rehab", desc: "Financing & payment options", icon: DollarSign },
  { href: "/resources/detox-timeline", label: "Detox Timeline", desc: "What happens during detox", icon: Sparkles },
  { href: "/resources/choosing-right-program", label: "Choosing a Program", desc: "Match needs to the right care", icon: BookOpen },
];

const tools = [
  { href: "/cost-estimator", label: "Cost Estimator", desc: "Get instant estimates", icon: Calculator },
  { href: "/insurance", label: "Insurance Checker", desc: "Verify your coverage", icon: Shield },
  { href: "/faq", label: "FAQ", desc: "Common questions", icon: HelpCircle },
  { href: "/how-it-works", label: "How It Works", desc: "Our matching process", icon: Info },
];

export function ResourcesMegaMenu({ onNavigate }: MegaMenuProps) {
  return (
    <div className="w-[min(680px,calc(100vw-2rem))]">
      <div className="flex">
        {/* Left: Guides with icon badges */}
        <div className="flex-1 px-5 py-4 border-r border-border/30">
          <p className="text-xs font-bold text-accent uppercase tracking-[0.15em] px-1 mb-2.5 flex items-center gap-1.5">
            <BookOpen className="h-3 w-3" />
            Guides & Articles
          </p>
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
            {guides.map((guide) => (
              <PrefetchLink
                key={guide.href}
                to={guide.href}
                onClick={onNavigate}
                className="group flex items-center gap-2.5 rounded-lg px-2 py-[7px] hover:bg-accent/[0.06] transition-colors"
              >
                <div className="h-7 w-7 rounded-md bg-accent/10 flex items-center justify-center shrink-0 group-hover:bg-accent/15 transition-colors">
                  <guide.icon className="h-3.5 w-3.5 text-accent" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground group-hover:text-foreground leading-tight">{guide.label}</p>
                  <p className="text-xs text-muted-foreground/90 leading-tight">{guide.desc}</p>
                </div>
              </PrefetchLink>
            ))}
          </div>
          <PrefetchLink to="/resources" onClick={onNavigate}
            className="inline-flex items-center gap-1 px-2 pt-2 text-xs font-semibold text-primary hover:text-primary/80">
            All resources <ArrowRight className="h-3 w-3" />
          </PrefetchLink>
        </div>

        {/* Right: Tools + CTA */}
        <div className="w-[220px] px-4 py-4">
          <p className="text-xs font-bold text-foreground/70 uppercase tracking-[0.15em] px-1 mb-2.5 flex items-center gap-1.5">
            <Calculator className="h-3 w-3 text-accent" />
            Interactive Tools
          </p>
          <div className="space-y-0">
            {tools.map((tool) => (
              <PrefetchLink
                key={tool.href}
                to={tool.href}
                onClick={onNavigate}
                className="group flex items-center gap-2 rounded-md px-2 py-[7px] hover:bg-muted/40 transition-colors"
              >
                <ChevronRight className="h-3 w-3 text-border group-hover:text-accent transition-colors shrink-0" />
                <p className="text-sm font-medium text-foreground/80 group-hover:text-foreground leading-tight">{tool.label}</p>
              </PrefetchLink>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-3 pt-3 border-t border-border/30">
            <div className="rounded-lg bg-gradient-to-br from-primary/[0.06] to-accent/[0.06] border border-primary/10 p-3">
              <p className="text-sm font-bold text-foreground mb-0.5">Need Help?</p>
              <p className="text-xs text-muted-foreground leading-snug mb-2.5">
                Free confidential treatment matching.
              </p>
              <Link to="/concierge" onClick={onNavigate}>
                <Button size="sm" className="w-full h-8 bg-accent text-accent-foreground hover:bg-accent/90 text-xs font-semibold gap-1.5">
                  Get Matched <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ResourcesMegaMenuMobile({ onNavigate }: MegaMenuProps) {
  return (
    <div className="space-y-1">
      {/* Guides */}
      <div>
        <p className="text-xs font-bold text-accent uppercase tracking-[0.15em] px-3 mb-1.5 flex items-center gap-1.5">
          <BookOpen className="h-3.5 w-3.5" />
          Guides & Articles
        </p>
        {guides.slice(0, 5).map((guide) => (
          <PrefetchLink key={guide.href} to={guide.href} onClick={onNavigate}
            className="group flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-accent/[0.06] active:bg-accent/[0.1] transition-colors">
            <div className="h-9 w-9 rounded-md bg-accent/10 flex items-center justify-center shrink-0 group-hover:bg-accent/15 transition-colors">
              <guide.icon className="h-4 w-4 text-accent" />
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-medium text-foreground leading-tight">{guide.label}</p>
              <p className="text-xs text-muted-foreground/80 leading-tight mt-0.5">{guide.desc}</p>
            </div>
          </PrefetchLink>
        ))}
        <PrefetchLink to="/resources" onClick={onNavigate}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-accent font-semibold">
          All resources <ArrowRight className="h-3.5 w-3.5" />
        </PrefetchLink>
      </div>

      {/* Interactive Tools */}
      <div className="border-t border-border/30 pt-2 mx-2">
        <p className="text-xs font-bold text-muted-foreground/70 uppercase tracking-[0.15em] px-1 mb-1.5 flex items-center gap-1.5">
          <Calculator className="h-3.5 w-3.5 text-accent" />
          Tools
        </p>
        {tools.map((tool) => (
          <PrefetchLink key={tool.href} to={tool.href} onClick={onNavigate}
            className="group flex items-center gap-2.5 rounded-md px-2.5 py-2.5 hover:bg-muted/40 active:bg-muted/60 transition-colors">
            <ChevronRight className="h-3.5 w-3.5 text-border group-hover:text-accent shrink-0" />
            <p className="text-[15px] font-medium text-foreground/80 group-hover:text-foreground leading-tight">{tool.label}</p>
          </PrefetchLink>
        ))}
      </div>
    </div>
  );
}
