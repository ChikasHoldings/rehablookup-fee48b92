import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Lock, Mail, ArrowRight, Eye, EyeOff, AlertTriangle, Clock, ShieldCheck, RefreshCw } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { providerNavLinks } from "@/data/providerNavLinks";
import { useQueryClient } from "@tanstack/react-query";

const loginSchema = z.object({
  email: z.string().trim().email({ message: "Please enter a valid email address" }).max(255),
  password: z.string().min(1, { message: "Password is required" }),
});

const REMEMBER_ME_KEY = "provider_remember_me";
const LOGIN_ATTEMPTS_KEY = "provider_login_attempts";
const MAX_ATTEMPTS = 5;
const CAPTCHA_THRESHOLD = 3;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

interface LoginAttempts {
  count: number;
  lastAttempt: number;
  lockedUntil: number | null;
}

interface CaptchaChallenge {
  num1: number;
  num2: number;
  operator: "+" | "-" | "×";
  answer: number;
}

const generateCaptcha = (): CaptchaChallenge => {
  const operators: Array<"+" | "-" | "×"> = ["+", "-", "×"];
  const operator = operators[Math.floor(Math.random() * operators.length)];
  
  let num1: number, num2: number, answer: number;
  
  switch (operator) {
    case "+":
      num1 = Math.floor(Math.random() * 20) + 1;
      num2 = Math.floor(Math.random() * 20) + 1;
      answer = num1 + num2;
      break;
    case "-":
      num1 = Math.floor(Math.random() * 20) + 10;
      num2 = Math.floor(Math.random() * 10) + 1;
      answer = num1 - num2;
      break;
    case "×":
      num1 = Math.floor(Math.random() * 10) + 1;
      num2 = Math.floor(Math.random() * 10) + 1;
      answer = num1 * num2;
      break;
  }
  
  return { num1, num2, operator, answer };
};

const getLoginAttempts = (email: string): LoginAttempts => {
  try {
    const stored = localStorage.getItem(`${LOGIN_ATTEMPTS_KEY}_${email.toLowerCase()}`);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parsing errors
  }
  return { count: 0, lastAttempt: 0, lockedUntil: null };
};

const setLoginAttempts = (email: string, attempts: LoginAttempts) => {
  localStorage.setItem(`${LOGIN_ATTEMPTS_KEY}_${email.toLowerCase()}`, JSON.stringify(attempts));
};

const clearLoginAttempts = (email: string) => {
  localStorage.removeItem(`${LOGIN_ATTEMPTS_KEY}_${email.toLowerCase()}`);
};

const formatTimeRemaining = (ms: number): string => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
};

const getBrowserInfo = (): { browser: string; os: string; device: string } => {
  const ua = navigator.userAgent;
  
  // Detect browser
  let browser = "Unknown Browser";
  if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Edg")) browser = "Edge";
  else if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Safari")) browser = "Safari";
  else if (ua.includes("Opera") || ua.includes("OPR")) browser = "Opera";
  
  // Detect OS
  let os = "Unknown OS";
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  
  // Detect device type
  let device = "Desktop";
  if (ua.includes("Mobile") || ua.includes("Android")) device = "Mobile";
  else if (ua.includes("Tablet") || ua.includes("iPad")) device = "Tablet";
  
  return { browser, os, device };
};

const generateSessionToken = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
};

export default function ProviderLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTimeRemaining, setLockoutTimeRemaining] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0);
  
  // CAPTCHA state
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captcha, setCaptcha] = useState<CaptchaChallenge | null>(null);
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captchaError, setCaptchaError] = useState(false);
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Generate new CAPTCHA
  const refreshCaptcha = useCallback(() => {
    setCaptcha(generateCaptcha());
    setCaptchaAnswer("");
    setCaptchaError(false);
  }, []);

  // Check if CAPTCHA should be shown
  const requiresCaptcha = useMemo(() => {
    return failedAttempts >= CAPTCHA_THRESHOLD && failedAttempts < MAX_ATTEMPTS;
  }, [failedAttempts]);

  // Update CAPTCHA visibility when attempts change
  useEffect(() => {
    if (requiresCaptcha && !captcha) {
      refreshCaptcha();
      setShowCaptcha(true);
    } else if (!requiresCaptcha) {
      setShowCaptcha(false);
      setCaptcha(null);
      setCaptchaAnswer("");
    }
  }, [requiresCaptcha, captcha, refreshCaptcha]);

  // Check lockout status when email changes
  const checkLockoutStatus = useCallback(() => {
    if (!email.trim()) {
      setIsLocked(false);
      setFailedAttempts(0);
      return;
    }

    const attempts = getLoginAttempts(email);
    
    if (attempts.lockedUntil && Date.now() < attempts.lockedUntil) {
      setIsLocked(true);
      setLockoutTimeRemaining(attempts.lockedUntil - Date.now());
      setFailedAttempts(attempts.count);
    } else if (attempts.lockedUntil && Date.now() >= attempts.lockedUntil) {
      clearLoginAttempts(email);
      setIsLocked(false);
      setFailedAttempts(0);
    } else {
      setIsLocked(false);
      setFailedAttempts(attempts.count);
    }
  }, [email]);

  useEffect(() => {
    checkLockoutStatus();
  }, [checkLockoutStatus]);

  // Countdown timer for lockout
  useEffect(() => {
    if (!isLocked || lockoutTimeRemaining <= 0) return;

    const interval = setInterval(() => {
      setLockoutTimeRemaining((prev) => {
        const newTime = prev - 1000;
        if (newTime <= 0) {
          setIsLocked(false);
          clearLoginAttempts(email);
          setFailedAttempts(0);
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isLocked, lockoutTimeRemaining, email]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/provider/dashboard", { replace: true });
      }
      setIsCheckingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN" && session) {
          navigate("/provider/dashboard", { replace: true });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      const shouldRemember = sessionStorage.getItem(REMEMBER_ME_KEY);
      if (shouldRemember === "false") {
        supabase.auth.signOut();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const recordFailedAttempt = () => {
    const attempts = getLoginAttempts(email);
    const newCount = attempts.count + 1;
    
    const newAttempts: LoginAttempts = {
      count: newCount,
      lastAttempt: Date.now(),
      lockedUntil: newCount >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_DURATION_MS : null,
    };
    
    setLoginAttempts(email, newAttempts);
    setFailedAttempts(newCount);
    
    if (newCount >= MAX_ATTEMPTS) {
      setIsLocked(true);
      setLockoutTimeRemaining(LOCKOUT_DURATION_MS);
    }
    
    // Refresh CAPTCHA on failed attempt
    if (newCount >= CAPTCHA_THRESHOLD && newCount < MAX_ATTEMPTS) {
      refreshCaptcha();
    }
    
    return newCount;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate with zod
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const firstError = result.error.errors[0];
      toast({
        title: "Invalid Input",
        description: firstError?.message || "Please check your email and password.",
        variant: "destructive",
      });
      return;
    }

    if (isLocked) {
      toast({
        title: "Account Temporarily Locked",
        description: `Please wait ${formatTimeRemaining(lockoutTimeRemaining)} before trying again.`,
        variant: "destructive",
      });
      return;
    }

    // Verify CAPTCHA if required
    if (showCaptcha && captcha) {
      const userAnswer = parseInt(captchaAnswer, 10);
      if (isNaN(userAnswer) || userAnswer !== captcha.answer) {
        setCaptchaError(true);
        toast({
          title: "CAPTCHA Failed",
          description: "Please solve the math problem correctly.",
          variant: "destructive",
        });
        refreshCaptcha();
        return;
      }
    }

    setIsLoading(true);
    const normalizedEmail = email.trim().toLowerCase();

    try {
      // Check if email is registered as a seeker (not a provider)
      const { data: isSeeker } = await supabase.rpc('is_email_seeker', { p_email: normalizedEmail });
      if (isSeeker) {
        toast({
          title: "Wrong Account Type",
          description: "This email is registered as a personal account, not a facility provider. Please use the seeker login.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Check if email or IP is blocked and rate limited using edge function
      const { data: preCheckResult, error: preCheckError } = await supabase.functions.invoke('log-login-attempt', {
        body: {
          identifier: normalizedEmail,
          success: false, // Pre-check doesn't count as attempt
          actionType: 'provider_login_precheck'
        }
      });

      if (preCheckError) {
        console.error('Pre-check error:', preCheckError);
      } else if (preCheckResult?.blocked) {
        toast({
          title: "Access Denied",
          description: preCheckResult.message || "Your IP address has been blocked. Please contact support.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      } else if (preCheckResult?.rate_limited) {
        const retryAfter = preCheckResult.retry_after_seconds || 0;
        toast({
          title: "Too Many Attempts",
          description: `Please wait ${Math.ceil(retryAfter / 60)} minute(s) before trying again.`,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        // Log failed attempt with IP capture via edge function
        await supabase.functions.invoke('log-login-attempt', {
          body: {
            identifier: normalizedEmail,
            success: false,
            actionType: 'provider_login'
          }
        });

        const attemptCount = recordFailedAttempt();
        const remainingAttempts = MAX_ATTEMPTS - attemptCount;
        
        if (attemptCount >= MAX_ATTEMPTS) {
          toast({
            title: "Account Locked",
            description: "Too many failed attempts. Your account has been temporarily locked for 15 minutes.",
            variant: "destructive",
          });
        } else if (error.message === "Invalid login credentials") {
          toast({
            title: "Login Failed",
            description: `Invalid email or password. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.`,
            variant: "destructive",
          });
        } else if (error.message.includes("Email not confirmed")) {
          toast({
            title: "Email Not Verified",
            description: "Please verify your email address before logging in.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Login Failed",
            description: error.message,
            variant: "destructive",
          });
        }
        return;
      }

      if (data.session) {
        // Log successful login with IP capture via edge function
        await supabase.functions.invoke('log-login-attempt', {
          body: {
            identifier: normalizedEmail,
            success: true,
            actionType: 'provider_login'
          }
        });

        clearLoginAttempts(email);
        setFailedAttempts(0);
        sessionStorage.setItem(REMEMBER_ME_KEY, rememberMe.toString());
        
        // Create session tracking record
        const { browser, os, device } = getBrowserInfo();
        const sessionToken = generateSessionToken();
        localStorage.setItem("current_session_token", sessionToken);
        
        // Insert session record
        await supabase.from("user_sessions").insert({
          user_id: data.session.user.id,
          session_token: sessionToken,
          browser,
          os,
          device_name: device,
          is_current: true,
          last_active_at: new Date().toISOString(),
          expires_at: rememberMe 
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
            : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 1 day
        });
        
        // Mark other sessions as not current
        await supabase
          .from("user_sessions")
          .update({ is_current: false })
          .eq("user_id", data.session.user.id)
          .neq("session_token", sessionToken);
        
        supabase.functions.invoke("log-activity", {
          body: {
            user_id: data.session.user.id,
            event_type: "login",
            event_description: `Signed in to account${rememberMe ? " (remembered)" : ""} from ${browser} on ${os}`,
          },
        });
        
        // Prefetch subscription and provider data for instant dashboard load
        queryClient.prefetchQuery({
          queryKey: ["subscription"],
          queryFn: async () => {
            const { data: subData } = await supabase.functions.invoke("check-subscription");
            // Cache in localStorage for instant future loads
            if (subData) {
              try {
                localStorage.setItem("subscription_cache", JSON.stringify({
                  data: subData,
                  timestamp: Date.now(),
                }));
              } catch {}
            }
            return subData;
          },
        });
        
        queryClient.prefetchQuery({
          queryKey: ["provider-facilities"],
          queryFn: async () => {
            const { data: facilities } = await supabase
              .from("facilities")
              .select("id, name, slug, status, city, state, logo_url, created_at")
              .eq("user_id", data.session.user.id)
              .order("created_at", { ascending: false });
            // Cache in localStorage for instant future loads
            if (facilities) {
              try {
                localStorage.setItem("provider-facilities-cache", JSON.stringify({
                  data: facilities,
                  timestamp: Date.now(),
                }));
                // Also cache the first facility data
                if (facilities.length > 0) {
                  localStorage.setItem("selectedFacilityData", JSON.stringify(facilities[0]));
                  localStorage.setItem("selectedFacilityId", facilities[0].id);
                }
              } catch {}
            }
            return facilities || [];
          },
        });
        
        toast({
          title: "Welcome back!",
          description: "You've been successfully logged in.",
        });
      }
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header 
          navLinks={providerNavLinks} 
          ctaLink="/provider-signup" 
          ctaLabel="Get Started"
          variant="provider"
        />
        <main className="flex flex-1 items-center justify-center px-4 py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            <p className="mt-4 text-muted-foreground">Loading...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header 
        navLinks={providerNavLinks} 
        ctaLink="/provider-signup" 
        ctaLabel="Get Started"
        variant="provider"
      />
      
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md animate-step-enter">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="font-display text-2xl font-bold text-foreground">
              Provider Sign In
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Access your facility dashboard
            </p>
          </div>

          {/* Card Container */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
            {/* Lockout Alert */}
            {isLocked && (
              <Alert variant="destructive" className="py-3">
                <Clock className="h-4 w-4" />
                <AlertDescription className="ml-2 text-sm">
                  Account temporarily locked due to too many failed attempts. 
                  Please try again in <strong>{formatTimeRemaining(lockoutTimeRemaining)}</strong>.
                </AlertDescription>
              </Alert>
            )}

            {/* Warning for failed attempts */}
            {!isLocked && failedAttempts > 0 && failedAttempts < MAX_ATTEMPTS && (
              <Alert variant="default" className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20 py-3">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="ml-2 text-sm text-yellow-800 dark:text-yellow-200">
                  {MAX_ATTEMPTS - failedAttempts} login attempt{MAX_ATTEMPTS - failedAttempts !== 1 ? 's' : ''} remaining before temporary lockout.
                </AlertDescription>
              </Alert>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@facility.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10 pl-10 text-sm"
                    required
                    autoComplete="email"
                    autoFocus
                    disabled={isLocked}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                  <Link 
                    to="/provider-forgot-password" 
                    className="text-xs text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10 pl-10 pr-10 text-sm"
                    required
                    autoComplete="current-password"
                    disabled={isLocked}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                    disabled={isLocked}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* CAPTCHA Challenge */}
              {showCaptcha && captcha && !isLocked && (
                <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/30">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Security Verification
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Please solve this math problem to verify you're human.
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 flex items-center gap-2 p-3 rounded-md bg-background border border-border">
                      <span className="font-mono text-lg font-bold text-foreground">
                        {captcha.num1} {captcha.operator} {captcha.num2} =
                      </span>
                      <Input
                        type="number"
                        value={captchaAnswer}
                        onChange={(e) => {
                          setCaptchaAnswer(e.target.value);
                          setCaptchaError(false);
                        }}
                        className={`w-20 h-9 text-center font-mono text-lg ${
                          captchaError ? "border-destructive" : ""
                        }`}
                        placeholder="?"
                        required
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={refreshCaptcha}
                      className="shrink-0 h-10 w-10"
                      title="Get new problem"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                  {captchaError && (
                    <p className="text-xs text-destructive">
                      Incorrect answer. Please try again.
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="rememberMe"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                  disabled={isLocked}
                />
                <label
                  htmlFor="rememberMe"
                  className="text-sm text-muted-foreground cursor-pointer select-none"
                >
                  Remember me for 30 days
                </label>
              </div>

              <Button
                type="submit"
                className="w-full h-10 text-sm font-semibold"
                disabled={isLoading || isLocked}
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Signing in...
                  </>
                ) : isLocked ? (
                  <>
                    <Clock className="mr-2 h-4 w-4" />
                    Locked
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Footer Links */}
          <div className="mt-6 space-y-3 text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/provider-signup" className="text-primary hover:underline font-medium">
                List your facility
              </Link>
            </p>
            <p className="text-xs text-muted-foreground">
              Need help?{" "}
              <Link to="/provider-support" className="text-primary hover:underline">
                Contact support
              </Link>
            </p>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
