import { useParams, Link, Navigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Clock,
  ArrowLeft,
  ArrowRight,
  Phone,
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
      <section className="relative">
        <div className="h-64 md:h-80 lg:h-96 overflow-hidden">
          <img
            src={article.image}
            alt={article.title}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        </div>
        <div className="container relative -mt-32 md:-mt-40">
          <div className="max-w-3xl">
            <Link
              to="/resources"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary-foreground/80 hover:text-primary-foreground mb-4 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Resources
            </Link>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground mb-4">
              <BookOpen className="h-3 w-3" />
              {article.categoryLabel}
            </span>
            <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl lg:text-4xl mb-4">
              {article.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <User className="h-4 w-4" />
                {article.author}
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {article.date}
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {article.readTime}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 md:py-16">
        <div className="container">
          <div className="grid gap-12 lg:grid-cols-3">
            {/* Article Content */}
            <article className="lg:col-span-2">
              <div className="prose prose-lg max-w-none">
                {article.content.map((paragraph, index) => {
                  if (paragraph.startsWith("## ")) {
                    return (
                      <h2
                        key={index}
                        className="font-display text-xl font-bold text-foreground mt-8 mb-4"
                      >
                        {paragraph.replace("## ", "")}
                      </h2>
                    );
                  }
                  return (
                    <p
                      key={index}
                      className="text-foreground/80 leading-relaxed mb-4"
                    >
                      {paragraph}
                    </p>
                  );
                })}
              </div>

              {/* Share */}
              <div className="mt-12 pt-8 border-t border-border">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Share2 className="h-4 w-4" />
                    <span className="text-sm">Share this article</span>
                  </div>
                  <Link to="/resources">
                    <Button variant="outline" className="gap-2">
                      <ArrowLeft className="h-4 w-4" />
                      Back to Resources
                    </Button>
                  </Link>
                </div>
              </div>
            </article>

            {/* Sidebar */}
            <aside className="space-y-8">
              {/* Help Card */}
              <div className="rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/5 to-accent/10 p-6">
                <h3 className="font-display text-lg font-semibold text-foreground mb-3">
                  Need Help Finding Treatment?
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Our specialists are available 24/7 to help you find the right treatment center.
                </p>
                <a href="tel:1-800-555-0199">
                  <Button className="w-full gap-2">
                    <Phone className="h-4 w-4" />
                    Call 1-800-555-0199
                  </Button>
                </a>
              </div>

              {/* Related Articles */}
              {relatedArticles.length > 0 && (
                <div>
                  <h3 className="font-display text-lg font-semibold text-foreground mb-4">
                    Related Articles
                  </h3>
                  <div className="space-y-4">
                    {relatedArticles.map((related) => (
                      <Link
                        key={related.id}
                        to={`/resources/${related.id}`}
                        className="group block"
                      >
                        <div className="rounded-xl border border-border bg-card p-4 transition-all hover:border-accent/30 hover:shadow-md">
                          <div className="flex gap-3">
                            <img
                              src={related.image}
                              alt={related.title}
                              className="h-16 w-16 rounded-lg object-cover shrink-0"
                            />
                            <div>
                              <h4 className="font-medium text-foreground text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
                                {related.title}
                              </h4>
                              <span className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
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
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-display text-lg font-semibold text-foreground mb-3">
                  Browse More Resources
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Explore our full library of articles and guides.
                </p>
                <Link to="/resources">
                  <Button variant="outline" className="w-full gap-2">
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
      <section className="py-16 md:py-20 bg-muted/30">
        <div className="container">
          <div className="mx-auto max-w-3xl rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/5 to-accent/10 p-8 md:p-12 text-center">
            <h2 className="mb-3 font-display text-2xl font-bold text-foreground md:text-3xl">
              Ready to Start Your Recovery Journey?
            </h2>
            <p className="mb-6 text-muted-foreground max-w-xl mx-auto">
              Find verified treatment centers near you and take the first step toward a healthier future.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/rehab-centers">
                <Button size="lg" className="gap-2">
                  Find Treatment Centers
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="tel:1-800-555-0199">
                <Button variant="outline" size="lg" className="gap-2">
                  <Phone className="h-4 w-4" />
                  Call for Help
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default ArticleDetail;
