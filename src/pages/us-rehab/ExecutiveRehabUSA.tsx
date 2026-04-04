import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";
import { 
  InternationalHero,
  CountriesServed,
  InternationalFAQ,
  PlacementCTA
} from "./components";
import { Briefcase, Laptop, Clock, Shield, Users, Phone } from "lucide-react";

const executiveFeatures = [
  { icon: Laptop, title: "Work Access", description: "Private offices, high-speed WiFi, and flexible scheduling to maintain business responsibilities" },
  { icon: Clock, title: "Flexible Programs", description: "Condensed therapy schedules that allow for business calls and essential meetings" },
  { icon: Shield, title: "Maximum Privacy", description: "Enhanced confidentiality protocols protecting your professional reputation" },
  { icon: Users, title: "Peer Community", description: "Network with other executives facing similar challenges in a supportive environment" },
  { icon: Phone, title: "Connected Care", description: "Secure communication channels for necessary business interactions" },
  { icon: Briefcase, title: "Career Support", description: "Coaching for work-life balance and managing professional pressures in recovery" }
];

const ExecutiveRehabUSA = () => {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Executive Rehab USA",
    "description": "Executive addiction treatment programs in the United States designed for business leaders, CEOs, and professionals who need to balance recovery with work responsibilities.",
    "provider": { "@type": "Organization", "name": "RehabLookup" },
    "areaServed": { "@type": "Country", "name": "United States" }
  };

  const customFAQs = [
    { question: "What makes executive rehab different from standard treatment?", answer: "Executive programs are designed for working professionals who cannot completely disconnect from their responsibilities. They offer private offices, WiFi access, flexible therapy schedules, and enhanced privacy while providing the same quality clinical care as traditional programs." },
    { question: "Can I really work during executive rehab?", answer: "Limited work is typically allowed—usually a few hours daily for essential communications and meetings. However, treatment professionals will help you set healthy boundaries. The goal is maintaining necessary responsibilities while prioritizing recovery." },
    { question: "How confidential is executive treatment?", answer: "Executive programs offer enhanced confidentiality beyond standard HIPAA protections. Many use aliases, have separate intake processes, and implement strict protocols to protect your professional reputation. Facilities understand the stakes for high-profile clients." },
    { question: "What types of professionals attend executive rehab?", answer: "Executives, CEOs, physicians, attorneys, politicians, entrepreneurs, and other high-achieving professionals who need to manage career responsibilities during treatment. Many programs cater specifically to C-suite executives and business owners." },
    { question: "How long are executive programs?", answer: "Executive programs range from 30-90 days. Some professionals opt for shorter initial stays with intensive aftercare, while others invest in comprehensive 60-90 day programs. The right length depends on your needs and circumstances." },
    { question: "Can my family visit during executive treatment?", answer: "Yes, most executive programs encourage family involvement with designated visiting times. Family therapy sessions help address relationship dynamics affected by addiction and work-related stress." }
  ];

  return (
    <Layout>
      <SEO
        title="Executive Rehab USA | Addiction Treatment for Professionals"
        description="Executive addiction treatment programs in America for CEOs, business leaders, and professionals. Work-friendly rehab with private offices, flexible schedules, and maximum confidentiality."
        canonical="/us-rehab/executive-rehab"
        keywords={["executive rehab USA", "CEO addiction treatment", "professional rehab program", "business leader rehab", "executive addiction treatment", "work during rehab"]}
        structuredData={schemaData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "US Rehab", url: "/us-rehab" },
          { name: "Executive Rehab", url: "/us-rehab/executive-rehab" },
        ]}
      />

      <div className="container mx-auto px-4 pt-4">
        <BreadcrumbNav className="mb-4" items={[
          { label: "US Rehab", href: "/us-rehab" },
          { label: "Executive Rehab" },
        ]} />
      </div>

      <InternationalHero title="Executive Rehab in the United States" subtitle="Recovery Without Career Interruption" description="Addiction treatment designed for business leaders who need to maintain essential work responsibilities. Private offices, flexible scheduling, and world-class clinical care." keywords={["executive rehab", "CEO treatment", "professional rehab", "work during treatment"]} />

      <section className="py-16 md:py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 text-primary mb-4">
              <Briefcase className="h-6 w-6" />
              <span className="text-sm font-semibold uppercase tracking-wide">Executive Features</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Treatment Designed for Leaders</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Executive programs balance intensive treatment with the flexibility professionals need to manage essential business responsibilities.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {executiveFeatures.map((feature, index) => (
              <div key={index} className="p-6 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors">
                <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-blue-500" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CountriesServed />
      <InternationalFAQ title="Executive Treatment FAQs" subtitle="Common questions about executive rehab programs in the United States." faqs={customFAQs} schemaId="executive-rehab-faq" />
      <PlacementCTA title="Find Your Executive Program" description="Discreet placement into America's top executive treatment programs. Maintain your career while investing in your health." />
    </Layout>
  );
};

export default ExecutiveRehabUSA;
