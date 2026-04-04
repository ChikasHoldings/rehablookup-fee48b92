import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { 
  Lock, Mail, ArrowRight, Eye, EyeOff, AlertTriangle, Clock, 
  ShieldCheck, RefreshCw, Building2, User, ExternalLink 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import headerLogo from "@/assets/logo-header.webp";

const loginSchema = z.object({
  email: z.string().trim().email({ message: "Please enter a valid email address" }).max(255),
  password: z.string().min(1, { message: "Password is required" }),
});

const REMEMBER_ME_KEY = "unified_remember_me";
const LOGIN_ATTEMPTS_KEY = "unified_login_attempts";
const MAX_ATTEMPTS = 5;
const CAPTCHA_THRESHOLD = 3;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

type AccountType = "provider" | "seeker" | "admin" | "unknown" | null;

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
  
  let browser = "Unknown Browser";
  if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Edg")) browser = "Edge";
  else if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Safari")) browser = "Safari";
  else if (ua.includes("Opera") || ua.includes("OPR")) browser = "Opera";
  
  let os = "Unknown OS";
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  
  let device = "Desktop";
  if (ua.includes("Mobile") || ua.includes("Android")) device = "Mobile";
  else if (ua.includes("Tablet") || ua.includes("iPad")) device = "Tablet";
  
  return { browser, os, device };
};

const generateSessionToken = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
};

export default function Login() {
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const typeHint = searchParams.get("type") as "seeker" | "provider" | null;
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTimeRemaining, setLockoutTimeRemaining] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [detectedType, setDetectedType] = useState<AccountType>(null);
  
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

  // Check if already authenticated and redirect appropriately
  useEffect(() => {
    let mounted = true;
    
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (session) {
          // Determine role and redirect immediately
          const { data: isAdmin } = await supabase.rpc("has_role", { 
            _user_id: session.user.id, 
            _role: "admin" 
          });
          
          if (isAdmin) {
            navigate("/admin", { replace: true });
            return;
          }
          
          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("user_id", session.user.id)
            .maybeSingle();
          
          if (profile) {
            navigate(returnTo || "/provider/dashboard", { replace: true });
            return;
          }
          
          const { data: seeker } = await supabase
            .from("seeker_profiles")
            .select("id")
            .eq("user_id", session.user.id)
            .maybeSingle();
          
          if (seeker) {
            navigate(returnTo || "/account", { replace: true });
            return;
          }
        }
        
        setIsCheckingAuth(false);
      } catch (err) {
        console.error("Auth check error:", err);
        if (mounted) setIsCheckingAuth(false);
      }
    };
    
    checkAuth();
    
    return () => { mounted = false; };
  }, [navigate, returnTo]);

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
    
    if (newCount >= CAPTCHA_THRESHOLD && newCount < MAX_ATTEMPTS) {
      refreshCaptcha();
    }
    
    return newCount;
  };

  const detectAccountType = async (normalizedEmail: string): Promise<{ type: AccountType; blocked: boolean; message?: string }> => {
    // Check admin first (highest priority - blocks login)
    const { data: isAdmin, error: adminError } = await supabase.rpc('is_email_admin', { p_email: normalizedEmail });
    if (adminError) console.error("Admin check error:", adminError);
    if (isAdmin) {
      return { 
        type: 'admin', 
        blocked: true, 
        message: "This email is registered as an admin account. Admin accounts must sign in through the dedicated admin portal." 
      };
    }

    // Check provider
    const { data: isProvider, error: providerError } = await supabase.rpc('is_email_provider', { p_email: normalizedEmail });
    if (providerError) console.error("Provider check error:", providerError);
    if (isProvider) return { type: 'provider', blocked: false };

    // Check seeker
    const { data: isSeeker, error: seekerError } = await supabase.rpc('is_email_seeker', { p_email: normalizedEmail });
    if (seekerError) console.error("Seeker check error:", seekerError);
    if (isSeeker) return { type: 'seeker', blocked: false };

    // Unknown email - block login
    return { 
      type: 'unknown', 
      blocked: true, 
      message: "No account found with this email address. Please check your email or create a new account." 
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate with zod
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const firstError = result.error.errors[0];
      setError(firstError?.message || "Please check your email and password.");
      return;
    }

    if (isLocked) {
      setError(`Account temporarily locked. Please wait ${formatTimeRemaining(lockoutTimeRemaining)} before trying again.`);
      return;
    }

    // Verify CAPTCHA if required
    if (showCaptcha && captcha) {
      const userAnswer = parseInt(captchaAnswer, 10);
      if (isNaN(userAnswer) || userAnswer !== captcha.answer) {
        setCaptchaError(true);
        setError("Please solve the math problem correctly.");
        refreshCaptcha();
        return;
      }
    }

    setIsSubmitting(true);
    const normalizedEmail = email.trim().toLowerCase();

    try {
      // Detect account type FIRST
      const accountResult = await detectAccountType(normalizedEmail);
      setDetectedType(accountResult.type);
      
      // Block if admin or unknown
      if (accountResult.blocked) {
        setError(accountResult.message || "Unable to sign in with this account.");
        setIsSubmitting(false);
        return;
      }

      // Check if IP is blocked and rate limited using edge function
      const { data: preCheckResult, error: preCheckError } = await supabase.functions.invoke('log-login-attempt', {
        body: {
          identifier: normalizedEmail,
          success: false,
          actionType: 'unified_login_precheck'
        }
      });

      if (preCheckError) {
        console.error('Pre-check error:', preCheckError);
      } else if (preCheckResult?.blocked) {
        setError(preCheckResult.message || "Your IP address has been blocked. Please contact support.");
        setIsSubmitting(false);
        return;
      } else if (preCheckResult?.rate_limited) {
        const retryAfter = preCheckResult.retry_after_seconds || 0;
        setError(`Too many attempts. Please wait ${Math.ceil(retryAfter / 60)} minute(s) before trying again.`);
        setIsSubmitting(false);
        return;
      }

      // Attempt sign in
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        // Log failed attempt with IP capture via edge function
        await supabase.functions.invoke('log-login-attempt', {
          body: {
            identifier: normalizedEmail,
            success: false,
            actionType: 'unified_login'
          }
        });

        const attemptCount = recordFailedAttempt();
        const remainingAttempts = MAX_ATTEMPTS - attemptCount;
        
        if (attemptCount >= MAX_ATTEMPTS) {
          setError("Too many failed attempts. Your account has been temporarily locked for 15 minutes.");
        } else if (authError.message === "Invalid login credentials") {
          setError(`Invalid email or password. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.`);
        } else if (authError.message.includes("Email not confirmed")) {
          setError("Please verify your email address before signing in. Check your inbox for a verification link.");
        } else {
          setError(authError.message);
        }
        setIsSubmitting(false);
        return;
      }

      if (data.session) {
        // Log successful login
        await supabase.functions.invoke('log-login-attempt', {
          body: {
            identifier: normalizedEmail,
            success: true,
            actionType: 'unified_login'
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
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        });
        
        // Mark other sessions as not current
        await supabase
          .from("user_sessions")
          .update({ is_current: false })
          .eq("user_id", data.session.user.id)
          .neq("session_token", sessionToken);
        
        // Log activity
        supabase.functions.invoke("log-activity", {
          body: {
            user_id: data.session.user.id,
            event_type: "login",
            event_description: `Signed in to account${rememberMe ? " (remembered)" : ""} from ${browser} on ${os}`,
          },
        });
        
        // Redirect based on account type
        if (accountResult.type === "provider") {
          // Prefetch provider data
          queryClient.prefetchQuery({
            queryKey: ["provider-facilities"],
            queryFn: async () => {
              const { data: facilities } = await supabase
                .from("facilities")
                .select("id, name, slug, status, city, state, logo_url, created_at")
                .eq("user_id", data.session.user.id)
                .order("created_at", { ascending: false });
              return facilities || [];
            },
          });
          
          toast({
            title: "Welcome back!",
            description: "Signed in to your provider account.",
          });
          navigate(returnTo || "/provider/dashboard", { replace: true });
        } else {
          toast({
            title: "Welcome back!",
            description: "Signed in successfully.",
          });
          navigate(returnTo || "/account", { replace: true });
        }
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("An unexpected error occurred. Please try again.");
      setIsSubmitting(false);
    }
  };

  // Show loading while checking auth
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="container h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <img src={headerLogo} alt="RehabLookup" className="h-8 md:h-9 w-auto" />
          </Link>
          <div className="text-sm text-muted-foreground">
            <span className="hidden sm:inline">Don't have an account?{" "}</span>
            <Link to="/signup" className="text-primary font-medium hover:underline">
              Sign up
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left Panel - Branding (Desktop) */}
        <div className="hidden lg:flex lg:w-1/2 xl:w-[45%] bg-gradient-to-br from-primary via-primary to-primary/90 p-12 items-center justify-center relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
          </div>
          
          <div className="relative max-w-md text-white">
            <h1 className="text-3xl xl:text-4xl font-display font-bold mb-6">
              Welcome Back
            </h1>
            <p className="text-lg text-white/80 mb-8">
              Sign in to continue your journey. Whether you're a family seeking help or a treatment provider, we're here to support you.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-white/90">
                <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">Personal Accounts</p>
                  <p className="text-sm text-white/70">Find treatment, save facilities, track requests</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-white/90">
                <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">Provider Accounts</p>
                  <p className="text-sm text-white/70">Manage listings, respond to leads, grow your facility</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Form */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-12">
          <div className="w-full max-w-md">
            {/* Mobile Container Card */}
            <div className="lg:bg-transparent lg:border-0 lg:shadow-none lg:p-0 bg-card border border-border rounded-xl shadow-sm p-5 sm:p-6">
              {/* Mobile Logo */}
              <div className="lg:hidden text-center mb-6">
                <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground">Sign In</h1>
                <p className="text-sm text-muted-foreground mt-1">Welcome back to RehabLookup</p>
              </div>

              {/* Desktop Title */}
              <div className="hidden lg:block mb-8">
                <h2 className="text-2xl font-display font-bold text-foreground">Sign in to your account</h2>
                <p className="text-muted-foreground mt-1">Enter your credentials below</p>
              </div>

              {/* Error Alert */}
              {error && (
                <Alert variant="destructive" className="mb-5 sm:mb-6">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                  {detectedType === "admin" && (
                    <Link 
                      to="/admin/login" 
                      className="mt-2 inline-flex items-center gap-1 text-sm font-medium hover:underline"
                    >
                      Go to Admin Login <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                  {detectedType === "unknown" && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link to="/signup">
                        <Button size="sm" variant="outline" className="text-xs">
                          Create Personal Account
                        </Button>
                      </Link>
                      <Link to="/provider-signup">
                        <Button size="sm" variant="outline" className="text-xs">
                          List Your Facility
                        </Button>
                      </Link>
                    </div>
                  )}
                </Alert>
              )}

              {/* Lockout Alert */}
              {isLocked && (
                <Alert className="mb-5 sm:mb-6 border-amber-500/50 bg-amber-500/10">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-700 dark:text-amber-400">
                    Account temporarily locked. Please wait{" "}
                    <span className="font-semibold">{formatTimeRemaining(lockoutTimeRemaining)}</span>{" "}
                    before trying again.
                  </AlertDescription>
                </Alert>
              )}

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="email" className="text-sm">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError(null);
                        setDetectedType(null);
                      }}
                      placeholder="you@example.com"
                      className="pl-10 h-10 sm:h-11"
                      autoComplete="email"
                      autoCapitalize="none"
                      disabled={isSubmitting || isLocked}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm">Password</Label>
                    <Link 
                      to="/forgot-password" 
                      className="text-xs sm:text-sm text-primary hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError(null);
                      }}
                      placeholder="••••••••"
                      className="pl-10 pr-10 h-10 sm:h-11"
                      autoComplete="current-password"
                      disabled={isSubmitting || isLocked}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* CAPTCHA */}
                {showCaptcha && captcha && (
                  <div className="space-y-3 p-3 sm:p-4 bg-muted/50 rounded-lg border border-border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Security Check</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={refreshCaptcha}
                        className="h-8 w-8 p-0"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Solve: <span className="font-mono font-bold text-foreground text-lg">
                        {captcha.num1} {captcha.operator} {captcha.num2} = ?
                      </span>
                    </p>
                    <Input
                      type="number"
                      value={captchaAnswer}
                      onChange={(e) => {
                        setCaptchaAnswer(e.target.value);
                        setCaptchaError(false);
                      }}
                      placeholder="Enter answer"
                      className={`h-10 sm:h-11 ${captchaError ? "border-destructive" : ""}`}
                      disabled={isSubmitting}
                    />
                  </div>
                )}

                {/* Remember Me */}
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                    disabled={isSubmitting || isLocked}
                  />
                  <Label htmlFor="remember" className="text-xs sm:text-sm font-normal cursor-pointer">
                    Remember me for 30 days
                  </Label>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full h-10 sm:h-11"
                  disabled={isSubmitting || isLocked}
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              {/* Divider */}
              <div className="relative my-6 sm:my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card lg:bg-background px-2 text-muted-foreground">New to RehabLookup?</span>
                </div>
              </div>

              {/* Signup Options */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <Link to="/signup">
                  <Button variant="outline" className="w-full h-9 sm:h-10 text-xs sm:text-sm">
                    <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                    Find Treatment
                  </Button>
                </Link>
                <Link to="/provider-signup">
                  <Button variant="outline" className="w-full h-9 sm:h-10 text-xs sm:text-sm">
                    <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                    List Facility
                  </Button>
                </Link>
              </div>

              {/* Type Hint Message */}
              {typeHint && (
                <p className="text-xs text-center text-muted-foreground mt-5 sm:mt-6">
                  {typeHint === "provider" 
                    ? "Sign in to manage your treatment facility listings."
                    : "Sign in to access your saved facilities and requests."
                  }
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
