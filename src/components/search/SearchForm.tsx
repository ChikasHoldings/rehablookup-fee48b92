import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Stethoscope, Shield } from "lucide-react";
import { treatmentTypes, insuranceProviders } from "@/data/treatmentCenters";

interface SearchFormProps {
  variant?: "hero" | "compact" | "compact-hero";
  initialLocation?: string;
  initialTreatmentType?: string;
  initialInsurance?: string;
  onSearchComplete?: () => void;
}

export function SearchForm({ 
  variant = "hero",
  initialLocation = "",
  initialTreatmentType = "",
  initialInsurance = "",
  onSearchComplete
}: SearchFormProps) {
  const navigate = useNavigate();
  const [location, setLocation] = useState(initialLocation);
  const [treatmentType, setTreatmentType] = useState(initialTreatmentType);
  const [insurance, setInsurance] = useState(initialInsurance);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (location) params.set("location", location);
    if (treatmentType) params.set("treatment", treatmentType);
    if (insurance) params.set("insurance", insurance);
    navigate(`/rehab-centers?${params.toString()}`);
    
    // Delay scroll to allow navigation/render
    if (onSearchComplete) {
      setTimeout(() => {
        onSearchComplete();
      }, 100);
    }
  };

  // Compact hero variant - inline search in hero
  if (variant === "compact-hero") {
    return (
      <form onSubmit={handleSubmit} className="mx-auto max-w-4xl">
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-xl sm:flex-row sm:items-center sm:gap-3 sm:p-3">
          {/* Location */}
          <div className="relative flex-1">
            <MapPin className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="City, State, or ZIP"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="h-12 w-full rounded-xl border border-input bg-background pl-11 pr-4 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          
          {/* Treatment Type */}
          <div className="relative flex-1 sm:max-w-[200px]">
            <Stethoscope className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <select
              value={treatmentType}
              onChange={(e) => setTreatmentType(e.target.value)}
              className="h-12 w-full appearance-none rounded-xl border border-input bg-background pl-11 pr-8 text-base text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Treatment Type</option>
              {treatmentTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Insurance - Hidden on mobile for space */}
          <div className="relative hidden flex-1 sm:block sm:max-w-[200px]">
            <Shield className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <select
              value={insurance}
              onChange={(e) => setInsurance(e.target.value)}
              className="h-12 w-full appearance-none rounded-xl border border-input bg-background pl-11 pr-8 text-base text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Insurance</option>
              {insuranceProviders.map((provider) => (
                <option key={provider} value={provider}>{provider}</option>
              ))}
            </select>
          </div>

          {/* Submit */}
          <Button type="submit" variant="default" size="lg" className="h-12 gap-2 px-8 text-base">
            <Search className="h-5 w-5" />
            <span className="hidden sm:inline">Find Rehab</span>
            <span className="sm:hidden">Search</span>
          </Button>
        </div>
      </form>
    );
  }

  // Compact variant for search results page - Mobile optimized
  if (variant === "compact") {
    return (
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end md:gap-3">
        {/* Location - Full width on mobile */}
        <div className="w-full md:min-w-[200px] md:flex-1">
          <label className="mb-2 block text-sm font-medium text-muted-foreground md:mb-1.5 md:text-xs">
            Location
          </label>
          <div className="relative">
            <MapPin className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground md:left-3 md:h-4 md:w-4" />
            <input
              type="text"
              placeholder="City, State, or ZIP"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="h-12 w-full rounded-xl border border-input bg-card pl-12 pr-4 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 md:h-10 md:rounded-lg md:pl-9 md:pr-3 md:text-sm"
            />
          </div>
        </div>

        {/* Treatment & Insurance - Side by side on mobile */}
        <div className="grid grid-cols-2 gap-3 md:contents">
          <div className="md:min-w-[180px] md:flex-1">
            <label className="mb-2 block text-sm font-medium text-muted-foreground md:mb-1.5 md:text-xs">
              Treatment
            </label>
            <div className="relative">
              <Stethoscope className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground md:left-3 md:h-4 md:w-4" />
              <select
                value={treatmentType}
                onChange={(e) => setTreatmentType(e.target.value)}
                className="h-12 w-full appearance-none rounded-xl border border-input bg-card pl-12 pr-4 text-base text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 md:h-10 md:rounded-lg md:pl-9 md:pr-8 md:text-sm"
              >
                <option value="">All Types</option>
                {treatmentTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="md:min-w-[180px] md:flex-1">
            <label className="mb-2 block text-sm font-medium text-muted-foreground md:mb-1.5 md:text-xs">
              Insurance
            </label>
            <div className="relative">
              <Shield className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground md:left-3 md:h-4 md:w-4" />
              <select
                value={insurance}
                onChange={(e) => setInsurance(e.target.value)}
                className="h-12 w-full appearance-none rounded-xl border border-input bg-card pl-12 pr-4 text-base text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 md:h-10 md:rounded-lg md:pl-9 md:pr-8 md:text-sm"
              >
                <option value="">Any</option>
                {insuranceProviders.map((provider) => (
                  <option key={provider} value={provider}>{provider}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Search Button - Full width on mobile */}
        <Button type="submit" className="h-12 w-full gap-2 text-base font-medium md:h-10 md:w-auto md:text-sm">
          <Search className="h-5 w-5 md:h-4 md:w-4" />
          Search
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-lg">
        <div className="grid gap-0 md:grid-cols-4">
          {/* Location */}
          <div className="border-b border-border p-4 md:border-b-0 md:border-r">
            <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <MapPin className="h-4 w-4 text-primary" />
              Location
            </label>
            <input
              type="text"
              placeholder="ZIP, City, or State"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-transparent text-base font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>

          {/* Treatment Type */}
          <div className="border-b border-border p-4 md:border-b-0 md:border-r">
            <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Stethoscope className="h-4 w-4 text-primary" />
              Treatment Type
            </label>
            <select
              value={treatmentType}
              onChange={(e) => setTreatmentType(e.target.value)}
              className="w-full appearance-none bg-transparent text-base font-medium text-foreground focus:outline-none"
            >
              <option value="">All Treatment Types</option>
              {treatmentTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Insurance */}
          <div className="border-b border-border p-4 md:border-b-0 md:border-r">
            <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Shield className="h-4 w-4 text-primary" />
              Insurance
            </label>
            <select
              value={insurance}
              onChange={(e) => setInsurance(e.target.value)}
              className="w-full appearance-none bg-transparent text-base font-medium text-foreground focus:outline-none"
            >
              <option value="">Any Insurance</option>
              {insuranceProviders.map((provider) => (
                <option key={provider} value={provider}>{provider}</option>
              ))}
            </select>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-center p-4">
            <Button type="submit" size="lg" className="w-full gap-2">
              <Search className="h-5 w-5" />
              Find Rehab Now
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
