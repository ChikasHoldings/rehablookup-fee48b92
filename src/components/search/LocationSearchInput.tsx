import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { MapPin, Building2, Loader2, CheckCircle2, Navigation } from "lucide-react";
import { useZipcodeLookup } from "@/hooks/useZipcodeLookup";
import { getLocationSuggestions, formatLocationSuggestion, type LocationSuggestion } from "@/data/locationSuggestions";
import { cn } from "@/lib/utils";

interface LocationSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onLocationDetected?: (data: { city: string; state: string; stateAbbr: string; zipcode: string }) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  showIcon?: boolean;
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
  disabled = false,
  variant = "default",
}: LocationSearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [lookupTimeout, setLookupTimeout] = useState<NodeJS.Timeout | null>(null);
  
  const { data: zipcodeData, isLoading, lookup, reset } = useZipcodeLookup();
  
  // Check if input is a zipcode
  const isZipcode = useMemo(() => /^\d{1,5}$/.test(value.trim()), [value]);
  const isCompleteZipcode = useMemo(() => /^\d{5}$/.test(value.trim()), [value]);
  
  // Get suggestions based on input
  const suggestions = useMemo(() => {
    if (isZipcode) return []; // Don't show suggestions for zipcode input
    return getLocationSuggestions(value);
  }, [value, isZipcode]);
  
  // Handle input change with zipcode detection
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setShowSuggestions(true);
    setHighlightedIndex(-1);
    
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
  }, [onChange, lookup, reset, lookupTimeout]);
  
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
    if (isLoading) {
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
  
  if (variant === "hero") {
    return (
      <div className={cn("relative", className)}>
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
            isLoading && "pr-12"
          )}
          autoComplete="off"
          disabled={disabled}
        />
        {isLoading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}
        
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
    );
  }
  
  // Default and compact variants
  return (
    <div className={cn("relative", className)}>
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
        disabled={disabled}
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
  );
}
