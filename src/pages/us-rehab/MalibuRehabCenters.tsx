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
import { Waves, Star, Shield, Sunset, Heart, Sparkles } from "lucide-react";

const malibuFeatures = [
  { icon: Waves, title: "Oceanfront Settings", description: "Wake up to Pacific Ocean views and beach access for healing in nature" },
  { icon: Star, title: "Celebrity-Level Care", description: "Treatment refined by decades of serving Hollywood's elite" },
  { icon: Shield, title: "Ultimate Privacy", description: "Gated estates and discrete protocols protect your identity" },
  { icon: Sunset, title: "Healing Environment", description: "California's most beautiful coastline for peaceful recovery" },
  { icon: Heart, title: "Holistic Programs", description: "Surf therapy, yoga, meditation, and wellness-focused care" },
  { icon: Sparkles, title: "Luxury Amenities", description: "Spa services, gourmet cuisine, and five-star accommodations" }
];

const MalibuRehabCenters = () => {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Malibu Rehab Centers",
    "description": "Exclusive oceanfront addiction treatment centers in Malibu, California offering luxury accommodations, privacy, and world-class clinical care in a stunning Pacific Coast setting.",
    "provider": { "@type": "Organization", "name": "RehabLookup" },
    "areaServed": { "@type": "Place", "name": "Malibu, California" }
  };

  const customFAQs = [
    { question: "What makes Malibu rehab so special?", answer: "Malibu pioneered luxury addiction treatment in the 1980s and remains the gold standard. The combination of stunning oceanfront locations, perfect weather, proximity to LA's top therapists, celebrity-level privacy, and holistic programs creates an unparalleled healing environment." },
    { question: "How much does Malibu rehab cost?", answer: "Malibu treatment centers are among the most expensive in the world, ranging from $50,000-$150,000+ per month. These prices reflect oceanfront real estate, high staff ratios, premium amenities, and decades of treatment excellence." },
    { question: "Is Malibu rehab worth the price?", answer: "For clients who value luxury, privacy, and the most beautiful treatment setting available, Malibu delivers exceptional value. The environment itself is therapeutic, and access to Southern California's top addiction specialists is unmatched." },
    { question: "What celebrities have gone to Malibu rehab?", answer: "Malibu facilities are known for strict confidentiality and don't confirm patient identities. However, the area is renowned for treating entertainment industry professionals, executives, and high-profile individuals who need absolute discretion." },
    { question: "What therapies are unique to Malibu?", answer: "Malibu programs often incorporate surf therapy, beach meditation, dolphin-watching excursions, ocean-side yoga, and outdoor fitness in the perfect California climate. Many use the natural environment as a core therapeutic tool." },
    { question: "How private are Malibu treatment centers?", answer: "Extremely private. Most are located on gated estates in Malibu's hills or along private beaches. Staff sign strict NDAs, facilities have no-photography policies, and security protocols are designed for celebrity-level protection." }
  ];

  return (
    <Layout>
      <SEO
        title="Malibu Rehab Centers | Oceanfront Luxury Treatment California"
        description="Discover Malibu's exclusive oceanfront rehab centers. Luxury addiction treatment with Pacific Ocean views, celebrity-level privacy, and world-class clinical care. International patients welcome."
        canonical="/us-rehab/malibu-rehab"
        keywords={["Malibu rehab centers", "oceanfront rehab California", "luxury Malibu treatment", "celebrity rehab Malibu", "beachfront addiction treatment", "Malibu drug rehab"]}
        structuredData={schemaData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "US Rehab", url: "/us-rehab" },
          { name: "Malibu Rehab", url: "/us-rehab/malibu-rehab" },
        ]}
      />

      <div className="container mx-auto px-4 pt-4">
        <BreadcrumbNav className="mb-4" items={[
          { label: "US Rehab", href: "/us-rehab" },
          { label: "Malibu Rehab Centers" },
        ]} />
      </div>

      <InternationalHero title="Malibu Rehab Centers" subtitle="Oceanfront Luxury on California's Coast" description="Experience addiction treatment in the world's most exclusive setting. Malibu's oceanfront facilities offer Pacific views, celebrity-level privacy, and transformative healing in paradise." keywords={["Malibu rehab", "oceanfront treatment", "luxury California rehab", "celebrity treatment"]} />

      <section className="py-16 md:py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 text-primary mb-4">
              <Waves className="h-6 w-6" />
              <span className="text-sm font-semibold uppercase tracking-wide">The Malibu Experience</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Why Malibu is the Gold Standard</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">For over 40 years, Malibu has defined luxury addiction treatment with its unmatched combination of natural beauty and clinical excellence.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {malibuFeatures.map((feature, index) => (
              <div key={index} className="p-6 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors">
                <div className="w-12 h-12 bg-cyan-500/10 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-cyan-500" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link to="/us-rehab/luxury-rehab-california" className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-semibold">Explore All California Treatment Options →</Link>
          </div>
        </div>
      </section>

      <CountriesServed />
      <InternationalFAQ title="Malibu Treatment FAQs" subtitle="Everything you need to know about luxury rehab in Malibu." faqs={customFAQs} schemaId="malibu-rehab-faq" />
      <PlacementCTA title="Experience Malibu Treatment" description="Let us connect you with Malibu's most exclusive oceanfront treatment facilities. Your healing journey in paradise awaits." />
    </Layout>
  );
};

export default MalibuRehabCenters;
