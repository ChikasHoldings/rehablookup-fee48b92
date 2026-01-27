import { useState, useMemo, memo } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Clock,
  ArrowRight,
  Search,
  Heart,
  Users,
  Brain,
  Stethoscope,
  Shield,
  Phone,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

// Import unique images for each article
import typesOfTreatmentImg from "@/assets/articles/types-of-treatment.jpg";
import choosingRehabImg from "@/assets/articles/choosing-rehab.jpg";
import firstWeekImg from "@/assets/articles/first-week.jpg";
import insuranceGuideImg from "@/assets/articles/insurance-guide.jpg";
import stagesRecoveryImg from "@/assets/articles/stages-recovery.jpg";
import supportLovedOneImg from "@/assets/articles/support-loved-one.jpg";
import inpatientOutpatientImg from "@/assets/articles/inpatient-outpatient.jpg";
import dualDiagnosisImg from "@/assets/articles/dual-diagnosis.jpg";
import signsAddictionImg from "@/assets/articles/signs-addiction.jpg";
import aftercarePlanningImg from "@/assets/articles/aftercare-planning.jpg";
import familyTherapyImg from "@/assets/articles/family-therapy.jpg";
import medicationAssistedImg from "@/assets/articles/medication-assisted.jpg";
import anxietyAddictionImg from "@/assets/articles/anxiety-addiction.jpg";
import talkingTeensImg from "@/assets/articles/talking-teens.jpg";
import holisticTherapiesImg from "@/assets/articles/holistic-therapies.jpg";
import relapsePreventionImg from "@/assets/articles/relapse-prevention.jpg";
import opioidTreatmentImg from "@/assets/articles/opioid-treatment.jpg";
import alcoholDetoxImg from "@/assets/articles/alcohol-detox.jpg";
import depressionSubstanceImg from "@/assets/articles/depression-substance.jpg";
import soberLivingImg from "@/assets/articles/sober-living.jpg";
import interventionGuideImg from "@/assets/articles/intervention-guide.jpg";
import ptsdAddictionImg from "@/assets/articles/ptsd-addiction.jpg";
import workplaceSubstanceImg from "@/assets/articles/workplace-substance.jpg";
import longTermSuccessImg from "@/assets/articles/long-term-success.jpg";

const categories = [
  { id: "all", label: "All Articles", icon: BookOpen, color: "bg-primary" },
  { id: "getting-started", label: "Getting Started", icon: Phone, color: "bg-blue-500" },
  { id: "recovery", label: "Recovery", icon: Heart, color: "bg-rose-500" },
  { id: "family", label: "Family Support", icon: Users, color: "bg-amber-500" },
  { id: "treatment", label: "Treatment Options", icon: Stethoscope, color: "bg-emerald-500" },
  { id: "mental-health", label: "Mental Health", icon: Brain, color: "bg-purple-500" },
  { id: "prevention", label: "Prevention", icon: Shield, color: "bg-cyan-500" },
];

const articles = [
  {
    id: "types-of-addiction-treatment",
    title: "Understanding the Different Types of Addiction Treatment",
    excerpt: "From detox to outpatient care, learn about the various addiction treatment options available and how to determine which approach might be right for you.",
    category: "getting-started",
    categoryLabel: "Getting Started",
    readTime: "8 min read",
    image: typesOfTreatmentImg,
    featured: true,
  },
  {
    id: "choosing-rehab-center",
    title: "How to Choose the Right Rehab Center for Your Needs",
    excerpt: "With thousands of treatment facilities available, finding the right one can feel overwhelming. This guide walks you through the key factors to consider.",
    category: "getting-started",
    categoryLabel: "Getting Started",
    readTime: "7 min read",
    image: choosingRehabImg,
    featured: true,
  },
  {
    id: "first-week-treatment",
    title: "What to Expect During Your First Week of Treatment",
    excerpt: "Starting addiction treatment can feel intimidating. Learn what typically happens during the first week so you can feel more prepared and confident.",
    category: "getting-started",
    categoryLabel: "Getting Started",
    readTime: "6 min read",
    image: firstWeekImg,
    featured: true,
  },
  {
    id: "insurance-coverage-guide",
    title: "Insurance Coverage for Addiction Treatment Explained",
    excerpt: "Understanding how insurance covers addiction treatment can be confusing. This guide explains your coverage options, rights, and how to maximize benefits.",
    category: "getting-started",
    categoryLabel: "Getting Started",
    readTime: "9 min read",
    image: insuranceGuideImg,
    featured: false,
  },
  {
    id: "stages-of-recovery",
    title: "Understanding the Stages of Addiction Recovery",
    excerpt: "Recovery is a journey with distinct stages. Learn what to expect and how to navigate each phase successfully from pre-contemplation to maintenance.",
    category: "recovery",
    categoryLabel: "Recovery",
    readTime: "5 min read",
    image: stagesRecoveryImg,
    featured: false,
  },
  {
    id: "support-loved-one",
    title: "How to Support a Loved One in Treatment",
    excerpt: "Family support is crucial for recovery. Discover effective ways to be there for someone during their treatment journey without enabling.",
    category: "family",
    categoryLabel: "Family Support",
    readTime: "4 min read",
    image: supportLovedOneImg,
    featured: false,
  },
  {
    id: "inpatient-vs-outpatient",
    title: "Choosing Between Inpatient and Outpatient Care",
    excerpt: "Not sure which treatment option is right? We break down the key differences to help you make an informed decision for your situation.",
    category: "treatment",
    categoryLabel: "Treatment Options",
    readTime: "6 min read",
    image: inpatientOutpatientImg,
    featured: false,
  },
  {
    id: "dual-diagnosis",
    title: "What is Dual Diagnosis Treatment?",
    excerpt: "Many people struggling with addiction also have co-occurring mental health conditions. Learn how dual diagnosis treatment addresses both issues together.",
    category: "mental-health",
    categoryLabel: "Mental Health",
    readTime: "7 min read",
    image: dualDiagnosisImg,
    featured: false,
  },
  {
    id: "signs-of-addiction",
    title: "Recognizing the Early Signs of Addiction",
    excerpt: "Early intervention can make a significant difference. Learn to identify the warning signs of substance abuse before it becomes a crisis.",
    category: "prevention",
    categoryLabel: "Prevention",
    readTime: "5 min read",
    image: signsAddictionImg,
    featured: false,
  },
  {
    id: "aftercare-planning",
    title: "The Importance of Aftercare Planning",
    excerpt: "Treatment doesn't end at discharge. Discover why aftercare planning is essential for long-term recovery success and how to build a solid plan.",
    category: "recovery",
    categoryLabel: "Recovery",
    readTime: "6 min read",
    image: aftercarePlanningImg,
    featured: false,
  },
  {
    id: "family-therapy",
    title: "How Family Therapy Helps the Recovery Process",
    excerpt: "Addiction affects the whole family. Learn how family therapy sessions can heal relationships and create a stronger support system.",
    category: "family",
    categoryLabel: "Family Support",
    readTime: "5 min read",
    image: familyTherapyImg,
    featured: false,
  },
  {
    id: "medication-assisted-treatment",
    title: "Understanding Medication-Assisted Treatment (MAT)",
    excerpt: "MAT combines medications with counseling and behavioral therapies. Learn how this evidence-based approach can support recovery.",
    category: "treatment",
    categoryLabel: "Treatment Options",
    readTime: "8 min read",
    image: medicationAssistedImg,
    featured: false,
  },
  {
    id: "anxiety-and-addiction",
    title: "The Connection Between Anxiety and Addiction",
    excerpt: "Anxiety and substance abuse often go hand in hand. Understand the relationship between these conditions and how to treat them together.",
    category: "mental-health",
    categoryLabel: "Mental Health",
    readTime: "6 min read",
    image: anxietyAddictionImg,
    featured: false,
  },
  {
    id: "talking-to-teens",
    title: "Talking to Teens About Substance Abuse",
    excerpt: "Open communication is key to prevention. Get practical tips for having honest, effective conversations with adolescents about drugs and alcohol.",
    category: "prevention",
    categoryLabel: "Prevention",
    readTime: "5 min read",
    image: talkingTeensImg,
    featured: false,
  },
  {
    id: "holistic-therapies",
    title: "Holistic Therapies in Addiction Treatment",
    excerpt: "From yoga to art therapy, holistic approaches complement traditional treatment. Explore the benefits of mind-body healing practices.",
    category: "treatment",
    categoryLabel: "Treatment Options",
    readTime: "4 min read",
    image: holisticTherapiesImg,
    featured: false,
  },
  {
    id: "relapse-prevention",
    title: "Building a Relapse Prevention Plan",
    excerpt: "Relapse is not failure—it's part of many recovery journeys. Learn how to create a strong prevention plan and what to do if relapse occurs.",
    category: "recovery",
    categoryLabel: "Recovery",
    readTime: "7 min read",
    image: relapsePreventionImg,
    featured: false,
  },
  {
    id: "opioid-addiction-treatment",
    title: "Opioid Addiction: Treatment Options and Recovery",
    excerpt: "Understanding opioid addiction and the evidence-based treatments available, including medication-assisted treatment and behavioral therapies.",
    category: "treatment",
    categoryLabel: "Treatment Options",
    readTime: "8 min read",
    image: opioidTreatmentImg,
    featured: false,
  },
  {
    id: "alcohol-detox-what-to-expect",
    title: "Alcohol Detox: What to Expect and How to Prepare",
    excerpt: "Alcohol withdrawal can be dangerous without proper medical supervision. Learn what happens during detox and why professional help is essential.",
    category: "treatment",
    categoryLabel: "Treatment Options",
    readTime: "6 min read",
    image: alcoholDetoxImg,
    featured: false,
  },
  {
    id: "depression-and-substance-abuse",
    title: "The Link Between Depression and Substance Abuse",
    excerpt: "Depression and addiction frequently co-occur. Explore how these conditions interact and why integrated treatment produces the best outcomes.",
    category: "mental-health",
    categoryLabel: "Mental Health",
    readTime: "7 min read",
    image: depressionSubstanceImg,
    featured: false,
  },
  {
    id: "sober-living-homes",
    title: "Sober Living Homes: Bridging Treatment and Independence",
    excerpt: "Sober living provides structured support after treatment. Learn how these transitional homes help maintain recovery while rebuilding life skills.",
    category: "recovery",
    categoryLabel: "Recovery",
    readTime: "5 min read",
    image: soberLivingImg,
    featured: false,
  },
  {
    id: "intervention-guide",
    title: "How to Plan an Intervention for a Loved One",
    excerpt: "A well-planned intervention can be the catalyst for change. Learn the steps to organize an effective, compassionate intervention.",
    category: "family",
    categoryLabel: "Family Support",
    readTime: "6 min read",
    image: interventionGuideImg,
    featured: false,
  },
  {
    id: "ptsd-and-addiction",
    title: "PTSD and Addiction: Understanding Trauma-Informed Care",
    excerpt: "Trauma and addiction are deeply connected. Discover how trauma-informed treatment approaches address both conditions for lasting recovery.",
    category: "mental-health",
    categoryLabel: "Mental Health",
    readTime: "8 min read",
    image: ptsdAddictionImg,
    featured: false,
  },
  {
    id: "workplace-substance-abuse",
    title: "Addressing Substance Abuse in the Workplace",
    excerpt: "Employers and employees alike need to understand workplace substance abuse policies, EAPs, and how to seek help while protecting your career.",
    category: "prevention",
    categoryLabel: "Prevention",
    readTime: "5 min read",
    image: workplaceSubstanceImg,
    featured: false,
  },
  {
    id: "long-term-recovery-success",
    title: "Keys to Long-Term Recovery Success",
    excerpt: "What separates those who maintain sobriety from those who struggle? Learn the habits, mindsets, and support systems that support lasting recovery.",
    category: "recovery",
    categoryLabel: "Recovery",
    readTime: "7 min read",
    image: longTermSuccessImg,
    featured: false,
  },
  {
    id: "cocaine-addiction-treatment",
    title: "Cocaine Addiction Treatment: Programs and Recovery Options",
    excerpt: "Cocaine addiction requires specialized treatment approaches. Learn about evidence-based therapies, what to expect in treatment, and how to build lasting recovery.",
    category: "treatment",
    categoryLabel: "Treatment Options",
    readTime: "8 min read",
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&h=400&fit=crop",
    featured: false,
  },
  {
    id: "meth-addiction-recovery",
    title: "Methamphetamine Addiction: Understanding Treatment and Recovery",
    excerpt: "Meth addiction presents unique challenges for recovery. Discover the most effective treatment approaches and what the recovery timeline looks like.",
    category: "treatment",
    categoryLabel: "Treatment Options",
    readTime: "9 min read",
    image: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&h=400&fit=crop",
    featured: false,
  },
  {
    id: "prescription-drug-addiction",
    title: "Prescription Drug Addiction: Signs, Risks, and Treatment",
    excerpt: "From painkillers to benzodiazepines, prescription drug addiction is increasingly common. Learn how to recognize the signs and find appropriate treatment.",
    category: "prevention",
    categoryLabel: "Prevention",
    readTime: "7 min read",
    image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&h=400&fit=crop",
    featured: false,
  },
  {
    id: "teen-addiction-treatment",
    title: "Teen Addiction Treatment: A Guide for Parents",
    excerpt: "Adolescent substance abuse requires age-appropriate treatment. Learn about teen-specific programs and how to support your child's recovery journey.",
    category: "family",
    categoryLabel: "Family Support",
    readTime: "8 min read",
    image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&h=400&fit=crop",
    featured: false,
  },
  {
    id: "veterans-addiction-treatment",
    title: "Addiction Treatment for Veterans: Specialized Programs and Resources",
    excerpt: "Veterans face unique challenges with substance abuse. Explore VA resources, specialized treatment programs, and support services designed for those who served.",
    category: "treatment",
    categoryLabel: "Treatment Options",
    readTime: "7 min read",
    image: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&h=400&fit=crop",
    featured: false,
  },
  {
    id: "womens-addiction-treatment",
    title: "Women's Addiction Treatment: Gender-Specific Care",
    excerpt: "Women experience addiction differently and benefit from specialized treatment. Learn about women-only programs and gender-responsive approaches to recovery.",
    category: "treatment",
    categoryLabel: "Treatment Options",
    readTime: "6 min read",
    image: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&h=400&fit=crop",
    featured: false,
  },
  {
    id: "12-step-programs-guide",
    title: "Understanding 12-Step Programs: AA, NA, and Beyond",
    excerpt: "12-step programs have helped millions recover from addiction. Learn how they work, what to expect at meetings, and whether this approach might be right for you.",
    category: "recovery",
    categoryLabel: "Recovery",
    readTime: "7 min read",
    image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&h=400&fit=crop",
    featured: false,
  },
  {
    id: "smart-recovery-alternative",
    title: "SMART Recovery: A Science-Based Alternative to 12-Step",
    excerpt: "Not everyone connects with 12-step programs. Discover SMART Recovery, a secular, science-based approach to overcoming addiction through self-empowerment.",
    category: "recovery",
    categoryLabel: "Recovery",
    readTime: "6 min read",
    image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&h=400&fit=crop",
    featured: false,
  },
  {
    id: "mindfulness-addiction-recovery",
    title: "Mindfulness and Meditation in Addiction Recovery",
    excerpt: "Mindfulness practices can be powerful tools for managing cravings and building emotional resilience. Learn how to incorporate meditation into your recovery.",
    category: "recovery",
    categoryLabel: "Recovery",
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=400&fit=crop",
    featured: false,
  },
  {
    id: "exercise-recovery-benefits",
    title: "The Role of Exercise in Addiction Recovery",
    excerpt: "Physical activity is a powerful recovery tool that helps heal the brain and body. Discover how exercise supports sobriety and which activities work best.",
    category: "recovery",
    categoryLabel: "Recovery",
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=400&fit=crop",
    featured: false,
  },
  {
    id: "nutrition-recovery-healing",
    title: "Nutrition in Recovery: Healing Your Body After Addiction",
    excerpt: "Substance abuse takes a toll on your body. Learn how proper nutrition can accelerate healing, reduce cravings, and support long-term recovery.",
    category: "recovery",
    categoryLabel: "Recovery",
    readTime: "6 min read",
    image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&h=400&fit=crop",
    featured: false,
  },
  {
    id: "fentanyl-crisis-treatment",
    title: "Fentanyl Addiction: Understanding the Crisis and Finding Help",
    excerpt: "The fentanyl crisis has changed the addiction landscape. Learn about the unique dangers of fentanyl, treatment options, and harm reduction strategies.",
    category: "treatment",
    categoryLabel: "Treatment Options",
    readTime: "8 min read",
    image: "https://images.unsplash.com/photo-1576671081837-49000212a370?w=800&h=400&fit=crop",
    featured: false,
  },
  {
    id: "benzodiazepine-withdrawal",
    title: "Benzodiazepine Withdrawal and Treatment: What to Know",
    excerpt: "Benzo withdrawal can be dangerous without proper medical supervision. Understand the risks, timeline, and why professional detox is essential.",
    category: "treatment",
    categoryLabel: "Treatment Options",
    readTime: "7 min read",
    image: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&h=400&fit=crop",
    featured: false,
  },
  {
    id: "gambling-addiction-treatment",
    title: "Gambling Addiction: Signs, Treatment, and Recovery",
    excerpt: "Gambling disorder shares many traits with substance addiction. Learn to recognize problem gambling and find effective treatment programs.",
    category: "treatment",
    categoryLabel: "Treatment Options",
    readTime: "6 min read",
    image: "https://images.unsplash.com/photo-1596838132731-3301c3fd4317?w=800&h=400&fit=crop",
    featured: false,
  },
  {
    id: "executive-addiction-treatment",
    title: "Executive Rehab Programs: Treatment for Professionals",
    excerpt: "High-powered careers can enable and hide addiction. Explore executive treatment programs designed for busy professionals who need privacy and flexibility.",
    category: "treatment",
    categoryLabel: "Treatment Options",
    readTime: "6 min read",
    image: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=800&h=400&fit=crop",
    featured: false,
  },
];

// Get category color
const getCategoryColor = (categoryId: string) => {
  const category = categories.find(c => c.id === categoryId);
  return category?.color || "bg-primary";
};

// Memoized Article Card Component
const ArticleCard = memo(function ArticleCard({ 
  article, 
  index,
  variant = "default"
}: { 
  article: typeof articles[0]; 
  index: number;
  variant?: "featured" | "default";
}) {
  const categoryColor = getCategoryColor(article.category);
  
  if (variant === "featured") {
    return (
      <Link
        to={`/resources/${article.id}`}
        className="group animate-fade-in block h-full"
        style={{ animationDelay: `${index * 100}ms` }}
      >
        <article className="relative h-full rounded-2xl bg-card overflow-hidden transition-all duration-500 hover:-translate-y-2 shadow-[0_4px_20px_-4px_hsl(var(--foreground)/0.1)] hover:shadow-[0_20px_40px_-12px_hsl(var(--primary)/0.25)] border border-border/50 hover:border-primary/40">
          {/* Featured Badge */}
          <div className="absolute top-4 left-4 z-10">
            <Badge className="gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-lg px-3 py-1.5 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              Featured
            </Badge>
          </div>
          
          {/* Image */}
          <div className="relative h-56 overflow-hidden">
            <img
              src={article.image}
              alt={article.title}
              className="h-full w-full object-cover transition-all duration-700 group-hover:scale-110 group-hover:brightness-110"
              loading="lazy"
              decoding="async"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent transition-opacity duration-300 group-hover:opacity-80" />
            
            {/* Category on image */}
            <div className="absolute bottom-4 left-4 right-4">
              <span className={`inline-flex items-center gap-2 rounded-full ${categoryColor} px-3 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur-sm transition-transform duration-300 group-hover:scale-105`}>
                <BookOpen className="h-3.5 w-3.5" />
                {article.categoryLabel}
              </span>
            </div>
          </div>
          
          {/* Content */}
          <div className="p-6 relative">
            {/* Subtle accent line */}
            <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
            
            <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {article.readTime}
            </div>
            <h3 className="mb-3 font-display text-xl font-bold text-foreground leading-snug group-hover:text-primary transition-colors duration-300 line-clamp-2">
              {article.title}
            </h3>
            <p className="mb-5 text-sm text-muted-foreground leading-relaxed line-clamp-2">
              {article.excerpt}
            </p>
            <div className="flex items-center gap-2 text-sm font-semibold text-primary group-hover:gap-3 transition-all duration-300">
              Read article
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </div>
          </div>
        </article>
      </Link>
    );
  }

  return (
    <Link
      to={`/resources/${article.id}`}
      className="group animate-fade-in block h-full"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <article className="h-full rounded-xl bg-card overflow-hidden transition-all duration-400 hover:-translate-y-1.5 shadow-[0_2px_12px_-3px_hsl(var(--foreground)/0.08)] hover:shadow-[0_12px_28px_-8px_hsl(var(--primary)/0.2)] border border-border/40 hover:border-primary/30 relative">
        {/* Hover glow effect */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        
        {/* Image */}
        <div className="relative h-44 overflow-hidden">
          <img
            src={article.image}
            alt={article.title}
            className="h-full w-full object-cover transition-all duration-600 group-hover:scale-108 group-hover:brightness-105"
            loading="lazy"
            decoding="async"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent transition-opacity duration-300" />
          
          {/* Animated overlay on hover */}
          <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </div>
        
        {/* Content */}
        <div className="p-5 relative">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full ${categoryColor} px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm transition-all duration-300 group-hover:shadow-md group-hover:scale-105`}>
              {article.categoryLabel}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {article.readTime}
            </span>
          </div>
          <h3 className="mb-2.5 font-display text-base font-semibold text-foreground leading-snug group-hover:text-primary transition-colors duration-300 line-clamp-2">
            {article.title}
          </h3>
          <p className="mb-4 text-sm text-muted-foreground leading-relaxed line-clamp-2 transition-colors duration-300 group-hover:text-muted-foreground/80">
            {article.excerpt}
          </p>
          
          {/* Enhanced read more link */}
          <div className="flex items-center gap-1.5 text-sm font-medium text-primary transition-all duration-300 group-hover:gap-2.5">
            <span className="relative">
              Read more
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary/50 group-hover:w-full transition-all duration-300" />
            </span>
            <ArrowRight className="h-3.5 w-3.5 transition-all duration-300 group-hover:translate-x-1" />
          </div>
        </div>
      </article>
    </Link>
  );
});

const Resources = () => {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredArticles = useMemo(() => {
    let results = [...articles];

    // Filter by category
    if (activeCategory !== "all") {
      results = results.filter((a) => a.category === activeCategory);
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      results = results.filter(
        (a) =>
          a.title.toLowerCase().includes(query) ||
          a.excerpt.toLowerCase().includes(query) ||
          a.categoryLabel.toLowerCase().includes(query)
      );
    }

    return results;
  }, [activeCategory, searchQuery]);

  const featuredArticles = articles.filter((a) => a.featured);

  return (
    <Layout>
      <SEO
        title="Addiction Recovery Resources & Guides"
        description="Expert articles and guides on addiction recovery, treatment options, family support, mental health, and relapse prevention. Free educational resources for your recovery journey."
        canonical="/resources"
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Resources", url: "/resources" },
        ]}
      />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/90 py-10 md:py-12">
        {/* Decorative elements */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        
        <div className="container relative text-center">
          <div className="mx-auto max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-white/90 backdrop-blur-sm">
              <BookOpen className="h-3.5 w-3.5" />
              Recovery Resources & Guides
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-white md:text-3xl lg:text-4xl">
              Expert Guides for Your Recovery Journey
            </h1>
            <p className="mt-3 text-base text-white/80 md:text-lg">
              <span className="font-semibold text-white">{articles.length}+</span> articles covering treatment options, family support, mental health, and relapse prevention
            </p>
          </div>
        </div>
      </section>

      {/* Featured Articles */}
      <section className="section-padding border-b border-border bg-gradient-to-b from-muted/30 to-background">
        <div className="container">
          <div className="mb-10 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-amber-500" />
                <span className="text-sm font-semibold text-amber-600 uppercase tracking-wide">Editor's Picks</span>
              </div>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                Featured Articles
              </h2>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {featuredArticles.map((article, index) => (
              <ArticleCard 
                key={article.id} 
                article={article} 
                index={index}
                variant="featured"
              />
            ))}
          </div>
        </div>
      </section>

      {/* All Articles with Filters */}
      <section className="section-padding">
        <div className="container">
          {/* Search and Filters */}
          <div className="mb-10 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-1">
                  Browse All Articles
                </h2>
                <p className="text-muted-foreground">Find the information you need</p>
              </div>
              
              {/* Search */}
              <div className="relative w-full md:w-80">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 h-11 rounded-xl border-border/50 focus:border-primary"
                />
              </div>
            </div>

            {/* Category Filters */}
            <div className="overflow-x-auto -mx-5 md:mx-0 px-5 md:px-0 pb-2 md:pb-0 scrollbar-hide">
              <div className="flex gap-2 md:flex-wrap min-w-max md:min-w-0">
                {categories.map((category) => {
                  const Icon = category.icon;
                  const isActive = activeCategory === category.id;
                  return (
                    <button
                      key={category.id}
                      onClick={() => setActiveCategory(category.id)}
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-all whitespace-nowrap ${
                        isActive
                          ? `${category.color} text-white shadow-md`
                          : "bg-muted text-foreground hover:bg-muted/80"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {category.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Results */}
          {filteredArticles.length > 0 ? (
            <>
              <p className="mb-6 text-sm text-muted-foreground">
                Showing <span className="font-semibold text-foreground">{filteredArticles.length}</span> {filteredArticles.length === 1 ? "article" : "articles"}
              </p>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredArticles.map((article, index) => (
                  <ArticleCard 
                    key={article.id} 
                    article={article} 
                    index={index}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="py-20 text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                <Search className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="mb-3 font-display text-2xl font-semibold text-foreground">
                No articles found
              </h3>
              <p className="mb-6 text-muted-foreground max-w-md mx-auto">
                Try adjusting your search or filter to find what you're looking for.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setActiveCategory("all");
                  setSearchQuery("");
                }}
                className="h-11 px-6 rounded-xl"
              >
                Clear filters
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding bg-muted/30">
        <div className="container">
          <div className="mx-auto max-w-3xl rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 via-primary/10 to-accent/10 p-8 md:p-12 text-center relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5">
                <Heart className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">We're Here to Help</span>
              </div>
              
              <h2 className="mb-4 font-display text-2xl md:text-3xl lg:text-4xl font-bold text-foreground">
                Need Personalized Guidance?
              </h2>
              <p className="mb-8 text-lg text-muted-foreground max-w-xl mx-auto">
                Our specialists are available 24/7 to answer your questions and help you find the right treatment path.
              </p>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link to="/account/concierge" className="w-full sm:w-auto">
                  <Button size="lg" className="gap-2 w-full sm:w-auto h-12 text-base rounded-xl shadow-lg">
                    <Heart className="h-5 w-5" />
                    Concierge Service
                  </Button>
                </Link>
                <Link to="/contact" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="gap-2 w-full sm:w-auto h-12 text-base rounded-xl">
                    Request a Callback
                    <ArrowRight className="h-5 w-5" />
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

export default Resources;
