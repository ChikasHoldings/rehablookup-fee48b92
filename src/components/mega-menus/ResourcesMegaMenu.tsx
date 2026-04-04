import { PrefetchLink } from "@/components/PrefetchLink";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  BookOpen, ArrowRight, Shield, DollarSign, HelpCircle, FileText,
  Sparkles, Calculator, Heart, Info, ExternalLink,
} from "lucide-react";

interface MegaMenuProps {
  onNavigate?: () => void;
}

const guides = [
  { href: "/resources/signs-of-addiction", label: "Signs of Addiction", desc: "Recognize the warning signs early", icon: Heart },
  { href: "/resources/what-to-expect-in-rehab", label: "What to Expect in Rehab", desc: "Your step-by-step treatment journey", icon: FileText },
  { href: "/resources/insurance-coverage-guide", label: "Insurance Coverage", desc: "Understanding your benefits", icon: Shield },
  { href: "/resources/paying-for-rehab", label: "Paying for Rehab", desc: "Financing & payment options", icon: DollarSign },
  { href: "/resources/detox-timeline", label: "Detox Timeline", desc: "What happens during detox", icon: Sparkles },
  { href: "/resources/choosing-right-program", label: "Choosing a Program", desc: "Match your needs to the right care", icon: BookOpen },
];

const tools = [
  { href: "/cost-estimator", label: "Cost Estimator", desc: "Get instant estimates", icon: Calculator },
  { href: "/insurance", label: "Insurance Checker", desc: "Verify your coverage", icon: Shield },
  { href: "/faq", label: "FAQ", desc: "Common questions", icon: HelpCircle },
  { href: "/how-it-works", label: "How It Works", desc: "Our matching process", icon: Info },
];

export function ResourcesMegaMenu({ onNavigate }: MegaMenuProps) {
  return (
    <div className="w-[640px] max-w-[92vw] p-5">
      {/* Top section: Featured guides as cards */}
      <div className="grid grid-cols-3 gap-2.5 mb-4">
        {guides.slice(0, 3).map((guide) => (
          <PrefetchLink
            key={guide.href}
            to={guide.href}
            onClick={onNavigate}
            className="group rounded-xl border border-border/50 p-3.5 hover:border-accent/30 hover:shadow-sm transition-all"
          >
            <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center mb-2.5 group-hover:bg-accent/15 transition-colors">
              <guide.icon className="h-4 w-4 text-accent" />
            </div>
            <p className="text-[13px] font-semibold text-foreground leading-tight mb-1 group-hover:text-primary transition-colors">{guide.label}</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{guide.desc}</p>
          </PrefetchLink>
        ))}
      </div>

      {/* Bottom section: remaining guides + tools */}
      <div className="flex gap-5 border-t border-border/40 pt-4">
        <div className="flex-1">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-2">More Guides</p>
          <div className="space-y-0.5">
            {guides.slice(3).map((guide) => (
              <PrefetchLink
                key={guide.href}
                to={guide.href}
                onClick={onNavigate}
                className="group flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
              >
                <guide.icon className="h-3.5 w-3.5 text-accent/60 group-hover:text-accent" />
                {guide.label}
              </PrefetchLink>
            ))}
          </div>
          <PrefetchLink to="/resources" onClick={onNavigate}
            className="inline-flex items-center gap-1 px-2 pt-2 text-[12px] font-semibold text-primary hover:text-primary/80">
            All articles <ArrowRight className="h-3 w-3" />
          </PrefetchLink>
        </div>

        <div className="w-px bg-border/40" />

        <div className="flex-1">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-2">Interactive Tools</p>
          <div className="space-y-0.5">
            {tools.map((tool) => (
              <PrefetchLink
                key={tool.href}
                to={tool.href}
                onClick={onNavigate}
                className="group flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-muted/40 transition-colors"
              >
                <tool.icon className="h-3.5 w-3.5 text-accent/60 group-hover:text-accent" />
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-foreground/90 group-hover:text-foreground">{tool.label}</p>
                  <p className="text-[10px] text-muted-foreground">{tool.desc}</p>
                </div>
              </PrefetchLink>
            ))}
          </div>
        </div>

        {/* Quick CTA */}
        <div className="w-[140px] shrink-0">
          <div className="rounded-xl bg-gradient-to-br from-primary/[0.06] to-accent/[0.06] border border-primary/10 p-3.5 h-full flex flex-col justify-center">
            <p className="text-[12px] font-bold text-foreground mb-1">Need Help?</p>
            <p className="text-[10px] text-muted-foreground leading-relaxed mb-2.5">
              Free treatment matching.
            </p>
            <Link to="/concierge" onClick={onNavigate}>
              <Button size="sm" className="w-full h-7 bg-accent text-accent-foreground hover:bg-accent/90 text-[11px] font-semibold gap-1">
                Get Help <ArrowRight className="h-2.5 w-2.5" />
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
