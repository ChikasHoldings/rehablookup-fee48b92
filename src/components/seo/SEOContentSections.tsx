// SEO-focused content sections for treatment pages

interface ContentSection {
  title: string;
  content: string;
  listItems?: string[];
}

export function generateDetoxContent(location?: { state?: string; city?: string }): ContentSection[] {
  const locationText = location?.city 
    ? `${location.city}, ${location.state}` 
    : location?.state || "your area";

  return [
    {
      title: `What is Medical Detox?`,
      content: `Medical detoxification is the first critical step in addiction recovery. It involves safely managing withdrawal symptoms under medical supervision. In ${locationText}, detox programs provide 24/7 care to help patients through this challenging phase.`,
      listItems: [
        "24/7 medical monitoring and support",
        "Medication-assisted treatment to ease withdrawal",
        "Average duration of 5-10 days depending on substance",
        "Smooth transition to ongoing treatment programs",
      ],
    },
    {
      title: `Types of Detox Programs`,
      content: `Detox centers in ${locationText} offer various levels of care based on individual needs, substance type, and severity of addiction.`,
      listItems: [
        "Inpatient medical detox with round-the-clock supervision",
        "Hospital-based detox for severe cases",
        "Outpatient detox for mild dependencies",
        "Rapid detox under anesthesia (select facilities)",
      ],
    },
    {
      title: `What to Expect During Detox`,
      content: `Understanding the detox process can help reduce anxiety. Most programs in ${locationText} follow evidence-based protocols to ensure patient safety and comfort.`,
      listItems: [
        "Initial medical assessment and intake",
        "Customized treatment plan development",
        "Withdrawal symptom management",
        "Nutritional support and hydration",
        "Aftercare planning and treatment recommendations",
      ],
    },
  ];
}

export function generateInpatientContent(location?: { state?: string; city?: string }): ContentSection[] {
  const locationText = location?.city 
    ? `${location.city}, ${location.state}` 
    : location?.state || "your area";

  return [
    {
      title: `Understanding Residential Inpatient Treatment`,
      content: `Residential inpatient rehab in ${locationText} provides intensive, round-the-clock care in a structured environment. Patients live at the facility for 30-90 days or longer, focusing entirely on recovery.`,
      listItems: [
        "24/7 access to clinical staff and support",
        "Structured daily schedule with therapy sessions",
        "Removal from triggers and negative environments",
        "Peer support from other residents",
      ],
    },
    {
      title: `Who Should Consider Inpatient Rehab?`,
      content: `Inpatient treatment is often recommended for individuals with moderate to severe substance use disorders, those who have relapsed after outpatient treatment, or anyone needing a structured recovery environment.`,
      listItems: [
        "Severe addiction requiring intensive support",
        "Co-occurring mental health conditions",
        "History of relapse after outpatient treatment",
        "Lack of stable, sober living environment",
        "Need for medical detox before treatment",
      ],
    },
    {
      title: `What's Included in Inpatient Programs`,
      content: `Quality inpatient facilities in ${locationText} offer comprehensive treatment programs combining evidence-based therapies with holistic approaches.`,
      listItems: [
        "Individual and group therapy sessions",
        "Cognitive-behavioral therapy (CBT)",
        "Dialectical behavior therapy (DBT)",
        "Family therapy and education",
        "Life skills training and relapse prevention",
        "Aftercare planning and alumni support",
      ],
    },
  ];
}

export function generateOutpatientContent(location?: { state?: string; city?: string }): ContentSection[] {
  const locationText = location?.city 
    ? `${location.city}, ${location.state}` 
    : location?.state || "your area";

  return [
    {
      title: `What is Outpatient Treatment?`,
      content: `Outpatient programs in ${locationText} allow individuals to receive addiction treatment while maintaining work, school, and family responsibilities. Treatment typically involves scheduled sessions several times per week.`,
      listItems: [
        "Flexible scheduling around work and family",
        "Various intensity levels available",
        "Lower cost than residential treatment",
        "Ability to apply skills in real-world settings",
      ],
    },
    {
      title: `Levels of Outpatient Care`,
      content: `Outpatient treatment exists on a continuum of intensity. Programs in ${locationText} offer multiple options to match individual needs.`,
      listItems: [
        "Partial Hospitalization (PHP): 5-7 days/week, 6+ hours/day",
        "Intensive Outpatient (IOP): 3-5 days/week, 3-4 hours/day",
        "Standard Outpatient: 1-2 sessions per week",
        "Continuing Care: Ongoing maintenance support",
      ],
    },
    {
      title: `Is Outpatient Right for You?`,
      content: `Outpatient treatment works best for those with milder addictions, strong support systems at home, or as a step-down from inpatient care.`,
      listItems: [
        "Mild to moderate substance use disorder",
        "Stable, supportive home environment",
        "Work or family obligations that prevent residential care",
        "Completed inpatient treatment (step-down care)",
        "Strong personal motivation for recovery",
      ],
    },
  ];
}

export function generateDualDiagnosisContent(location?: { state?: string; city?: string }): ContentSection[] {
  const locationText = location?.city 
    ? `${location.city}, ${location.state}` 
    : location?.state || "your area";

  return [
    {
      title: `What is Dual Diagnosis Treatment?`,
      content: `Dual diagnosis treatment in ${locationText} addresses both substance use disorders and co-occurring mental health conditions simultaneously. This integrated approach is essential for lasting recovery.`,
      listItems: [
        "Treats addiction and mental health together",
        "Addresses root causes of substance abuse",
        "Higher success rates than treating conditions separately",
        "Integrated care team of addiction and psychiatric specialists",
      ],
    },
    {
      title: `Common Co-Occurring Disorders`,
      content: `Many individuals struggling with addiction also have underlying mental health conditions. Treatment centers in ${locationText} are equipped to address these complex cases.`,
      listItems: [
        "Depression and substance abuse",
        "Anxiety disorders and addiction",
        "PTSD and substance use",
        "Bipolar disorder and addiction",
        "ADHD and substance abuse",
        "Eating disorders and addiction",
      ],
    },
    {
      title: `The Dual Diagnosis Treatment Approach`,
      content: `Effective dual diagnosis programs use evidence-based therapies to address both conditions, providing a foundation for sustainable recovery.`,
      listItems: [
        "Comprehensive psychiatric evaluation",
        "Medication management when appropriate",
        "Trauma-informed care approaches",
        "Cognitive-behavioral therapy (CBT)",
        "Dialectical behavior therapy (DBT)",
        "Holistic therapies for whole-person healing",
      ],
    },
  ];
}

// Component to render content sections
interface SEOContentSectionProps {
  sections: ContentSection[];
  className?: string;
}

export function SEOContentSection({ sections, className = "" }: SEOContentSectionProps) {
  return (
    <div className={`space-y-8 ${className}`}>
      {sections.map((section, index) => (
        <article key={index} className="prose prose-slate dark:prose-invert max-w-none">
          <h2 className="text-xl font-semibold text-foreground mb-3">
            {section.title}
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            {section.content}
          </p>
          {section.listItems && (
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              {section.listItems.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          )}
        </article>
      ))}
    </div>
  );
}
