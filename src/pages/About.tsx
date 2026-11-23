import { Link } from "react-router-dom";
import { PageFAQ } from "@/components/seo/PageFAQ";
import { aboutFaqs } from "@/data/pageFaqs";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { STATS } from "@/lib/copy/stats";
import {
  Heart,
  Search,
  Shield,
  Users,
  CheckCircle,
  Eye,
  Target,
  Lightbulb,
  Clock,
  Phone,
} from "lucide-react";
import supportSpecialistImg from "@/assets/support-specialist.png";
import aboutTeamImage from "@/assets/about-team.jpg";
import aboutMissionImage from "@/assets/about-mission.jpg";
import founderPortrait from "@/assets/team/founder-chiedu-kabakwu.webp";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";
import { TOPIC_HERO_IMAGES } from "@/data/locationImages";

const values = [
  {
    icon: Shield,
    title: "Transparency",
    description:
      "We believe families deserve accurate, honest information about treatment options without hidden agendas or misleading claims.",
    gradient: "from-blue-500/20 to-cyan-500/20",
    iconBg: "from-blue-500 to-cyan-500",
  },
  {
    icon: Heart,
    title: "Compassion",
    description:
      "We understand the emotional weight of searching for addiction treatment. Our approach is always respectful and supportive.",
    gradient: "from-rose-500/20 to-pink-500/20",
    iconBg: "from-rose-500 to-pink-500",
  },
  {
    icon: CheckCircle,
    title: "Clear Sourcing",
    description:
      "Every listing says where its information came from, and facilities can claim their listings to keep details current.",
    gradient: "from-emerald-500/20 to-teal-500/20",
    iconBg: "from-emerald-500 to-teal-500",
  },
  {
    icon: Users,
    title: "Accessibility",
    description:
      "Treatment information should be accessible to everyone, regardless of their situation or insurance status.",
    gradient: "from-violet-500/20 to-purple-500/20",
    iconBg: "from-violet-500 to-purple-500",
  },
];

const missionCards = [
  {
    icon: Eye,
    title: "Our Vision",
    description: "A world where every person struggling with addiction can easily find clearly sourced treatment information without confusion or barriers.",
  },
  {
    icon: Target,
    title: "Our Mission",
    description: "To connect families with trusted addiction treatment centers through transparency, compassion, and clearly sourced information.",
  },
  {
    icon: Heart,
    title: "Our Promise",
    description: "We will never accept payment to rank facilities higher. Our listings are based solely on verification and quality standards.",
  },
];

const About = () => {
  return (
    <Layout>
      <SEO
        title="About Us - Trusted Rehab Directory | RehabLookup"
        description="RehabLookup is a directory of addiction treatment center listings. Learn our mission, values, and how listing information is sourced."
        canonical="/about"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "AboutPage",
          "name": "About RehabLookup",
          "description": "RehabLookup is a directory of addiction treatment center listings.",
          "url": "https://rehablookup.com/about",
          "mainEntity": {
            "@type": "Organization",
            "name": "RehabLookup",
            "url": "https://rehablookup.com",
            "description": "Directory of addiction treatment center listings across the United States.",
            "foundingDate": "2024",
            "foundingLocation": { "@type": "Place", "name": "United States" },
            "founder": {
              "@type": "Person",
              "name": "Chiedu Kabakwu",
              "jobTitle": "Founder & CEO",
            },
            "publishingPrinciples": "https://rehablookup.com/editorial-policy",
            "ethicsPolicy": "https://rehablookup.com/editorial-policy",
          },
        }}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "About", url: "/about" },
        ]}
      />
      
      {/* Hero — ABOUT page. Smaller than State hero per the brief.
          Distinct from the directory archetypes: warm slate→accent
          gradient + Heart eyebrow signals brand/mission, not utility. */}
      <section className="relative overflow-hidden border-b border-white/5 bg-gradient-to-br from-slate-950 via-slate-900 to-accent/40">
        <img
          src={TOPIC_HERO_IMAGES.mission}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-30"
          loading="eager"
          decoding="async"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-slate-950/55" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.06),_transparent_55%)]" />

        <div className="container relative z-10 py-6 md:py-8">
          <BreadcrumbNav
            className="mb-3 [&_*]:!text-white/70 [&_a:hover]:!text-white"
            items={[{ label: "About" }]}
          />
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm ring-1 ring-accent/25">
              <Heart className="h-3 w-3" />
              Our Story
            </div>
            <h1 className="mb-2 font-display text-2xl font-bold text-white md:text-3xl lg:text-4xl">
              About RehabLookup
            </h1>
            <p className="text-sm md:text-base text-white/80 max-w-xl mx-auto">
              Connecting families with trusted addiction treatment centers through transparency and compassion.
            </p>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="border-b border-border bg-card py-5 px-4 md:py-6 md:px-6">
        <div className="container">
          <div className="flex flex-wrap items-center justify-center gap-6 text-base md:gap-10 lg:gap-12 md:text-sm lg:text-base">
            <div className="flex items-center gap-2.5 text-muted-foreground md:gap-3">
              <Shield className="h-5 w-5 md:h-6 md:w-6 text-accent" />
              <span>Verified Facilities</span>
            </div>
            <div className="flex items-center gap-2.5 text-muted-foreground md:gap-3">
              <Clock className="h-5 w-5 md:h-6 md:w-6 text-accent" />
              <span>24/7 Support</span>
            </div>
            <div className="flex items-center gap-2.5 text-muted-foreground md:gap-3">
              <Users className="h-5 w-5 md:h-6 md:w-6 text-accent" />
              <span>100% Free for Families</span>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Cards Section */}
      <section className="section-padding-lg bg-gradient-to-b from-background to-muted/30">
        <div className="container">
          <div className="text-center mb-10 md:mb-14">
            <div className="mb-5 md:mb-6 inline-flex items-center gap-2 rounded-full bg-accent/10 px-5 md:px-6 py-2.5 md:py-3">
              <Target className="h-5 w-5 md:h-6 md:w-6 text-accent" />
              <span className="text-base md:text-lg font-medium text-accent">What Drives Us</span>
            </div>
            <h2 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-4 md:mb-5">
              Our Purpose & Promise
            </h2>
            <p className="text-muted-foreground max-w-xl md:max-w-2xl mx-auto text-sm md:text-base lg:text-lg">
              Everything we do is guided by our commitment to helping families find the right treatment.
            </p>
          </div>

          <div className="grid gap-5 md:gap-6 md:grid-cols-3 max-w-5xl mx-auto">
            {missionCards.map((card, index) => (
              <div
                key={card.title}
                className="group relative rounded-2xl bg-gradient-to-br from-accent/5 to-accent/10 p-px animate-fade-in hover:scale-[1.02] transition-transform duration-300"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="h-full rounded-[15px] bg-card p-6 border border-border/50">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent/80 shadow-md group-hover:shadow-lg transition-shadow duration-300">
                      <card.icon className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="font-display text-lg font-bold text-foreground">
                      {card.title}
                    </h3>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {card.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who We Are with Image */}
      <section className="section-padding-lg">
        <div className="container">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="animate-fade-in">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-accent/10 px-5 py-2.5">
                <Eye className="h-5 w-5 text-accent" />
                <span className="text-base font-medium text-accent">Who We Are</span>
              </div>
              <h2 className="mb-6 font-display text-2xl font-bold text-foreground md:text-3xl">
                A Directory You Can Trust
              </h2>
              <div className="space-y-5 text-muted-foreground leading-relaxed">
                <p>
                  <strong className="text-foreground">RehabLookup is a directory service, not a treatment provider.</strong> We 
                  connect individuals and families with addiction treatment centers across the nation.
                </p>
                <p>
                  We understand that finding the right treatment center is one of the most 
                  important decisions a family can make. That's why we've built a platform 
                  focused on transparency, accuracy, and compassion.
                </p>
                <p>
                  Our team works diligently to verify each facility in our directory, 
                  ensuring they meet proper licensing requirements and quality standards.
                </p>
              </div>
              
              {/* Stats */}
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-xl bg-muted/50">
                  <div className="font-display text-2xl font-bold text-accent">{STATS.facilities}</div>
                  <div className="text-sm text-muted-foreground">Verified Centers</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-muted/50">
                  <div className="font-display text-2xl font-bold text-accent">50</div>
                  <div className="text-sm text-muted-foreground">States Covered</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-muted/50">
                  <div className="font-display text-2xl font-bold text-accent">24/7</div>
                  <div className="text-sm text-muted-foreground">Support</div>
                </div>
              </div>
            </div>
            
            <div className="relative animate-fade-in" style={{ animationDelay: "0.1s" }}>
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <img 
                  src={aboutMissionImage} 
                  alt="RehabLookup mission - helping families find hope" 
                  className="w-full h-auto object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/60 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <p className="font-display text-xl font-semibold text-white">
                    Helping families find hope
                  </p>
                  <p className="mt-1 text-white/80 text-sm">
                    Every journey begins with a single step
                  </p>
                </div>
              </div>
              {/* Decorative element */}
              <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-accent/20 rounded-full blur-2xl -z-10" />
              <div className="absolute -top-4 -left-4 w-32 h-32 bg-primary/20 rounded-full blur-2xl -z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="section-padding-lg">
        <div className="container">
          <div className="text-center mb-12">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-accent/10 px-5 py-2.5">
              <Users className="h-5 w-5 text-accent" />
              <span className="text-base font-medium text-accent">Our Team</span>
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl mb-4">
              Dedicated to Your Success
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Our team of specialists is here to help you navigate the path to recovery.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl group">
              <img 
                src={aboutTeamImage} 
                alt="RehabLookup team of dedicated specialists" 
                className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-8 md:p-10">
                <h3 className="font-display text-2xl font-bold text-white mb-2">
                  Compassionate Experts
                </h3>
                <p className="text-white/80 max-w-lg">
                  Our team combines healthcare expertise with genuine compassion. We're not just a 
                  directory—we're real people dedicated to helping you find the right treatment.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-4 py-2 text-sm text-white">
                    <CheckCircle className="h-4 w-4" />
                    Trained Specialists
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-4 py-2 text-sm text-white">
                    <Heart className="h-4 w-4" />
                    Judgment-Free Support
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-4 py-2 text-sm text-white">
                    <Clock className="h-4 w-4" />
                    Available 24/7
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Leadership Team */}
      <section className="section-padding-lg bg-muted/20">
        <div className="container">
          <div className="text-center mb-12">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-accent/10 px-5 py-2.5">
              <Shield className="h-5 w-5 text-accent" />
              <span className="text-base font-medium text-accent">Leadership</span>
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl mb-4">
              Meet Our Leadership Team
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              RehabLookup is led by its founder.
            </p>
          </div>

          {/* SEO recovery Phase 1 (2026-11-23): only people whose role can be
              confirmed are shown. The previously listed Medical Director, CTO
              and advisory board had no supporting record in the repository or
              database; they are withheld pending owner confirmation (see
              docs/seo-recovery/SEO_PHASE_HANDOFF.md). */}
          <div className="grid gap-8 max-w-sm mx-auto">
            {[
              {
                name: "Chiedu Kabakwu",
                title: "Founder & CEO",
                image: founderPortrait,
                imageAlt:
                  "Portrait of Chiedu Kabakwu, Founder and CEO of RehabLookup, a behavioral health and patient advocacy leader guiding families to trusted addiction treatment.",
                bio: "Founder and CEO of RehabLookup. A decade of experience across behavioral health, technology, and patient advocacy — leading the company's mission to bring transparency and dignity to how families find trusted addiction treatment.",
                credentials: "MBA — Business Administration & Healthcare Strategy",
              },
            ].map((leader) => (
              <div key={leader.name} className="group rounded-2xl bg-card border border-border/50 overflow-hidden hover:shadow-lg transition-shadow duration-300">
                <div className="aspect-square overflow-hidden">
                  <img
                    src={leader.image}
                    alt={leader.imageAlt}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                    width={512}
                    height={512}
                  />
                </div>
                <div className="p-6">
                  <h3 className="font-display text-lg font-bold text-foreground">{leader.name}</h3>
                  <p className="text-sm font-medium text-accent mb-2">{leader.title}</p>
                  <p className="text-sm text-muted-foreground mb-3">{leader.bio}</p>
                  <p className="text-xs text-muted-foreground/70 italic">{leader.credentials}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Stats — By the Numbers */}
      <section className="section-padding-lg bg-primary text-primary-foreground">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="font-display text-2xl font-bold md:text-3xl mb-3">
              RehabLookup by the Numbers
            </h2>
            <p className="text-primary-foreground/70 max-w-xl mx-auto">
              The directory at a glance.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {[
              { value: STATS.facilities, label: "Facility Listings", sub: STATS.states },
              { value: "SAMHSA", label: "Primary Data Source", sub: "FindTreatment.gov listings" },
              { value: "51", label: "Jurisdictions", sub: "All 50 states + D.C." },
              { value: STATS.freeForSeekers, label: "Free for Seekers", sub: "No fees, no upsells" },
            ].map((stat) => (
              <div key={stat.label} className="text-center p-5 rounded-xl bg-primary-foreground/5 border border-primary-foreground/10">
                <div className="font-display text-3xl md:text-4xl font-bold text-accent tabular-nums mb-1">{stat.value}</div>
                <div className="text-sm font-medium text-primary-foreground">{stat.label}</div>
                <div className="text-xs text-primary-foreground/60 mt-0.5">{stat.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & Compliance Badges */}
      <section className="section-padding-lg bg-muted/20 border-y border-border">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl mb-3">
              Trust & Compliance
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Security, privacy, and ethical standards are at the core of everything we build.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {[
              { icon: Shield, label: "Private Inquiries", desc: "Inquiries go only to the facility you contact" },
              { icon: CheckCircle, label: "SSL Secured", desc: "Encrypted connection on every page" },
              { icon: Eye, label: "Clear Sourcing", desc: "Each listing shows where its information came from" },
              { icon: Heart, label: "Labeled Sponsorship", desc: "Paid Featured placements are labeled" },
            ].map((badge) => (
              <div key={badge.label} className="text-center p-5 rounded-xl bg-card border border-border">
                <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center mx-auto mb-3">
                  <badge.icon className="h-5 w-5 text-accent" />
                </div>
                <h4 className="font-semibold text-foreground text-sm mb-1">{badge.label}</h4>
                <p className="text-xs text-muted-foreground">{badge.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Journey — Timeline */}
      <section className="section-padding-lg bg-background">
        <div className="container max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl mb-3">
              Our Journey
            </h2>
          </div>
          <div className="space-y-6">
            {[
              { year: "2024", title: "Founded", desc: "RehabLookup launched with a mission to bring transparency to addiction treatment search." },
              { year: "2026", title: "Nationwide Listings", desc: "Imported facility listings from SAMHSA's FindTreatment.gov directory covering all 50 states and Washington, D.C." },
              { year: "2026", title: "Platform 2.0", desc: "Launched the provider dashboard, listing management, and performance analytics for treatment centers." },
            ].map((milestone, idx) => (
              <div key={idx} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                    {milestone.year.slice(-2)}
                  </div>
                  {idx < 3 && <div className="w-px flex-1 bg-border mt-2" />}
                </div>
                <div className="pb-6">
                  <div className="text-xs font-medium text-accent mb-1">{milestone.year}</div>
                  <h4 className="font-semibold text-foreground mb-1">{milestone.title}</h4>
                  <p className="text-sm text-muted-foreground">{milestone.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="section-padding-lg bg-muted/30">
        <div className="container">
          <div className="mb-12 text-center animate-fade-in">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-accent/10 px-5 py-2.5">
              <Lightbulb className="h-5 w-5 text-accent" />
              <span className="text-base font-medium text-accent">Our Values</span>
            </div>
            <h2 className="mb-4 font-display text-2xl font-bold text-foreground md:text-3xl">
              What Guides Us
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              These core principles shape everything we do at RehabLookup.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 max-w-4xl mx-auto">
            {values.map((value, index) => (
              <div
                key={value.title}
                className={`group relative rounded-2xl bg-gradient-to-br ${value.gradient} p-px animate-fade-in hover:scale-[1.01] transition-transform duration-300`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="h-full rounded-[15px] bg-card p-5 border border-border/50">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${value.iconBg} shadow-md group-hover:shadow-lg transition-shadow duration-300`}>
                      <value.icon className="h-4.5 w-4.5 text-white" />
                    </div>
                    <h3 className="font-display text-lg font-semibold text-foreground">
                      {value.title}
                    </h3>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed pl-12">{value.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Important Notice */}
      <section className="border-y border-border bg-card py-12 px-4 md:px-6">
        <div className="container">
          <div className="mx-auto max-w-3xl rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/5 to-accent/10 p-8 animate-fade-in">
            <div className="flex flex-col gap-5 md:flex-row md:items-start">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-accent/80 shadow-lg">
                <Shield className="h-7 w-7 text-white" />
              </div>
              <div>
                <h3 className="mb-3 font-display text-xl font-semibold text-foreground">
                  Important Notice
                </h3>
                <div className="space-y-3 text-muted-foreground leading-relaxed">
                  <p>
                    RehabLookup is a directory and referral service. We are <strong className="text-foreground">not</strong> a 
                    treatment provider, medical facility, or substitute for professional medical advice.
                  </p>
                  <p>
                    If you or someone you know is experiencing a medical emergency, please call 911 immediately.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="border-t border-border bg-card py-10 md:py-12">
        <div className="container">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 md:flex-row rounded-xl border border-border bg-gradient-to-r from-primary/5 to-primary/10 p-5 md:p-6">
            <div className="relative shrink-0">
              <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 p-0.5 ring-1 ring-primary/10">
                <div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-b from-background to-secondary/50">
                  <img 
                    src={supportSpecialistImg} 
                    alt="Support specialist ready to help" 
                    className="w-full h-full object-cover object-top scale-110"
                  />
                </div>
              </div>
              <div className="absolute bottom-0 right-0 flex items-center gap-1 rounded-full bg-card px-2 py-0.5 shadow-sm border border-border">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                </span>
                <span className="text-xs font-medium text-foreground">Online</span>
              </div>
            </div>
            
            <div className="flex-1 text-center md:text-left">
              <h2 className="mb-1 font-display text-base font-bold text-foreground md:text-lg">
                Ready to Find Treatment?
              </h2>
              <p className="text-muted-foreground text-sm max-w-md">
                Search the directory and contact facilities directly.
              </p>
            </div>
            
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
              <Link to="/search-results">
                <Button size="sm" className="w-full gap-2 sm:w-auto">
                  <Search className="h-4 w-4" />
                  Search Treatment Centers
                </Button>
              </Link>
              <Link to="/contact">
                <Button size="sm" variant="outline" className="w-full gap-2 sm:w-auto">
                  <Phone className="h-4 w-4" />
                  Contact Us
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <PageFAQ faqs={aboutFaqs} className="border-t border-border bg-muted/30" />
    </Layout>
  );
};

export default About;
