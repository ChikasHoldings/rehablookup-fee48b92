import { Link } from "react-router-dom";
import { PageFAQ } from "@/components/seo/PageFAQ";
import { aboutFaqs } from "@/data/pageFaqs";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import {
  Heart,
  Shield,
  Users,
  CheckCircle,
  ArrowRight,
  Eye,
  Target,
  Lightbulb,
  Clock,
  ChevronRight,
} from "lucide-react";
import aboutTeamImage from "@/assets/about-team.jpg";
import aboutMissionImage from "@/assets/about-mission.jpg";
import MedicalPatternBackground from "@/components/backgrounds/MedicalPatternBackground";

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
    title: "Verification",
    description:
      "Every facility in our directory is verified for proper licensing, accreditation, and quality standards.",
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
    description: "A world where every person struggling with addiction can easily find quality, verified treatment options without confusion or barriers.",
  },
  {
    icon: Target,
    title: "Our Mission",
    description: "To connect families with trusted addiction treatment centers through transparency, compassion, and verified information.",
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
        description="RehabLookup connects families with verified addiction treatment centers. Learn our mission, values, and commitment to transparency in recovery."
        canonical="/about"
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "About", url: "/about" },
        ]}
      />
      
      {/* Hero - Compact navy header */}
      <section className="bg-primary py-10 px-4 md:py-14 lg:py-16 md:px-6 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
        <MedicalPatternBackground />
          <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-accent/10 rounded-full blur-3xl -translate-y-1/2" />
          <div className="absolute top-1/2 right-1/4 w-48 h-48 bg-white/5 rounded-full blur-2xl -translate-y-1/2" />
        </div>
        
        <div className="container relative">
          {/* Breadcrumb */}
          <nav className="mb-5 md:mb-6 text-center">
            <span className="inline-flex items-center gap-2 text-sm md:text-base whitespace-nowrap">
              <Link to="/" className="text-white/70 hover:text-white transition-colors">Home</Link>
              <span className="text-white/50">/</span>
              <span className="text-white font-medium">About</span>
            </span>
          </nav>
          
          <div className="mx-auto max-w-2xl lg:max-w-3xl text-center">
            <div className="mb-4 md:mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 md:px-5 py-2 md:py-2.5 backdrop-blur-sm border border-white/10">
              <Heart className="h-4 w-4 md:h-5 md:w-5 text-accent" />
              <span className="text-sm md:text-base font-medium text-primary-foreground">Our Story</span>
            </div>
            <h1 className="mb-3 md:mb-4 font-display text-xl font-bold text-primary-foreground md:text-2xl lg:text-3xl xl:text-4xl">
              About RehabLookup: Trusted Addiction Treatment Directory
            </h1>
            <p className="text-base md:text-lg text-primary-foreground/80 leading-relaxed max-w-xl md:max-w-2xl mx-auto">
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
              <span>10,000+ Families Helped</span>
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
                  <div className="font-display text-2xl font-bold text-accent">500+</div>
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

      {/* CTA - Compact navy section */}
      <section className="bg-primary py-10 px-4 md:py-12 md:px-6 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/4 w-48 h-48 bg-accent/10 rounded-full blur-3xl -translate-y-1/2" />
          <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-white/5 rounded-full blur-2xl -translate-y-1/2" />
        </div>
        
        <div className="container relative">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 max-w-4xl mx-auto">
            <div className="text-center md:text-left">
              <h2 className="font-display text-xl font-bold text-primary-foreground md:text-2xl mb-2">
                Ready to Find Treatment?
              </h2>
              <p className="text-primary-foreground/80 text-sm md:text-base">
                Search our directory or speak with a specialist today.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Link to="/rehab-centers">
                <Button variant="hero-light" size="default" className="gap-2 font-semibold hover:scale-105 transition-all duration-200">
                  Find Treatment
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/concierge">
                <Button variant="ghost" size="default" className="text-primary-foreground hover:bg-white/10 gap-2 font-semibold">
                  <Heart className="h-4 w-4" />
                  Concierge Service
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
