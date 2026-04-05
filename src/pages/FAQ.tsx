import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO, generateFAQSchema } from "@/components/SEO";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search, HelpCircle, ArrowRight, Heart, Phone, Lock,
  Stethoscope, DollarSign, Building2, X, Shield, CheckCircle,
  ChevronDown, Users, Globe, Home, Clock, Pill, Brain,
  CalendarCheck, BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FAQItem { question: string; answer: string; }
interface FAQCategory { id: string; name: string; icon: React.ElementType; description: string; faqs: FAQItem[]; }

const faqCategories: FAQCategory[] = [
  {
    id: "getting-started",
    name: "Getting Started",
    icon: Phone,
    description: "Starting your journey to recovery",
    faqs: [
      { question: "How do I know if I or a loved one needs treatment?", answer: "Signs that treatment may be needed include inability to control substance use, experiencing withdrawal symptoms when not using, neglecting responsibilities, relationship problems, health issues related to use, and continuing despite negative consequences. If substance use is causing distress or impairment in any area of life, it's worth speaking with a professional. You don't have to hit \"rock bottom\" to benefit from treatment." },
      { question: "What is the first step to getting help?", answer: "The first step is reaching out. You can call a treatment center directly, speak with your primary care doctor, or use our free concierge service to get matched with facilities that fit your needs. Many people also start by confiding in a trusted friend or family member. Remember, asking for help is a sign of strength, not weakness." },
      { question: "Can I get help for someone else?", answer: "Yes. Many families initiate the treatment process on behalf of a loved one. You can research facilities, verify insurance coverage, and even arrange admissions. For voluntary treatment, the individual must ultimately agree to participate. If your loved one is resistant, a professional interventionist can help facilitate a productive conversation about seeking help." },
      { question: "Is treatment available 24/7?", answer: "Most treatment centers have admissions teams available around the clock, 7 days a week. Crisis situations can be addressed immediately, and many facilities offer same-day or next-day intake assessments. Our support team is also available to help you find appropriate care quickly, regardless of the time." },
      { question: "What if I'm not ready for rehab but need support?", answer: "There are many levels of care available. Outpatient counseling, support groups like AA or NA, SMART Recovery, telehealth therapy, and peer support services all offer meaningful support without requiring residential treatment. Speaking with a professional can help you understand your options and find an approach that feels right for where you are in your journey." },
      { question: "How quickly can I get into a treatment program?", answer: "Many programs can admit patients within 24-72 hours, especially for urgent cases. Some facilities offer same-day admission. The timeline depends on bed availability, insurance verification, and the level of care needed. Our concierge service can expedite the process by handling verification and coordination on your behalf." },
      { question: "What should I bring to rehab?", answer: "Most programs provide a packing list upon admission. Generally, bring comfortable clothing for 7-10 days, personal hygiene items (no alcohol-based products), any prescribed medications in original bottles, a valid ID, insurance cards, and a small amount of cash. Leave valuables, electronics (policies vary), and any substances at home. Contact your chosen facility for their specific guidelines." },
    ],
  },
  {
    id: "treatment-types",
    name: "Treatment Options",
    icon: Stethoscope,
    description: "Understanding different programs and therapies",
    faqs: [
      { question: "What is the difference between inpatient and outpatient treatment?", answer: "Inpatient (residential) treatment means living at the facility full-time, typically for 30-90 days, with 24/7 medical support and structured programming. Outpatient treatment allows you to live at home while attending scheduled therapy sessions several times per week. Intensive Outpatient Programs (IOP) offer a middle ground with 9-20 hours of weekly programming. The right choice depends on addiction severity, your home environment, and personal circumstances." },
      { question: "What is medical detox and do I need it?", answer: "Medical detoxification is medically supervised withdrawal from substances in a clinical setting. Medical staff monitor vital signs, manage symptoms, and provide medications to ensure safety and comfort. Detox is strongly recommended for alcohol, opioids, benzodiazepines, and barbiturates, where unsupervised withdrawal can be medically dangerous or even life-threatening. Your admissions team will assess whether detox is needed." },
      { question: "What therapies are commonly used in treatment?", answer: "Evidence-based approaches include Cognitive Behavioral Therapy (CBT), Dialectical Behavior Therapy (DBT), Motivational Interviewing (MI), EMDR for trauma, contingency management, and 12-step facilitation. Many programs also incorporate family therapy, group therapy, experiential therapy (art, music, equine), mindfulness meditation, yoga, and exercise programs. Treatment plans are typically individualized based on each person's needs." },
      { question: "How long does treatment typically last?", answer: "Program lengths vary by level of care: medical detox typically lasts 5-10 days, short-term residential is usually 28-30 days, extended residential runs 60-90 days, and long-term therapeutic communities can be 6-12 months. Outpatient programs generally last 2-6 months. Research consistently shows that longer engagement with treatment supports better long-term outcomes." },
      { question: "What is dual diagnosis treatment?", answer: "Dual diagnosis (or co-occurring disorders) treatment simultaneously addresses both addiction and mental health conditions such as depression, anxiety, PTSD, bipolar disorder, or ADHD. Integrated treatment is considered the gold standard because these conditions often fuel each other. Look for programs with licensed psychiatrists and therapists trained in both addiction and mental health care." },
      { question: "What is Medication-Assisted Treatment (MAT)?", answer: "MAT combines FDA-approved medications (such as buprenorphine/Suboxone, methadone, or naltrexone/Vivitrol for opioids, and naltrexone, acamprosate, or disulfiram for alcohol) with counseling and behavioral therapies. MAT is considered an evidence-based best practice that can reduce cravings, prevent relapse, and support long-term recovery. It is not \"replacing one drug with another\" — it is a medically supervised treatment approach." },
      { question: "What is a Partial Hospitalization Program (PHP)?", answer: "A PHP provides structured, hospital-level treatment during the day (typically 5-7 days per week, 6-8 hours daily) while allowing patients to return home or to a sober living environment in the evenings. It bridges the gap between inpatient and outpatient care and is ideal for those who need intensive support but have a stable living situation." },
      { question: "Are holistic or alternative therapies effective?", answer: "Holistic therapies like yoga, meditation, acupuncture, art therapy, equine therapy, and adventure therapy can be valuable complements to evidence-based clinical treatment. They help with stress management, emotional regulation, and overall wellbeing. The most effective programs integrate these alongside proven clinical approaches rather than using them as standalone treatments." },
    ],
  },
  {
    id: "detox-withdrawal",
    name: "Detox & Withdrawal",
    icon: Pill,
    description: "Understanding the detox process",
    faqs: [
      { question: "What does the detox process look like?", answer: "Upon arrival, you'll receive a comprehensive medical assessment including vital signs, blood work, and a substance use history review. Medical staff will create a personalized detox protocol. You'll be monitored 24/7 with regular check-ins, medications as needed for comfort, nutritional support, and emotional support. Most detox programs last 5-10 days depending on the substance and severity." },
      { question: "Is detox painful or dangerous?", answer: "Medical detox is designed to minimize discomfort and ensure safety. Withdrawal can be unpleasant, but medications can significantly reduce symptoms like nausea, anxiety, insomnia, and pain. Unsupervised withdrawal from alcohol and benzodiazepines can be medically dangerous, which is why professional detox is strongly recommended. With proper medical care, detox is safe." },
      { question: "What withdrawal symptoms should I expect?", answer: "Symptoms vary by substance: Alcohol withdrawal may include tremors, anxiety, sweating, nausea, and in severe cases, seizures. Opioid withdrawal can cause muscle aches, nausea, diarrhea, insomnia, and intense cravings. Stimulant withdrawal often involves fatigue, depression, and increased appetite. Benzodiazepine withdrawal may include anxiety, insomnia, and in severe cases, seizures. Medical staff will manage all symptoms." },
      { question: "Can I detox at home?", answer: "Home detox is generally not recommended, especially for alcohol, benzodiazepines, or heavy opioid use, as withdrawal can be medically dangerous. However, for some substances and lower severity cases, an outpatient detox protocol with regular medical check-ins may be appropriate. Always consult with a medical professional before attempting to stop substance use on your own." },
      { question: "What happens after detox is complete?", answer: "Detox is the first step, not the complete treatment. After detox, patients typically transition to a residential or outpatient treatment program where they receive therapy, counseling, and skills training for long-term recovery. Detox alone without follow-up treatment has high relapse rates. Your treatment team will help create a seamless transition plan." },
    ],
  },
  {
    id: "cost-insurance",
    name: "Cost & Insurance",
    icon: DollarSign,
    description: "Affording quality treatment",
    faqs: [
      { question: "Does insurance cover addiction treatment?", answer: "Yes, most health insurance plans cover addiction treatment under mental health and substance use disorder benefits, as required by the Mental Health Parity and Addiction Equity Act (MHPAEA) and the Affordable Care Act. Coverage typically includes detox, residential treatment, outpatient programs, and medications. The extent of coverage varies by plan — we can help you verify your specific benefits." },
      { question: "What if I don't have insurance?", answer: "Many options exist: state-funded treatment programs, sliding scale fees based on income, payment plans, nonprofit treatment centers, SAMHSA-funded programs, and scholarships offered by individual facilities. Medicaid covers treatment in all states, and many facilities accept it. Some faith-based programs offer free treatment. Don't let concerns about cost prevent you from exploring your options." },
      { question: "How much does treatment cost without insurance?", answer: "Costs vary significantly by level of care and location: outpatient programs typically range from $1,000-$10,000 for a full course, intensive outpatient is $3,000-$15,000, residential treatment costs $10,000-$30,000 per month, and luxury/executive programs can be $30,000-$100,000+ per month. Many facilities offer payment plans and financial assistance to make treatment accessible." },
      { question: "Can I use HSA or FSA funds for treatment?", answer: "Yes. Health Savings Accounts (HSA) and Flexible Spending Accounts (FSA) can typically be used for addiction treatment expenses, including detox, therapy sessions, residential care, prescribed medications, and even some travel costs related to treatment. Check with your account administrator for specific eligible expenses and documentation requirements." },
      { question: "What is in-network vs. out-of-network coverage?", answer: "In-network facilities have negotiated rates with your insurance company, usually resulting in lower out-of-pocket costs (copays, coinsurance). Out-of-network facilities may still be partially covered but at higher cost to you. PPO plans typically offer some out-of-network benefits while HMO plans may not. Always verify coverage details before admission to avoid unexpected bills." },
      { question: "Will I have to pay anything out of pocket?", answer: "Most people have some out-of-pocket costs even with insurance, including copays, deductibles, and coinsurance. The amount depends on your specific plan. Many facilities offer financial counseling to help you understand your costs upfront and can set up payment plans for any remaining balance. Some also offer scholarships or sliding scale fees." },
      { question: "Does Medicaid cover rehab?", answer: "Yes, Medicaid covers substance abuse treatment in all 50 states, including detox, outpatient therapy, and in many states, residential treatment. Coverage specifics vary by state and plan type. Many quality treatment centers accept Medicaid. Our directory allows you to filter for Medicaid-accepting facilities in your area." },
    ],
  },
  {
    id: "privacy-legal",
    name: "Privacy & Legal",
    icon: Lock,
    description: "Your rights and protections",
    faqs: [
      { question: "Is my treatment information kept confidential?", answer: "Absolutely. Your treatment records are protected by HIPAA (Health Insurance Portability and Accountability Act) and 42 CFR Part 2, which provides even stronger protections specifically for substance use disorder records. Treatment centers cannot share your information without your written consent, except in narrow emergency circumstances. We also never sell your data to third parties." },
      { question: "Will my employer find out if I seek treatment?", answer: "Treatment records cannot be disclosed to employers without your explicit written consent. The Family and Medical Leave Act (FMLA) allows eligible employees to take up to 12 weeks of unpaid, job-protected leave for treatment without disclosing the specific medical reason. The ADA also protects individuals in recovery from discrimination. Your facility can advise you on workplace protections." },
      { question: "Can I remain anonymous while searching for treatment?", answer: "Yes. You can browse our entire directory, read treatment guides, compare facilities, and research programs without providing any personal information. You only share your details when you choose to contact a specific facility or request our concierge service. Your browsing activity is never shared with treatment centers." },
      { question: "How does RehabLookup verify treatment centers?", answer: "We verify state licensing, accreditation from organizations like The Joint Commission (JCAHO) or CARF International, DEA registration for MAT programs, and confirm that facilities meet quality standards. Our team regularly reviews listings for accuracy, monitors patient feedback, and investigates complaints. Facilities that don't meet our standards are removed from the directory." },
      { question: "Can I be forced into treatment?", answer: "Laws vary by state. Most states have some form of involuntary commitment for substance use disorders under specific circumstances (imminent danger to self or others). However, voluntary treatment is generally more effective. Many states also offer drug court diversion programs as an alternative to incarceration. An attorney or your local legal aid office can explain the laws in your state." },
      { question: "Will treatment show up on a background check?", answer: "No. Treatment records are protected health information and do not appear on standard background checks, employment screenings, or criminal record checks. Treatment itself is a medical matter, not a legal one. However, any criminal charges that may have led to court-ordered treatment would be part of court records." },
    ],
  },
  {
    id: "family-support",
    name: "Family & Support",
    icon: Users,
    description: "Supporting your loved one's recovery",
    faqs: [
      { question: "How can I support a loved one in treatment?", answer: "Stay connected through facility-approved communication (calls, letters, family visits during designated times). Participate in family therapy sessions and educational programs offered by the facility. Educate yourself about addiction as a disease. Join a support group like Al-Anon or Nar-Anon. Set healthy boundaries while expressing love and encouragement. Your own wellbeing matters too." },
      { question: "What is family therapy and why is it important?", answer: "Family therapy addresses how addiction affects the entire family system, including communication patterns, codependency, enabling behaviors, and relationship dynamics. It helps families heal together, establish healthy boundaries, and create a supportive home environment for recovery. Research shows that family involvement significantly improves treatment outcomes and reduces relapse rates." },
      { question: "Can I visit my loved one during treatment?", answer: "Most residential programs allow family visits during designated times, typically starting after the first 1-2 weeks to allow the patient to settle in. Visitation policies vary by facility — some offer weekly visiting hours, family weekends, or family therapy days. Contact the specific facility for their visitation schedule and guidelines." },
      { question: "What resources are available for families?", answer: "Many resources exist: Al-Anon and Nar-Anon support groups, family therapy, CRAFT (Community Reinforcement and Family Training) programs, educational workshops offered by treatment centers, books like \"Beyond Addiction\" and \"Beautiful Boy,\" online forums, and family counselors specializing in addiction. Taking care of yourself is essential to supporting your loved one effectively." },
      { question: "How do I stage an intervention?", answer: "A professional interventionist can guide the process, which typically involves gathering close family and friends, preparing specific examples of how addiction has affected relationships, presenting treatment options, and establishing consequences if treatment is refused. CRAFT is an evidence-based alternative to traditional confrontational interventions that has shown strong success rates." },
    ],
  },
  {
    id: "recovery-aftercare",
    name: "Recovery & Aftercare",
    icon: CalendarCheck,
    description: "Life after treatment",
    faqs: [
      { question: "What happens after completing a treatment program?", answer: "Aftercare planning begins before discharge and typically includes ongoing individual therapy, group counseling, support group participation (AA, NA, SMART Recovery), and possibly sober living arrangements. Many facilities offer alumni programs with regular check-ins, events, and continued support. Building a recovery-focused lifestyle with healthy routines, supportive relationships, and meaningful activities is key to sustained sobriety." },
      { question: "What is sober living and should I consider it?", answer: "Sober living homes are structured, substance-free residences that bridge the gap between treatment and independent living. Residents follow house rules, attend recovery meetings, maintain employment or education, and support each other. Sober living is strongly recommended for those without a stable, supportive home environment, those completing long-term treatment, or anyone who wants additional structure during early recovery." },
      { question: "What if I relapse after treatment?", answer: "Relapse does not mean failure. Addiction is a chronic condition, and relapse rates (40-60%) are comparable to other chronic illnesses like diabetes or hypertension. If relapse occurs, the priority is returning to treatment or increasing your level of support quickly. Many people require multiple treatment episodes before achieving sustained recovery. Each experience builds skills and self-awareness." },
      { question: "How long does recovery take?", answer: "Recovery is a lifelong journey, but it gets easier over time. The brain needs 12-18 months to significantly heal from the effects of substance use. The first 90 days are typically the highest risk period. Most people find that active engagement in recovery support during the first 1-2 years establishes a strong foundation. Many people in long-term recovery report that their lives are better than before addiction." },
      { question: "What support groups are available?", answer: "Options include 12-step programs (AA, NA, CA), SMART Recovery (science-based), Refuge Recovery (Buddhist-inspired), LifeRing Secular Recovery, Celebrate Recovery (faith-based), Women for Sobriety, and online recovery communities like In The Rooms. Many people benefit from trying several to find the right fit. Support groups are free and widely available in most communities." },
      { question: "Can I continue working while in recovery?", answer: "Yes. Many people in outpatient programs, IOP, or aftercare maintain employment throughout recovery. Some employers offer Employee Assistance Programs (EAPs) that provide confidential counseling and referrals. The ADA protects individuals in recovery from workplace discrimination. Some people find that returning to a structured routine including work supports their recovery." },
    ],
  },
  {
    id: "mental-health",
    name: "Mental Health",
    icon: Brain,
    description: "Co-occurring mental health conditions",
    faqs: [
      { question: "How common are co-occurring mental health disorders?", answer: "Very common. According to SAMHSA, approximately 9.2 million adults in the U.S. have both a mental health disorder and a substance use disorder. Common co-occurring conditions include depression, anxiety disorders, PTSD, bipolar disorder, ADHD, and personality disorders. Integrated treatment that addresses both conditions simultaneously produces the best outcomes." },
      { question: "Should I treat my mental health or addiction first?", answer: "Current best practice is to treat both simultaneously through integrated dual diagnosis treatment. Treating only one condition often leads to relapse because untreated mental health symptoms can trigger substance use and vice versa. Look for programs with psychiatrists, licensed therapists, and addiction counselors who work together as a team." },
      { question: "Will I be prescribed psychiatric medication during treatment?", answer: "If clinically appropriate, yes. A psychiatrist or physician will evaluate whether medication for depression, anxiety, PTSD, or other conditions would support your recovery. Medications are carefully selected to avoid those with addiction potential when possible. Medication management is combined with therapy for the most effective treatment approach." },
      { question: "What if I have a trauma history?", answer: "Many treatment programs offer trauma-informed care and specific therapies for trauma including EMDR (Eye Movement Desensitization and Reprocessing), Seeking Safety, CPT (Cognitive Processing Therapy), and somatic experiencing. It's important to choose a program experienced in trauma work, especially if you have PTSD. You should never be pressured to share trauma details before you're ready." },
    ],
  },
  {
    id: "specialized-programs",
    name: "Specialized Programs",
    icon: Globe,
    description: "Programs for specific populations",
    faqs: [
      { question: "Are there programs specifically for veterans?", answer: "Yes. The VA offers specialized substance abuse treatment programs, and many private facilities have veteran-specific tracks that address combat-related trauma, military sexual trauma, and the unique culture of military service. Programs like the VA's SATP and community-based programs specifically designed for veterans are available. TRICARE also covers treatment at many civilian facilities." },
      { question: "What programs exist for young adults and adolescents?", answer: "Many facilities offer age-specific programs for teens (13-17) and young adults (18-25) that address developmental needs, peer pressure, academic concerns, and family dynamics. These programs often incorporate educational support, life skills training, and age-appropriate therapeutic approaches. Look for programs with staff experienced in adolescent development and addiction." },
      { question: "Are there gender-specific treatment programs?", answer: "Yes. Gender-specific programs create safe spaces to address issues unique to each population. Women's programs often focus on trauma, domestic violence, pregnancy/postpartum issues, and childcare support. Men's programs may address anger management, emotional expression, and masculinity issues. LGBTQ+-affirming programs provide inclusive care sensitive to the unique challenges faced by this community." },
      { question: "What about executive or professional treatment programs?", answer: "Executive programs cater to professionals who need treatment while maintaining some work responsibilities. They typically offer private accommodations, business amenities (phone, internet access), flexible scheduling, and confidentiality protections beyond standard HIPAA. Programs may also address workplace stress, professional licensing concerns, and career-related triggers." },
      { question: "Are there faith-based treatment options?", answer: "Yes. Many faith-based programs incorporate spiritual practices, scripture study, pastoral counseling, and community worship alongside clinical treatment. Programs exist across denominations including Christian, Jewish, and other faith traditions. Some are low-cost or free. Effective faith-based programs also include evidence-based clinical approaches alongside spiritual components." },
      { question: "What programs are available for international patients?", answer: "Many U.S. treatment centers welcome international patients and can assist with travel arrangements, visa documentation, language services, and cultural sensitivity. Some specialize in serving international clientele with multilingual staff and culturally adapted programming. Our international patients page provides detailed guidance on seeking treatment in the United States." },
    ],
  },
  {
    id: "about-rehablookup",
    name: "About RehabLookup",
    icon: Building2,
    description: "How our platform works",
    faqs: [
      { question: "Is RehabLookup free to use?", answer: "Yes. Browsing our directory, reading treatment guides, comparing facilities, verifying insurance compatibility, and using our search tools are completely free for individuals seeking treatment. Our concierge placement service provides personalized, guided matching at no cost to seekers." },
      { question: "How are treatment centers listed on RehabLookup?", answer: "Treatment centers apply through our provider portal. We verify their state licensing, accreditations (Joint Commission, CARF, etc.), insurance relationships, and other credentials before listing. All facilities must meet our quality standards and keep their profile information accurate and current. We do not accept facilities that fail our verification process." },
      { question: "Does RehabLookup recommend specific facilities?", answer: "Our concierge team provides personalized recommendations based on your treatment needs, insurance coverage, location preference, budget, and other factors. We match based on clinical fit and quality — not advertising spend — ensuring you receive honest, unbiased guidance. We partner with a network of vetted providers to offer the best options for each individual." },
      { question: "How is RehabLookup different from other directories?", answer: "RehabLookup verifies every listed facility's credentials, provides transparent information about treatment approaches and costs, and offers a personalized concierge service that goes beyond simple directory listings. We don't accept pay-for-placement advertising, and our recommendations are based on clinical fit rather than financial relationships." },
      { question: "How do I list my treatment center on RehabLookup?", answer: "Treatment providers can apply through our Provider Portal. The process includes submitting facility information, providing documentation of licensing and accreditations, and completing our verification review. Once approved, you can manage your listing, respond to inquiries, and connect with individuals seeking treatment through our platform." },
      { question: "How do I contact RehabLookup for help?", answer: "You can reach us through our Contact page, use our concierge service for personalized placement assistance, or browse our directory to contact facilities directly. Our team is available to answer questions and help guide you through the process of finding the right treatment center for your needs." },
      { question: "What is the RehabLookup Concierge Service?", answer: "Our Concierge Service is a free, personalized placement assistance program. A dedicated advisor reviews your situation — including substance type, insurance, location preferences, co-occurring conditions, and budget — then hand-matches you with vetted treatment centers that fit your unique needs. It takes the guesswork out of finding the right program and saves you hours of research." },
      { question: "How does RehabLookup verify treatment centers?", answer: "Every facility listed on RehabLookup undergoes a multi-step verification process. We confirm active state licensing, check accreditation status with bodies like The Joint Commission (JCAHO) and CARF International, verify DEA registration for MAT programs, validate insurance relationships, and review patient feedback. Facilities that fail verification or receive substantiated complaints are removed from our directory." },
      { question: "Does RehabLookup accept payments from treatment centers to rank them higher?", answer: "No. RehabLookup does not accept pay-for-placement or pay-per-lead advertising that would bias our recommendations. Our concierge matching is based entirely on clinical fit, quality of care, insurance compatibility, and patient preferences. Featured listings are clearly labeled and never influence our concierge recommendations." },
      { question: "Can I read reviews of treatment centers on RehabLookup?", answer: "Yes. Many facility profiles include verified patient reviews and ratings. We moderate reviews to ensure they are genuine and helpful. Reviews cover aspects like quality of care, staff professionalism, facility environment, and overall experience. We encourage all past patients to share their honest feedback to help others make informed decisions." },
      { question: "How do I search for rehab centers by location?", answer: "Use our directory search at rehablookup.com/rehab-centers to filter by state, city, or zip code. You can also browse our state-specific pages or use the 'Near Me' feature to find facilities close to your current location. Each listing includes the facility's full address, contact information, and a map." },
      { question: "Can I filter treatment centers by insurance on RehabLookup?", answer: "Yes. Our search filters allow you to select your insurance provider to see only facilities that accept your plan. You can also use our insurance verification feature to check your specific benefits with a facility before contacting them. We list major insurance carriers including Aetna, Blue Cross Blue Shield, Cigna, UnitedHealthcare, Humana, and many more." },
      { question: "Does RehabLookup offer resources beyond the directory?", answer: "Absolutely. We publish an extensive blog with articles on addiction, recovery, mental health, and treatment options. We provide treatment type guides, state-specific resource pages, insurance guides, and educational content to help you make informed decisions. All of our educational content is reviewed for accuracy and updated regularly." },
      { question: "Is my personal information safe on RehabLookup?", answer: "Yes. We take data security very seriously. All data transmitted through our site is encrypted using industry-standard SSL/TLS protocols. We never sell your personal information to third parties. Your search activity is private and is never shared with treatment centers unless you choose to reach out. Our full privacy practices are detailed in our Privacy Policy." },
      { question: "Can treatment providers manage their listing on RehabLookup?", answer: "Yes. Verified treatment providers have access to a dedicated Provider Portal where they can update facility details, manage photos and descriptions, respond to inquiries, track engagement analytics, update insurance information, and manage their concierge network participation. Changes go through a review process to maintain listing quality." },
      { question: "Does RehabLookup help with same-day or emergency admissions?", answer: "Yes. If you or a loved one is in crisis, our concierge team can help identify facilities with immediate availability for same-day or next-day admission. Many of our listed centers offer expedited intake for urgent situations. You can also browse our Same-Day Admission and Fast Admission pages to find programs ready to accept patients quickly." },
    ],
  },
];

function FAQAccordionItem({ faq, isOpen, onToggle }: { faq: FAQItem; isOpen: boolean; onToggle: () => void }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (isOpen && contentRef.current) {
      setHeight(contentRef.current.scrollHeight);
    } else {
      setHeight(0);
    }
  }, [isOpen]);

  return (
    <div
      className={cn(
        "rounded-xl border bg-card transition-all duration-200",
        isOpen
          ? "border-primary/30 shadow-sm ring-1 ring-primary/10"
          : "border-border hover:border-primary/20"
      )}
    >
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
        aria-expanded={isOpen}
      >
        <span className={cn(
          "text-sm font-semibold leading-snug transition-colors",
          isOpen ? "text-primary" : "text-foreground"
        )}>
          {faq.question}
        </span>
        <ChevronDown className={cn(
          "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
          isOpen && "rotate-180 text-primary"
        )} />
      </button>
      <div
        className="overflow-hidden transition-[height] duration-200 ease-out"
        style={{ height }}
      >
        <div ref={contentRef}>
          <div className="px-5 pb-5 pt-0">
            <div className="h-px bg-border mb-4" />
            <p className="text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const FAQ = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("getting-started");
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const searchRef = useRef<HTMLInputElement>(null);
  const location = useLocation();

  const toggleItem = useCallback((key: string) => {
    setOpenItems(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return faqCategories.filter(c => c.id === activeCategory);
    }
    const q = searchQuery.toLowerCase();
    return faqCategories
      .map(c => ({
        ...c,
        faqs: c.faqs.filter(
          f => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)
        ),
      }))
      .filter(c => c.faqs.length > 0);
  }, [searchQuery, activeCategory]);

  const totalQuestions = faqCategories.reduce((a, c) => a + c.faqs.length, 0);
  const totalResults = filteredCategories.reduce((a, c) => a + c.faqs.length, 0);
  const isSearching = !!searchQuery.trim();

  // Auto-expand matching results when searching
  useEffect(() => {
    if (isSearching) {
      const matchingKeys = new Set<string>();
      filteredCategories.forEach(cat => {
        cat.faqs.forEach((_, idx) => matchingKeys.add(`${cat.id}-${idx}`));
      });
      setOpenItems(matchingKeys);
    } else {
      setOpenItems(new Set());
    }
  }, [searchQuery, filteredCategories, isSearching]);

  // Hash-based navigation
  useEffect(() => {
    const hash = location.hash.replace("#", "");
    if (hash && faqCategories.some(c => c.id === hash)) {
      setActiveCategory(hash);
      setSearchQuery("");
    }
  }, [location.hash]);

  const allFaqsForSchema = faqCategories.flatMap(c =>
    c.faqs.map(f => ({ question: f.question, answer: f.answer }))
  );

  const handleCategoryClick = (catId: string) => {
    setActiveCategory(catId);
    setOpenItems(new Set());
    setSearchQuery("");
    // On mobile, scroll to content
    const el = document.getElementById("faq-content-area");
    if (el && window.innerWidth < 1024) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const activeCat = faqCategories.find(c => c.id === activeCategory);

  const expandAll = () => {
    const all = new Set<string>();
    filteredCategories.forEach(cat => {
      cat.faqs.forEach((_, idx) => all.add(`${cat.id}-${idx}`));
    });
    setOpenItems(all);
  };

  const collapseAll = () => setOpenItems(new Set());

  // Count matches per category during search
  const searchMatchCounts = useMemo(() => {
    if (!isSearching) return {};
    const q = searchQuery.toLowerCase();
    const counts: Record<string, number> = {};
    faqCategories.forEach(c => {
      const n = c.faqs.filter(f =>
        f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)
      ).length;
      if (n > 0) counts[c.id] = n;
    });
    return counts;
  }, [searchQuery, isSearching]);

  return (
    <Layout>
      <SEO
        title="Addiction Treatment FAQ | RehabLookup"
        description="Get answers about addiction treatment, insurance coverage, privacy, and recovery. Learn how RehabLookup helps you find the right rehab center."
        canonical="/faq"
        structuredData={generateFAQSchema(allFaqsForSchema)}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "FAQ", url: "/faq" },
        ]}
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-primary py-10 md:py-12">
        <div className="container relative z-10">
          <BreadcrumbNav
            className="mb-4"
            variant="dark"
            items={[
              { label: "FAQ" },
            ]}
          />
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-4 text-sm font-medium text-white/90 backdrop-blur-sm">
              <HelpCircle className="h-4 w-4" />
              <span>Frequently Asked Questions</span>
            </div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold text-white mb-3 leading-tight tracking-tight">
              Your Questions, Answered
            </h1>
            <p className="text-base text-white/80 leading-relaxed max-w-lg mx-auto">
              Comprehensive answers about treatment, insurance, privacy, recovery, and how RehabLookup helps you find the right care.
            </p>

            {/* Search */}
            <div className="relative max-w-md mx-auto mt-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
              <Input
                ref={searchRef}
                type="text"
                placeholder="Search all questions…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12 rounded-xl border-0 bg-card pl-11 pr-10 text-sm shadow-xl placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-accent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors z-10"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
            </div>

            <div className="mt-5 flex items-center justify-center gap-6 text-white/70 text-sm">
              <div className="flex items-center gap-1.5">
                <BookOpen className="h-4 w-4" />
                <span>{faqCategories.length} Topics</span>
              </div>
              <div className="flex items-center gap-1.5">
                <HelpCircle className="h-4 w-4" />
                <span className="tabular-nums">{totalQuestions} Questions</span>
              </div>
              <div className="hidden sm:flex items-center gap-1.5">
                <Shield className="h-4 w-4" />
                <span>HIPAA Compliant</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Split-screen layout */}
      <section className="py-8 md:py-12 bg-gradient-to-b from-background to-muted/20 min-h-[60vh]">
        <div className="container">
          <div className="flex flex-col lg:flex-row gap-8">

            {/* Sidebar */}
            <aside className="lg:w-72 xl:w-80 flex-shrink-0">
              <div className="lg:sticky lg:top-24">
                {/* Mobile: horizontal pills */}
                <div className="lg:hidden">
                  <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2">
                    {faqCategories.map(cat => {
                      const isActive = activeCategory === cat.id;
                      const matchCount = isSearching ? searchMatchCounts[cat.id] : undefined;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => handleCategoryClick(cat.id)}
                          className={cn(
                            "shrink-0 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                            isActive && !isSearching
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : isSearching && matchCount
                                ? "bg-accent/10 text-accent border border-accent/20"
                                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                          )}
                        >
                          <cat.icon className="h-3.5 w-3.5" />
                          {cat.name}
                          {isSearching && matchCount && (
                            <span className="text-xs bg-accent/20 text-accent rounded-full px-1.5 tabular-nums">{matchCount}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Desktop: vertical sidebar */}
                <div className="hidden lg:block">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1">
                    Topics
                  </h3>
                  <ScrollArea className="max-h-[calc(100vh-160px)]">
                    <nav className="space-y-1">
                      {faqCategories.map(cat => {
                        const isActive = activeCategory === cat.id && !isSearching;
                        const matchCount = isSearching ? searchMatchCounts[cat.id] : undefined;
                        return (
                          <button
                            key={cat.id}
                            onClick={() => handleCategoryClick(cat.id)}
                            className={cn(
                              "w-full flex items-center gap-3 rounded-xl px-3.5 py-3 text-left transition-all duration-150 group",
                              isActive
                                ? "bg-primary/10 border border-primary/20 shadow-sm"
                                : isSearching && matchCount
                                  ? "bg-accent/5 border border-accent/10 hover:bg-accent/10"
                                  : "border border-transparent hover:bg-muted/60"
                            )}
                          >
                            <div className={cn(
                              "flex h-9 w-9 items-center justify-center rounded-lg shrink-0 transition-colors",
                              isActive
                                ? "bg-primary text-primary-foreground"
                                : isSearching && matchCount
                                  ? "bg-accent/10 text-accent"
                                  : "bg-muted text-muted-foreground group-hover:bg-muted/80"
                            )}>
                              <cat.icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className={cn(
                                "text-sm font-medium truncate",
                                isActive ? "text-primary" : "text-foreground"
                              )}>
                                {cat.name}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {cat.faqs.length} questions
                              </div>
                            </div>
                            {isSearching && matchCount && (
                              <span className="text-xs font-semibold bg-accent/15 text-accent rounded-full px-2 py-0.5 tabular-nums shrink-0">
                                {matchCount}
                              </span>
                            )}
                            {isActive && (
                              <div className="w-1 h-6 bg-primary rounded-full shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </nav>
                  </ScrollArea>

                  {/* Sidebar CTA */}
                  <div className="mt-6 rounded-xl border border-accent/20 bg-accent/5 p-4">
                    <p className="text-sm font-semibold text-foreground mb-1">Still need help?</p>
                    <p className="text-xs text-muted-foreground mb-3">Our team can answer your specific questions.</p>
                    <Link to="/concierge">
                      <Button size="sm" className="w-full gap-2 text-xs font-semibold">
                        <Heart className="h-3.5 w-3.5" />
                        Get Personalized Help
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 min-w-0" id="faq-content-area">
              {/* Search results header */}
              {isSearching && (
                <div className="mb-6 flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2 rounded-full bg-accent/10 px-4 py-2 text-sm">
                    <Search className="h-3.5 w-3.5 text-accent" />
                    <span className="text-muted-foreground">
                      Found <span className="font-semibold text-foreground tabular-nums">{totalResults}</span> result{totalResults !== 1 ? "s" : ""} for &ldquo;<span className="font-semibold text-foreground">{searchQuery}</span>&rdquo;
                    </span>
                  </div>
                  <button onClick={() => setSearchQuery("")} className="text-sm text-primary hover:underline">Clear</button>
                </div>
              )}

              {/* Controls */}
              {filteredCategories.length > 0 && (
                <div className="flex items-center justify-between mb-6">
                  {!isSearching && activeCat && (
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                        <activeCat.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-lg font-display font-bold text-foreground">{activeCat.name}</h2>
                        <p className="text-xs text-muted-foreground">{activeCat.description}</p>
                      </div>
                    </div>
                  )}
                  {isSearching && <div />}
                  <div className="flex items-center gap-3 shrink-0">
                    <button onClick={expandAll} className="text-xs text-primary hover:underline font-medium">
                      Expand All
                    </button>
                    <span className="text-border">|</span>
                    <button onClick={collapseAll} className="text-xs text-primary hover:underline font-medium">
                      Collapse All
                    </button>
                  </div>
                </div>
              )}

              {filteredCategories.length === 0 ? (
                <div className="text-center py-16">
                  <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <Search className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-display text-xl font-bold text-foreground mb-2">No Results Found</h3>
                  <p className="text-sm text-muted-foreground mb-6">Try different keywords or browse by category.</p>
                  <Button onClick={() => { setSearchQuery(""); setActiveCategory("getting-started"); }} variant="outline" className="gap-2">
                    View All Questions
                  </Button>
                </div>
              ) : (
                <div className="space-y-10">
                  {filteredCategories.map(category => (
                    <div key={category.id}>
                      {/* Show category header only in search mode */}
                      {isSearching && (
                        <div className="flex items-center gap-3 mb-4">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                            <category.icon className="h-4 w-4 text-primary" />
                          </div>
                          <h3 className="text-base font-display font-bold text-foreground">{category.name}</h3>
                          <span className="text-xs text-muted-foreground tabular-nums">{category.faqs.length} match{category.faqs.length !== 1 ? "es" : ""}</span>
                        </div>
                      )}

                      <div className="space-y-2.5">
                        {category.faqs.map((faq, index) => {
                          const key = `${category.id}-${index}`;
                          return (
                            <FAQAccordionItem
                              key={key}
                              faq={faq}
                              isOpen={openItems.has(key)}
                              onToggle={() => toggleItem(key)}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </main>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-10 bg-muted/30">
        <div className="container">
          <div className="mx-auto max-w-3xl rounded-2xl border border-accent/20 bg-gradient-to-r from-accent/5 via-card to-accent/10 p-6 md:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-accent/10 rounded-full blur-3xl" />
            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 shrink-0">
                  <HelpCircle className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h2 className="text-lg font-display font-bold text-foreground mb-1">Still Have Questions?</h2>
                  <p className="text-sm text-muted-foreground">Our compassionate team is here to help you find the right path forward.</p>
                </div>
              </div>
              <div className="flex items-center gap-3 ml-13 md:ml-0">
                <Link to="/concierge">
                  <Button className="gap-2 font-semibold">
                    <Heart className="h-4 w-4" />
                    Find Treatment
                  </Button>
                </Link>
                <Link to="/contact">
                  <Button variant="outline" className="gap-2 font-semibold">
                    Contact Us <ArrowRight className="h-4 w-4" />
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

export default FAQ;
