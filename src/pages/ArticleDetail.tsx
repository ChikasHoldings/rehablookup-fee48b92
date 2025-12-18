import { useParams, Link, Navigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Clock,
  ArrowLeft,
  ArrowRight,
  Heart,
  Share2,
  Calendar,
  User,
} from "lucide-react";

interface Article {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  categoryLabel: string;
  readTime: string;
  image: string;
  author: string;
  date: string;
  content: string[];
}

const articles: Article[] = [
  {
    id: "types-of-addiction-treatment",
    title: "Understanding the Different Types of Addiction Treatment",
    excerpt: "From detox to outpatient care, learn about the various addiction treatment options available and how to determine which approach might be right for you or your loved one.",
    category: "treatment",
    categoryLabel: "Treatment Guide",
    readTime: "8 min read",
    image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1200&h=600&fit=crop",
    author: "Dr. Sarah Mitchell",
    date: "December 15, 2024",
    content: [
      "Understanding the landscape of addiction treatment options is crucial for anyone seeking help for themselves or a loved one. With various levels of care available, finding the right fit can significantly impact recovery success.",
      "## Medical Detoxification",
      "Medical detox is often the first step in addiction treatment. It involves supervised withdrawal from substances in a safe, medically-monitored environment. During detox, healthcare professionals manage withdrawal symptoms, which can range from uncomfortable to life-threatening depending on the substance.",
      "Detox typically lasts 3-10 days, depending on the substance and severity of dependence. While detox addresses physical dependence, it is not a complete treatment for addiction—it prepares individuals for the therapeutic work that follows.",
      "## Inpatient or Residential Treatment",
      "Inpatient treatment provides 24-hour care in a structured environment. Patients live at the facility, typically for 30-90 days, and participate in intensive therapy, group sessions, and educational programs. This level of care removes individuals from triggering environments and provides constant support.",
      "Residential treatment is particularly effective for those with severe addictions, co-occurring mental health disorders, or unstable living situations. The immersive nature allows individuals to focus entirely on recovery without daily life distractions.",
      "## Partial Hospitalization Programs (PHP)",
      "PHPs offer intensive treatment during the day while allowing patients to return home at night. Typically involving 20-30 hours of programming per week, these programs bridge the gap between inpatient and outpatient care.",
      "This option works well for those who need intensive support but have stable, supportive home environments. It allows individuals to practice applying recovery skills in real-world settings while maintaining a high level of professional support.",
      "## Intensive Outpatient Programs (IOP)",
      "IOPs provide structured treatment for 9-20 hours per week, usually in the evenings or on weekends. This allows individuals to maintain work, school, or family responsibilities while receiving comprehensive care.",
      "IOPs typically include group therapy, individual counseling, educational sessions, and family involvement. They are often used as a step-down from residential treatment or as primary treatment for those with milder addictions and strong support systems.",
      "## Standard Outpatient Treatment",
      "Outpatient treatment involves attending therapy sessions—typically one to three times per week—while living at home. This is the least restrictive level of care and works best for those with mild to moderate addiction and strong motivation for recovery.",
      "Outpatient treatment may include individual therapy, group counseling, medication management, and connections to community support groups.",
      "## Medication-Assisted Treatment (MAT)",
      "MAT combines medications with counseling and behavioral therapies to treat substance use disorders. FDA-approved medications are available for alcohol, opioid, and nicotine addiction.",
      "For opioid addiction, medications like buprenorphine (Suboxone), methadone, and naltrexone (Vivitrol) can reduce cravings and prevent relapse. For alcohol addiction, medications like naltrexone, acamprosate, and disulfiram may be prescribed.",
      "MAT is not substituting one addiction for another—these medications normalize brain chemistry, block the euphoric effects of substances, and relieve cravings, allowing individuals to focus on recovery.",
      "## Holistic and Alternative Approaches",
      "Many treatment programs incorporate holistic therapies alongside evidence-based treatments. These may include yoga, meditation, acupuncture, art therapy, equine therapy, or adventure-based programming.",
      "While these approaches should complement rather than replace proven treatments, they can enhance overall well-being, provide healthy coping mechanisms, and address the whole person—mind, body, and spirit.",
      "## Choosing the Right Treatment",
      "The best treatment approach depends on individual factors including the severity and duration of addiction, substances used, co-occurring mental health conditions, previous treatment attempts, support system strength, and practical considerations like insurance coverage and family responsibilities.",
      "A professional assessment can help determine the appropriate level of care. Remember that treatment can be adjusted as needs change—many people move through different levels of care as they progress in recovery.",
      "## Conclusion",
      "Addiction treatment is not one-size-fits-all. Understanding the various options empowers individuals to make informed decisions about their care. The most important step is reaching out for help, regardless of which treatment modality you begin with. Recovery is possible at any level of care when individuals are committed to the process.",
    ],
  },
  {
    id: "choosing-rehab-center",
    title: "How to Choose the Right Rehab Center for Your Needs",
    excerpt: "With thousands of treatment facilities available, finding the right one can feel overwhelming. This guide walks you through the key factors to consider when selecting a rehab center.",
    category: "getting-started",
    categoryLabel: "Getting Started",
    readTime: "7 min read",
    image: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200&h=600&fit=crop",
    author: "Jennifer Walsh, LCSW",
    date: "December 14, 2024",
    content: [
      "Choosing the right rehab center is one of the most important decisions you will make in your recovery journey. With thousands of facilities across the country offering different approaches, amenities, and specializations, finding the best fit requires careful consideration.",
      "## Determine the Appropriate Level of Care",
      "The first step is understanding what level of care you need. This depends on the severity of your addiction, any co-occurring mental health conditions, your medical history, and your support system at home. Options range from inpatient residential treatment to outpatient programs.",
      "A professional assessment from a doctor, therapist, or addiction specialist can help determine the appropriate level of care. Many treatment centers offer free assessments to help with this decision.",
      "## Verify Accreditation and Licensing",
      "Always verify that a facility is properly licensed by the state and accredited by recognized organizations like The Joint Commission (JCAHO), CARF International, or the National Association of Addiction Treatment Providers (NAATP).",
      "Accreditation indicates that a facility meets established standards for quality care. It also often affects whether insurance will cover treatment.",
      "## Evaluate Treatment Approaches",
      "Different facilities use different treatment philosophies and approaches. Some focus heavily on 12-step programming, while others use alternatives like SMART Recovery. Some emphasize individual therapy, while others prioritize group work.",
      "Consider evidence-based treatments like cognitive-behavioral therapy (CBT), dialectical behavior therapy (DBT), motivational interviewing, and trauma-informed care. Ask facilities about their specific therapeutic approaches and how they customize treatment plans.",
      "## Consider Specialized Programs",
      "If you have specific needs, look for programs that specialize in addressing them. This might include dual diagnosis treatment for co-occurring mental health conditions, gender-specific programs, LGBTQ+ affirming treatment, programs for specific age groups, or treatment tailored to particular professions.",
      "Specialized programs often provide more relevant peer support and address unique challenges that general programs might not fully understand.",
      "## Review Staff Credentials",
      "Quality treatment requires qualified staff. Look for programs with licensed therapists, certified addiction counselors, medical doctors, psychiatrists, and nurses with addiction medicine experience.",
      "Ask about staff-to-patient ratios—lower ratios typically mean more individualized attention. Also inquire about staff training and ongoing education requirements.",
      "## Understand Costs and Insurance Coverage",
      "Treatment costs vary dramatically based on facility type, location, amenities, and duration. Contact your insurance provider to understand your coverage for addiction treatment, including any pre-authorization requirements.",
      "Ask facilities directly about costs, what is included, payment plans, and any financial assistance available. Some facilities offer sliding scale fees based on ability to pay.",
      "## Evaluate Location and Environment",
      "Consider whether you want treatment close to home or in a different environment. Some people benefit from removing themselves from familiar triggers, while others do better with nearby family support.",
      "Also consider the physical environment—some facilities offer resort-like settings with extensive amenities, while others are more clinical. Choose an environment where you will feel comfortable focusing on recovery.",
      "## Ask About Family Involvement",
      "Family involvement often improves treatment outcomes. Ask whether the facility offers family therapy, educational programs for loved ones, and structured family visitation. Strong family programs help repair relationships and build a supportive home environment for after treatment.",
      "## Inquire About Aftercare Planning",
      "Recovery does not end when treatment does. Ask how the facility helps with the transition back to daily life. This should include aftercare planning, alumni programs, referrals to outpatient treatment or support groups, and follow-up support.",
      "## Trust Your Instincts",
      "After researching and visiting facilities, trust your gut feeling. You are more likely to engage fully in treatment if you feel comfortable with the environment, staff, and approach. Do not settle for a facility that does not feel right.",
      "## Conclusion",
      "Choosing the right rehab center takes time and research, but making an informed decision increases your chances of successful recovery. Remember that the best facility is one that meets your specific needs, uses evidence-based treatments, and feels like a place where you can do the hard work of healing.",
    ],
  },
  {
    id: "first-week-treatment",
    title: "What to Expect During Your First Week of Treatment",
    excerpt: "Starting addiction treatment can feel intimidating. Learn what typically happens during the first week so you can feel more prepared and confident about taking this important step.",
    category: "getting-started",
    categoryLabel: "Getting Started",
    readTime: "6 min read",
    image: "https://images.unsplash.com/photo-1559757175-5700dde675bc?w=1200&h=600&fit=crop",
    author: "Dr. Michael Chen",
    date: "December 12, 2024",
    content: [
      "The first week of addiction treatment is often the most challenging—and the most transformative. Knowing what to expect can help ease anxiety and prepare you for this important step in your recovery journey.",
      "## Arrival and Intake",
      "When you arrive at a treatment facility, you will go through an intake process. This includes paperwork, reviewing facility rules, and an initial assessment. Staff will ask detailed questions about your substance use history, medical history, mental health, and personal background.",
      "Be as honest as possible during intake—this information helps the clinical team develop an appropriate treatment plan. You will also undergo a physical exam and possibly drug testing.",
      "## Medical Evaluation and Detox",
      "If you have been actively using substances, you may need medical detoxification. During the first few days, medical staff will monitor you closely and provide medications to manage withdrawal symptoms safely.",
      "Withdrawal experiences vary depending on the substance. You might experience physical symptoms like sweating, nausea, or tremors, as well as psychological symptoms like anxiety or irritability. Staff will do everything possible to keep you comfortable during this process.",
      "## Getting Oriented",
      "You will receive a tour of the facility, meet staff members and fellow patients, and learn the daily schedule. Most treatment centers have structured days that include therapy sessions, group activities, meals, and free time.",
      "This structure might feel rigid at first, but it serves an important purpose—it replaces the chaos of addiction with healthy routines and keeps you engaged in recovery activities throughout the day.",
      "## Beginning Therapy",
      "Once you are medically stable, therapy begins. This typically includes individual counseling sessions where you start building a relationship with your primary therapist, group therapy sessions where you connect with peers, and educational sessions about addiction and recovery.",
      "The first week of therapy often focuses on stabilization and building rapport. Deeper therapeutic work comes as you settle into the program and build trust with your treatment team.",
      "## Emotional Ups and Downs",
      "Expect emotional turbulence during your first week. Without substances to numb feelings, emotions you have been avoiding may surface. You might feel scared, angry, sad, or overwhelmed. This is completely normal.",
      "Staff members are trained to support you through these difficult moments. Lean on them—that is what they are there for. Fellow patients who are further along in their treatment can also offer valuable perspective and support.",
      "## Adjusting to Community Living",
      "In residential treatment, you will share space with others in recovery. This community aspect can feel uncomfortable at first, but it becomes one of the most valuable parts of treatment. Fellow patients understand what you are going through in a way that others cannot.",
      "Give yourself time to adjust to this new living situation. You do not have to share your deepest secrets on day one—trust builds naturally over time.",
      "## Homesickness and Doubt",
      "It is common to miss home and question whether treatment was the right decision during the first week. You might feel the urge to leave. These feelings are normal and typically fade as you adjust.",
      "Try to stay present and give the program a chance. Talk to staff if you are struggling—they have seen these feelings before and can help you work through them.",
      "## Self-Care Basics",
      "Focus on basic self-care during your first week. Get as much sleep as your body needs—you may be catching up on years of poor sleep. Eat regular meals even if your appetite is off. Stay hydrated. Take things one hour at a time if needed.",
      "## Connecting with Loved Ones",
      "Facilities have different policies about communication with family during the first week. Some limit contact to allow you to focus on yourself; others encourage family involvement from the start. Follow the facility guidelines and trust that they are designed to support your recovery.",
      "## Conclusion",
      "Your first week of treatment sets the foundation for the work ahead. It will not be easy, but it is the beginning of a new chapter. Trust the process, be honest with yourself and others, and take it one day at a time. The discomfort of the first week is temporary; the benefits of recovery are lasting.",
    ],
  },
  {
    id: "insurance-coverage-guide",
    title: "Insurance Coverage for Addiction Treatment Explained",
    excerpt: "Understanding how insurance covers addiction treatment can be confusing. This comprehensive guide explains your coverage options, rights, and how to maximize your benefits.",
    category: "insurance",
    categoryLabel: "Insurance",
    readTime: "9 min read",
    image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1200&h=600&fit=crop",
    author: "Lisa Martinez, LMFT",
    date: "December 10, 2024",
    content: [
      "Navigating insurance coverage for addiction treatment can feel overwhelming, but understanding your options is crucial for accessing the care you need. This guide breaks down how insurance works for addiction treatment and how to maximize your benefits.",
      "## Your Legal Right to Coverage",
      "Thanks to the Mental Health Parity and Addiction Equity Act and the Affordable Care Act, most health insurance plans are required to cover addiction treatment. This means your plan cannot impose stricter limitations on mental health and substance use disorder benefits than on medical and surgical benefits.",
      "If you purchased insurance through the Health Insurance Marketplace or have employer-sponsored coverage, addiction treatment must be covered as an essential health benefit.",
      "## Types of Coverage",
      "Different insurance plans offer different levels of coverage. Employer-sponsored plans typically provide good coverage for addiction treatment, though specifics vary. Marketplace (ACA) plans must cover addiction treatment as an essential health benefit.",
      "Medicare covers addiction treatment for eligible individuals, including detox, inpatient treatment, and outpatient services. Medicaid coverage varies by state but generally includes substance use disorder treatment. Private insurance policies vary widely—review your specific policy carefully.",
      "## Understanding Your Benefits",
      "Before seeking treatment, contact your insurance company to understand your benefits. Key questions to ask include: What levels of care are covered (inpatient, outpatient, etc.)? What is my deductible for addiction treatment? What are my copays or coinsurance amounts? Is there a maximum number of covered days? Do I need pre-authorization for treatment? Are there in-network facilities near me?",
      "Ask for this information in writing so you have documentation to reference.",
      "## In-Network vs. Out-of-Network",
      "Most insurance plans have networks of preferred providers. Using in-network facilities typically costs significantly less than going out-of-network. However, if you need specialized treatment not available in-network, you may be able to negotiate out-of-network coverage at in-network rates.",
      "Some plans offer out-of-network benefits with higher cost-sharing. Compare total costs, not just daily rates, when evaluating in-network versus out-of-network options.",
      "## Pre-Authorization Requirements",
      "Many insurance plans require pre-authorization (prior approval) before covering addiction treatment, especially for residential care. The treatment facility typically handles this process, but understanding it helps you advocate for yourself.",
      "Pre-authorization involves the facility submitting clinical information demonstrating medical necessity. If initially denied, you have the right to appeal. Do not let an initial denial stop you from pursuing treatment.",
      "## Dealing with Denials",
      "Insurance denials for addiction treatment are unfortunately common, but you have the right to appeal. Common reasons for denial include lack of medical necessity documentation, failure to obtain pre-authorization, out-of-network services, and exhausted benefits.",
      "When appealing, request a detailed explanation of the denial, gather supporting documentation from your treatment team, submit a written appeal within the required timeframe, and consider involving a patient advocate.",
      "## Maximizing Your Benefits",
      "To make the most of your insurance coverage: Choose in-network providers when possible, understand what is covered before starting treatment, keep detailed records of all communications with your insurer, get pre-authorization when required, and appeal denials—many are overturned on appeal.",
      "Work closely with the treatment facility admissions team—they often have experience navigating insurance and can help advocate for your coverage.",
      "## If You Are Uninsured",
      "If you do not have insurance, you still have options. State-funded treatment programs provide free or low-cost care based on ability to pay. Sliding scale programs adjust fees based on income. Some facilities offer scholarships or financial assistance.",
      "SAMHSA National Helpline (1-800-662-4357) can help locate free or reduced-cost treatment options in your area.",
      "## Payment Plans and Financing",
      "Many treatment facilities offer payment plans that allow you to pay over time. Some also work with healthcare financing companies that provide loans for medical treatment. While these options may involve interest charges, they can make treatment accessible when insurance coverage is limited.",
      "## Employer Considerations",
      "The Family and Medical Leave Act (FMLA) may protect your job while you attend treatment if you work for a covered employer. Additionally, your employer cannot legally discriminate against you for seeking addiction treatment.",
      "If you have questions about workplace protections, consult with HR or an employment attorney before discussing your treatment needs with your employer.",
      "## Conclusion",
      "Insurance coverage for addiction treatment can be complex, but do not let that complexity prevent you from getting help. Most plans are required to cover treatment, and facilities often have staff dedicated to helping with insurance navigation. Focus on your recovery—there are resources to help with the financial aspects.",
    ],
  },
  {
    id: "stages-of-recovery",
    title: "Understanding the Stages of Addiction Recovery",
    excerpt: "Recovery is a journey with distinct stages. Learn what to expect and how to navigate each phase successfully from pre-contemplation to maintenance.",
    category: "recovery",
    categoryLabel: "Recovery",
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1200&h=600&fit=crop",
    author: "Dr. Sarah Mitchell",
    date: "December 10, 2024",
    content: [
      "Recovery from addiction is not a single event but a transformative journey that unfolds over time. Understanding the stages of this journey can help individuals and their loved ones navigate the path to lasting sobriety with greater awareness and preparation.",
      "## The Pre-Contemplation Stage",
      "In this initial stage, individuals may not yet recognize that they have a problem with substance use. They might minimize the impact of their behavior or believe they can stop whenever they choose. During this phase, loved ones often notice the problem before the person struggling does.",
      "Education and gentle, non-judgmental conversations can be helpful during this stage. Interventions, when conducted properly with professional guidance, may also help someone move toward recognizing their need for help.",
      "## The Contemplation Stage",
      "During contemplation, individuals begin to acknowledge that their substance use is problematic. They may weigh the pros and cons of continuing their current behavior versus making a change. This stage is characterized by ambivalence—the desire to change mixed with reluctance to give up the substance.",
      "Support during this phase involves listening without judgment, providing information about treatment options, and expressing concern while respecting autonomy. Motivational interviewing techniques can be particularly effective.",
      "## The Preparation Stage",
      "Once someone decides to take action, they enter the preparation stage. This involves researching treatment options, talking to healthcare providers, arranging logistics like time off work or childcare, and mentally preparing for the challenges ahead.",
      "This is an excellent time to help with practical matters—researching treatment centers, understanding insurance coverage, and creating a support plan. The more prepared someone is, the more likely they are to follow through.",
      "## The Action Stage",
      "The action stage is when treatment actively begins. This might include detoxification, inpatient or outpatient treatment, therapy sessions, and beginning to build new coping skills. This stage requires significant effort and commitment.",
      "During this phase, individuals learn to identify triggers, develop healthy coping mechanisms, address underlying issues that contributed to their addiction, and begin rebuilding their lives. Support from family, friends, and treatment professionals is crucial.",
      "## The Maintenance Stage",
      "After completing initial treatment, the maintenance stage begins. This ongoing phase focuses on sustaining the changes made during treatment and preventing relapse. It involves continuing therapy, attending support groups, practicing self-care, and building a fulfilling life without substances.",
      "Maintenance is not passive—it requires active engagement with recovery practices. Many people find that their commitment to recovery deepens over time as they experience the benefits of sobriety.",
      "## Navigating Setbacks",
      "Relapse can be part of the recovery journey for many people. Rather than viewing it as failure, it should be seen as an opportunity to learn and strengthen ones recovery. Understanding what led to the relapse and adjusting the recovery plan accordingly is essential.",
      "If relapse occurs, the most important step is to return to treatment or support as quickly as possible. Many treatment programs offer alumni support and can help individuals get back on track.",
      "## Conclusion",
      "Recovery is a deeply personal journey that looks different for everyone. By understanding these stages, individuals and their support systems can approach the process with realistic expectations and appropriate strategies for each phase. Remember, seeking help is a sign of strength, and lasting recovery is possible.",
    ],
  },
  {
    id: "support-loved-one",
    title: "How to Support a Loved One in Treatment",
    excerpt: "Family support is crucial for recovery. Discover effective ways to be there for someone during their treatment journey without enabling.",
    category: "family",
    categoryLabel: "Family Support",
    readTime: "4 min read",
    image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&h=600&fit=crop",
    author: "Jennifer Walsh, LCSW",
    date: "December 8, 2024",
    content: [
      "When someone you love enters treatment for addiction, you may feel a mix of relief, hope, fear, and uncertainty. Your support during this time can make a significant difference in their recovery journey, but knowing how to help effectively is not always intuitive.",
      "## Educate Yourself About Addiction",
      "Understanding addiction as a chronic brain disorder rather than a moral failing or lack of willpower is the first step. Learn about how substances affect the brain, the nature of dependence, and what recovery involves. This knowledge helps you approach your loved one with compassion rather than frustration.",
      "Many treatment centers offer family education programs. Take advantage of these opportunities to learn from professionals and connect with other families in similar situations.",
      "## Set Healthy Boundaries",
      "Supporting someone in recovery does not mean accepting harmful behavior or sacrificing your own well-being. Healthy boundaries protect both you and your loved one. Be clear about what behaviors you will and will not tolerate, and follow through consistently.",
      "For example, you might establish that you will not provide money that could be used for substances, or that verbal abuse will result in ending a conversation. Boundaries are not punishments—they are guidelines that create a healthier dynamic for everyone.",
      "## Avoid Enabling Behaviors",
      "Enabling means doing things that make it easier for someone to continue their addiction or avoid the consequences of their actions. This might include making excuses for them, covering up problems, providing financial support without accountability, or taking over their responsibilities.",
      "While these actions often come from a place of love and a desire to help, they can actually impede recovery. Learning to step back and allow natural consequences can be difficult but is often necessary.",
      "## Practice Active Listening",
      "When your loved one wants to talk, give them your full attention. Listen without immediately offering advice or judgment. Sometimes people in recovery need to process their experiences and feelings out loud, and having someone truly listen can be incredibly healing.",
      "Ask open-ended questions and reflect back what you hear to show you understand. Avoid interrupting or steering the conversation toward your own concerns.",
      "## Take Care of Yourself",
      "Supporting someone through addiction and recovery is emotionally demanding. You cannot pour from an empty cup. Prioritize your own mental health, maintain your own support network, and consider joining a group like Al-Anon or Nar-Anon designed for families of people with addiction.",
      "Therapy for yourself can also be valuable. A therapist can help you process your own feelings, develop coping strategies, and learn how to support your loved one in healthy ways.",
      "## Celebrate Progress, Not Perfection",
      "Recovery is a process with ups and downs. Celebrate the small victories—each day of sobriety, each healthy choice, each step forward. At the same time, prepare yourself for the possibility of setbacks and respond to them with support rather than shame.",
      "Your continued belief in your loved one, even during difficult times, can be a powerful source of motivation for their recovery.",
      "## Participate in Family Therapy",
      "Many treatment programs include family therapy as part of comprehensive care. These sessions provide a safe space to address relationship issues, improve communication, and heal from the impact of addiction on the family system. Participate willingly and openly.",
      "## Conclusion",
      "Supporting a loved one in treatment requires patience, education, and self-care. By setting healthy boundaries, avoiding enabling, and maintaining your own well-being, you can be a positive force in their recovery journey. Remember that you cannot control their choices, but you can control how you respond and the kind of support you offer.",
    ],
  },
  {
    id: "inpatient-vs-outpatient",
    title: "Choosing Between Inpatient and Outpatient Care",
    excerpt: "Not sure which treatment option is right? We break down the key differences to help you make an informed decision for your situation.",
    category: "treatment",
    categoryLabel: "Treatment Options",
    readTime: "6 min read",
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&h=600&fit=crop",
    author: "Dr. Michael Chen",
    date: "December 5, 2024",
    content: [
      "One of the most important decisions when seeking addiction treatment is choosing between inpatient (residential) and outpatient care. Both approaches have their merits, and the right choice depends on individual circumstances, the severity of addiction, and personal responsibilities.",
      "## Understanding Inpatient Treatment",
      "Inpatient or residential treatment involves living at a treatment facility for a designated period, typically 30 to 90 days. Patients receive round-the-clock care and supervision in a structured environment designed to support recovery.",
      "The immersive nature of inpatient treatment removes individuals from their usual environment and the triggers associated with it. This separation can be particularly valuable for those with severe addictions or unstable living situations.",
      "## Benefits of Inpatient Care",
      "Inpatient treatment offers several advantages. The 24/7 supervision ensures safety during detox and early recovery. The structured schedule keeps patients engaged in therapeutic activities throughout the day. The community aspect provides peer support from others going through similar experiences.",
      "Additionally, inpatient programs typically offer a comprehensive range of services including individual therapy, group counseling, medical care, and holistic treatments like yoga or art therapy—all in one location.",
      "## Understanding Outpatient Treatment",
      "Outpatient treatment allows individuals to live at home while attending treatment sessions at a facility. The intensity varies from standard outpatient programs (a few hours per week) to intensive outpatient programs (IOP) or partial hospitalization programs (PHP) that may require several hours per day.",
      "This approach allows people to maintain work, school, and family responsibilities while receiving treatment. It also costs less than residential care since it does not include room and board.",
      "## Benefits of Outpatient Care",
      "Outpatient treatment offers flexibility that can make treatment accessible to those who cannot take extended time away from their responsibilities. It allows individuals to immediately apply coping skills in real-world situations while still having therapeutic support.",
      "The ability to maintain normal routines can help with the transition to long-term recovery, as individuals do not face the challenge of re-entering daily life after an extended stay in a facility.",
      "## Factors to Consider",
      "Several factors should influence your decision. The severity and duration of addiction matters—those with severe dependencies often benefit from the intensive support of inpatient care. A history of relapse or previous unsuccessful outpatient treatment may indicate that a higher level of care is needed.",
      "Co-occurring mental health conditions, the stability of the home environment, support system availability, and practical considerations like work and childcare also play important roles in this decision.",
      "## The Continuum of Care",
      "Many people benefit from a stepped approach that begins with more intensive care and transitions to less intensive treatment over time. For example, someone might start with inpatient treatment, step down to a partial hospitalization program, then to intensive outpatient, and finally to standard outpatient care or aftercare.",
      "This continuum allows for appropriate levels of support at each stage of recovery while gradually building independence and real-world coping skills.",
      "## Making Your Decision",
      "Consult with addiction treatment professionals who can assess your specific situation and recommend the most appropriate level of care. Be honest about the severity of your addiction, your living situation, and your support system.",
      "Remember that choosing outpatient care does not mean choosing easier treatment—it means choosing treatment that fits your circumstances. Both paths can lead to successful recovery when matched appropriately to individual needs.",
      "## Conclusion",
      "Whether you choose inpatient or outpatient treatment, the most important thing is to seek help. Both approaches offer evidence-based treatment that can lead to lasting recovery. Work with professionals to determine which option gives you the best chance of success given your unique circumstances.",
    ],
  },
  {
    id: "dual-diagnosis",
    title: "What is Dual Diagnosis Treatment?",
    excerpt: "Many people struggling with addiction also have co-occurring mental health conditions. Learn how dual diagnosis treatment addresses both issues together.",
    category: "mental-health",
    categoryLabel: "Mental Health",
    readTime: "7 min read",
    image: "https://images.unsplash.com/photo-1573497620053-ea5300f94f21?w=1200&h=600&fit=crop",
    author: "Dr. Amanda Roberts",
    date: "December 3, 2024",
    content: [
      "Dual diagnosis, also called co-occurring disorders, refers to the presence of both a substance use disorder and a mental health condition in the same individual. This combination is more common than many people realize and requires specialized treatment that addresses both issues simultaneously.",
      "## The Connection Between Addiction and Mental Health",
      "Substance use disorders and mental health conditions frequently occur together. According to research, about half of people who experience a mental illness will also experience a substance use disorder at some point in their lives, and vice versa.",
      "The relationship between these conditions is complex. Sometimes mental health issues lead to substance use as a form of self-medication. Other times, substance use triggers or worsens mental health symptoms. Often, both conditions share common underlying factors like genetics, trauma, or brain chemistry.",
      "## Common Co-Occurring Conditions",
      "Several mental health conditions commonly co-occur with addiction. Depression and anxiety are among the most prevalent, but others include bipolar disorder, post-traumatic stress disorder (PTSD), attention-deficit/hyperactivity disorder (ADHD), and personality disorders.",
      "Each combination presents unique challenges. For example, someone with untreated anxiety might use alcohol to cope, developing dependence over time. Someone with bipolar disorder might use stimulants during depressive episodes or substances during manic phases.",
      "## Why Integrated Treatment Matters",
      "Treating only one condition while ignoring the other rarely leads to lasting recovery. If someone receives addiction treatment but their depression goes unaddressed, the underlying pain that contributed to their substance use remains. This significantly increases the risk of relapse.",
      "Integrated treatment addresses both conditions simultaneously, with providers who understand how the conditions interact and can coordinate care effectively. This approach recognizes that recovery from one condition supports recovery from the other.",
      "## Components of Dual Diagnosis Treatment",
      "Effective dual diagnosis treatment typically includes comprehensive assessment to accurately identify all conditions present, medication management when appropriate for the mental health condition, evidence-based psychotherapy like cognitive-behavioral therapy (CBT) or dialectical behavior therapy (DBT), substance abuse counseling, support groups, and holistic approaches to overall wellness.",
      "Treatment may occur in inpatient or outpatient settings depending on the severity of both conditions and individual needs.",
      "## Finding the Right Treatment Program",
      "Not all addiction treatment programs are equipped to handle dual diagnosis cases. When seeking treatment, look for programs that specifically advertise dual diagnosis or co-occurring disorder treatment, have psychiatric staff on-site, offer individualized treatment plans, and integrate mental health care throughout the program.",
      "Ask directly about how the program addresses mental health conditions and what credentials the staff hold for treating psychiatric disorders.",
      "## The Role of Medication",
      "Medication can play an important role in dual diagnosis treatment. Psychiatric medications may help stabilize mental health symptoms, making it easier to engage in addiction treatment. Some medications, like certain antidepressants, may also help reduce cravings.",
      "It is crucial that medication management is handled by providers who understand both addiction and mental health, as some psychiatric medications can be problematic in individuals with substance use histories.",
      "## Long-Term Management",
      "Both mental health conditions and addiction often require ongoing management. After completing initial treatment, continuing care might include maintenance medication, regular therapy sessions, support group participation, and lifestyle practices that support mental wellness.",
      "Building a strong support network and developing robust coping skills are essential for managing both conditions over the long term.",
      "## Conclusion",
      "Dual diagnosis is common and treatable. If you or someone you love is struggling with both addiction and mental health issues, seek treatment that addresses both conditions together. Integrated care offers the best chance for lasting recovery from both disorders.",
    ],
  },
  {
    id: "signs-of-addiction",
    title: "Recognizing the Early Signs of Addiction",
    excerpt: "Early intervention can make a significant difference. Learn to identify the warning signs of substance abuse before it becomes a crisis.",
    category: "prevention",
    categoryLabel: "Prevention",
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1493836512294-502baa1986e2?w=1200&h=600&fit=crop",
    author: "Dr. Robert Thompson",
    date: "November 28, 2024",
    content: [
      "Recognizing the early signs of addiction can be challenging, especially since many people go to great lengths to hide their substance use. However, early intervention significantly improves outcomes, making it important to know what warning signs to look for.",
      "## Behavioral Changes",
      "One of the first indicators of developing addiction is a change in behavior. This might include increased secrecy, lying about whereabouts or activities, withdrawing from family and friends, losing interest in hobbies or activities that were once important, or associating with a new group of friends.",
      "Changes in sleep patterns, appetite, and energy levels can also signal a problem. Someone might seem more fatigued, sleep at unusual times, or show dramatic changes in weight.",
      "## Physical Signs",
      "Physical symptoms vary depending on the substance but may include bloodshot eyes, dilated or constricted pupils, sudden weight changes, deterioration in physical appearance or hygiene, unusual smells on breath or clothing, and unexplained injuries or accidents.",
      "Some substances leave more obvious physical traces than others. Injection drug use may leave track marks, while heavy alcohol use might cause facial flushing or a persistent smell of alcohol.",
      "## Psychological Indicators",
      "Mental and emotional changes can also indicate a substance problem. Watch for mood swings, irritability, anxiety, paranoia, lack of motivation, personality changes, or difficulty concentrating. Someone developing an addiction might seem like a different person from who they were before.",
      "These changes may be subtle at first but typically become more pronounced as addiction progresses.",
      "## Changes in Responsibilities",
      "Addiction often interferes with meeting responsibilities. Warning signs include declining performance at work or school, missing important obligations, financial problems or unexplained need for money, neglecting household responsibilities, or abandoning commitments to family members.",
      "The person may have ready excuses for these failures or become defensive when questioned.",
      "## Relationship Issues",
      "Substance use frequently damages relationships. Early signs might include increased conflict with family members, isolation from loved ones, new secrecy about relationships, or reports from others about concerning behavior. The person might start associating primarily with others who use substances.",
      "## Tolerance and Withdrawal",
      "Two hallmark signs of developing dependence are tolerance (needing more of a substance to achieve the same effect) and withdrawal (experiencing physical or psychological symptoms when not using). These indicate that the body has adapted to the presence of the substance.",
      "Withdrawal symptoms vary by substance but might include tremors, sweating, nausea, anxiety, irritability, or insomnia.",
      "## What to Do If You Notice Signs",
      "If you notice these warning signs in yourself or someone you care about, take them seriously. Approach the person with concern rather than accusation. Express your observations and worries using non-judgmental language.",
      "Encourage professional help—talking to a doctor or addiction specialist can clarify the situation and identify appropriate next steps. If the person is resistant, consider consulting with a professional yourself about how to best approach the situation.",
      "## Conclusion",
      "Early recognition of addiction signs creates opportunities for early intervention, which can prevent more severe consequences. Trust your instincts—if something seems wrong, it probably deserves attention. Remember that addiction is a treatable condition, and seeking help is a sign of strength.",
    ],
  },
  {
    id: "aftercare-planning",
    title: "The Importance of Aftercare Planning",
    excerpt: "Treatment does not end at discharge. Discover why aftercare planning is essential for long-term recovery success and how to build a solid plan.",
    category: "recovery",
    categoryLabel: "Recovery",
    readTime: "6 min read",
    image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1200&h=600&fit=crop",
    author: "Lisa Martinez, LMFT",
    date: "November 25, 2024",
    content: [
      "Completing a treatment program is a significant accomplishment, but it marks the beginning of a new phase rather than the end of the recovery journey. Aftercare planning is essential for maintaining sobriety and building a fulfilling life in recovery.",
      "## Why Aftercare Matters",
      "Research consistently shows that people who engage in aftercare have better long-term outcomes than those who do not. The transition from structured treatment back to everyday life presents challenges—old triggers reappear, the support of the treatment environment is gone, and real-life stressors resume.",
      "A solid aftercare plan provides ongoing support during this vulnerable period and helps individuals apply the skills they learned in treatment to real-world situations.",
      "## Components of an Effective Aftercare Plan",
      "A comprehensive aftercare plan typically includes several elements. Continuing therapy or counseling helps address ongoing issues and provides professional support. Support group participation, whether 12-step programs like AA or NA or alternatives like SMART Recovery, offers peer connection and accountability.",
      "The plan should also address practical matters like housing, employment, healthcare, and rebuilding relationships. Each of these areas can impact recovery and deserves thoughtful consideration.",
      "## Building Your Support Network",
      "Recovery thrives in community. Your aftercare plan should identify supportive people in your life—family members, friends, sponsors, therapists, and peers in recovery. Know who you can call when you are struggling and who will support your sobriety.",
      "Consider limiting contact with people who might trigger relapse or do not support your recovery. This might be difficult but is often necessary.",
      "## Identifying and Managing Triggers",
      "During treatment, you likely identified situations, emotions, places, or people that trigger cravings or thoughts of using. Your aftercare plan should include strategies for managing these triggers in daily life.",
      "Some triggers can be avoided entirely, while others require coping strategies. Know your high-risk situations and have a plan for each one.",
      "## Healthy Lifestyle Practices",
      "Physical health supports mental health and recovery. Your aftercare plan should include attention to sleep, nutrition, exercise, and stress management. Regular routines can provide structure that supports sobriety.",
      "Many people in recovery find that practices like meditation, yoga, or spending time in nature enhance their well-being and help prevent relapse.",
      "## Continuing Mental Health Care",
      "If you have co-occurring mental health conditions, continuing psychiatric care is crucial. Ensure you have appointments scheduled with appropriate providers and a plan for medication management if applicable.",
      "Even without a formal diagnosis, ongoing therapy can help you work through issues that arise in recovery and maintain emotional health.",
      "## Creating a Relapse Prevention Plan",
      "Part of aftercare planning involves preparing for the possibility of relapse. Know your personal warning signs, have emergency contacts ready, and know what steps you will take if you slip. Having this plan in place can help you catch a lapse before it becomes a full relapse.",
      "## Conclusion",
      "Aftercare is not optional—it is essential for long-term recovery. Work with your treatment team to develop a comprehensive plan before you leave treatment, and commit to following through. Recovery is an ongoing journey, and aftercare provides the support you need along the way.",
    ],
  },
  {
    id: "opioid-addiction-treatment",
    title: "Opioid Addiction: Treatment Options and Recovery",
    excerpt: "Understanding opioid addiction and the evidence-based treatments available, including medication-assisted treatment and behavioral therapies.",
    category: "treatment",
    categoryLabel: "Treatment Options",
    readTime: "8 min read",
    image: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=1200&h=600&fit=crop",
    author: "Dr. Robert Thompson",
    date: "December 8, 2024",
    content: [
      "Opioid addiction has become one of the most pressing public health crises in recent decades. Whether the addiction began with prescription pain medications or illicit drugs like heroin or fentanyl, effective treatments are available that can help people reclaim their lives.",
      "## Understanding Opioid Addiction",
      "Opioids work by binding to receptors in the brain, reducing pain perception and producing feelings of euphoria. Over time, the brain adapts to the presence of opioids, leading to tolerance (needing more to achieve the same effect) and physical dependence (experiencing withdrawal when the drug is stopped).",
      "Addiction involves compulsive drug seeking and use despite negative consequences. It changes brain structure and function in ways that can persist long after drug use stops, which is why professional treatment is so important.",
      "## Medication-Assisted Treatment (MAT)",
      "MAT is the gold standard for opioid addiction treatment, combining FDA-approved medications with counseling and behavioral therapies. Research consistently shows that MAT reduces opioid use, overdose deaths, criminal activity, and transmission of infectious diseases.",
      "Three medications are commonly used: buprenorphine (often combined with naloxone as Suboxone), methadone, and naltrexone (Vivitrol). Each works differently but all help normalize brain chemistry, reduce cravings, and prevent withdrawal symptoms.",
      "## Buprenorphine Treatment",
      "Buprenorphine is a partial opioid agonist that reduces cravings and withdrawal symptoms without producing the intense high of full agonists. It can be prescribed by qualified physicians in office-based settings, making it more accessible than methadone.",
      "Buprenorphine has a ceiling effect, meaning that after a certain dose, taking more does not increase its effects. This makes it safer and less likely to be misused than full opioid agonists.",
      "## Methadone Treatment",
      "Methadone is a full opioid agonist that has been used for decades in addiction treatment. It effectively prevents withdrawal and reduces cravings, allowing people to function normally while in recovery.",
      "Due to its potential for misuse, methadone is dispensed only through certified opioid treatment programs (OTPs). Patients typically visit the clinic daily, especially in early treatment, though take-home doses may be earned over time.",
      "## Naltrexone Treatment",
      "Naltrexone is an opioid antagonist that blocks the effects of opioids. Unlike buprenorphine and methadone, it does not produce any opioid effects and is not addictive. It is available as a daily pill or a monthly injection (Vivitrol).",
      "The injectable form is particularly helpful for those who struggle with daily medication adherence. However, patients must be completely detoxed from opioids before starting naltrexone to avoid precipitating severe withdrawal.",
      "## Behavioral Therapies",
      "While medications address the physical aspects of addiction, behavioral therapies help patients modify their attitudes and behaviors related to drug use. Cognitive-behavioral therapy (CBT) helps identify and change negative thought patterns. Contingency management provides rewards for positive behaviors like staying drug-free.",
      "Individual counseling, group therapy, and family therapy all play important roles in comprehensive opioid addiction treatment.",
      "## The Importance of Comprehensive Care",
      "Effective opioid addiction treatment addresses the whole person, not just the addiction. This includes treating co-occurring mental health conditions, addressing trauma, providing case management services, and helping with practical needs like housing and employment.",
      "Long-term recovery often requires ongoing support including continued medication when appropriate, regular counseling, support group participation, and lifestyle changes that support sobriety.",
      "## Overcoming Stigma",
      "Unfortunately, stigma around opioid addiction and its treatment, particularly MAT, can prevent people from seeking help. It is important to understand that addiction is a chronic brain disorder, not a moral failing, and that medications for opioid addiction are legitimate, evidence-based treatments.",
      "## Conclusion",
      "Opioid addiction is a serious but treatable condition. With proper treatment combining medication and therapy, people can and do recover. If you or someone you love is struggling with opioid addiction, reach out to a healthcare provider or treatment center to learn about your options.",
    ],
  },
  {
    id: "alcohol-detox-what-to-expect",
    title: "Alcohol Detox: What to Expect and How to Prepare",
    excerpt: "Alcohol withdrawal can be dangerous without proper medical supervision. Learn what happens during detox and why professional help is essential.",
    category: "treatment",
    categoryLabel: "Treatment Options",
    readTime: "6 min read",
    image: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=1200&h=600&fit=crop",
    author: "Dr. Lisa Martinez",
    date: "December 6, 2024",
    content: [
      "For those who have been drinking heavily for an extended period, stopping alcohol suddenly can be dangerous—even life-threatening. Medical detoxification provides the safe, supervised environment needed to navigate withdrawal successfully.",
      "## Why Alcohol Withdrawal Can Be Dangerous",
      "Unlike many other substances, alcohol withdrawal can cause severe, potentially fatal complications. The body becomes physically dependent on alcohol, and when drinking stops abruptly, the central nervous system becomes overactive.",
      "In severe cases, this can lead to delirium tremens (DTs), a condition characterized by severe confusion, rapid heartbeat, fever, and seizures. DTs can be fatal without proper medical treatment, which is why medically supervised detox is so important.",
      "## Timeline of Alcohol Withdrawal",
      "Withdrawal symptoms typically begin 6-12 hours after the last drink. Early symptoms include anxiety, shakiness, sweating, nausea, and insomnia. These symptoms usually peak around 24-72 hours and can include increased heart rate and blood pressure, fever, and in severe cases, hallucinations or seizures.",
      "Most acute withdrawal symptoms subside within 5-7 days, though some psychological symptoms like anxiety and sleep disturbances may persist longer.",
      "## What Happens During Medical Detox",
      "Medical detox takes place in a hospital, detox center, or residential treatment facility where trained professionals monitor your condition around the clock. Upon arrival, you will receive a thorough medical assessment to determine the appropriate level of care.",
      "Medical staff will monitor vital signs, assess withdrawal severity using standardized scales, and administer medications as needed to manage symptoms and prevent complications. The goal is to keep you as comfortable and safe as possible during the withdrawal process.",
      "## Medications Used in Alcohol Detox",
      "Benzodiazepines are the most commonly used medications for alcohol withdrawal. Drugs like diazepam (Valium), chlordiazepoxide (Librium), or lorazepam (Ativan) help prevent seizures, reduce anxiety, and ease other withdrawal symptoms.",
      "Other medications may be used to address specific symptoms like nausea, headaches, or insomnia. Some facilities also use medications like gabapentin or phenobarbital as part of their detox protocols.",
      "## Preparing for Detox",
      "Before entering detox, be honest with the treatment team about your drinking patterns, any medications you take, and your medical history. Pack comfortable clothing and personal care items. Arrange for someone to handle responsibilities while you are away.",
      "Mentally prepare for some discomfort—withdrawal is not pleasant, but it is temporary. Remind yourself why you are doing this and focus on the healthier future ahead.",
      "## After Detox",
      "Detox is just the first step in recovery—it addresses physical dependence but not the underlying issues driving the addiction. Following detox with comprehensive treatment including therapy, support groups, and possibly ongoing medication is essential for long-term recovery.",
      "Many people transition directly from detox to an inpatient or intensive outpatient treatment program to continue their recovery journey.",
      "## Conclusion",
      "If you have been drinking heavily and want to stop, please do not try to detox on your own. Medical supervision can mean the difference between a safe withdrawal and a medical emergency. Reach out to a healthcare provider or treatment center to discuss your options for medically supervised detox.",
    ],
  },
  {
    id: "depression-and-substance-abuse",
    title: "The Link Between Depression and Substance Abuse",
    excerpt: "Depression and addiction frequently co-occur. Explore how these conditions interact and why integrated treatment produces the best outcomes.",
    category: "mental-health",
    categoryLabel: "Mental Health",
    readTime: "7 min read",
    image: "https://images.unsplash.com/photo-1493836512294-502baa1986e2?w=1200&h=600&fit=crop",
    author: "Dr. Amanda Roberts",
    date: "December 4, 2024",
    content: [
      "Depression and substance abuse are deeply intertwined conditions. People with depression are about twice as likely to develop a substance use disorder, and those with addiction have higher rates of depression. Understanding this connection is essential for effective treatment.",
      "## How Depression and Addiction Connect",
      "The relationship between depression and substance abuse is bidirectional and complex. Some people begin using substances to self-medicate depressive symptoms—alcohol might temporarily numb emotional pain, stimulants might provide energy that depression steals.",
      "However, substance use often worsens depression over time. Alcohol is a depressant that can deepen low moods. The consequences of addiction—damaged relationships, job loss, financial problems—add more reasons to feel hopeless and sad.",
      "## Signs of Co-Occurring Depression and Addiction",
      "Recognizing when both conditions are present is crucial for proper treatment. Signs of depression include persistent sad or empty mood, loss of interest in activities once enjoyed, changes in sleep or appetite, fatigue, feelings of worthlessness or guilt, difficulty concentrating, and thoughts of death or suicide.",
      "When combined with addiction, you might notice using substances specifically to cope with negative emotions, increased substance use during depressive episodes, neglecting treatment for one condition in favor of the other, or worsening of both conditions over time.",
      "## The Importance of Integrated Treatment",
      "Treating only addiction while ignoring depression—or vice versa—rarely leads to lasting recovery. Untreated depression increases the risk of relapse, while continued substance use undermines depression treatment.",
      "Integrated treatment addresses both conditions simultaneously, with providers who understand how depression and addiction interact. This approach might include medication for depression, therapy that addresses both conditions, and treatment of substance use disorder.",
      "## Treatment Approaches",
      "Antidepressant medications can be an important part of treatment for co-occurring depression and addiction. SSRIs and other antidepressants help regulate brain chemistry and improve mood. It may take several weeks to find the right medication and dosage.",
      "Cognitive-behavioral therapy (CBT) is effective for both depression and addiction. It helps identify negative thought patterns, develop healthier coping skills, and change behaviors that contribute to both conditions.",
      "## Self-Care Strategies",
      "Beyond formal treatment, self-care practices support recovery from both conditions. Regular exercise has been shown to improve both depression and addiction outcomes. A consistent sleep schedule, healthy nutrition, and stress management techniques like mindfulness also play important roles.",
      "Building a strong social support network reduces isolation, a common factor in both depression and addiction.",
      "## Hope for Recovery",
      "Recovery from co-occurring depression and substance abuse is absolutely possible. Many people find that as they address both conditions, each becomes more manageable. Treatment takes time and patience, but with proper care, people can and do get better.",
      "## Conclusion",
      "If you are struggling with both depression and substance use, know that you are not alone and that effective treatment exists. Seek out providers who specialize in co-occurring disorders and commit to addressing both conditions together. Your path to wellness involves treating the whole person.",
    ],
  },
  {
    id: "sober-living-homes",
    title: "Sober Living Homes: Bridging Treatment and Independence",
    excerpt: "Sober living provides structured support after treatment. Learn how these transitional homes help maintain recovery while rebuilding life skills.",
    category: "recovery",
    categoryLabel: "Recovery",
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&h=600&fit=crop",
    author: "Mark Stevens, CADC",
    date: "December 2, 2024",
    content: [
      "The transition from treatment back to everyday life is one of the most vulnerable periods in recovery. Sober living homes provide a crucial bridge, offering structure and support while residents rebuild their lives in a substance-free environment.",
      "## What Are Sober Living Homes?",
      "Sober living homes, also called sober houses or recovery residences, are group living environments for people in recovery from addiction. Unlike treatment facilities, they do not provide clinical services—instead, they offer a stable, drug-free living situation with peer support.",
      "Residents typically share responsibilities like cooking, cleaning, and house maintenance. They pay rent and follow house rules while working, attending school, or participating in outpatient treatment.",
      "## Benefits of Sober Living",
      "Sober living offers several advantages for people in early recovery. The structured environment with house rules and expectations provides accountability. Living with others in recovery creates a built-in support network of people who understand the challenges firsthand.",
      "The transition is gradual—rather than going directly from the protective environment of treatment to complete independence, residents can practice life skills while still having support readily available.",
      "## Typical House Rules",
      "While rules vary by residence, most sober living homes require complete abstinence from drugs and alcohol, participation in household chores, attending house meetings, adhering to curfews, maintaining employment or being in school, participating in recovery activities like 12-step meetings, and submitting to random drug testing.",
      "Violations of major rules, particularly using substances, typically result in being asked to leave the house.",
      "## Finding a Quality Sober Living Home",
      "Quality varies significantly among sober living homes. Look for residences that are certified or affiliated with reputable organizations, have clear rules and structure, require drug testing, provide a clean and safe living environment, have experienced house managers, and have positive reviews from former residents.",
      "Visit potential homes in person if possible and ask questions about rules, costs, and what is expected of residents.",
      "## How Long Should You Stay?",
      "There is no set duration for sober living—some people stay for a few months, others for a year or more. Factors to consider include the stability of your recovery, your progress in building life skills, your financial situation, and your housing options after leaving.",
      "Leaving too soon can be risky. Many people benefit from staying until they have stable employment, a solid support network, and confidence in their recovery skills.",
      "## Costs and Funding",
      "Sober living homes are typically self-pay, meaning residents cover rent out of pocket. Costs vary widely based on location, amenities, and services offered. Some homes accept scholarships or offer sliding scale fees.",
      "Insurance generally does not cover sober living because it is housing rather than treatment, but some states have programs that help fund recovery housing for people who qualify.",
      "## Conclusion",
      "Sober living homes fill an important gap between treatment and independent living. They provide structure, accountability, and peer support during a vulnerable time in recovery. If you are completing treatment and concerned about returning to your previous environment, consider sober living as a next step.",
    ],
  },
  {
    id: "intervention-guide",
    title: "How to Plan an Intervention for a Loved One",
    excerpt: "A well-planned intervention can be the catalyst for change. Learn the steps to organize an effective, compassionate intervention.",
    category: "family",
    categoryLabel: "Family Support",
    readTime: "6 min read",
    image: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=1200&h=600&fit=crop",
    author: "Jennifer Walsh, LCSW",
    date: "November 30, 2024",
    content: [
      "Watching someone you love struggle with addiction is painful, especially when they refuse to acknowledge the problem or seek help. An intervention is a carefully planned process designed to help someone recognize their need for treatment and agree to accept it.",
      "## What Is an Intervention?",
      "An intervention brings together people who care about someone struggling with addiction to express their concerns in a structured, supportive way. The goal is to help the person see how their substance use affects themselves and others, and to motivate them to accept treatment.",
      "Interventions are not about confrontation or blame—they are about expressing love and concern while setting clear boundaries.",
      "## Working with a Professional",
      "While some families conduct interventions on their own, working with a professional interventionist significantly increases the likelihood of success. Interventionists guide the process, help family members prepare what they will say, manage emotions during the meeting, and ensure the intervention stays on track.",
      "If the person has a history of violence, severe mental illness, or suicidal behavior, professional guidance is especially important.",
      "## Forming the Intervention Team",
      "Choose participants who have a meaningful relationship with the person, can remain calm and supportive during the meeting, are committed to the process and willing to follow through on boundaries, and have specific examples of how the addiction has affected them.",
      "Include family members, close friends, and possibly colleagues or spiritual advisors. Avoid including anyone who might be dismissed as not truly caring or who might become angry or confrontational.",
      "## Preparing for the Intervention",
      "Each participant should write a letter expressing their love for the person, specific examples of how the addiction has affected them, their request that the person accept treatment, and the consequences if treatment is refused.",
      "Practice reading these letters aloud and be prepared for emotional reactions. Decide in advance what consequences each person will enforce if the individual refuses help.",
      "## Arranging Treatment",
      "Before the intervention, have a treatment plan ready. Research facilities, verify insurance coverage, and ideally have a bed reserved. If the person agrees to treatment, you want them to leave for the facility immediately—delays give time for second thoughts.",
      "Pack a bag with everything they will need so they can go directly from the intervention to treatment.",
      "## Conducting the Intervention",
      "Choose a private, comfortable location and a time when the person is most likely to be sober. Each person reads their letter, expressing love first and then sharing how the addiction has affected them. Finally, present the treatment option and ask them to accept help.",
      "Stay calm and compassionate. If the person becomes defensive or angry, acknowledge their feelings without backing down from the request.",
      "## If They Say No",
      "Not every intervention results in immediate acceptance of treatment. If your loved one refuses, follow through on the consequences you outlined. This is not punishment—it is setting boundaries that protect you and may ultimately motivate them to seek help.",
      "Many people who initially refuse treatment later change their minds. Keep lines of communication open while maintaining your boundaries.",
      "## Conclusion",
      "Interventions require careful planning and emotional preparation, but they can be the catalyst that helps someone finally accept the help they need. Whether working with a professional or planning independently, approach the process with love, preparation, and realistic expectations.",
    ],
  },
  {
    id: "ptsd-and-addiction",
    title: "PTSD and Addiction: Understanding Trauma-Informed Care",
    excerpt: "Trauma and addiction are deeply connected. Discover how trauma-informed treatment approaches address both conditions for lasting recovery.",
    category: "mental-health",
    categoryLabel: "Mental Health",
    readTime: "8 min read",
    image: "https://images.unsplash.com/photo-1559757175-5700dde675bc?w=1200&h=600&fit=crop",
    author: "Dr. Michael Chen",
    date: "November 28, 2024",
    content: [
      "Trauma and addiction are often intimately connected. Many people who struggle with substance use disorders have experienced significant trauma, and substances become a way to cope with the overwhelming emotions and memories that trauma leaves behind.",
      "## The Connection Between Trauma and Addiction",
      "Post-traumatic stress disorder (PTSD) develops after experiencing or witnessing a traumatic event. Symptoms include intrusive memories or flashbacks, avoidance of reminders of the trauma, negative changes in mood and thinking, and heightened reactivity including irritability, sleep problems, and being easily startled.",
      "Substances can temporarily suppress these symptoms. Alcohol might help someone sleep through nightmares. Opioids might numb emotional pain. Stimulants might combat the numbness and disconnection that often accompany PTSD. Over time, this self-medication can develop into addiction.",
      "## Prevalence of Co-Occurring PTSD and Addiction",
      "Research shows that people with PTSD are significantly more likely to develop substance use disorders than those without PTSD. Among people seeking addiction treatment, rates of PTSD are much higher than in the general population—some studies suggest that over half of women and a third of men in addiction treatment have PTSD.",
      "## Why Traditional Treatment May Fall Short",
      "Treatment programs that address only addiction without considering underlying trauma often have limited success for people with PTSD. Trauma symptoms may intensify when substances are removed, as the coping mechanism is gone but the underlying pain remains.",
      "This can lead to relapse as individuals seek relief from overwhelming emotions they are not equipped to handle. Effective treatment must address both conditions.",
      "## What Is Trauma-Informed Care?",
      "Trauma-informed care is an approach that recognizes the widespread impact of trauma and integrates this understanding into all aspects of treatment. It assumes that many people seeking treatment have trauma histories and creates an environment that avoids re-traumatization.",
      "Key principles include safety, trustworthiness, choice, collaboration, and empowerment. The environment is designed to feel safe, staff actions are transparent, clients have meaningful choices in their treatment, and the approach builds on client strengths.",
      "## Evidence-Based Trauma Treatments",
      "Several therapies have been shown effective for treating PTSD, and some are specifically designed for people with co-occurring addiction. Prolonged Exposure (PE) helps people gradually approach trauma-related memories and situations they have been avoiding. Cognitive Processing Therapy (CPT) addresses unhelpful beliefs related to the trauma.",
      "Eye Movement Desensitization and Reprocessing (EMDR) uses bilateral stimulation while processing traumatic memories. Seeking Safety is specifically designed for people with both PTSD and addiction, focusing on coping skills and safety.",
      "## The Role of Medication",
      "Medications can help manage both PTSD and addiction symptoms. SSRIs like sertraline and paroxetine are FDA-approved for PTSD. Other medications may help with specific symptoms like nightmares or hyperarousal.",
      "For addiction, medications like naltrexone, buprenorphine, or acamprosate may be appropriate depending on the substance involved. A psychiatrist experienced with co-occurring disorders can help determine the right medication approach.",
      "## Finding the Right Treatment",
      "Look for treatment programs that explicitly address trauma and have staff trained in trauma-informed approaches. Ask about their experience treating co-occurring PTSD and addiction, what trauma-specific therapies they offer, and how they create a trauma-sensitive environment.",
      "## Conclusion",
      "Healing from both PTSD and addiction is possible, but it requires treatment that addresses the connection between them. If you have experienced trauma and struggle with substance use, seek out trauma-informed care that will help you process your experiences while building the skills for lasting recovery.",
    ],
  },
  {
    id: "workplace-substance-abuse",
    title: "Addressing Substance Abuse in the Workplace",
    excerpt: "Employers and employees alike need to understand workplace substance abuse policies, EAPs, and how to seek help while protecting your career.",
    category: "prevention",
    categoryLabel: "Prevention",
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1497215842964-222b430dc094?w=1200&h=600&fit=crop",
    author: "Lisa Martinez, LMFT",
    date: "November 25, 2024",
    content: [
      "Substance abuse affects workplaces of all kinds, impacting productivity, safety, and employee well-being. Understanding workplace policies, resources, and how to seek help while protecting your career is essential for both employers and employees.",
      "## The Impact of Substance Abuse at Work",
      "Substance abuse in the workplace leads to increased absenteeism, higher accident rates, decreased productivity, and higher healthcare costs. Employees struggling with addiction may have difficulty concentrating, miss deadlines, have conflicts with coworkers, or show physical signs of impairment.",
      "Beyond productivity, there are safety concerns—particularly in industries involving driving, operating machinery, or making decisions that affect others' welfare.",
      "## Employee Assistance Programs (EAPs)",
      "Many employers offer Employee Assistance Programs that provide confidential support for employees dealing with personal problems, including substance abuse. EAPs typically offer free counseling sessions, referrals to treatment programs, and support for navigating workplace issues related to addiction.",
      "EAP services are confidential—your employer will not be told the specific nature of your issue unless you give permission or there is an immediate safety concern. Using your EAP is often the best first step if you are concerned about your substance use.",
      "## Know Your Rights",
      "The Americans with Disabilities Act (ADA) protects employees who are in recovery or seeking treatment, but not those currently using illegal drugs. This means you cannot be fired simply for having a history of addiction or for seeking treatment, but you can be held to the same performance and conduct standards as other employees.",
      "The Family and Medical Leave Act (FMLA) may provide job-protected leave for treatment if you work for a covered employer and meet eligibility requirements. Understanding these protections can help you seek help without unnecessary fear of job loss.",
      "## Approaching Your Employer",
      "If you decide to disclose your substance use issue to your employer, consider doing so proactively rather than waiting until performance problems accumulate. Have a plan in place—know what treatment you are seeking and how long you might need.",
      "Frame the conversation around your commitment to your job and your proactive steps to address the problem. Many employers are more supportive than employees expect, especially when approached before issues become serious.",
      "## Drug Testing Policies",
      "Many workplaces conduct drug testing—pre-employment, random, reasonable suspicion, or post-accident. Understand your company's policy. If you test positive, you may be offered the opportunity to seek treatment rather than immediate termination, depending on the policy.",
      "If you are in medication-assisted treatment for opioid addiction, medications like buprenorphine or methadone may show up on drug tests. You may need to provide documentation of legitimate prescription treatment.",
      "## Returning to Work After Treatment",
      "Returning to work after addiction treatment requires planning. Work with your treatment team on a return-to-work strategy. You may need to negotiate modified duties, ongoing support, or random testing as conditions of your return.",
      "Build a support system at work if possible—even one trusted colleague who knows your situation can make a significant difference in maintaining recovery in the workplace.",
      "## Conclusion",
      "Substance abuse does not have to end your career. Understanding workplace resources like EAPs, knowing your legal protections, and approaching the situation proactively can help you get the help you need while protecting your professional life. If you are struggling, reach out for help—the sooner you address the issue, the better the outcome for both your health and your career.",
    ],
  },
  {
    id: "long-term-recovery-success",
    title: "Keys to Long-Term Recovery Success",
    excerpt: "What separates those who maintain sobriety from those who struggle? Learn the habits, mindsets, and support systems that support lasting recovery.",
    category: "recovery",
    categoryLabel: "Recovery",
    readTime: "7 min read",
    image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1200&h=600&fit=crop",
    author: "Mark Stevens, CADC",
    date: "November 22, 2024",
    content: [
      "Completing treatment is a significant accomplishment, but it is the beginning of recovery, not the end. What distinguishes those who maintain long-term sobriety from those who struggle? Research and experience point to several key factors.",
      "## Building a Recovery-Focused Life",
      "Long-term recovery requires more than simply not using substances—it involves building a life where substances are not needed or wanted. This means finding purpose, developing healthy relationships, pursuing meaningful activities, and addressing the underlying issues that contributed to addiction.",
      "Those who thrive in recovery often describe finding a new sense of meaning and satisfaction in life that makes the sacrifices of sobriety worthwhile.",
      "## Maintaining Support Connections",
      "Isolation is one of the biggest risks in recovery. Maintaining connections with others who support your sobriety—whether through 12-step groups, other recovery communities, therapy, or simply supportive friends and family—provides accountability, encouragement, and belonging.",
      "Research consistently shows that people who stay connected to recovery support have better outcomes than those who try to go it alone.",
      "## Continued Personal Growth",
      "Recovery offers an opportunity for profound personal growth. Those who thrive often embrace this opportunity—working on themselves through therapy, reading, spiritual practice, or personal development activities.",
      "Addressing character defects, healing relationships, and becoming the person you want to be are all part of long-term recovery. Complacency—feeling like the work is done—can be a warning sign.",
      "## Healthy Lifestyle Habits",
      "Physical health supports mental health and recovery. Regular exercise, adequate sleep, nutritious eating, and stress management all contribute to well-being and reduce relapse risk.",
      "Many people in recovery find that physical activity becomes an important part of their routine—it provides natural mood enhancement, reduces stress, and offers a healthy way to spend time.",
      "## Managing Stress and Emotions",
      "Learning to handle stress and difficult emotions without substances is essential. This involves developing a toolbox of coping strategies—deep breathing, meditation, physical activity, talking to someone, journaling, or other healthy outlets.",
      "Recognizing when stress is building and taking proactive steps to address it prevents emotions from reaching the point where relapse feels like the only option.",
      "## Staying Vigilant About Triggers",
      "Even years into recovery, certain situations, emotions, or experiences can trigger cravings. Knowing your triggers and having a plan for handling them remains important long-term.",
      "This does not mean living in fear—it means remaining aware and prepared. Over time, many triggers lose their power, but staying vigilant protects your recovery.",
      "## Giving Back",
      "Many people find that helping others in recovery strengthens their own sobriety. Whether through sponsoring others, volunteering, sharing your story, or simply being supportive, giving back reinforces your own recovery principles and provides a sense of purpose.",
      "The act of helping someone else can also remind you how far you have come and why your recovery matters.",
      "## Handling Setbacks",
      "Recovery is not always a straight line. Challenging periods, close calls, or even relapses may occur. What matters is how you respond. Those who maintain long-term recovery treat setbacks as learning opportunities rather than reasons to give up.",
      "If you struggle, return to what works—increase support, see your therapist, attend more meetings, reach out for help. A lapse does not have to become a full relapse.",
      "## Conclusion",
      "Long-term recovery is possible and rewarding. It requires ongoing commitment, support, and personal growth, but millions of people live full, satisfying lives in recovery. By building a strong foundation and maintaining the practices that support sobriety, you can join them.",
    ],
  },
];

const ArticleDetail = () => {
  const { id } = useParams<{ id: string }>();
  const article = articles.find((a) => a.id === id);

  if (!article) {
    return <Navigate to="/resources" replace />;
  }

  const relatedArticles = articles
    .filter((a) => a.category === article.category && a.id !== article.id)
    .slice(0, 2);

  return (
    <Layout>
      {/* Hero */}
      <section className="relative bg-background border-b border-border/50">
        <div className="container py-8 md:py-12">
          {/* Back Link */}
          <Link
            to="/resources"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary mb-8 transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back to Resources
          </Link>
          
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left: Content */}
            <div className="order-2 lg:order-1">
              {/* Category Badge */}
              <div className="mb-5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
                  <BookOpen className="h-3.5 w-3.5" />
                  {article.categoryLabel}
                </span>
              </div>
              
              {/* Title */}
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl lg:text-4xl xl:text-[2.75rem] mb-5 leading-[1.15]">
                {article.title}
              </h1>
              
              {/* Excerpt */}
              <p className="text-base text-muted-foreground md:text-lg mb-8 leading-relaxed max-w-xl">
                {article.excerpt}
              </p>
              
              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-6 text-sm">
                {/* Author */}
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md shadow-primary/20">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{article.author}</p>
                    <p className="text-xs text-muted-foreground">Author</p>
                  </div>
                </div>
                
                {/* Divider */}
                <div className="hidden sm:block h-10 w-px bg-border" />
                
                {/* Date & Read Time */}
                <div className="flex items-center gap-4 text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    <span>{article.date}</span>
                  </div>
                  <span className="text-border">•</span>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    <span>{article.readTime}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right: Featured Image */}
            <div className="order-1 lg:order-2">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/10 ring-1 ring-black/5">
                <div className="aspect-[16/10]">
                  <img
                    src={article.image}
                    alt={article.title}
                    className="h-full w-full object-cover"
                  />
                </div>
                {/* Subtle gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 md:py-16 bg-gradient-to-b from-muted/30 to-background">
        <div className="container">
          <div className="grid gap-10 lg:grid-cols-3 lg:gap-12">
            {/* Article Content */}
            <article className="lg:col-span-2">
              <div className="rounded-2xl border border-border/50 bg-card p-6 md:p-10 shadow-sm">
                <div className="prose prose-lg max-w-none">
                  {article.content.map((paragraph, index) => {
                    if (paragraph.startsWith("## ")) {
                      return (
                        <h2
                          key={index}
                          className="font-display text-xl font-bold text-foreground mt-10 mb-4 first:mt-0 flex items-center gap-3"
                        >
                          <span className="h-8 w-1 rounded-full bg-primary" />
                          {paragraph.replace("## ", "")}
                        </h2>
                      );
                    }
                    return (
                      <p
                        key={index}
                        className="text-foreground/80 leading-relaxed mb-5 text-base"
                      >
                        {paragraph}
                      </p>
                    );
                  })}
                </div>

                {/* Share & Actions */}
                <div className="mt-12 pt-8 border-t border-border/50">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">Share:</span>
                      <div className="flex items-center gap-2">
                        <button className="h-9 w-9 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors">
                          <Share2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <Link to="/resources">
                      <Button variant="outline" size="sm" className="gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        All Articles
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </article>

            {/* Sidebar */}
            <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
              {/* Help Card */}
              <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/90 p-6 text-white shadow-lg shadow-primary/20">
                <div className="mb-4 h-12 w-12 rounded-xl bg-white/15 flex items-center justify-center">
                  <Heart className="h-6 w-6" />
                </div>
                <h3 className="font-display text-lg font-semibold mb-2">
                  Need Help Finding Treatment?
                </h3>
                <p className="text-sm text-white/80 mb-5 leading-relaxed">
                  Our specialists are available 24/7 to help you find the right treatment center.
                </p>
                <Link to="/request-help?source=article_sidebar">
                  <Button variant="secondary" className="w-full gap-2 bg-white text-primary hover:bg-white/90">
                    Request Help
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>

              {/* Related Articles */}
              {relatedArticles.length > 0 && (
                <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
                  <h3 className="font-display text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    Related Articles
                  </h3>
                  <div className="space-y-3">
                    {relatedArticles.map((related) => (
                      <Link
                        key={related.id}
                        to={`/resources/${related.id}`}
                        className="group block"
                      >
                        <div className="rounded-xl bg-muted/30 p-3 transition-all hover:bg-muted/50 hover:shadow-sm">
                          <div className="flex gap-3">
                            <img
                              src={related.image}
                              alt={related.title}
                              className="h-14 w-14 rounded-lg object-cover shrink-0"
                            />
                            <div className="min-w-0">
                              <h4 className="font-medium text-foreground text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
                                {related.title}
                              </h4>
                              <span className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {related.readTime}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Browse More */}
              <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
                <h3 className="font-display text-base font-semibold text-foreground mb-2">
                  Explore More
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Discover our full library of recovery guides.
                </p>
                <Link to="/resources">
                  <Button variant="outline" size="sm" className="w-full gap-2">
                    View All Articles
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-20 bg-muted/50">
        <div className="container">
          <div className="mx-auto max-w-3xl rounded-2xl bg-gradient-to-br from-primary to-primary/90 p-8 md:p-12 text-center text-white shadow-xl shadow-primary/20 relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
            
            <div className="relative">
              <div className="mb-4 mx-auto h-14 w-14 rounded-2xl bg-white/15 flex items-center justify-center">
                <Heart className="h-7 w-7" />
              </div>
              <h2 className="mb-3 font-display text-2xl font-bold md:text-3xl">
                Ready to Start Your Recovery Journey?
              </h2>
              <p className="mb-8 text-white/80 max-w-xl mx-auto">
                Find verified treatment centers near you and take the first step toward a healthier future.
              </p>
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link to="/rehab-centers">
                  <Button size="lg" variant="secondary" className="gap-2 bg-white text-primary hover:bg-white/90 shadow-lg">
                    Find Treatment Centers
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/request-help?source=article_cta">
                  <Button size="lg" variant="outline" className="gap-2 border-white/30 text-white hover:bg-white/10">
                    Request Help
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

export default ArticleDetail;
