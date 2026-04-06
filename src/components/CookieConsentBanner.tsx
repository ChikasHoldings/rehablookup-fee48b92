import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Settings2 } from "lucide-react";

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
    necessary: true,
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
    const savedConsent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (savedConsent) {
      try {
        const parsed = JSON.parse(savedConsent) as CookiePreferences;
        if (parsed.version !== COOKIE_CONSENT_VERSION) {
          setIsVisible(true);
        } else {
          applyPreferences(parsed);
        }
      } catch {
        setIsVisible(true);
      }
    } else {
      const timer = setTimeout(() => setIsVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const applyPreferences = (prefs: CookiePreferences) => {
    if (window.gtag) {
      window.gtag("consent", "update", {
        analytics_storage: prefs.analytics ? "granted" : "denied",
        ad_storage: prefs.marketing ? "granted" : "denied",
        ad_user_data: prefs.marketing ? "granted" : "denied",
        ad_personalization: prefs.marketing ? "granted" : "denied",
      });
    }
  };

  const saveConsent = (prefs: CookiePreferences) => {
    const consentData = { ...prefs, timestamp: new Date().toISOString() };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consentData));
    applyPreferences(consentData);
    setIsVisible(false);
  };

  const acceptAll = () =>
    saveConsent({ necessary: true, analytics: true, marketing: true, version: COOKIE_CONSENT_VERSION, timestamp: "" });

  const rejectNonEssential = () =>
    saveConsent({ necessary: true, analytics: false, marketing: false, version: COOKIE_CONSENT_VERSION, timestamp: "" });

  if (!isVisible || isAppShellRoute) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-300"
      role="dialog"
      aria-label="Cookie consent"
    >
      <div className="rounded-lg border border-border bg-background/95 backdrop-blur-sm shadow-lg">
        {/* Compact main view */}
        {!showDetails ? (
          <div className="p-3.5">
            <div className="flex items-start gap-2.5 mb-3">
              <Shield className="h-4 w-4 text-primary mt-0.5 shrink-0" aria-hidden="true" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                We use cookies to improve your experience. Your health data is never sold.{" "}
                <Link to="/privacy-policy" className="text-primary hover:underline font-medium">
                  Privacy Policy
                </Link>
              </p>
            </div>
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => setShowDetails(true)}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Settings2 className="h-3 w-3" />
                Manage
              </button>
              <div className="flex gap-1.5">
                <Button variant="ghost" size="sm" onClick={rejectNonEssential} className="h-7 px-2.5 text-xs">
                  Decline
                </Button>
                <Button size="sm" onClick={acceptAll} className="h-7 px-3 text-xs">
                  Accept
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Expanded preferences */
          <div className="p-3.5">
            <p className="text-xs font-medium text-foreground mb-2.5">Cookie Preferences</p>
            <div className="space-y-2 mb-3">
              {[
                { label: "Essential", desc: "Required for site to work", locked: true, checked: true },
                { label: "Analytics", desc: "Help us improve", locked: false, checked: preferences.analytics, key: "analytics" as const },
                { label: "Marketing", desc: "Relevant content & ads", locked: false, checked: preferences.marketing, key: "marketing" as const },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-xs font-medium text-foreground">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                  </div>
                  {item.locked ? (
                    <span className="text-[10px] font-medium text-primary bg-primary/10 rounded px-1.5 py-0.5">On</span>
                  ) : (
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={(e) => setPreferences({ ...preferences, [item.key!]: e.target.checked })}
                        className="peer sr-only"
                      />
                      <div className="h-5 w-9 rounded-full bg-muted peer-checked:bg-primary after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-background after:transition-all peer-checked:after:translate-x-4" />
                    </label>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => setShowDetails(false)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back
              </button>
              <Button size="sm" onClick={() => saveConsent(preferences)} className="h-7 px-3 text-xs">
                Save
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
