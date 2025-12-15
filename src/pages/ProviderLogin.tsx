import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
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

const providerNavLinks = [
  { href: "/for-providers", label: "Why List With Us" },
  { href: "/provider-resources", label: "Resources" },
  { href: "/provider-support", label: "Support" },
];

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
    
    if (!email.trim() || !password.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter both email and password.",
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

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
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
        clearLoginAttempts(email);
        setFailedAttempts(0);
        sessionStorage.setItem(REMEMBER_ME_KEY, rememberMe.toString());
        
        supabase.functions.invoke("log-activity", {
          body: {
            user_id: data.session.user.id,
            event_type: "login",
            event_description: `Signed in to account${rememberMe ? " (remembered)" : ""}`,
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
      
      <main className="flex flex-1 items-center justify-center px-4 py-12 md:py-16">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold text-foreground">
              Provider Sign In
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Access your facility dashboard
            </p>
          </div>

          {/* Lockout Alert */}
          {isLocked && (
            <Alert variant="destructive">
              <Clock className="h-4 w-4" />
              <AlertDescription className="ml-2">
                Account temporarily locked due to too many failed attempts. 
                Please try again in <strong>{formatTimeRemaining(lockoutTimeRemaining)}</strong>.
              </AlertDescription>
            </Alert>
          )}

          {/* Warning for failed attempts */}
          {!isLocked && failedAttempts > 0 && failedAttempts < MAX_ATTEMPTS && (
            <Alert variant="default" className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="ml-2 text-yellow-800 dark:text-yellow-200">
                {MAX_ATTEMPTS - failedAttempts} login attempt{MAX_ATTEMPTS - failedAttempts !== 1 ? 's' : ''} remaining before temporary lockout.
              </AlertDescription>
            </Alert>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@facility.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 pl-10"
                  required
                  autoComplete="email"
                  autoFocus
                  disabled={isLocked}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
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
                  className="h-11 pl-10 pr-10"
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
              <div className="space-y-2 p-4 rounded-lg border border-border bg-muted/30">
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
                    className="shrink-0"
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
              className="w-full h-11"
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

          {/* Footer */}
          <div className="space-y-4 pt-4 border-t border-border">
            <p className="text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/provider-signup" className="text-primary hover:underline font-medium">
                List your facility
              </Link>
            </p>
            <p className="text-center text-xs text-muted-foreground">
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
