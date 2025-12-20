import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Stethoscope, Shield, Building2, ChevronDown, Check } from "lucide-react";
import { treatmentTypes, insuranceProviders } from "@/data/treatmentCenters";
import { getLocationSuggestions, formatLocationSuggestion, type LocationSuggestion } from "@/data/locationSuggestions";

interface SearchFormProps {
  variant?: "hero" | "compact" | "compact-hero" | "directory";
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
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showTreatmentDropdown, setShowTreatmentDropdown] = useState(false);
  const [showInsuranceDropdown, setShowInsuranceDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const treatmentDropdownRef = useRef<HTMLDivElement>(null);
  const insuranceDropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(() => getLocationSuggestions(location), [location]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(target) &&
        inputRef.current &&
        !inputRef.current.contains(target)
      ) {
        setShowSuggestions(false);
      }
      
      if (
        treatmentDropdownRef.current &&
        !treatmentDropdownRef.current.contains(target)
      ) {
        setShowTreatmentDropdown(false);
      }
      
      if (
        insuranceDropdownRef.current &&
        !insuranceDropdownRef.current.contains(target)
      ) {
        setShowInsuranceDropdown(false);
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

  // Directory variant - Rehabs.com style horizontal search bar
  if (variant === "directory") {
    return (
      <form onSubmit={handleSubmit} className="mx-auto max-w-4xl">
        <div className="flex flex-col overflow-hidden rounded-xl bg-card shadow-2xl ring-1 ring-white/10 md:flex-row">
          {/* Where */}
          <div className="group relative flex-1 border-b border-border/50 transition-colors hover:bg-muted/30 md:border-b-0 md:border-r">
            <div className="p-4 md:p-5">
              <label className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                <MapPin className="h-3.5 w-3.5" />
                Where
              </label>
              <input
                ref={inputRef}
                type="text"
                placeholder="City, State, or ZIP code"
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  setShowSuggestions(true);
                  setHighlightedIndex(-1);
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={handleKeyDown}
                className="w-full bg-transparent text-base text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
                autoComplete="off"
              />
            </div>
            
            {/* Autocomplete Suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-border bg-card shadow-xl"
              >
                {suggestions.map((suggestion, index) => (
                  <button
                    key={suggestion.type === "state" ? suggestion.abbr : `${suggestion.name}-${suggestion.state}`}
                    type="button"
                    onClick={() => handleSelectSuggestion(suggestion)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      index === highlightedIndex
                        ? "bg-primary/10 text-foreground"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    {suggestion.type === "state" ? (
                      <MapPin className="h-4 w-4 shrink-0 text-primary" />
                    ) : (
                      <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="flex-1 truncate">
                      {formatLocationSuggestion(suggestion)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {suggestion.type === "state" ? "State" : "City"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Type of Care - Custom Dropdown */}
          <div ref={treatmentDropdownRef} className="group relative flex-1 border-b border-border/50 transition-colors hover:bg-muted/30 md:border-b-0 md:border-r">
            <button
              type="button"
              onClick={() => {
                setShowTreatmentDropdown(!showTreatmentDropdown);
                setShowInsuranceDropdown(false);
                setShowSuggestions(false);
              }}
              className="w-full p-4 text-left md:p-5"
            >
              <span className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                <Stethoscope className="h-3.5 w-3.5" />
                Type of Care
              </span>
              <div className="flex items-center justify-between">
                <span className={`text-base ${treatmentType ? "text-foreground" : "text-muted-foreground/70"}`}>
                  {treatmentType || "All treatment types"}
                </span>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showTreatmentDropdown ? "rotate-180" : ""}`} />
              </div>
            </button>
            
            {/* Treatment Dropdown Menu */}
            {showTreatmentDropdown && (
              <div className="absolute left-0 right-0 top-full z-50 max-h-64 overflow-y-auto rounded-lg border border-border bg-card shadow-xl">
                <button
                  type="button"
                  onClick={() => {
                    setTreatmentType("");
                    setShowTreatmentDropdown(false);
                  }}
                  className={`flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-muted ${
                    !treatmentType ? "bg-primary/10" : ""
                  }`}
                >
                  <span className="text-foreground">All treatment types</span>
                  {!treatmentType && <Check className="h-4 w-4 text-primary" />}
                </button>
                {treatmentTypes.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setTreatmentType(type);
                      setShowTreatmentDropdown(false);
                    }}
                    className={`flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-muted ${
                      treatmentType === type ? "bg-primary/10" : ""
                    }`}
                  >
                    <span className="text-foreground">{type}</span>
                    {treatmentType === type && <Check className="h-4 w-4 text-primary" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Insurance - Custom Dropdown */}
          <div ref={insuranceDropdownRef} className="group relative flex-1 border-b border-border/50 transition-colors hover:bg-muted/30 md:border-b-0 md:border-r">
            <button
              type="button"
              onClick={() => {
                setShowInsuranceDropdown(!showInsuranceDropdown);
                setShowTreatmentDropdown(false);
                setShowSuggestions(false);
              }}
              className="w-full p-4 text-left md:p-5"
            >
              <span className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                <Shield className="h-3.5 w-3.5" />
                Insurance
              </span>
              <div className="flex items-center justify-between">
                <span className={`text-base ${insurance ? "text-foreground" : "text-muted-foreground/70"}`}>
                  {insurance || "All insurance"}
                </span>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showInsuranceDropdown ? "rotate-180" : ""}`} />
              </div>
            </button>
            
            {/* Insurance Dropdown Menu */}
            {showInsuranceDropdown && (
              <div className="absolute left-0 right-0 top-full z-50 max-h-64 overflow-y-auto rounded-lg border border-border bg-card shadow-xl">
                <button
                  type="button"
                  onClick={() => {
                    setInsurance("");
                    setShowInsuranceDropdown(false);
                  }}
                  className={`flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-muted ${
                    !insurance ? "bg-primary/10" : ""
                  }`}
                >
                  <span className="text-foreground">All insurance</span>
                  {!insurance && <Check className="h-4 w-4 text-primary" />}
                </button>
                {insuranceProviders.map((provider) => (
                  <button
                    key={provider}
                    type="button"
                    onClick={() => {
                      setInsurance(provider);
                      setShowInsuranceDropdown(false);
                    }}
                    className={`flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-muted ${
                      insurance === provider ? "bg-primary/10" : ""
                    }`}
                  >
                    <span className="text-foreground">{provider}</span>
                    {insurance === provider && <Check className="h-4 w-4 text-primary" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex items-center bg-primary/5 p-3 md:p-4">
            <Button type="submit" size="lg" className="w-full h-12 px-8 text-base font-bold shadow-lg transition-transform hover:scale-[1.02] md:w-auto gap-2">
              <Search className="h-5 w-5" />
              Find Rehab
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
