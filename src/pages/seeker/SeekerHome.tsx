import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, MapPin, FileText, HelpCircle, Shield, Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface NearbyFacility {
  id: string;
  name: string;
  city: string;
  state: string;
  facility_type: string;
  slug: string;
}

export default function SeekerHome() {
  const [searchQuery, setSearchQuery] = useState("");
  const [nearbyFacilities, setNearbyFacilities] = useState<NearbyFacility[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchNearbyFacilities = async () => {
      // For now, just fetch some approved facilities
      // In a real implementation, this would use geolocation
      const { data } = await supabase
        .from('facilities')
        .select('id, name, city, state, facility_type, slug')
        .eq('status', 'approved')
        .limit(6);
      
      setNearbyFacilities(data || []);
      setIsLoading(false);
    };

    fetchNearbyFacilities();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search-results?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  // Show discovery layout when no nearby facilities
  if (!isLoading && nearbyFacilities.length === 0) {
    return (
      <div className="min-h-full">
        {/* Search Section */}
        <div className="bg-gradient-to-b from-primary/5 to-background py-12 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-4">
              Find Treatment Near You
            </h1>
            <p className="text-muted-foreground mb-6">
              Search for addiction treatment centers by location, treatment type, or facility name.
            </p>
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by city, state, or zip code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12"
                />
              </div>
              <Button type="submit" size="lg" className="h-12">
                Search
              </Button>
            </form>
          </div>
        </div>

        {/* Quick Links Grid */}
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Popular Pages */}
            <Card className="border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="h-5 w-5 text-primary" />
                  <h2 className="font-display font-semibold text-lg">Popular Pages</h2>
                </div>
                <div className="space-y-3">
                  <Link 
                    to="/rehab-centers" 
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <FileText className="h-4 w-4" />
                    Find Rehab Centers
                  </Link>
                  <Link 
                    to="/request-help" 
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <HelpCircle className="h-4 w-4" />
                    Request Help
                  </Link>
                  <Link 
                    to="/how-it-works" 
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <HelpCircle className="h-4 w-4" />
                    How It Works
                  </Link>
                  <Link 
                    to="/insurance" 
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Shield className="h-4 w-4" />
                    Insurance Coverage
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Find Treatment */}
            <Card className="border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="h-5 w-5 text-primary" />
                  <h2 className="font-display font-semibold text-lg">Find Treatment</h2>
                </div>
                <div className="space-y-3">
                  <Link 
                    to="/drug-rehab-near-me" 
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <MapPin className="h-4 w-4" />
                    Drug Rehab Near Me
                  </Link>
                  <Link 
                    to="/alcohol-rehab-near-me" 
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <MapPin className="h-4 w-4" />
                    Alcohol Rehab Near Me
                  </Link>
                  <Link 
                    to="/detox-near-me" 
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <MapPin className="h-4 w-4" />
                    Detox Centers
                  </Link>
                  <Link 
                    to="/inpatient-rehab-near-me" 
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <MapPin className="h-4 w-4" />
                    Inpatient Treatment
                  </Link>
                  <Link 
                    to="/outpatient-near-me" 
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <MapPin className="h-4 w-4" />
                    Outpatient Programs
                  </Link>
                  <Link 
                    to="/dual-diagnosis-near-me" 
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <MapPin className="h-4 w-4" />
                    Dual Diagnosis
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Call to Action */}
          <Card className="mt-8 bg-muted/50 border-border/50">
            <CardContent className="p-6 text-center">
              <p className="text-primary font-medium mb-2">Need immediate help?</p>
              <h3 className="text-lg font-display font-semibold mb-4">
                Our support team is available 24/7 to connect you with treatment
              </h3>
              <Button asChild className="bg-amber-500 hover:bg-amber-600 text-white">
                <Link to="/request-help">
                  <Phone className="h-4 w-4 mr-2" />
                  Request a Call Back
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show nearby facilities feed
  return (
    <div className="min-h-full">
      {/* Search Section */}
      <div className="bg-card border-b border-border py-4 px-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search treatment centers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit">Search</Button>
          </form>
        </div>
      </div>

      {/* Nearby Facilities */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        <h2 className="text-lg font-display font-semibold mb-4">
          Treatment Centers Near You
        </h2>
        
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-5 bg-muted rounded w-2/3 mb-2" />
                  <div className="h-4 bg-muted rounded w-1/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {nearbyFacilities.map((facility) => (
              <Link key={facility.id} to={`/center/${facility.slug}`}>
                <Card className="hover:border-primary/50 transition-colors">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-foreground mb-1">
                      {facility.name}
                    </h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {facility.city}, {facility.state}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {facility.facility_type}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
