import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";
import { 
  InternationalHero,
  CountriesServed,
  InternationalFAQ,
  PlacementCTA
} from "./components";
import { Link } from "react-router-dom";
import { MapPin, Star, Sun, Waves, Mountain } from "lucide-react";

const californiaHighlights = [
  { region: "Malibu", description: "Oceanfront luxury treatment with celebrity-level privacy and holistic programs", icon: Waves, specialties: ["Luxury Treatment", "Celebrity Rehab", "Holistic Programs"] },
  { region: "Los Angeles", description: "Diverse treatment options from executive programs to intensive outpatient", icon: Star, specialties: ["Executive Treatment", "Dual Diagnosis", "Outpatient Options"] },
  { region: "San Diego", description: "Year-round perfect weather with beach-based recovery programs", icon: Sun, specialties: ["Beach Therapy", "Adventure Programs", "Young Adult Focus"] },
  { region: "Northern California", description: "Mountain retreats and wine country serenity for peaceful recovery", icon: Mountain, specialties: ["Wilderness Therapy", "Meditation Retreats", "Long-Term Programs"] }
];

const LuxuryRehabCalifornia = () => {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Luxury Rehab in California",
    "description": "Premium addiction treatment centers in California including Malibu oceanfront facilities, Los Angeles executive programs, and Northern California retreats.",
    "provider": { "@type": "Organization", "name": "RehabLookup" },
    "areaServed": { "@type": "State", "name": "California" }
  };

  const customFAQs = [
    { question: "Why is California famous for luxury rehab?", answer: "California pioneered the luxury treatment model with Malibu's oceanfront facilities in the 1980s. The state offers unparalleled natural beauty, year-round perfect weather, Hollywood-level privacy standards, and the highest concentration of accredited luxury treatment centers in America." },
    { question: "How much does luxury rehab in California cost?", answer: "California luxury rehab ranges from $40,000-$120,000+ per month. Malibu oceanfront facilities are typically the most expensive, while excellent programs in San Diego or Northern California may offer better value while maintaining premium quality." },
    { question: "What makes Malibu rehabs special?", answer: "Malibu offers oceanfront treatment settings with private beach access, celebrity-level confidentiality protocols, holistic programs incorporating surf therapy and meditation, and proximity to LA's top psychiatrists and therapists. The natural beauty promotes healing." },
    { question: "Is California rehab worth traveling from abroad?", answer: "Absolutely. California's combination of world-class clinical treatment, perfect weather for outdoor activities, innovative therapies, and natural healing environments makes it the top destination for international clients seeking premium addiction treatment." },
    { question: "Can I extend my stay if needed?", answer: "Yes, most California facilities offer flexible program lengths. Many international clients opt for 60-90 day programs to maximize treatment benefits. Step-down to sober living in California is also available for those wanting extended support." }
  ];

  return (
    <Layout>
      <SEO
        title="Luxury Rehab California | Malibu & LA Addiction Treatment"
        description="Find luxury rehab in California including Malibu oceanfront centers, Los Angeles executive programs, and San Diego beach treatment. Premium addiction care for international patients."
        canonical="/us-rehab/luxury-rehab-california"
        keywords={["luxury rehab California", "Malibu rehab centers", "LA addiction treatment", "California drug rehab", "celebrity rehab California", "oceanfront rehab Malibu"]}
        structuredData={schemaData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "US Rehab", url: "/us-rehab" },
          { name: "Luxury Rehab California", url: "/us-rehab/luxury-rehab-california" },
        ]}
      />

      <div className="container mx-auto px-4 pt-4">
        <BreadcrumbNav className="mb-4" items={[
          { label: "US Rehab", href: "/us-rehab" },
          { label: "Luxury Rehab California" },
        ]} />
      </div>

      <InternationalHero title="Luxury Rehab in California" subtitle="Malibu • Los Angeles • San Diego • Wine Country" description="Experience world-renowned addiction treatment in California's most exclusive facilities. From Malibu's oceanfront retreats to LA's executive programs, find premium care in America's premier recovery destination." keywords={["California rehab", "Malibu treatment", "LA luxury rehab", "oceanfront rehab"]} />

      <section className="py-16 md:py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 text-primary mb-4">
              <MapPin className="h-6 w-6" />
              <span className="text-sm font-semibold uppercase tracking-wide">California Regions</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Treatment Destinations in California</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Each region of California offers unique treatment environments and specializations.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {californiaHighlights.map((region, index) => (
              <div key={index} className="p-6 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                    <region.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">{region.region}</h3>
                    <p className="text-muted-foreground mb-4">{region.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {region.specialties.map((specialty, idx) => (
                        <span key={idx} className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">{specialty}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link to="/rehab-centers/california" className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-semibold">Browse All California Facilities →</Link>
          </div>
        </div>
      </section>

      <CountriesServed />
      <InternationalFAQ title="California Treatment FAQs" subtitle="Everything you need to know about luxury rehab in California." faqs={customFAQs} schemaId="luxury-rehab-california-faq" />
      <PlacementCTA title="Find Your California Treatment Center" description="From Malibu oceanfront to LA executive programs, we'll place you in the perfect California facility." />
    </Layout>
  );
};

export default LuxuryRehabCalifornia;
