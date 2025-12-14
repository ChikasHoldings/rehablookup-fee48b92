import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { ContactRequestForm } from "@/components/forms/ContactRequestForm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { treatmentCenters } from "@/data/treatmentCenters";
import { supabase } from "@/integrations/supabase/client";
import {
  MapPin,
  Phone,
  Star,
  CheckCircle,
  Shield,
  Clock,
  ArrowLeft,
  Building,
  Heart,
  BadgeCheck,
  Users,
} from "lucide-react";

const TreatmentCenterProfile = () => {
  const { id } = useParams<{ id: string }>();
  const [hasTrackedView, setHasTrackedView] = useState(false);
  
  // First try to find in static data
  const staticCenter = treatmentCenters.find((c) => c.id === id);
  
  // Track view for database facilities
  useEffect(() => {
    const trackView = async () => {
      if (!id || hasTrackedView || staticCenter) return;
      
      try {
        await supabase.functions.invoke('track-view', {
          body: { facility_id: id }
        });
        setHasTrackedView(true);
      } catch (error) {
        console.error('Failed to track view:', error);
      }
    };

    trackView();
  }, [id, hasTrackedView, staticCenter]);

  const center = staticCenter;

  if (!center) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <Building className="h-10 w-10 text-primary" />
          </div>
          <h1 className="mb-4 font-display text-3xl font-bold text-foreground">
            Center Not Found
          </h1>
          <p className="mb-8 text-muted-foreground">
            The treatment center you're looking for doesn't exist or has been removed.
          </p>
          <Link to="/rehab-centers">
            <Button className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Search
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header with Navy Background */}
      <section className="bg-primary py-8 md:py-12">
        <div className="container">
          {/* Breadcrumb */}
          <nav className="mb-6 flex items-center gap-2 text-sm text-primary-foreground/70">
            <Link to="/" className="hover:text-primary-foreground transition-colors">Home</Link>
            <span>/</span>
            <Link to="/rehab-centers" className="hover:text-primary-foreground transition-colors">Find Treatment</Link>
            <span>/</span>
            <span className="text-primary-foreground">{center.name}</span>
          </nav>

          <Link to="/rehab-centers" className="mb-6 inline-flex items-center gap-2 text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Search Results
          </Link>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {center.featured && (
                  <Badge className="gap-1.5 bg-accent text-accent-foreground border-0 py-1 px-3">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    Featured Center
                  </Badge>
                )}
                <Badge className="gap-1.5 bg-primary-foreground/15 text-primary-foreground border-0 py-1 px-3">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Verified Facility
                </Badge>
              </div>

              <h1 className="mb-3 font-display text-3xl font-bold text-primary-foreground md:text-4xl">
                {center.name}
              </h1>

              <p className="mb-5 flex items-center gap-2 text-lg text-primary-foreground/80">
                <MapPin className="h-5 w-5" />
                {center.address}
              </p>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 rounded-lg bg-primary-foreground/10 px-4 py-2">
                  <Star className="h-5 w-5 fill-accent text-accent" />
                  <span className="text-lg font-bold text-primary-foreground">{center.rating}</span>
                  <span className="text-sm text-primary-foreground/70">
                    ({center.reviewCount} reviews)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <a href={`tel:${center.phone}`}>
                <Button variant="hero-light" size="lg" className="w-full gap-2 shadow-lg">
                  <Phone className="h-5 w-5" />
                  Call Now: {center.phone}
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="border-b border-border bg-card py-4">
        <div className="container">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground md:gap-10">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <span>Licensed & Accredited</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span>24/7 Admissions</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span>Experienced Staff</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 md:py-16">
        <div className="container">
          <div className="grid gap-12 lg:grid-cols-3">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-10">
              {/* About */}
              <div className="animate-fade-in">
                <h2 className="mb-4 font-display text-2xl font-bold text-foreground">
                  About This Facility
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {center.description}
                </p>
              </div>

              {/* Program Overview */}
              <div className="animate-fade-in" style={{ animationDelay: "50ms" }}>
                <h2 className="mb-4 font-display text-2xl font-bold text-foreground">
                  Program Overview
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {center.programOverview}
                </p>
              </div>

              {/* Treatment Types */}
              <div className="animate-fade-in" style={{ animationDelay: "100ms" }}>
                <h2 className="mb-4 font-display text-2xl font-bold text-foreground">
                  Treatment Programs
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {center.treatmentTypes.map((type) => (
                    <div
                      key={type}
                      className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-card transition-all hover:shadow-md hover:border-primary/20"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Heart className="h-5 w-5 text-primary" />
                      </div>
                      <span className="font-medium text-foreground">{type}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Insurance */}
              <div className="animate-fade-in" style={{ animationDelay: "150ms" }}>
                <h2 className="mb-4 font-display text-2xl font-bold text-foreground">
                  Insurance Accepted
                </h2>
                <div className="flex flex-wrap gap-2">
                  {center.insuranceAccepted.map((ins) => (
                    <Badge key={ins} variant="secondary" className="gap-1.5 text-sm py-2 px-4 bg-secondary border-0">
                      <Shield className="h-3.5 w-3.5 text-primary" />
                      {ins}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Amenities */}
              <div className="animate-fade-in" style={{ animationDelay: "200ms" }}>
                <h2 className="mb-4 font-display text-2xl font-bold text-foreground">
                  Facility Amenities
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  {center.amenities.map((amenity) => (
                    <div
                      key={amenity}
                      className="flex items-center gap-2.5 text-foreground"
                    >
                      <CheckCircle className="h-4 w-4 text-accent" />
                      <span>{amenity}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Contact Form */}
            <div>
              <div className="sticky top-24 rounded-2xl border border-border bg-card p-6 shadow-lg">
                <div className="mb-6 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Phone className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-2 font-display text-xl font-bold text-foreground">
                    Request Information
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    A specialist will contact you within 24 hours
                  </p>
                </div>
                <ContactRequestForm centerName={center.name} />

                <div className="mt-6 flex items-center justify-center gap-2 border-t border-border pt-6">
                  <Clock className="h-4 w-4 text-accent" />
                  <span className="text-sm text-muted-foreground">
                    Available 24/7 for urgent inquiries
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-primary py-14 md:py-16">
        <div className="container text-center">
          <div className="mx-auto max-w-2xl">
            <h2 className="mb-4 font-display text-2xl font-bold text-primary-foreground md:text-3xl">
              Ready to Start Your Recovery Journey?
            </h2>
            <p className="mb-8 text-primary-foreground/80">
              Call now to speak directly with {center.name}'s admissions team.
            </p>
            <a href={`tel:${center.phone}`}>
              <Button variant="hero-light" size="lg" className="gap-2 shadow-xl hover:shadow-2xl transition-shadow">
                <Phone className="h-5 w-5" />
                Call {center.phone}
              </Button>
            </a>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default TreatmentCenterProfile;
