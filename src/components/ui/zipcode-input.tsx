import { useState, useEffect, useCallback } from "react";
import { Input } from "./input";
import { Label } from "./label";
import { Loader2, MapPin, CheckCircle2, AlertCircle } from "lucide-react";
import { useZipcodeLookup } from "@/hooks/useZipcodeLookup";
import { cn } from "@/lib/utils";

interface ZipcodeInputProps {
  zipcode: string;
  city: string;
  state: string;
  onZipcodeChange: (zipcode: string) => void;
  onCityChange: (city: string) => void;
  onStateChange: (state: string) => void;
  onCityStateChange?: (cityState: string) => void;
  zipcodeError?: string;
  cityError?: string;
  stateError?: string;
  showLabels?: boolean;
  layout?: "horizontal" | "vertical" | "compact";
  className?: string;
  disabled?: boolean;
}

export function ZipcodeInput({
  zipcode,
  city,
  state,
  onZipcodeChange,
  onCityChange,
  onStateChange,
  onCityStateChange,
  zipcodeError,
  cityError,
  stateError,
  showLabels = true,
  layout = "horizontal",
  className,
  disabled = false,
}: ZipcodeInputProps) {
  const { data, isLoading, error, lookup, reset } = useZipcodeLookup();
  const [hasAutoFilled, setHasAutoFilled] = useState(false);
  const [lookupTimeout, setLookupTimeout] = useState<NodeJS.Timeout | null>(null);

  // Debounced zipcode lookup
  const handleZipcodeChange = useCallback((value: string) => {
    const cleanValue = value.replace(/\D/g, "").slice(0, 5);
    onZipcodeChange(cleanValue);
    setHasAutoFilled(false);
    
    // Clear previous timeout
    if (lookupTimeout) {
      clearTimeout(lookupTimeout);
    }

    // Reset if less than 5 digits
    if (cleanValue.length < 5) {
      reset();
      return;
    }

    // Debounce lookup
    const timeout = setTimeout(() => {
      lookup(cleanValue);
    }, 300);
    
    setLookupTimeout(timeout);
  }, [onZipcodeChange, lookup, reset, lookupTimeout]);

  // Auto-fill city and state when data is available
  useEffect(() => {
    if (data && !hasAutoFilled) {
      onCityChange(data.city);
      onStateChange(data.state);
      if (onCityStateChange) {
        onCityStateChange(`${data.city}, ${data.stateAbbr}`);
      }
      setHasAutoFilled(true);
    }
  }, [data, hasAutoFilled, onCityChange, onStateChange, onCityStateChange]);

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
      return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    }
    if (data && hasAutoFilled) {
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    }
    if (error || zipcodeError) {
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    }
    return <MapPin className="h-4 w-4 text-muted-foreground" />;
  };

  if (layout === "compact") {
    return (
      <div className={cn("space-y-2", className)}>
        {showLabels && (
          <Label className="text-sm font-medium">
            Location <span className="text-destructive">*</span>
          </Label>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <Input
              placeholder="ZIP Code"
              value={zipcode}
              onChange={(e) => handleZipcodeChange(e.target.value)}
              className={cn(
                "h-10 text-sm pr-9",
                (zipcodeError || error) && "border-destructive focus-visible:ring-destructive"
              )}
              disabled={disabled}
              inputMode="numeric"
              maxLength={5}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {getStatusIcon()}
            </div>
          </div>
          <Input
            placeholder={isLoading ? "Loading..." : "City, State"}
            value={city && state ? `${city}, ${state}` : ""}
            onChange={(e) => {
              // Allow manual editing but parse city/state
              const value = e.target.value;
              if (onCityStateChange) {
                onCityStateChange(value);
              }
              const parts = value.split(",").map(s => s.trim());
              if (parts[0]) onCityChange(parts[0]);
              if (parts[1]) onStateChange(parts[1]);
            }}
            className={cn(
              "h-10 text-sm",
              (cityError || stateError) && "border-destructive",
              hasAutoFilled && "bg-muted/30"
            )}
            disabled={disabled || isLoading}
          />
        </div>
        {(zipcodeError || error) && (
          <p className="text-xs text-destructive">{zipcodeError || error}</p>
        )}
        {/* Auto-detection message hidden but functionality preserved */}
      </div>
    );
  }

  if (layout === "vertical") {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="space-y-2">
          {showLabels && (
            <Label htmlFor="zipcode" className="text-sm font-medium">
              ZIP Code <span className="text-destructive">*</span>
            </Label>
          )}
          <div className="relative">
            <Input
              id="zipcode"
              placeholder="Enter ZIP code"
              value={zipcode}
              onChange={(e) => handleZipcodeChange(e.target.value)}
              className={cn(
                "pr-10",
                (zipcodeError || error) && "border-destructive focus-visible:ring-destructive"
              )}
              disabled={disabled}
              inputMode="numeric"
              maxLength={5}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {getStatusIcon()}
            </div>
          </div>
          {(zipcodeError || error) && (
            <p className="text-xs text-destructive">{zipcodeError || error}</p>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            {showLabels && (
              <Label htmlFor="city" className="text-sm font-medium">
                City <span className="text-destructive">*</span>
              </Label>
            )}
            <Input
              id="city"
              placeholder={isLoading ? "Loading..." : "City"}
              value={city}
              onChange={(e) => {
                onCityChange(e.target.value);
                setHasAutoFilled(false);
              }}
              className={cn(
                cityError && "border-destructive",
                hasAutoFilled && "bg-muted/30 border-green-200"
              )}
              disabled={disabled || isLoading}
            />
            {cityError && <p className="text-xs text-destructive">{cityError}</p>}
          </div>
          
          <div className="space-y-2">
            {showLabels && (
              <Label htmlFor="state" className="text-sm font-medium">
                State <span className="text-destructive">*</span>
              </Label>
            )}
            <Input
              id="state"
              placeholder={isLoading ? "Loading..." : "State"}
              value={state}
              onChange={(e) => {
                onStateChange(e.target.value);
                setHasAutoFilled(false);
              }}
              className={cn(
                stateError && "border-destructive",
                hasAutoFilled && "bg-muted/30 border-green-200"
              )}
              disabled={disabled || isLoading}
            />
            {stateError && <p className="text-xs text-destructive">{stateError}</p>}
          </div>
        </div>
        
        {/* Auto-detection message hidden but functionality preserved */}
      </div>
    );
  }

  // Default horizontal layout
  return (
    <div className={cn("space-y-2", className)}>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          {showLabels && (
            <Label htmlFor="zipcode" className="text-sm font-medium">
              ZIP Code <span className="text-destructive">*</span>
            </Label>
          )}
          <div className="relative">
            <Input
              id="zipcode"
              placeholder="Enter ZIP"
              value={zipcode}
              onChange={(e) => handleZipcodeChange(e.target.value)}
              className={cn(
                "pr-10",
                (zipcodeError || error) && "border-destructive focus-visible:ring-destructive"
              )}
              disabled={disabled}
              inputMode="numeric"
              maxLength={5}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {getStatusIcon()}
            </div>
          </div>
          {(zipcodeError || error) && (
            <p className="text-xs text-destructive">{zipcodeError || error}</p>
          )}
        </div>

        <div className="space-y-2">
          {showLabels && (
            <Label htmlFor="city" className="text-sm font-medium">
              City <span className="text-destructive">*</span>
            </Label>
          )}
          <Input
            id="city"
            placeholder={isLoading ? "Loading..." : "City"}
            value={city}
            onChange={(e) => {
              onCityChange(e.target.value);
              setHasAutoFilled(false);
            }}
            className={cn(
              cityError && "border-destructive",
              hasAutoFilled && "bg-muted/30 border-green-200"
            )}
            disabled={disabled || isLoading}
          />
          {cityError && <p className="text-xs text-destructive">{cityError}</p>}
        </div>

        <div className="space-y-2">
          {showLabels && (
            <Label htmlFor="state" className="text-sm font-medium">
              State <span className="text-destructive">*</span>
            </Label>
          )}
          <Input
            id="state"
            placeholder={isLoading ? "Loading..." : "State"}
            value={state}
            onChange={(e) => {
              onStateChange(e.target.value);
              setHasAutoFilled(false);
            }}
            className={cn(
              stateError && "border-destructive",
              hasAutoFilled && "bg-muted/30 border-green-200"
            )}
            disabled={disabled || isLoading}
          />
          {stateError && <p className="text-xs text-destructive">{stateError}</p>}
        </div>
      </div>
      
      {/* Auto-detection message hidden but functionality preserved */}
    </div>
  );
}
