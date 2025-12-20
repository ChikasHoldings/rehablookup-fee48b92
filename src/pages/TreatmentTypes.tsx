import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StateLinksGroup } from "@/components/treatment/StateLinksSection";
import {
  Pill,
  Brain,
  Activity,
  Home,
  Stethoscope,
  Sparkles,
  ArrowRight,
  CheckCircle,
  Shield,
  Clock,
  Heart,
  Users,
  Award,
  Zap,
  Leaf,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TreatmentType {
  icon: LucideIcon;
  title: string;
  shortTitle: string;
  description: string;
  features: string[];
  link: string;
  color: string;
  stats?: string;
}

const treatmentTypes: TreatmentType[] = [
  {
    icon: Sparkles,
    title: "Detox Programs",
    shortTitle: "Detox",
    description: "Medically supervised withdrawal management with 24/7 monitoring to safely detox from drugs and alcohol.",
    features: ["Medical supervision", "Withdrawal management", "Medication support", "Treatment transition"],
    link: "/treatment-types/detox-programs",
    color: "from-violet-500 to-purple-600",
    stats: "3-14 days typical",
  },
  {
    icon: Pill,
    title: "Drug Addiction Treatment",
    shortTitle: "Drug Rehab",
    description: "Comprehensive programs for substance abuse including opioids, stimulants, benzodiazepines, and other controlled substances.",
    features: ["Medical detoxification", "Individual therapy", "Group counseling", "Relapse prevention"],
    link: "/treatment-types/drug-addiction-treatment",
    color: "from-blue-500 to-indigo-600",
    stats: "30-90 days",
  },
  {
    icon: Activity,
    title: "Alcohol Rehabilitation",
    shortTitle: "Alcohol Rehab",
    description: "Specialized programs for alcohol dependence with medically supervised detox and evidence-based therapies.",
    features: ["Safe detox protocols", "12-step programs", "Cognitive behavioral therapy", "Family therapy"],
    link: "/treatment-types/alcohol-rehabilitation",
    color: "from-amber-500 to-orange-600",
    stats: "28-90 days",
  },
  {
    icon: Brain,
    title: "Dual Diagnosis Treatment",
    shortTitle: "Dual Diagnosis",
    description: "Integrated treatment addressing both addiction and co-occurring mental health conditions like depression, anxiety, and PTSD.",
    features: ["Psychiatric evaluation", "Medication management", "Trauma-informed care", "Holistic therapies"],
    link: "/treatment-types/dual-diagnosis-treatment",
    color: "from-teal-500 to-cyan-600",
    stats: "60-90+ days",
  },
  {
    icon: Home,
    title: "Residential Inpatient",
    shortTitle: "Inpatient",
    description: "24/7 structured care in a supportive residential environment for intensive, focused recovery.",
    features: ["Round-the-clock supervision", "Structured daily schedule", "Therapeutic community", "Life skills training"],
    link: "/treatment-types/residential-inpatient",
    color: "from-emerald-500 to-green-600",
    stats: "30-90 days",
  },
  {
    icon: Stethoscope,
    title: "Outpatient Programs",
    shortTitle: "Outpatient",
    description: "Flexible treatment options allowing you to maintain work, school, and family commitments while receiving care.",
    features: ["Intensive outpatient (IOP)", "Partial hospitalization (PHP)", "Evening programs", "Telehealth options"],
    link: "/treatment-types/outpatient-programs",
    color: "from-sky-500 to-blue-600",
    stats: "8-20 hrs/week",
  },
  {
    icon: Leaf,
    title: "Holistic & Alternative Therapy",
    shortTitle: "Holistic",
    description: "Complementary approaches that address mind, body, and spirit for whole-person healing.",
    features: ["Yoga & meditation", "Art & music therapy", "Equine therapy", "Nutritional counseling"],
    link: "/treatment-types/holistic-therapy",
    color: "from-rose-500 to-pink-600",
    stats: "Varies",
  },
];

const TreatmentTypeCard = ({ type, index }: { type: TreatmentType; index: number }) => {
  const IconComponent = type.icon;
  
  return (
    <Link
      to={type.link}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-300",
        "hover:shadow-xl hover:-translate-y-1 hover:border-primary/30",
        "animate-fade-in"
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Gradient Header */}
      <div className={cn("relative h-28 bg-gradient-to-br", type.color)}>
        <div className="absolute inset-0 bg-black/10" />
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-card to-transparent" />
        
        {/* Icon Badge */}
        <div className="absolute -bottom-6 left-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-card border-2 border-card shadow-lg transition-transform group-hover:scale-110">
            <IconComponent className={cn("h-7 w-7 text-transparent bg-clip-text bg-gradient-to-br", type.color)} style={{ color: 'currentColor' }} />
            <IconComponent className={cn("h-7 w-7 absolute")} style={{ color: type.color.includes('violet') ? '#8B5CF6' : type.color.includes('blue') ? '#3B82F6' : type.color.includes('amber') ? '#F59E0B' : type.color.includes('teal') ? '#14B8A6' : type.color.includes('emerald') ? '#10B981' : type.color.includes('sky') ? '#0EA5E9' : '#F43F5E' }} />
          </div>
        </div>
        
        {/* Stats Badge */}
        {type.stats && (
          <div className="absolute top-3 right-3">
            <Badge variant="secondary" className="bg-white/90 text-foreground text-[10px] font-medium shadow-sm">
              {type.stats}
            </Badge>
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="flex flex-1 flex-col p-5 pt-10">
        <h3 className="mb-2 font-display text-lg font-bold text-foreground group-hover:text-primary transition-colors">
          {type.title}
        </h3>
        <p className="mb-4 text-sm text-muted-foreground leading-relaxed line-clamp-2">
          {type.description}
        </p>
        
        {/* Features */}
        <ul className="mb-5 grid grid-cols-2 gap-x-2 gap-y-1.5">
          {type.features.slice(0, 4).map((feature) => (
            <li key={feature} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle className="h-3 w-3 text-primary shrink-0" />
              <span className="truncate">{feature}</span>
            </li>
          ))}
        </ul>
        
        {/* CTA */}
        <div className="mt-auto">
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3 group-hover:bg-primary/5 transition-colors">
            <span className="text-sm font-medium text-foreground">Find Programs</span>
            <ArrowRight className="h-4 w-4 text-primary transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </div>
    </Link>
  );
};

const TreatmentTypes = () => {
  return (
    <Layout>
      <SEO
        title="Types of Addiction Treatment Programs | Find the Right Care"
        description="Explore different addiction treatment options including drug rehab, alcohol treatment, dual diagnosis, residential, outpatient, and holistic therapy programs. Find verified treatment centers."
        canonical="/treatment-types"
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Treatment Types", url: "/treatment-types" },
        ]}
      />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary via-primary to-primary/95 py-14 md:py-20">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-10 right-10 h-64 w-64 rounded-full bg-accent/30 blur-3xl" />
        </div>
        
        <div className="container relative">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 backdrop-blur-sm">
              <Stethoscope className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-primary-foreground">Treatment Directory</span>
            </div>
            
            <h1 className="mb-4 font-display text-3xl font-bold tracking-tight text-primary-foreground md:text-4xl lg:text-5xl">
              Find the Right Treatment
              <span className="block text-accent">For Your Recovery Journey</span>
            </h1>
            
            <p className="mb-8 text-base text-primary-foreground/80 md:text-lg max-w-2xl mx-auto leading-relaxed">
              From medical detox to holistic therapy, explore evidence-based treatment programs designed to address your unique needs and support lasting recovery.
            </p>
            
            {/* Quick Stats */}
            <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                  <Award className="h-5 w-5 text-accent" />
                </div>
                <div className="text-left">
                  <p className="text-lg font-bold text-primary-foreground">7+</p>
                  <p className="text-xs text-primary-foreground/70">Treatment Types</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                  <Users className="h-5 w-5 text-accent" />
                </div>
                <div className="text-left">
                  <p className="text-lg font-bold text-primary-foreground">15K+</p>
                  <p className="text-xs text-primary-foreground/70">Centers Nationwide</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                  <Shield className="h-5 w-5 text-accent" />
                </div>
                <div className="text-left">
                  <p className="text-lg font-bold text-primary-foreground">100%</p>
                  <p className="text-xs text-primary-foreground/70">Verified Programs</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Navigation Pills */}
      <section className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
        <div className="container py-3">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
            {treatmentTypes.map((type) => (
              <Link
                key={type.link}
                to={type.link}
                className="shrink-0 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:border-primary hover:bg-primary hover:text-primary-foreground"
              >
                {type.shortTitle}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Treatment Types Grid */}
      <section className="py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mb-10 text-center">
            <h2 className="mb-3 font-display text-2xl font-bold text-foreground md:text-3xl">
              Explore Treatment Programs
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Each treatment type serves a specific purpose in the recovery journey. Find the right level of care for your situation.
            </p>
          </div>
          
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {treatmentTypes.map((type, index) => (
              <TreatmentTypeCard key={type.link} type={type} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* Treatment Comparison Section */}
      <section className="bg-muted/30 py-12 md:py-16">
        <div className="container">
          <div className="mb-10 text-center">
            <h2 className="mb-3 font-display text-2xl font-bold text-foreground md:text-3xl">
              Compare Treatment Levels
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Understanding the differences between treatment types helps you make the right choice.
            </p>
          </div>
          
          <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            {/* Table Header */}
            <div className="grid grid-cols-4 gap-4 border-b border-border bg-muted/50 p-4 text-sm font-semibold text-foreground">
              <div>Program Type</div>
              <div className="text-center">Duration</div>
              <div className="text-center">Intensity</div>
              <div className="text-center">Best For</div>
            </div>
            
            {/* Table Rows */}
            <div className="divide-y divide-border">
              <div className="grid grid-cols-4 gap-4 p-4 text-sm hover:bg-muted/30 transition-colors">
                <Link to="/treatment-types/detox-programs" className="font-medium text-primary hover:underline flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Detox
                </Link>
                <div className="text-center text-muted-foreground">3-14 days</div>
                <div className="text-center">
                  <Badge variant="destructive" className="text-[10px]">High</Badge>
                </div>
                <div className="text-center text-muted-foreground text-xs">Initial withdrawal</div>
              </div>
              
              <div className="grid grid-cols-4 gap-4 p-4 text-sm hover:bg-muted/30 transition-colors">
                <Link to="/treatment-types/residential-inpatient" className="font-medium text-primary hover:underline flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  Inpatient
                </Link>
                <div className="text-center text-muted-foreground">30-90 days</div>
                <div className="text-center">
                  <Badge variant="destructive" className="text-[10px]">High</Badge>
                </div>
                <div className="text-center text-muted-foreground text-xs">Severe addiction</div>
              </div>
              
              <div className="grid grid-cols-4 gap-4 p-4 text-sm hover:bg-muted/30 transition-colors">
                <Link to="/treatment-types/outpatient-programs" className="font-medium text-primary hover:underline flex items-center gap-2">
                  <Stethoscope className="h-4 w-4" />
                  Outpatient
                </Link>
                <div className="text-center text-muted-foreground">8-20 hrs/wk</div>
                <div className="text-center">
                  <Badge variant="secondary" className="text-[10px]">Medium</Badge>
                </div>
                <div className="text-center text-muted-foreground text-xs">Work/life balance</div>
              </div>
              
              <div className="grid grid-cols-4 gap-4 p-4 text-sm hover:bg-muted/30 transition-colors">
                <Link to="/treatment-types/dual-diagnosis-treatment" className="font-medium text-primary hover:underline flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  Dual Diagnosis
                </Link>
                <div className="text-center text-muted-foreground">60-90+ days</div>
                <div className="text-center">
                  <Badge variant="destructive" className="text-[10px]">High</Badge>
                </div>
                <div className="text-center text-muted-foreground text-xs">Co-occurring disorders</div>
              </div>
              
              <div className="grid grid-cols-4 gap-4 p-4 text-sm hover:bg-muted/30 transition-colors">
                <Link to="/treatment-types/holistic-therapy" className="font-medium text-primary hover:underline flex items-center gap-2">
                  <Leaf className="h-4 w-4" />
                  Holistic
                </Link>
                <div className="text-center text-muted-foreground">Varies</div>
                <div className="text-center">
                  <Badge variant="outline" className="text-[10px]">Low-Med</Badge>
                </div>
                <div className="text-center text-muted-foreground text-xs">Whole-person healing</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Browse by State */}
      <section className="py-12 md:py-16">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              Find Treatment by State
            </h2>
            <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
              Browse verified treatment programs in your state
            </p>
          </div>

          <StateLinksGroup
            title="Detox Programs by State"
            basePath="/treatment-types/detox-programs"
            icon={Sparkles}
          />

          <StateLinksGroup
            title="Inpatient Rehab by State"
            basePath="/treatment-types/residential-inpatient"
            icon={Home}
          />

          <StateLinksGroup
            title="Outpatient Programs by State"
            basePath="/treatment-types/outpatient-programs"
            icon={Stethoscope}
          />

          <StateLinksGroup
            title="Dual Diagnosis by State"
            basePath="/treatment-types/dual-diagnosis-treatment"
            icon={Brain}
            className=""
          />
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-12 md:py-16">
        <div className="container">
          <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-primary/90 p-8 md:p-12">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
            
            <div className="relative text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2">
                <Zap className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium text-primary-foreground">Get Personalized Help</span>
              </div>
              
              <h2 className="mb-4 font-display text-2xl font-bold text-primary-foreground md:text-3xl">
                Not Sure Which Treatment Is Right?
              </h2>
              <p className="mb-8 text-primary-foreground/80 max-w-xl mx-auto">
                Our specialists can help you understand your options and find the best program for your unique situation. Free and confidential.
              </p>
              
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link to="/request-help?source=treatment_types">
                  <Button size="lg" variant="secondary" className="gap-2 font-semibold shadow-lg hover:shadow-xl transition-shadow">
                    <Heart className="h-4 w-4" />
                    Request Help Now
                  </Button>
                </Link>
                <Link to="/rehab-centers">
                  <Button size="lg" variant="outline" className="gap-2 border-white/30 text-white hover:bg-white/10 hover:text-white">
                    Browse All Centers
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default TreatmentTypes;