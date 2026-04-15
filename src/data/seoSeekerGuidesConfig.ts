// ============================================================
// Client Intent / "How to Help" Guide Configurations
// Priority 7: 5 new pages targeting family member search intent
// ============================================================

export interface SeekerGuideConfig {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  heroSubtitle: string;
  introContent: string;
  sections: { heading: string; content: string }[];
  actionSteps: string[];
  resources: { label: string; href: string }[];
  faqs: { question: string; answer: string }[];
}

export const seekerGuidePages: SeekerGuideConfig[] = [
  {
    slug: "how-to-stage-an-intervention",
    title: "How to Stage an Intervention",
    metaTitle: "How to Stage an Intervention — Step-by-Step Guide",
    metaDescription: "Learn how to stage an effective intervention for a loved one struggling with addiction. Step-by-step guide, professional tips, and what to expect.",
    heroSubtitle: "A compassionate, step-by-step guide to planning and conducting an effective addiction intervention for your loved one.",
    introContent: "An intervention is a carefully planned process in which family, friends, and sometimes professionals confront someone about their addiction and encourage them to seek treatment. When done correctly, interventions are powerful tools that can break through denial and motivate change. Studies show professional interventions result in the loved one entering treatment over 90% of the time. This guide walks you through planning, conducting, and following up on an intervention with compassion and effectiveness.",
    sections: [
      { heading: "Understanding When an Intervention Is Needed", content: "An intervention may be appropriate when your loved one refuses to acknowledge their addiction, repeated conversations about substance use have failed, their behavior is causing harm to themselves or others, their health, job, or relationships are deteriorating, or they've resisted previous suggestions to seek help. Interventions are not about ambushing someone — they're about expressing love and concern in a structured way that makes it harder to dismiss." },
      { heading: "Choosing an Intervention Approach", content: "Several intervention models exist: The Johnson Model — the traditional surprise intervention with prepared statements and consequences. ARISE (A Relational Intervention Sequence for Engagement) — a gradual, invitational approach without surprise. CRAFT (Community Reinforcement and Family Training) — teaches family members strategies to encourage treatment-seeking behavior. Family Systemic Intervention — involves the entire family system in change. A professional interventionist can recommend the best model for your specific situation." },
      { heading: "Planning the Intervention", content: "Successful interventions require careful planning: (1) Consult a professional interventionist for guidance. (2) Form your intervention team — people the loved one respects and cares about. (3) Research treatment options and have a facility ready for immediate admission. (4) Each team member writes a personal impact letter describing how the addiction has affected them. (5) Establish consequences if treatment is refused (these must be enforceable). (6) Rehearse with the team to ensure a calm, unified approach. (7) Choose a private, comfortable location and time when the person is sober." },
      { heading: "During & After the Intervention", content: "During the intervention, stay calm, compassionate, and unified. Each person reads their impact statement and expresses concern without anger or blame. Present the treatment option and request an immediate commitment. Be prepared for resistance, anger, or emotional responses. If the person agrees, facilitate immediate transport to treatment — delays allow resolve to weaken. If they refuse, follow through on stated consequences. Even 'failed' interventions plant seeds of awareness. Regardless of outcome, family members should continue their own support (Al-Anon, family therapy) to maintain healthy boundaries." },
    ],
    actionSteps: [
      "Consult with a professional interventionist",
      "Assemble a team of concerned loved ones",
      "Research and pre-arrange treatment facility admission",
      "Each participant writes a personal impact letter",
      "Establish clear, enforceable consequences",
      "Rehearse the intervention with your team",
      "Conduct the intervention in a calm, private setting",
      "Be prepared for immediate transport to treatment",
    ],
    resources: [
      { label: "Find Treatment Centers", href: "/rehab-centers" },
      { label: "Insurance Coverage Guide", href: "/does-insurance-cover-rehab" },
      { label: "Concierge Placement Service", href: "/concierge" },
      { label: "Inpatient vs Outpatient", href: "/inpatient-vs-outpatient-rehab" },
    ],
    faqs: [
      { question: "Should I hire a professional interventionist?", answer: "Professional interventionists significantly increase the likelihood of success (90%+ vs. 50-60% for family-led interventions). They provide expertise in managing emotional dynamics, de-escalating conflicts, and facilitating productive conversations. Costs range from $1,500-$10,000 depending on complexity and whether they accompany the person to treatment." },
      { question: "What if they refuse to go to treatment?", answer: "Follow through on the consequences you established. Even refused interventions often lead to treatment-seeking within days to weeks as the person processes what was shared. Continue attending your own support (Al-Anon) and maintaining boundaries. The door to treatment should always remain open." },
      { question: "What if the intervention makes them angry?", answer: "Anger is a common initial reaction and is usually temporary. Anger often masks shame, fear, and recognition of truth. Stay calm, don't engage in arguments, and reaffirm love while maintaining your message. Professional interventionists are trained to manage these emotional responses." },
      { question: "How quickly should treatment start after the intervention?", answer: "Ideally, immediately. Have bags packed, insurance verified, and a treatment facility ready for same-day admission. Any delay between agreement and admission allows ambivalence, denial, or fear to override the motivation created during the intervention." },
    ],
  },
  {
    slug: "signs-loved-one-needs-rehab",
    title: "Signs Your Loved One Needs Rehab",
    metaTitle: "Signs Your Loved One Needs Rehab — When to Seek Help",
    metaDescription: "Recognize the warning signs that your loved one needs professional addiction treatment. Behavioral, physical, and emotional indicators. Know when to act.",
    heroSubtitle: "Recognize the critical warning signs that indicate your loved one may need professional addiction treatment — and learn how to take action.",
    introContent: "Recognizing when a loved one's substance use has crossed from recreational or manageable to a point requiring professional treatment can be challenging. Denial, secrecy, and gradual progression make it difficult to identify the tipping point. This guide outlines the behavioral, physical, emotional, and social warning signs that indicate professional rehab may be necessary, and provides guidance on how to approach the conversation and take meaningful action.",
    sections: [
      { heading: "Behavioral Warning Signs", content: "Behavioral changes are often the most noticeable indicators: increased secrecy and lying, unexplained absences or disappearances, neglecting responsibilities (work, school, parenting), financial problems or unexplained expenses, legal issues (DUI, possession charges), changing friend groups or social circles, loss of interest in previously enjoyed activities, risky behavior (driving under the influence, unsafe situations), and repeated promises to cut down that are never kept. These patterns escalate over time and indicate that substance use has moved beyond the individual's control." },
      { heading: "Physical Warning Signs", content: "Physical signs vary by substance but may include: dramatic weight changes, bloodshot or glazed eyes, poor hygiene and grooming, unusual odors on breath or clothing, unexplained injuries or bruises, sleep pattern changes (insomnia or excessive sleeping), changes in appetite, slurred speech or impaired coordination, tremors or shaking, and visible track marks or nasal damage. Chronic health problems, frequent illness, or emergency room visits can also indicate substance abuse requiring professional intervention." },
      { heading: "Emotional & Psychological Signs", content: "Emotional indicators include: mood swings and unpredictability, increased irritability or aggressiveness, depression, anxiety, or paranoia, emotional withdrawal from family and friends, defensiveness when substance use is mentioned, inability to cope with stress without substances, decreased motivation and apathy, and memory lapses or confusion. These psychological changes often reflect the neurological impact of sustained substance use on brain chemistry and function." },
      { heading: "When Casual Use Becomes Addiction", content: "The transition from use to addiction is characterized by: tolerance (needing more to achieve the same effect), withdrawal symptoms when not using, failed attempts to stop or cut down, continued use despite clear negative consequences, spending increasing time obtaining, using, and recovering from substances, and loss of control over amount or frequency. If your loved one exhibits these patterns, professional treatment offers the best path to recovery. Waiting for a 'rock bottom' moment is dangerous — intervention at any stage saves lives." },
    ],
    actionSteps: [
      "Document specific behaviors and incidents you've observed",
      "Educate yourself about addiction as a medical condition",
      "Talk to your loved one from a place of concern, not judgment",
      "Research treatment options before having the conversation",
      "Set clear boundaries for your own wellbeing",
      "Consider consulting a professional interventionist",
      "Verify insurance coverage for treatment",
      "Be prepared to act quickly if they agree to get help",
    ],
    resources: [
      { label: "How to Stage an Intervention", href: "/how-to-stage-an-intervention" },
      { label: "Find Treatment Centers", href: "/rehab-centers" },
      { label: "Insurance Coverage Guide", href: "/does-insurance-cover-rehab" },
      { label: "Concierge Placement Service", href: "/concierge" },
    ],
    faqs: [
      { question: "How do I know if it's addiction or just heavy use?", answer: "The key distinction is loss of control. If your loved one can't consistently moderate their use, continues despite negative consequences, experiences withdrawal when stopping, and prioritizes substance use over responsibilities and relationships, these are clinical indicators of addiction (substance use disorder) requiring professional assessment." },
      { question: "Should I wait for them to ask for help?", answer: "No. Waiting for someone in active addiction to voluntarily seek help is risky. Addiction impairs the very brain functions needed to make that decision. Expressing concern, offering support, and presenting treatment options — even when initially rejected — plants seeds that often lead to treatment-seeking behavior." },
      { question: "What if they say they can handle it themselves?", answer: "Attempting to recover without professional support has significantly lower success rates. Suggest a professional assessment — if they truly don't have a problem, an evaluation will confirm that. If they do, they'll receive appropriate recommendations. Frame the assessment as an act of ruling out concern, not admitting failure." },
      { question: "Am I enabling their addiction?", answer: "Enabling means protecting someone from the consequences of their substance use — paying their bills, making excuses, covering for them, or providing financial support that subsidizes substance use. Loving someone with addiction while maintaining firm boundaries is different from enabling. Al-Anon and family therapy can help distinguish supportive behaviors from enabling ones." },
    ],
  },
  {
    slug: "how-to-help-alcoholic-family-member",
    title: "How to Help an Alcoholic Family Member",
    metaTitle: "How to Help an Alcoholic Family Member — Family Guide",
    metaDescription: "Learn how to help a family member with alcoholism. Practical guidance on communication, boundaries, intervention, and finding treatment. Support your family.",
    heroSubtitle: "Practical guidance for families navigating a loved one's alcoholism — from difficult conversations to finding effective treatment.",
    introContent: "Living with an alcoholic family member is emotionally devastating — the unpredictability, broken promises, financial strain, and erosion of trust take a profound toll on everyone in the family. Yet family members often feel helpless, unsure how to help without enabling, and exhausted from cycles of hope and disappointment. This guide provides practical, evidence-based strategies for supporting a family member with alcoholism while protecting your own mental health. You can't force recovery, but you can create conditions that encourage it while maintaining your own wellbeing.",
    sections: [
      { heading: "Understanding Alcoholism as a Disease", content: "The first step in helping is understanding that alcoholism (alcohol use disorder) is a chronic brain disease, not a choice or moral failing. Alcohol changes brain chemistry over time, impairing the neural circuits responsible for self-control, judgment, and decision-making. This means your loved one isn't choosing alcohol over your family — their brain's reward and motivation systems have been hijacked by the substance. Understanding this doesn't excuse harmful behavior, but it shifts the framework from blame to compassion and informs more effective approaches to encouraging treatment." },
      { heading: "Communicating Effectively", content: "How you communicate matters significantly: Choose moments when they're sober and you're calm. Use 'I' statements ('I'm worried about your health') rather than 'you' accusations. Be specific about behaviors and their impact rather than labeling ('When you missed dinner last night, the kids were hurt'). Express love and concern, not anger or ultimatums. Avoid arguing when they're intoxicated. Don't take on a therapeutic role — you're family, not their counselor. Suggest professional help consistently but without nagging. Be honest about the impact on the family." },
      { heading: "Setting Healthy Boundaries", content: "Boundaries protect your family while removing the safety net that allows alcoholism to continue: Don't cover for their drinking (calling in sick to work, making excuses). Don't clean up after alcohol-related messes. Refuse to engage in arguments while they're intoxicated. Protect finances from alcohol spending. Remove yourself and children from unsafe situations. Stop behaviors that make it easier for them to keep drinking. State consequences clearly and follow through consistently. Boundaries are not punishments — they're protection for you and natural consequences for them." },
      { heading: "Getting Professional Help", content: "Professional resources for both the alcoholic family member and the family include: Encouraging assessment by an addiction specialist. Exploring intervention with a professional interventionist. Researching treatment programs that match their needs and insurance. Al-Anon and Alateen for family members (free, worldwide meetings). Family therapy with an addiction-specialized therapist. CRAFT (Community Reinforcement and Family Training) — an evidence-based program teaching families strategies that double the likelihood of loved ones entering treatment. Individual therapy for your own stress, grief, and coping." },
    ],
    actionSteps: [
      "Educate yourself about alcoholism as a medical condition",
      "Attend an Al-Anon meeting for family support",
      "Establish clear, enforceable boundaries",
      "Communicate concerns when they are sober",
      "Research treatment options and verify insurance",
      "Consider CRAFT training for evidence-based family strategies",
      "Protect your own mental health through therapy or support groups",
      "Be ready with a treatment plan if they express willingness",
    ],
    resources: [
      { label: "Alcohol Rehab Centers", href: "/alcohol-rehab-centers" },
      { label: "How to Stage an Intervention", href: "/how-to-stage-an-intervention" },
      { label: "Alcohol Addiction Treatment", href: "/alcohol-addiction-treatment" },
      { label: "Does Insurance Cover Rehab?", href: "/does-insurance-cover-rehab" },
    ],
    faqs: [
      { question: "Why can't they just stop drinking?", answer: "Chronic alcohol use physically changes brain structure and chemistry, particularly in areas governing impulse control, reward processing, and stress response. The brain becomes dependent on alcohol to function normally. Stopping suddenly can even be medically dangerous (seizures). This is why professional treatment — not willpower alone — is the most effective path to recovery." },
      { question: "Am I responsible for their drinking?", answer: "No. You did not cause, cannot control, and cannot cure their alcoholism. These are the core principles of Al-Anon. While family dynamics may play a role in recovery, the responsibility for the addiction and the decision to seek help ultimately rest with the individual. Focus on what you can control — your own boundaries, wellbeing, and support." },
      { question: "Should I give them an ultimatum?", answer: "Ultimatums can be effective only if you're genuinely prepared to follow through. Empty threats reinforce the pattern of empty consequences. If you establish boundaries or consequences, you must enforce them consistently. A professional interventionist can help frame consequences constructively and ensure follow-through." },
      { question: "How do I protect my children from an alcoholic parent?", answer: "Prioritize safety by never leaving children in an intoxicated parent's care, having an exit plan for volatile situations, providing age-appropriate honest communication about the parent's illness, enrolling children in Alateen when age-appropriate, seeking family therapy, and maintaining consistent routines. Your children's safety and emotional wellbeing come first." },
    ],
  },
  {
    slug: "what-to-expect-loved-one-in-rehab",
    title: "What to Expect When a Loved One Goes to Rehab",
    metaTitle: "What to Expect When a Loved One Goes to Rehab",
    metaDescription: "Learn what happens when your loved one enters rehab — the treatment process, your role, communication, and how to prepare for their return. Family guide.",
    heroSubtitle: "Understanding the rehab process from a family perspective — what your loved one experiences, your role, and how to prepare for their return.",
    introContent: "When your loved one enters rehab, you may feel a mix of relief, anxiety, guilt, and uncertainty. Understanding what the treatment process involves — from admission to aftercare — helps you manage expectations, participate effectively in their recovery, and prepare for the changes ahead. This guide walks families through the entire rehab experience: what your loved one will experience, what your role will be, how communication works, and how to create a supportive environment for their return home.",
    sections: [
      { heading: "The First Week: Admission & Detox", content: "Upon admission, your loved one undergoes comprehensive medical and psychological assessment. Personal belongings are checked (most programs restrict electronics initially), and a treatment plan is developed. If detox is needed, the first 3-10 days focus on medically supervised withdrawal management. This is often the most physically challenging period. Your loved one may have limited contact during this phase — this restriction supports their adjustment and isn't personal. Expect initial check-in calls, but extended communication typically begins after stabilization." },
      { heading: "Active Treatment Phase", content: "After detox, your loved one enters active rehabilitation — the therapeutic core of treatment. Daily schedules typically include individual therapy (CBT, DBT, EMDR), group therapy sessions, educational workshops, recreational and wellness activities, and peer community building. This phase typically lasts 3-12 weeks depending on the program. Communication gradually opens — phone calls, family therapy sessions, and visitation days become available. Your loved one may seem different during this phase as they process emotions and confront underlying issues." },
      { heading: "Your Role During Treatment", content: "Family participation significantly improves treatment outcomes. Your role includes: Attending family therapy sessions (in-person or virtual). Participating in family education programs about addiction. Working on your own recovery through Al-Anon or therapy. Following the facility's communication guidelines. Preparing the home environment for their return (removing substances, establishing new routines). Being honest in family sessions even when it's uncomfortable. Understanding that recovery is a process — don't expect a 'fixed' person on discharge day." },
      { heading: "Preparing for Homecoming", content: "Discharge planning begins early in treatment. Before your loved one returns: Remove all alcohol and addictive substances from the home. Discuss new household agreements and boundaries. Understand their aftercare plan (ongoing therapy, support groups, sober activities). Prepare for changed dynamics — they'll have new boundaries and needs. Don't plan celebrations involving alcohol. Understand that the first 90 days post-discharge are the highest-risk period for relapse. Have a relapse response plan in place. Continue your own support group attendance and therapy." },
    ],
    actionSteps: [
      "Attend family orientation at the treatment facility",
      "Participate in all offered family therapy sessions",
      "Join Al-Anon or family support group meetings",
      "Remove substances from the home before their return",
      "Learn about their aftercare plan and support needs",
      "Prepare for changed family dynamics and communication",
      "Develop a family relapse response plan",
      "Continue your own therapy and support group participation",
    ],
    resources: [
      { label: "Find Treatment Centers", href: "/rehab-centers" },
      { label: "Inpatient Rehab Guide", href: "/inpatient-rehab" },
      { label: "How Much Does Rehab Cost?", href: "/rehab-cost" },
      { label: "Concierge Placement Service", href: "/concierge" },
    ],
    faqs: [
      { question: "How often can I contact my loved one in rehab?", answer: "Communication policies vary by facility and treatment phase. Most programs allow weekly phone calls after the initial stabilization period (first 5-7 days). Family therapy sessions are typically scheduled 1-2 times per week. Visitation may be available on designated days. These boundaries support treatment engagement — they're not punishment." },
      { question: "What if they want to leave treatment early?", answer: "Wanting to leave is common, especially in early treatment when discomfort is highest. Most programs work with patients to address their concerns. As family, you can encourage them to stay while respecting their autonomy. Remind them of why they entered treatment. Follow the facility's guidance on how to respond to these requests." },
      { question: "How do I handle my own emotions during this time?", answer: "You may experience relief, grief, guilt, anger, and anxiety — often simultaneously. These feelings are normal and valid. Attend Al-Anon meetings, seek individual therapy, lean on trusted friends and family, and remember that taking care of yourself isn't selfish — it's essential for supporting your loved one's recovery." },
      { question: "What if they relapse after coming home?", answer: "Relapse is a possibility in any chronic condition and doesn't mean treatment failed. Have a response plan: stay calm, don't enable continued use, encourage immediate return to treatment or intensification of aftercare, and contact their treatment team or aftercare provider. Relapse is a signal to adjust the treatment plan, not to abandon hope." },
    ],
  },
  {
    slug: "how-to-find-rehab-for-family-member",
    title: "How to Find Rehab for a Family Member",
    metaTitle: "How to Find Rehab for a Family Member — Step-by-Step",
    metaDescription: "Step-by-step guide to finding the right rehab for a family member. Insurance verification, program types, questions to ask, and placement help.",
    heroSubtitle: "A practical, step-by-step guide to finding and securing the right treatment program for your loved one — from research to admission.",
    introContent: "Finding the right rehab for a family member can feel overwhelming — hundreds of facilities, different program types, insurance complexities, and the pressure of making the right choice during a crisis. This guide simplifies the process into manageable steps, helping you evaluate programs, verify insurance, ask the right questions, and navigate admission efficiently. Whether you're planning ahead or responding to an emergency, these steps will help you find quality, accredited treatment matched to your loved one's specific needs.",
    sections: [
      { heading: "Step 1: Understand Their Needs", content: "Before searching for programs, assess the situation: What substance(s) are they using? How severe is the addiction (duration, frequency, consequences)? Do they have co-occurring mental health conditions? What is their insurance coverage? Do they have medical conditions requiring specialized care? What level of care do they likely need (detox, inpatient, outpatient)? Have they been in treatment before — what worked and what didn't? Are there demographic needs (age-specific, gender-specific, LGBTQ+ affirming)? This information helps narrow your search to appropriate programs." },
      { heading: "Step 2: Research & Compare Programs", content: "When evaluating treatment facilities, prioritize: Accreditation (CARF, Joint Commission) — ensures quality standards. Licensed clinical staff (licensed counselors, psychiatrists, physicians). Evidence-based treatment approaches (CBT, DBT, MAT when appropriate). Appropriate level of care for their needs. Good patient reviews and outcomes data. Aftercare planning as part of the program. Insurance acceptance or financial options. Location preferences (close to home vs. geographic distance). Staff-to-patient ratios. Family involvement in treatment." },
      { heading: "Step 3: Verify Insurance & Financial Options", content: "Contact your insurance provider to verify: In-network vs. out-of-network facilities. Pre-authorization requirements. Covered levels of care (detox, inpatient, outpatient). Number of covered days. Copays, deductibles, and out-of-pocket maximums. Medication coverage (MAT, psychiatric medications). Many treatment facilities offer free insurance verification — call admissions and provide insurance details for a benefits check. For uninsured individuals, explore Medicaid, sliding-scale programs, state-funded treatment, and nonprofit options." },
      { heading: "Step 4: Ask the Right Questions & Admission", content: "When contacting facilities, ask: What is your accreditation? What evidence-based therapies do you use? What is your staff-to-patient ratio? How do you handle co-occurring mental health conditions? What does a typical day look like? What is your discharge planning process? What aftercare support do you provide? Can you accommodate their specific needs? What is the admission timeline? Once you've chosen a program, be prepared to act quickly — have insurance information, medical history, and a bag packed. Many facilities offer same-day or next-day admission for urgent cases." },
    ],
    actionSteps: [
      "Assess your loved one's substance use, health, and needs",
      "Research accredited programs matching their needs",
      "Call insurance to verify behavioral health benefits",
      "Contact 3-5 facilities and ask key evaluation questions",
      "Request insurance verification from top programs",
      "Compare programs on clinical quality and fit",
      "Prepare for admission (documents, packing, logistics)",
      "Consider concierge placement for expert guidance",
    ],
    resources: [
      { label: "Search Treatment Centers", href: "/rehab-centers" },
      { label: "Insurance Coverage Guide", href: "/does-insurance-cover-rehab" },
      { label: "How Much Does Rehab Cost?", href: "/rehab-cost" },
      { label: "Concierge Placement Service", href: "/concierge" },
      { label: "Inpatient vs Outpatient", href: "/inpatient-vs-outpatient-rehab" },
    ],
    faqs: [
      { question: "How long does it take to get into rehab?", answer: "Many facilities offer same-day to 48-hour admission. The timeline depends on insurance verification (often completed in hours), bed availability, and medical needs. For urgent cases (fentanyl use, suicidal ideation), emergency admission is typically available. Our concierge service can expedite placement within hours." },
      { question: "Can I choose rehab for my adult family member?", answer: "You can research, recommend, and facilitate admission, but an adult must consent to voluntary treatment (except in states with involuntary commitment laws for substance abuse — known as Casey's Law or Marchman Act). You can absolutely do the legwork of finding the right program, verifying insurance, and having everything ready so that when they agree, admission is immediate." },
      { question: "Is it better to go to rehab near home or far away?", answer: "Both approaches have merit. Near home: easier family involvement, familiar aftercare resources, lower travel costs. Far away: removes them from triggers and drug connections, provides fresh environment, and makes it harder to leave treatment impulsively. The best choice depends on their specific situation, support system, and treatment history." },
      { question: "Should I use a placement service?", answer: "Placement services (like our concierge) have deep knowledge of programs, relationships with admissions teams, and can match specific needs with appropriate facilities quickly. They're particularly valuable in crisis situations, for complex cases (dual diagnosis, specialized needs), or when you're overwhelmed by options. Quality placement services are free to families or included in treatment costs." },
    ],
  },
];
