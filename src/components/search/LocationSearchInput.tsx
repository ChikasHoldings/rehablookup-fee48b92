import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { MapPin, Building2, Loader2, CheckCircle2, Navigation, Crosshair } from "lucide-react";
import { useZipcodeLookup } from "@/hooks/useZipcodeLookup";
import { getLocationSuggestions, formatLocationSuggestion, type LocationSuggestion } from "@/data/locationSuggestions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

interface LocationSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onLocationDetected?: (data: { city: string; state: string; stateAbbr: string; zipcode: string }) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  showIcon?: boolean;
  showGeolocation?: boolean;
  disabled?: boolean;
  variant?: "default" | "hero" | "compact";
}

export function LocationSearchInput({
  value,
  onChange,
  onLocationDetected,
  placeholder = "City, State, or ZIP code",
  className,
  inputClassName,
  showIcon = true,
  showGeolocation = true,
  disabled = false,
  variant = "default",
}: LocationSearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [lookupTimeout, setLookupTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isGeolocating, setIsGeolocating] = useState(false);
  
  const { data: zipcodeData, isLoading, lookup, reset } = useZipcodeLookup();

  // Reverse geocode coordinates to get location info
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      // Use OpenStreetMap Nominatim for reverse geocoding (free, no API key needed)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        { headers: { "Accept-Language": "en" } }
      );
      
      if (!response.ok) throw new Error("Geocoding failed");
      
      const data = await response.json();
      const address = data.address;
      
      if (address) {
        const city = address.city || address.town || address.village || address.municipality || "";
        const state = address.state || "";
        const postcode = address.postcode || "";
        
        // Get state abbreviation from the zipcode lookup
        if (postcode) {
          const zipcodeResult = await lookup(postcode);
          if (zipcodeResult) {
            const formattedLocation = `${zipcodeResult.city}, ${zipcodeResult.stateAbbr}`;
            onChange(formattedLocation);
            
            if (onLocationDetected) {
              onLocationDetected({
                city: zipcodeResult.city,
                state: zipcodeResult.state,
                stateAbbr: zipcodeResult.stateAbbr,
                zipcode: postcode,
              });
            }
            toast.success(`Location detected: ${formattedLocation}`);
            return;
          }
        }
        
        // Fallback if zipcode lookup fails
        if (city && state) {
          const formattedLocation = `${city}, ${state}`;
          onChange(formattedLocation);
          toast.success(`Location detected: ${formattedLocation}`);
        } else {
          throw new Error("Could not determine location");
        }
      } else {
        throw new Error("No address found");
      }
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      toast.error("Could not determine your location. Please enter it manually.");
    }
  }, [lookup, onChange, onLocationDetected]);

  // Handle geolocation button click
  const handleGeolocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    
    setIsGeolocating(true);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        await reverseGeocode(position.coords.latitude, position.coords.longitude);
        setIsGeolocating(false);
      },
      (error) => {
        setIsGeolocating(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error("Location access denied. Please enable location permissions.");
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error("Location information is unavailable.");
            break;
          case error.TIMEOUT:
            toast.error("Location request timed out. Please try again.");
            break;
          default:
            toast.error("An error occurred while getting your location.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }, [reverseGeocode]);
  
  // Check if input is a zipcode
  const isZipcode = useMemo(() => /^\d{1,5}$/.test(value.trim()), [value]);
  const isCompleteZipcode = useMemo(() => /^\d{5}$/.test(value.trim()), [value]);
  
  // Get suggestions based on input
  const suggestions = useMemo(() => {
    if (isZipcode) return []; // Don't show suggestions for zipcode input
    return getLocationSuggestions(value);
  }, [value, isZipcode]);
  
  // Handle input change with zipcode detection and "near me" detection
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setShowSuggestions(true);
    setHighlightedIndex(-1);
    
    // Detect "near me" input and auto-trigger geolocation
    const normalizedInput = newValue.trim().toLowerCase().replace(/[^a-z\s]/g, "");
    if (normalizedInput === "near me" || normalizedInput === "nearme" || normalizedInput === "my location") {
      handleGeolocation();
      return;
    }
    
    // Clear previous timeout
    if (lookupTimeout) {
      clearTimeout(lookupTimeout);
    }
    
    // Check if it's a complete zipcode
    const cleanZip = newValue.replace(/\D/g, "");
    if (cleanZip.length === 5) {
      // Debounce zipcode lookup
      const timeout = setTimeout(() => {
        lookup(cleanZip);
      }, 300);
      setLookupTimeout(timeout);
    } else {
      reset();
    }
  }, [onChange, lookup, reset, lookupTimeout, handleGeolocation]);
  
  // Auto-fill location when zipcode data is received
  useEffect(() => {
    if (zipcodeData && isCompleteZipcode) {
      const formattedLocation = `${zipcodeData.city}, ${zipcodeData.stateAbbr}`;
      onChange(formattedLocation);
      
      if (onLocationDetected) {
        onLocationDetected({
          city: zipcodeData.city,
          state: zipcodeData.state,
          stateAbbr: zipcodeData.stateAbbr,
          zipcode: value.trim(),
        });
      }
      
      setShowSuggestions(false);
    }
  }, [zipcodeData, isCompleteZipcode, onChange, onLocationDetected, value]);
  
  // Handle suggestion selection
  const handleSelectSuggestion = useCallback((suggestion: LocationSuggestion) => {
    const formatted = formatLocationSuggestion(suggestion);
    onChange(formatted);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    
    if (onLocationDetected && suggestion.type === "city") {
      onLocationDetected({
        city: suggestion.name,
        state: suggestion.state,
        stateAbbr: suggestion.state,
        zipcode: "",
      });
    }
  }, [onChange, onLocationDetected]);
  
  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === "Escape") {
        setShowSuggestions(false);
      }
      return;
    }
    
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
  }, [showSuggestions, suggestions, highlightedIndex, handleSelectSuggestion]);
  
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
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (lookupTimeout) {
        clearTimeout(lookupTimeout);
      }
    };
  }, [lookupTimeout]);
  
  const getStatusIcon = () => {
    if (isLoading || isGeolocating) {
      return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    }
    if (zipcodeData && !isZipcode) {
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    }
    return <MapPin className="h-4 w-4 text-muted-foreground" />;
  };
  
  const baseInputClasses = cn(
    "w-full bg-transparent text-foreground placeholder:text-muted-foreground/70 focus:outline-none transition-colors",
    inputClassName
  );

  const GeolocationButton = ({ size = "default" }: { size?: "default" | "sm" }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleGeolocation}
            disabled={disabled || isGeolocating}
            className={cn(
              "shrink-0 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors",
              size === "sm" ? "h-8 w-8" : "h-10 w-10"
            )}
          >
            {isGeolocating ? (
              <Loader2 className={cn("animate-spin", size === "sm" ? "h-4 w-4" : "h-5 w-5")} />
            ) : (
              <Crosshair className={cn(size === "sm" ? "h-4 w-4" : "h-5 w-5")} />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Use my current location</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
  
  if (variant === "hero") {
    return (
      <div className={cn("relative flex items-center gap-2", className)}>
        <div className="relative flex-1">
          {showIcon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
              {getStatusIcon()}
            </div>
          )}
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={handleInputChange}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            className={cn(
              baseInputClasses,
              "h-14 rounded-xl border border-input bg-background px-12 text-lg focus:border-primary focus:ring-2 focus:ring-primary/20",
              showIcon && "pl-12",
              (isLoading || showGeolocation) && "pr-4"
            )}
            autoComplete="off"
            disabled={disabled || isGeolocating}
          />
          
          {/* Suggestions dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-border bg-card shadow-xl"
            >
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion.type === "state" ? suggestion.abbr : `${suggestion.name}-${suggestion.state}`}
                  type="button"
                  onClick={() => handleSelectSuggestion(suggestion)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                    index === highlightedIndex
                      ? "bg-primary/10 text-foreground"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  {suggestion.type === "state" ? (
                    <Navigation className="h-4 w-4 shrink-0 text-primary" />
                  ) : (
                    <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="flex-1 truncate font-medium">
                    {formatLocationSuggestion(suggestion)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {suggestion.type === "state" ? "State" : "City"}
                  </span>
                </button>
              ))}
            </div>
          )}
          
          {/* Zipcode lookup status */}
          {isCompleteZipcode && isLoading && (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-xl border border-border bg-card p-3 shadow-xl">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Looking up ZIP code...
              </div>
            </div>
          )}
        </div>
        
        {showGeolocation && <GeolocationButton />}
      </div>
    );
  }
  
  // Default and compact variants
  return (
    <div className={cn("relative flex items-center gap-1", className)}>
      <div className="relative flex-1">
        {showIcon && (
          <div className={cn(
            "absolute top-1/2 -translate-y-1/2 z-10",
            variant === "compact" ? "left-3" : "left-4"
          )}>
            {getStatusIcon()}
          </div>
        )}
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          className={cn(
            baseInputClasses,
            variant === "compact" 
              ? "h-10 rounded-lg text-sm pl-9 pr-3" 
              : "h-12 rounded-xl text-base pl-11 pr-4",
            "border border-input bg-background focus:border-primary focus:ring-2 focus:ring-primary/20"
          )}
          autoComplete="off"
          disabled={disabled || isGeolocating}
        />
        
        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-border bg-card shadow-lg"
          >
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion.type === "state" ? suggestion.abbr : `${suggestion.name}-${suggestion.state}`}
                type="button"
                onClick={() => handleSelectSuggestion(suggestion)}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
                  index === highlightedIndex
                    ? "bg-primary/10 text-foreground"
                    : "text-foreground hover:bg-muted"
                )}
              >
                {suggestion.type === "state" ? (
                  <Navigation className="h-3.5 w-3.5 shrink-0 text-primary" />
                ) : (
                  <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
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
      
      {showGeolocation && <GeolocationButton size={variant === "compact" ? "sm" : "default"} />}
    </div>
  );
}
