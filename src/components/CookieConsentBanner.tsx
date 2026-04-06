import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Cookie, X, Shield } from "lucide-react";

const COOKIE_CONSENT_KEY = "rehablookup_cookie_consent";
const COOKIE_CONSENT_VERSION = "1.0";

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  version: string;
  timestamp: string;
}

export function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true, // Always required
    analytics: false,
    marketing: false,
    version: COOKIE_CONSENT_VERSION,
    timestamp: "",
  });
  const { pathname } = useLocation();

  const isAppShellRoute =
    pathname === "/provider" ||
    pathname.startsWith("/provider/") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/account" ||
    pathname.startsWith("/account/");

  useEffect(() => {
    // Check if user has already consented
    const savedConsent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (savedConsent) {
      try {
        const parsed = JSON.parse(savedConsent) as CookiePreferences;
        // Show banner again if version changed
        if (parsed.version !== COOKIE_CONSENT_VERSION) {
          setIsVisible(true);
        } else {
          // Apply saved preferences
          applyPreferences(parsed);
        }
      } catch {
        setIsVisible(true);
      }
    } else {
      // Delay showing banner slightly for better UX
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const applyPreferences = (prefs: CookiePreferences) => {
    // Enable/disable Google Analytics based on preferences
    if (prefs.analytics && window.gtag) {
      window.gtag("consent", "update", {
        analytics_storage: "granted",
      });
    } else if (window.gtag) {
      window.gtag("consent", "update", {
        analytics_storage: "denied",
      });
    }

    // Marketing cookies
    if (window.gtag) {
      window.gtag("consent", "update", {
        ad_storage: prefs.marketing ? "granted" : "denied",
        ad_user_data: prefs.marketing ? "granted" : "denied",
        ad_personalization: prefs.marketing ? "granted" : "denied",
      });
    }
  };

  const saveConsent = (prefs: CookiePreferences) => {
    const consentData = {
      ...prefs,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consentData));
    applyPreferences(consentData);
    setIsVisible(false);
  };

  const acceptAll = () => {
    saveConsent({
      necessary: true,
      analytics: true,
      marketing: true,
      version: COOKIE_CONSENT_VERSION,
      timestamp: "",
    });
  };

  const acceptSelected = () => {
    saveConsent(preferences);
  };

  const rejectNonEssential = () => {
    saveConsent({
      necessary: true,
      analytics: false,
      marketing: false,
      version: COOKIE_CONSENT_VERSION,
      timestamp: "",
    });
  };

  if (!isVisible || isAppShellRoute) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6"
      role="dialog"
      aria-label="Cookie consent"
      aria-describedby="cookie-description"
    >
      <div className="mx-auto max-w-4xl rounded-xl border border-border bg-background shadow-2xl">
        <div className="p-4 md:p-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Cookie className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground">
                  Your Privacy Matters
                </h2>
                <p className="text-sm text-muted-foreground">
                  <Shield className="inline h-3 w-3 mr-1" aria-hidden="true" />
                  HIPAA-compliant &amp; GDPR-ready
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={rejectNonEssential}
              aria-label="Reject non-essential cookies and close"
              className="shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Description */}
          <p id="cookie-description" className="text-sm text-muted-foreground mb-4">
            We understand that seeking addiction treatment information is sensitive. We use cookies 
            to improve your experience and provide personalized support. Your health information is 
            never sold or shared with advertisers.{" "}
            <Link to="/privacy-policy" className="text-primary hover:underline font-medium">
              Read our Privacy Policy
            </Link>
          </p>

          {/* Detailed preferences */}
          {showDetails && (
            <div className="mb-4 space-y-3 rounded-lg bg-muted/50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Essential Cookies</p>
                  <p className="text-xs text-muted-foreground">
                    Required for the website to function properly
                  </p>
                </div>
                <div className="rounded bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                  Always Active
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Analytics Cookies</p>
                  <p className="text-xs text-muted-foreground">
                    Help us understand how visitors use our site
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={preferences.analytics}
                    onChange={(e) =>
                      setPreferences({ ...preferences, analytics: e.target.checked })
                    }
                    className="peer sr-only"
                  />
                  <div className="h-6 w-11 rounded-full bg-muted peer-checked:bg-primary peer-focus:ring-2 peer-focus:ring-primary/20 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-background after:transition-all peer-checked:after:translate-x-full" />
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Marketing Cookies</p>
                  <p className="text-xs text-muted-foreground">
                    Used to deliver relevant content and ads
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={preferences.marketing}
                    onChange={(e) =>
                      setPreferences({ ...preferences, marketing: e.target.checked })
                    }
                    className="peer sr-only"
                  />
                  <div className="h-6 w-11 rounded-full bg-muted peer-checked:bg-primary peer-focus:ring-2 peer-focus:ring-primary/20 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-background after:transition-all peer-checked:after:translate-x-full" />
                </label>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="text-muted-foreground"
            >
              {showDetails ? "Hide Details" : "Customize Preferences"}
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={rejectNonEssential}
              >
                Essential Only
              </Button>
              {showDetails ? (
                <Button size="sm" onClick={acceptSelected}>
                  Save Preferences
                </Button>
              ) : (
                <Button size="sm" onClick={acceptAll}>
                  Accept All
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
