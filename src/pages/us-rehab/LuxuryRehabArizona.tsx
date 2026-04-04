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
import { MapPin, Sun, Mountain, Sparkles, Heart } from "lucide-react";

const arizonaHighlights = [
  { region: "Sedona", description: "World-famous energy vortexes and spiritual healing in breathtaking red rock landscapes", icon: Sparkles, specialties: ["Spiritual Healing", "Holistic Programs", "Energy Work"] },
  { region: "Scottsdale/Phoenix", description: "Luxury desert resorts with world-class amenities and medical excellence", icon: Sun, specialties: ["Luxury Resorts", "Executive Programs", "Medical Detox"] },
  { region: "Tucson", description: "Peaceful desert setting with excellent clinical programs and value-focused care", icon: Mountain, specialties: ["Value Care", "Long-Term Programs", "Desert Therapy"] },
  { region: "Northern Arizona", description: "Mountain retreats and wilderness programs in cooler climates", icon: Heart, specialties: ["Wilderness Therapy", "Adventure Programs", "Mountain Retreats"] }
];

const LuxuryRehabArizona = () => {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Luxury Rehab in Arizona",
    "description": "Premium addiction treatment centers in Arizona including Sedona spiritual retreats, Scottsdale luxury facilities, and desert healing environments.",
    "provider": { "@type": "Organization", "name": "RehabLookup" },
    "areaServed": { "@type": "State", "name": "Arizona" }
  };

  const customFAQs = [
    { question: "What makes Arizona unique for addiction treatment?", answer: "Arizona offers a distinctive healing environment with its dramatic desert landscapes, clear skies, and spiritual energy centers like Sedona. The dry climate is excellent for outdoor activities, and the state has pioneered equine therapy and holistic treatment modalities." },
    { question: "Is Sedona really special for recovery?", answer: "Many people believe Sedona's energy vortexes have healing properties, making it a global destination for spiritual wellness. Treatment centers in Sedona integrate the natural setting into therapy with red rock hikes, meditation in nature, and spiritual practices." },
    { question: "How hot is Arizona for treatment?", answer: "Summer temperatures in Phoenix/Scottsdale can exceed 100°F, but facilities have excellent air conditioning. Sedona and Northern Arizona are cooler. Many international clients prefer the dry heat to humid climates, and outdoor activities are scheduled for cooler times." },
    { question: "What therapies are Arizona known for?", answer: "Arizona pioneered equine (horse) therapy for addiction treatment and is known for holistic approaches including Native American healing practices, desert meditation, adventure therapy, and nature-based programming." },
    { question: "How do Arizona costs compare to California?", answer: "Arizona generally offers 20-40% lower costs than comparable California facilities while maintaining excellent quality. Scottsdale luxury programs range from $35,000-$70,000/month, while Sedona spiritual retreats offer diverse price points." }
  ];

  return (
    <Layout>
      <SEO
        title="Luxury Rehab Arizona | Sedona & Scottsdale Treatment Centers"
        description="Find luxury rehab in Arizona including Sedona spiritual healing centers, Scottsdale desert resorts, and equine therapy programs. Desert healing for international patients."
        canonical="/us-rehab/luxury-rehab-arizona"
        keywords={["luxury rehab Arizona", "Sedona rehab centers", "Scottsdale addiction treatment", "Arizona drug rehab", "desert rehab", "equine therapy Arizona"]}
        structuredData={schemaData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "US Rehab", url: "/us-rehab" },
          { name: "Luxury Rehab Arizona", url: "/us-rehab/luxury-rehab-arizona" },
        ]}
      />

      <div className="container mx-auto px-4 pt-4">
        <BreadcrumbNav className="mb-4" items={[
          { label: "US Rehab", href: "/us-rehab" },
          { label: "Luxury Rehab Arizona" },
        ]} />
      </div>

      <InternationalHero title="Luxury Rehab in Arizona" subtitle="Sedona • Scottsdale • Phoenix • Tucson" description="Experience transformative healing in Arizona's stunning desert landscapes. From Sedona's spiritual vortexes to Scottsdale's luxury resorts, find peace and recovery in the Southwest." keywords={["Arizona rehab", "Sedona treatment", "Scottsdale rehab", "desert healing"]} />

      <section className="py-16 md:py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 text-primary mb-4">
              <MapPin className="h-6 w-6" />
              <span className="text-sm font-semibold uppercase tracking-wide">Arizona Regions</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Treatment Destinations in Arizona</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">From spiritual Sedona to luxury Scottsdale, Arizona offers diverse healing environments.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {arizonaHighlights.map((region, index) => (
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
            <Link to="/rehab-centers/arizona" className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-semibold">Browse All Arizona Facilities →</Link>
          </div>
        </div>
      </section>

      <CountriesServed />
      <InternationalFAQ title="Arizona Treatment FAQs" subtitle="Everything you need to know about luxury rehab in the Grand Canyon State." faqs={customFAQs} schemaId="luxury-rehab-arizona-faq" />
      <PlacementCTA title="Find Your Arizona Treatment Center" description="From Sedona's spiritual healing to Scottsdale's luxury resorts, we'll place you in the perfect Arizona facility." />
    </Layout>
  );
};

export default LuxuryRehabArizona;
