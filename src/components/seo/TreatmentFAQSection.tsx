import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FAQ {
  question: string;
  answer: string;
}

interface TreatmentFAQSectionProps {
  faqs: FAQ[];
  treatmentType: string;
  location?: {
    city?: string;
    state?: string;
  };
}

export function TreatmentFAQSection({ faqs, treatmentType, location }: TreatmentFAQSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const locationSuffix = location?.city 
    ? ` in ${location.city}` 
    : location?.state 
      ? ` in ${location.state}` 
      : "";

  return (
    <section className="py-12 bg-background">
      <div className="container max-w-4xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 mb-4">
            <HelpCircle className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-primary">Frequently Asked Questions</span>
          </div>
          <h2 className="text-2xl font-bold text-foreground md:text-3xl">
            Common Questions About {treatmentType}{locationSuffix}
          </h2>
          <p className="mt-2 text-muted-foreground">
            Get answers to the most common questions about finding treatment near you.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="rounded-xl border bg-card overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="flex w-full items-center justify-between p-5 text-left hover:bg-muted/50 transition-colors"
                aria-expanded={openIndex === index}
              >
                <span className="font-semibold text-foreground pr-4">{faq.question}</span>
                <ChevronDown 
                  className={cn(
                    "h-5 w-5 text-muted-foreground shrink-0 transition-transform",
                    openIndex === index && "rotate-180"
                  )}
                />
              </button>
              <div
                className={cn(
                  "overflow-hidden transition-all duration-300",
                  openIndex === index ? "max-h-[500px]" : "max-h-0"
                )}
              >
                <div className="px-5 pb-5 text-muted-foreground leading-relaxed">
                  {faq.answer}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Pre-built FAQ generators for different treatment types
export function getDrugRehabNearMeFAQs(location?: { city?: string; state?: string }): FAQ[] {
  const locationName = location?.city || location?.state || "your area";
  
  return [
    {
      question: `How do I find drug rehab centers near me?`,
      answer: `Use our search tool to find verified drug rehabilitation centers in ${locationName}. Enter your location or use geolocation to see nearby facilities, compare programs, verify insurance coverage, and connect with treatment specialists who can help you choose the right program.`
    },
    {
      question: `What types of drug rehab programs are available near me?`,
      answer: `Drug rehab centers near you typically offer: medical detoxification (3-10 days), residential inpatient treatment (30-90 days), partial hospitalization programs (PHP), intensive outpatient programs (IOP), and standard outpatient treatment. Many facilities specialize in specific substances like opioids, stimulants, or benzodiazepines.`
    },
    {
      question: `How much does drug rehab cost near me?`,
      answer: `Drug rehab costs vary by program type. In ${locationName}, outpatient programs typically cost $1,000-$10,000 for 3 months, while inpatient treatment ranges from $5,000-$80,000+ for 30 days. Most insurance plans cover addiction treatment, and many facilities offer sliding-scale fees or payment plans.`
    },
    {
      question: `Does insurance cover drug rehab near me?`,
      answer: `Yes, under federal law (ACA and Mental Health Parity Act), most insurance plans must cover substance abuse treatment. This includes private insurance, employer plans, Medicaid, and Medicare. We recommend verifying your specific benefits with our free insurance check tool.`
    },
    {
      question: `How long does drug rehab take?`,
      answer: `Treatment duration varies by program and individual needs. Detox typically lasts 3-10 days. Short-term residential programs run 28-30 days, while long-term programs are 60-90+ days. Outpatient programs usually last 8-12 weeks. Research shows longer treatment correlates with better outcomes.`
    },
    {
      question: `What should I look for in a drug rehab center near me?`,
      answer: `Key factors include: accreditation (Joint Commission, CARF), evidence-based treatment approaches, qualified medical staff, individualized treatment plans, dual diagnosis capabilities, aftercare planning, and family involvement programs. Also verify they treat your specific substance and accept your insurance.`
    },
  ];
}

export function getAlcoholRehabNearMeFAQs(location?: { city?: string; state?: string }): FAQ[] {
  const locationName = location?.city || location?.state || "your area";
  
  return [
    {
      question: `How do I find alcohol rehab near me?`,
      answer: `Search our directory to find verified alcohol treatment centers in ${locationName}. You can filter by treatment type, insurance accepted, amenities, and more. Our specialists can also help match you with the right program based on your specific needs.`
    },
    {
      question: `Is medical detox necessary for alcohol addiction?`,
      answer: `Medical detox is often recommended for alcohol addiction due to potentially dangerous withdrawal symptoms including seizures and delirium tremens (DTs). A medical evaluation will determine if you need supervised detox. Never attempt to quit alcohol cold turkey without medical guidance.`
    },
    {
      question: `What alcohol treatment programs are available near me?`,
      answer: `Alcohol treatment options include medical detoxification, residential inpatient programs, partial hospitalization (PHP), intensive outpatient programs (IOP), outpatient counseling, and medication-assisted treatment (MAT) using FDA-approved medications like naltrexone or disulfiram.`
    },
    {
      question: `How effective is alcohol rehab?`,
      answer: `Research shows that quality alcohol treatment is effective, with 40-60% of people maintaining sobriety after completing treatment. Success rates improve significantly when treatment lasts 90+ days and includes aftercare planning, ongoing therapy, and support group participation.`
    },
    {
      question: `Does insurance cover alcohol rehab near me?`,
      answer: `Yes, alcohol addiction treatment is covered by most insurance plans under the Affordable Care Act and Mental Health Parity Act. Coverage varies by plan, so use our free insurance verification tool to check your specific benefits and find covered facilities near you.`
    },
    {
      question: `Can I keep working while in alcohol treatment?`,
      answer: `Yes, outpatient programs (IOP and standard outpatient) are designed to accommodate work schedules. Sessions typically meet evenings or weekends, 2-5 times per week. However, if you need medical detox or have severe addiction, a residential program may be more appropriate initially.`
    },
  ];
}

export function getDetoxNearMeFAQs(location?: { city?: string; state?: string }): FAQ[] {
  const locationName = location?.city || location?.state || "your area";
  
  return [
    {
      question: `What is medical detox and why is it important?`,
      answer: `Medical detoxification is the process of safely removing substances from your body under medical supervision. It's critical because withdrawal from certain substances (alcohol, benzodiazepines, opioids) can be dangerous or life-threatening without proper medical care. Detox centers in ${locationName} provide 24/7 monitoring and medications to manage symptoms.`
    },
    {
      question: `How long does drug or alcohol detox take?`,
      answer: `Detox duration varies by substance: alcohol detox typically takes 3-7 days, opioid detox 5-10 days, benzodiazepine detox can take 2-4 weeks due to slower tapering requirements. Your treatment team will create an individualized timeline based on your usage history and health status.`
    },
    {
      question: `Is detox painful?`,
      answer: `Modern medical detox focuses on comfort and safety. Medications are used to manage withdrawal symptoms and cravings, significantly reducing discomfort. While some symptoms are unavoidable, medical detox is far safer and more comfortable than attempting to quit on your own.`
    },
    {
      question: `What happens after detox?`,
      answer: `Detox is only the first step in recovery. After completing detox, you should transition to a treatment program (residential, PHP, IOP, or outpatient) to address the psychological and behavioral aspects of addiction. This is crucial for long-term recovery success.`
    },
    {
      question: `How much does detox cost near me?`,
      answer: `Detox costs in ${locationName} range from $250-$800/day for medical detox, or $1,000-$5,000+ for a complete detox program. Most insurance plans cover medical detox as part of addiction treatment. We can help you verify your insurance coverage and find affordable options.`
    },
  ];
}

export function getDualDiagnosisNearMeFAQs(location?: { city?: string; state?: string }): FAQ[] {
  const locationName = location?.city || location?.state || "your area";
  
  return [
    {
      question: `What is dual diagnosis treatment?`,
      answer: `Dual diagnosis (or co-occurring disorder) treatment addresses both addiction and mental health conditions simultaneously. This integrated approach is essential because substance abuse and mental health disorders often fuel each other. Treatment centers in ${locationName} offer specialized programs for dual diagnosis.`
    },
    {
      question: `What mental health conditions are commonly treated with addiction?`,
      answer: `Common co-occurring conditions include depression, anxiety disorders, PTSD, bipolar disorder, ADHD, borderline personality disorder, and schizophrenia. Studies show over 50% of people with substance use disorders also have a mental health condition that requires treatment.`
    },
    {
      question: `Why is integrated treatment important for dual diagnosis?`,
      answer: `Integrated treatment is crucial because untreated mental health conditions are a major cause of relapse. Treating only the addiction while ignoring underlying psychiatric issues typically leads to poor outcomes. Dual diagnosis programs address both conditions with coordinated care from addiction and mental health specialists.`
    },
    {
      question: `What does dual diagnosis treatment involve?`,
      answer: `Dual diagnosis treatment typically includes psychiatric evaluation, medication management, individual therapy (CBT, DBT, trauma-focused), group therapy, addiction counseling, and aftercare planning. Treatment is tailored to address the specific combination of disorders each person has.`
    },
    {
      question: `How do I find dual diagnosis treatment near me?`,
      answer: `Search our directory for treatment centers in ${locationName} that offer dual diagnosis programs. Look for facilities with licensed mental health professionals on staff, psychiatric services, and experience treating your specific conditions. Our specialists can help match you with appropriate programs.`
    },
  ];
}
