import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Stethoscope, Shield, Building2, Loader2, CheckCircle2, Navigation } from "lucide-react";
import { treatmentTypes as treatmentTypeOptions, insuranceProviders as insuranceProviderOptions } from "@/data/treatmentCenters";
import { getLocationSuggestions, formatLocationSuggestion, type LocationSuggestion } from "@/data/locationSuggestions";
import { MultiSelectDropdown } from "./MultiSelectDropdown";
import { useZipcodeLookup } from "@/hooks/useZipcodeLookup";
import { cn } from "@/lib/utils";
import { analytics } from "@/lib/analytics";
interface SearchFormProps {
  variant?: "hero" | "compact" | "compact-hero" | "directory";
  initialLocation?: string;
  initialTreatmentType?: string;
  initialInsurance?: string;
  onSearchComplete?: () => void;
  /** Custom target path for search results (defaults to /rehab-centers) */
  targetPath?: string;
}

export function SearchForm({ 
  variant = "hero",
  initialLocation = "",
  initialTreatmentType = "",
  initialInsurance = "",
  onSearchComplete,
  targetPath = "/search-results"
}: SearchFormProps) {
  const navigate = useNavigate();
  const [location, setLocation] = useState(initialLocation);
  const [selectedTreatmentTypes, setSelectedTreatmentTypes] = useState<string[]>(
    initialTreatmentType ? [initialTreatmentType] : []
  );
  const [selectedInsurance, setSelectedInsurance] = useState<string[]>(
    initialInsurance ? [initialInsurance] : []
  );
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [lookupTimeout, setLookupTimeout] = useState<NodeJS.Timeout | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { data: zipcodeData, isLoading: isZipLookupLoading, lookup: lookupZipcode, reset: resetZipLookup } = useZipcodeLookup();

  // Check if input is a zipcode
  const isZipcode = useMemo(() => /^\d{1,5}$/.test(location.trim()), [location]);
  const isCompleteZipcode = useMemo(() => /^\d{5}$/.test(location.trim()), [location]);
  
  const suggestions = useMemo(() => {
    if (isZipcode) return []; // Don't show suggestions for zipcode input
    return getLocationSuggestions(location);
  }, [location, isZipcode]);
  
  // Handle location change with zipcode detection
  const handleLocationChange = useCallback((value: string) => {
    setLocation(value);
    setShowSuggestions(true);
    setHighlightedIndex(-1);
    
    // Clear previous timeout
    if (lookupTimeout) {
      clearTimeout(lookupTimeout);
    }
    
    // Check if it's a complete zipcode
    const cleanZip = value.replace(/\D/g, "");
    if (cleanZip.length === 5) {
      // Debounce zipcode lookup
      const timeout = setTimeout(() => {
        lookupZipcode(cleanZip);
      }, 300);
      setLookupTimeout(timeout);
    } else {
      resetZipLookup();
    }
  }, [lookupZipcode, resetZipLookup, lookupTimeout]);
  
  // Auto-fill location when zipcode data is received
  useEffect(() => {
    if (zipcodeData && isCompleteZipcode) {
      const formattedLocation = `${zipcodeData.city}, ${zipcodeData.stateAbbr}`;
      setLocation(formattedLocation);
      setShowSuggestions(false);
    }
  }, [zipcodeData, isCompleteZipcode]);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (lookupTimeout) {
        clearTimeout(lookupTimeout);
      }
    };
  }, [lookupTimeout]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectSuggestion = (suggestion: LocationSuggestion) => {
    setLocation(formatLocationSuggestion(suggestion));
    setShowSuggestions(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelectSuggestion(suggestions[highlightedIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    
    // Sanitize location input - strip HTML/JS, limit length
    const sanitizedLocation = location
      .replace(/<[^>]*>/g, "")
      .replace(/javascript:/gi, "")
      .replace(/data:/gi, "")
      .trim()
      .slice(0, 200);
    
    // Track search in GA
    analytics.search(sanitizedLocation || "all locations");
    
    const params = new URLSearchParams();
    if (sanitizedLocation) params.set("location", sanitizedLocation);
    if (selectedTreatmentTypes.length > 0) params.set("treatment", selectedTreatmentTypes.slice(0, 10).join(","));
    if (selectedInsurance.length > 0) params.set("insurance", selectedInsurance.slice(0, 10).join(","));
    navigate(`${targetPath}?${params.toString()}`);
    
    // Delay scroll to allow navigation/render
    if (onSearchComplete) {
      setTimeout(() => {
        onSearchComplete();
      }, 100);
    }
  };

  // Directory variant - enterprise-grade horizontal search bar
  if (variant === "directory") {
    return (
      <form onSubmit={handleSubmit} className="mx-auto max-w-4xl">
        <div className="flex flex-col rounded-2xl bg-card/95 backdrop-blur-sm shadow-2xl ring-1 ring-white/15 md:flex-row">
          {/* Where */}
          <div className="group relative flex-[1.2] border-b border-border/40 transition-colors hover:bg-muted/15 md:border-b-0 md:border-r">
            <div className="p-4 md:px-5 md:py-4">
              <label className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-primary">
                {isZipLookupLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : zipcodeData && !isZipcode ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <MapPin className="h-3.5 w-3.5" />
                )}
                Location
              </label>
              <input
                ref={inputRef}
                type="text"
                placeholder="Enter city, state, or ZIP code"
                value={location}
                onChange={(e) => handleLocationChange(e.target.value.slice(0, 200))}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={handleKeyDown}
                maxLength={200}
                className={cn(
                  "w-full bg-transparent text-[15px] font-medium text-foreground placeholder:text-muted-foreground/50 focus:outline-none",
                  zipcodeData && !isZipcode && "text-green-700 dark:text-green-400"
                )}
                autoComplete="off"
              />
              {isZipLookupLoading && (
                <p className="mt-1 text-xs text-muted-foreground animate-pulse">Resolving ZIP code…</p>
              )}
            </div>
            
            {/* Autocomplete Suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-border/60 bg-card shadow-2xl animate-in fade-in-0 slide-in-from-top-1 duration-150"
              >
                <div className="py-1 px-1">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={suggestion.type === "state" ? suggestion.abbr : `${suggestion.name}-${suggestion.state}`}
                      type="button"
                      onClick={() => handleSelectSuggestion(suggestion)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[13px] transition-all duration-100",
                        index === highlightedIndex
                          ? "bg-primary/10 text-foreground"
                          : "text-foreground/80 hover:bg-muted/50"
                      )}
                    >
                      <div className={cn(
                        "h-7 w-7 rounded-md flex items-center justify-center shrink-0",
                        suggestion.type === "state" ? "bg-primary/10" : "bg-muted"
                      )}>
                        {suggestion.type === "state" ? (
                          <Navigation className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </div>
                      <span className="flex-1 truncate font-medium">
                        {formatLocationSuggestion(suggestion)}
                      </span>
                      <span className="text-xs text-muted-foreground/60 font-semibold uppercase tracking-wider bg-muted/50 px-1.5 py-0.5 rounded">
                        {suggestion.type === "state" ? "State" : "City"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Type of Care - Multi-select */}
          <div className="group flex-1 border-b border-border/40 transition-colors hover:bg-muted/15 md:border-b-0 md:border-r">
            <div className="p-4 md:px-5 md:py-4">
              <MultiSelectDropdown
                options={treatmentTypeOptions}
                selected={selectedTreatmentTypes}
                onChange={setSelectedTreatmentTypes}
                placeholder="Select care level"
                icon={<Stethoscope className="h-3.5 w-3.5" />}
                label="Type of Care"
              />
            </div>
          </div>

          {/* Insurance - Multi-select */}
          <div className="group flex-1 border-b border-border/40 transition-colors hover:bg-muted/15 md:border-b-0 md:border-r">
            <div className="p-4 md:px-5 md:py-4">
              <MultiSelectDropdown
                options={insuranceProviderOptions}
                selected={selectedInsurance}
                onChange={setSelectedInsurance}
                placeholder="Select your plan"
                icon={<Shield className="h-3.5 w-3.5" />}
                label="Insurance"
                searchable
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center p-3 md:p-4">
            <Button type="submit" size="lg" className="w-full h-12 px-8 text-[15px] font-bold shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl md:w-auto gap-2.5 rounded-xl">
              <Search className="h-5 w-5" />
              Search Centers
            </Button>
          </div>
        </div>
      </form>
    );
  }

  // Compact hero variant - inline search in hero
  if (variant === "compact-hero") {
    return (
      <form onSubmit={handleSubmit} className="mx-auto max-w-4xl">
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-xl sm:flex-row sm:items-center sm:gap-3 sm:p-3">
          {/* Location */}
          <div className="relative flex-1">
            {isZipLookupLoading ? (
              <Loader2 className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary animate-spin" />
            ) : zipcodeData && !isZipcode ? (
              <CheckCircle2 className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-green-500" />
            ) : (
              <MapPin className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            )}
            <input
              type="text"
              placeholder="City, State, or ZIP"
              value={location}
              onChange={(e) => handleLocationChange(e.target.value.slice(0, 200))}
              maxLength={200}
              className={cn(
                "h-12 w-full rounded-xl border border-input bg-background pl-11 pr-4 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
                zipcodeData && !isZipcode && "border-green-200 bg-green-50/50 dark:bg-green-950/20"
              )}
            />
          </div>
          
          {/* Treatment Type */}
          <div className="relative flex-1 sm:max-w-[200px]">
            <Stethoscope className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <select
              value={selectedTreatmentTypes[0] || ""}
              onChange={(e) => setSelectedTreatmentTypes(e.target.value ? [e.target.value] : [])}
              className="h-12 w-full appearance-none rounded-xl border border-input bg-background pl-11 pr-8 text-base text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Treatment Type</option>
              {treatmentTypeOptions.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Insurance - Hidden on mobile for space */}
          <div className="relative hidden flex-1 sm:block sm:max-w-[200px]">
            <Shield className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <select
              value={selectedInsurance[0] || ""}
              onChange={(e) => setSelectedInsurance(e.target.value ? [e.target.value] : [])}
              className="h-12 w-full appearance-none rounded-xl border border-input bg-background pl-11 pr-8 text-base text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Insurance</option>
              {insuranceProviderOptions.map((provider) => (
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
            {isZipLookupLoading ? (
              <Loader2 className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary animate-spin md:left-3 md:h-4 md:w-4" />
            ) : zipcodeData && !isZipcode ? (
              <CheckCircle2 className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-green-500 md:left-3 md:h-4 md:w-4" />
            ) : (
              <MapPin className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground md:left-3 md:h-4 md:w-4" />
            )}
            <input
              type="text"
              placeholder="City, State, or ZIP"
              value={location}
              onChange={(e) => handleLocationChange(e.target.value.slice(0, 200))}
              maxLength={200}
              className={cn(
                "h-12 w-full rounded-xl border border-input bg-card pl-12 pr-4 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 md:h-10 md:rounded-lg md:pl-9 md:pr-3 md:text-sm",
                zipcodeData && !isZipcode && "border-green-200 bg-green-50/50 dark:bg-green-950/20"
              )}
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
                value={selectedTreatmentTypes[0] || ""}
                onChange={(e) => setSelectedTreatmentTypes(e.target.value ? [e.target.value] : [])}
                className="h-12 w-full appearance-none rounded-xl border border-input bg-card pl-12 pr-4 text-base text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 md:h-10 md:rounded-lg md:pl-9 md:pr-8 md:text-sm"
              >
                <option value="">All Types</option>
                {treatmentTypeOptions.map((type) => (
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
                value={selectedInsurance[0] || ""}
                onChange={(e) => setSelectedInsurance(e.target.value ? [e.target.value] : [])}
                className="h-12 w-full appearance-none rounded-xl border border-input bg-card pl-12 pr-4 text-base text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 md:h-10 md:rounded-lg md:pl-9 md:pr-8 md:text-sm"
              >
                <option value="">Any</option>
                {insuranceProviderOptions.map((provider) => (
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
              {isZipLookupLoading ? (
                <Loader2 className="h-4 w-4 text-primary animate-spin" />
              ) : zipcodeData && !isZipcode ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <MapPin className="h-4 w-4 text-primary" />
              )}
              Location
            </label>
            <input
              type="text"
              placeholder="ZIP, City, or State"
              value={location}
              onChange={(e) => handleLocationChange(e.target.value)}
              className={cn(
                "w-full bg-transparent text-base font-medium text-foreground placeholder:text-muted-foreground focus:outline-none",
                zipcodeData && !isZipcode && "text-green-700 dark:text-green-400"
              )}
            />
            {isZipLookupLoading && (
              <p className="mt-1 text-xs text-muted-foreground animate-pulse">Looking up ZIP...</p>
            )}
          </div>

          {/* Treatment Type */}
          <div className="border-b border-border p-4 md:border-b-0 md:border-r">
            <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Stethoscope className="h-4 w-4 text-primary" />
              Treatment Type
            </label>
            <select
              value={selectedTreatmentTypes[0] || ""}
              onChange={(e) => setSelectedTreatmentTypes(e.target.value ? [e.target.value] : [])}
              className="w-full appearance-none bg-transparent text-base font-medium text-foreground focus:outline-none"
            >
              <option value="">All Treatment Types</option>
              {treatmentTypeOptions.map((type) => (
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
              value={selectedInsurance[0] || ""}
              onChange={(e) => setSelectedInsurance(e.target.value ? [e.target.value] : [])}
              className="w-full appearance-none bg-transparent text-base font-medium text-foreground focus:outline-none"
            >
              <option value="">Any Insurance</option>
              {insuranceProviderOptions.map((provider) => (
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
