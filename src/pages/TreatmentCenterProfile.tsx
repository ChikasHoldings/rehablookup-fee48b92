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
  Globe,
  Mail,
  ExternalLink,
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
          <h1 className="mb-4 font-display text-2xl font-bold text-foreground">
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

  // Generate placeholder gallery images for demo
  const galleryImages = [
    "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1551076805-e1869033e561?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop",
  ];

  const heroImage = "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200&h=600&fit=crop";

  return (
    <Layout>
      {/* Hero Section with Image */}
      <section className="relative">
        {/* Hero Image */}
        <div className="relative h-64 w-full overflow-hidden md:h-80 lg:h-96">
          <img
            src={heroImage}
            alt={`${center.name} facility`}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/95 via-primary/60 to-transparent" />
        </div>

        {/* Content Overlay */}
        <div className="absolute inset-0 flex items-end">
          <div className="container pb-8 md:pb-10">
            {/* Breadcrumb */}
            <nav className="mb-4 flex items-center gap-2 text-xs text-primary-foreground/70">
              <Link to="/" className="transition-colors hover:text-primary-foreground">Home</Link>
              <span>/</span>
              <Link to="/rehab-centers" className="transition-colors hover:text-primary-foreground">Find Treatment</Link>
              <span>/</span>
              <span className="text-primary-foreground">{center.name}</span>
            </nav>

            <Link 
              to="/rehab-centers" 
              className="mb-4 inline-flex items-center gap-1.5 text-xs text-primary-foreground/80 transition-colors hover:text-primary-foreground"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to Results
            </Link>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                {/* Badges */}
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {center.featured && (
                    <Badge className="gap-1 border-0 bg-accent px-2.5 py-1 text-xs text-accent-foreground">
                      <Star className="h-3 w-3 fill-current" />
                      Featured
                    </Badge>
                  )}
                  <Badge className="gap-1 border-0 bg-primary-foreground/15 px-2.5 py-1 text-xs text-primary-foreground">
                    <BadgeCheck className="h-3 w-3" />
                    Verified
                  </Badge>
                </div>

                <h1 className="mb-2 font-display text-2xl font-bold text-primary-foreground md:text-3xl lg:text-4xl">
                  {center.name}
                </h1>

                <div className="flex flex-wrap items-center gap-4 text-sm text-primary-foreground/80">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {center.city}, {center.state}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Star className="h-4 w-4 fill-accent text-accent" />
                    <span className="font-semibold text-primary-foreground">{center.rating}</span>
                    <span>({center.reviewCount} reviews)</span>
                  </span>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex shrink-0 gap-2">
                <a href={`tel:${center.phone}`}>
                  <Button size="lg" className="gap-2 bg-card text-primary shadow-lg hover:bg-card/90">
                    <Phone className="h-4 w-4" />
                    <span className="hidden sm:inline">Call Now</span>
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Info Bar */}
      <section className="border-b border-border bg-card py-3">
        <div className="container">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-primary" />
              <span>Licensed & Accredited</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-primary" />
              <span>24/7 Admissions</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-primary" />
              <span>Experienced Staff</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Phone className="h-4 w-4 text-primary" />
              <span>{center.phone}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="bg-muted/30 py-10 md:py-12">
        <div className="container">
          <div className="grid gap-8 lg:grid-cols-3 lg:gap-10">
            {/* Left Column - Main Content */}
            <div className="space-y-8 lg:col-span-2">
              {/* Photo Gallery */}
              <div className="overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm">
                <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Facility Photos
                </h2>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  {galleryImages.map((img, idx) => (
                    <div 
                      key={idx} 
                      className="group relative aspect-[4/3] overflow-hidden rounded-lg"
                    >
                      <img
                        src={img}
                        alt={`${center.name} facility photo ${idx + 1}`}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* About Section */}
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <h2 className="mb-3 font-display text-lg font-semibold text-foreground">
                  About This Facility
                </h2>
                <p className="leading-relaxed text-muted-foreground">
                  {center.description}
                </p>
              </div>

              {/* Program Overview */}
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <h2 className="mb-3 font-display text-lg font-semibold text-foreground">
                  Program Overview
                </h2>
                <p className="leading-relaxed text-muted-foreground">
                  {center.programOverview}
                </p>
              </div>

              {/* Treatment Programs */}
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <h2 className="mb-4 font-display text-lg font-semibold text-foreground">
                  Treatment Programs
                </h2>
                <div className="grid gap-2 sm:grid-cols-2">
                  {center.treatmentTypes.map((type) => (
                    <div
                      key={type}
                      className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-3 transition-colors hover:border-primary/30"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                        <Heart className="h-4 w-4 text-primary" />
                      </div>
                      <span className="text-sm font-medium text-foreground">{type}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Insurance */}
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <h2 className="mb-4 font-display text-lg font-semibold text-foreground">
                  Insurance Accepted
                </h2>
                <div className="flex flex-wrap gap-2">
                  {center.insuranceAccepted.map((ins) => (
                    <Badge 
                      key={ins} 
                      variant="secondary" 
                      className="gap-1.5 border-0 bg-secondary px-3 py-1.5 text-sm"
                    >
                      <Shield className="h-3 w-3 text-primary" />
                      {ins}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Amenities */}
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <h2 className="mb-4 font-display text-lg font-semibold text-foreground">
                  Facility Amenities
                </h2>
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                  {center.amenities.map((amenity) => (
                    <div
                      key={amenity}
                      className="flex items-center gap-2 text-sm text-foreground"
                    >
                      <CheckCircle className="h-4 w-4 shrink-0 text-accent" />
                      <span>{amenity}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-6">
              {/* Contact Form Card */}
              <div className="sticky top-20 rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="mb-5 text-center">
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mb-1 font-display text-base font-semibold text-foreground">
                    Request Information
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Get a response within 24 hours
                  </p>
                </div>
                <ContactRequestForm centerName={center.name} />

                <div className="mt-4 flex items-center justify-center gap-1.5 border-t border-border pt-4 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 text-accent" />
                  <span>Available 24/7 for urgent inquiries</span>
                </div>
              </div>

              {/* Contact Info Card */}
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <h3 className="mb-4 font-display text-base font-semibold text-foreground">
                  Contact Information
                </h3>
                <div className="space-y-3">
                  <a 
                    href={`tel:${center.phone}`}
                    className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:border-primary/30 hover:bg-muted/50"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                      <Phone className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="text-sm font-medium text-foreground">{center.phone}</p>
                    </div>
                  </a>
                  
                  <div className="flex items-start gap-3 rounded-lg border border-border p-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                      <MapPin className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Address</p>
                      <p className="text-sm font-medium text-foreground">{center.address}</p>
                    </div>
                  </div>

                  <a 
                    href="#"
                    className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:border-primary/30 hover:bg-muted/50"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                      <Globe className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Website</p>
                      <p className="text-sm font-medium text-primary">Visit Website</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-border bg-card py-10">
        <div className="container">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 text-center md:flex-row md:text-left">
            <div className="flex-1">
              <h2 className="mb-1 font-display text-lg font-semibold text-foreground">
                Ready to Start Your Recovery?
              </h2>
              <p className="text-sm text-muted-foreground">
                Speak directly with {center.name}'s admissions team today.
              </p>
            </div>
            <a href={`tel:${center.phone}`}>
              <Button size="lg" className="gap-2">
                <Phone className="h-4 w-4" />
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