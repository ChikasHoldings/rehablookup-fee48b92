import { useState, useEffect, useRef } from 'react';
import headerLogo from "@/assets/logo-header.webp";
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Lock, User, Phone, MapPin, Eye, EyeOff, Loader2, CheckCircle, ArrowLeft } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { PhoneInput } from '@/components/ui/phone-input';
import { EmailInput } from '@/components/ui/email-input';
import { isValidPhoneNumber } from '@/lib/phoneUtils';
import { isValidEmail } from '@/lib/emailUtils';
import { useZipcodeLookup } from '@/hooks/useZipcodeLookup';
import { PasswordStrengthIndicator, calculatePasswordStrength } from '@/components/ui/password-strength-indicator';

export default function SeekerSignup() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [signupEmail, setSignupEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  // Anti-bot honeypot
  const [honeypot, setHoneypot] = useState('');
  // Client-side rate limiting
  const [lastSubmitAttempt, setLastSubmitAttempt] = useState(0);

  // Form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [zipcode, setZipcode] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Zipcode lookup
  const zipcodeLookup = useZipcodeLookup();
  
  // Check if already authenticated - redirect seamlessly
  useEffect(() => {
    let mounted = true;
    
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      
      if (session?.user) {
        // Check if email is verified in our system
        const { data: verifiedRecord } = await supabase
          .from('email_verification_codes')
          .select('verified')
          .eq('email', session.user.email?.toLowerCase() || '')
          .eq('verified', true)
          .maybeSingle();
        
        if (verifiedRecord) {
          navigate('/account', { replace: true });
        }
      }
    };
    
    checkAuth();
    
    return () => { mounted = false; };
  }, [navigate]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);
  
  // Auto-fill city/state when zipcode changes
  useEffect(() => {
    if (zipcode.length === 5) {
      zipcodeLookup.lookup(zipcode);
    } else if (zipcode.length < 5) {
      zipcodeLookup.reset();
      setCity('');
      setState('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zipcode]);
  
  useEffect(() => {
    if (zipcodeLookup.data) {
      setCity(zipcodeLookup.data.city);
      setState(zipcodeLookup.data.stateAbbr);
    }
  }, [zipcodeLookup.data]);

  const sendVerificationCode = async (emailAddress: string) => {
    const { data, error } = await supabase.functions.invoke('send-verification-code', {
      body: { email: emailAddress }
    });
    
    if (error) {
      throw new Error('Failed to send verification code');
    }
    
    if (data?.error) {
      throw new Error(data.error);
    }
    
    return data;
  };

  const passwordStrength = calculatePasswordStrength(password);
  const isPasswordStrong = passwordStrength.score >= 3;

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Honeypot check
    if (honeypot) {
      toast.error('An unexpected error occurred. Please try again.');
      return;
    }

    // Client-side rate limiting: 1 attempt per 10 seconds
    const now = Date.now();
    if (now - lastSubmitAttempt < 10_000) {
      toast.error('Please wait a few seconds before trying again.');
      return;
    }
    setLastSubmitAttempt(now);

    // Sanitize inputs
    const sanitizedFirst = firstName.trim().replace(/<[^>]*>/g, '').replace(/javascript:/gi, '').slice(0, 50);
    const sanitizedLast = lastName.trim().replace(/<[^>]*>/g, '').replace(/javascript:/gi, '').slice(0, 50);

    // Validation
    if (!sanitizedFirst || !sanitizedLast) {
      toast.error('Please enter your first and last name');
      return;
    }
    
    if (!isValidEmail(email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    if (!isValidPhoneNumber(phone)) {
      toast.error('Please enter a valid phone number');
      return;
    }
    
    if (zipcode.length !== 5 || !city || !state) {
      toast.error('Please enter a valid zipcode');
      return;
    }
    
    if (!isPasswordStrong) {
      toast.error('Please choose a stronger password');
      return;
    }
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      const trimmedEmail = email.trim().toLowerCase();

      // Cross-account checks: prevent duplicate accounts across roles
      const [providerResult, adminResult] = await Promise.all([
        supabase.rpc('is_email_provider', { p_email: trimmedEmail }),
        supabase.rpc('is_email_admin', { p_email: trimmedEmail }),
      ]);

      if (!providerResult.error && providerResult.data) {
        toast.error('This email is registered as a facility provider. Please use the provider login or a different email.');
        setIsSubmitting(false);
        return;
      }

      if (!adminResult.error && adminResult.data) {
        toast.error('This email is associated with an administrative account. Please use a different email.');
        setIsSubmitting(false);
        return;
      }

      const displayName = `${sanitizedFirst} ${sanitizedLast}`;
      
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            display_name: displayName,
            first_name: sanitizedFirst,
            last_name: sanitizedLast,
            account_type: 'seeker',
            phone: phone,
            zipcode: zipcode,
            city: city,
            state: state
          }
        }
      });
      
      if (error) {
        if (error.message.includes('already registered')) {
          toast.error('An account with this email already exists. Please sign in instead.');
        } else {
          toast.error(error.message);
        }
        return;
      }
      
      if (data.user) {
        // Update seeker profile with phone/location (trigger creates the base profile)
        if (data.session) {
          supabase
            .from('seeker_profiles')
            .update({
              phone: phone,
              zipcode: zipcode,
              city: city,
              state: state
            })
            .eq('user_id', data.user.id)
            .then(() => {});
        }
        
        // Send welcome email (fire and forget)
        supabase.functions.invoke('send-seeker-emails', {
          body: {
            type: 'welcome',
            seekerId: data.user.id,
            email: trimmedEmail
          }
        }).catch(() => {});
        
        // Send 6-digit verification code
        try {
          await sendVerificationCode(trimmedEmail);
          toast.success('Account created! Enter the 6-digit code sent to your email.');
        } catch {
          toast.success('Account created! We\'ll send you a verification code.');
        }
        
        setSignupEmail(trimmedEmail);
        setShowVerification(true);
        setResendCooldown(60);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    
    const newCode = [...verificationCode];
    newCode[index] = value.slice(-1);
    setVerificationCode(newCode);
    
    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length === 6) {
      const newCode = pastedData.split('');
      setVerificationCode(newCode);
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerifyCode = async () => {
    const code = verificationCode.join('');
    if (code.length !== 6) {
      toast.error('Please enter the complete 6-digit code');
      return;
    }
    
    setIsVerifying(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('verify-code', {
        body: { email: signupEmail, code }
      });
      
      if (error || data?.error) {
        toast.error(data?.error || 'Invalid verification code. Please try again.');
        setVerificationCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        return;
      }
      
      toast.success('Email verified successfully!');
      navigate('/account', { replace: true });
    } catch {
      toast.error('Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    
    setIsResending(true);
    try {
      await sendVerificationCode(signupEmail);
      toast.success('New verification code sent!');
      setResendCooldown(60);
      setVerificationCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (error: any) {
      toast.error(error.message || 'Failed to resend code');
    } finally {
      setIsResending(false);
    }
  };

  // Auto-submit when all 6 digits are entered
  useEffect(() => {
    const code = verificationCode.join('');
    if (code.length === 6 && showVerification) {
      handleVerifyCode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verificationCode]);

  // Verification UI rendered inline inside the signup card
  const verificationContent = (
    <div className="w-full text-center space-y-6">
      <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
        <Mail className="h-7 w-7 text-primary" />
      </div>
      <div>
        <h2 className="text-xl font-display font-bold text-foreground">Verify your email</h2>
        <p className="text-sm text-muted-foreground mt-2">
          We sent a 6-digit code to{' '}
          <span className="font-medium text-foreground">{signupEmail}</span>
        </p>
      </div>
      
      {/* 6-digit code input */}
      <div className="flex justify-center gap-2 sm:gap-3" onPaste={handleCodePaste}>
        {verificationCode.map((digit, index) => (
          <input
            key={index}
            ref={(el) => { inputRefs.current[index] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleCodeChange(index, e.target.value)}
            onKeyDown={(e) => handleCodeKeyDown(index, e)}
            className="w-10 h-12 sm:w-11 sm:h-14 text-center text-xl font-bold border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            disabled={isVerifying}
            autoFocus={index === 0}
          />
        ))}
      </div>

      <Button
        onClick={handleVerifyCode}
        disabled={isVerifying || verificationCode.join('').length !== 6}
        className="w-full h-10"
      >
        {isVerifying ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Verifying...
          </>
        ) : (
          'Verify Email'
        )}
      </Button>
      
      <div className="pt-1 space-y-2">
        <p className="text-sm text-muted-foreground">
          Didn't receive the code?{' '}
          {resendCooldown > 0 ? (
            <span className="text-muted-foreground/70">Resend in {resendCooldown}s</span>
          ) : (
            <button
              type="button"
              onClick={handleResendCode}
              disabled={isResending}
              className="text-primary font-medium hover:underline"
            >
              {isResending ? 'Sending...' : 'Resend code'}
            </button>
          )}
        </p>
        <p className="text-xs text-muted-foreground">
          Check your spam folder if you don't see the email.
        </p>
        <button
          type="button"
          onClick={() => navigate('/account', { replace: true })}
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-3 w-3" />
          Skip for now
        </button>
      </div>
    </div>
  );

  return (
    <>
      <SEO 
        title="Create Account | RehabLookup"
        description="Create an account to save your favorite treatment centers and manage your recovery journey."
        noindex={true}
      />
      
      <div className="min-h-screen flex flex-col bg-background">
        {/* Header */}
        <header className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-50">
          <div className="container h-14 flex items-center justify-between">
            <Link to="/" className="flex items-center">
              <img src={headerLogo} alt="RehabLookup" className="h-8 md:h-9 w-auto" />
            </Link>
            <div className="text-sm text-muted-foreground">
              <span className="hidden sm:inline">Already have an account?{" "}</span>
              <Link to="/login" className="text-primary font-medium hover:underline">
                Sign in
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex">
          {/* Left Panel - Branding (Desktop) */}
          <div className="hidden lg:flex lg:w-1/2 xl:w-[45%] bg-primary p-12 items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
            </div>
            
            <div className="relative max-w-md text-white">
              <h1 className="text-3xl xl:text-4xl font-display font-bold mb-6">
                Start Your Journey
              </h1>
              <p className="text-lg text-white/80 mb-8">
                Create your free account to save facilities, track your search progress, and connect with treatment centers.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-white/90">
                  <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">Save Your Favorites</p>
                    <p className="text-sm text-white/70">Bookmark facilities to review later</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-white/90">
                  <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">Request Information</p>
                    <p className="text-sm text-white/70">Connect directly with treatment centers</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-white/90">
                  <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">Concierge Service</p>
                    <p className="text-sm text-white/70">Get personalized placement assistance</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Form */}
          <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-12">
            <div className="w-full max-w-md">
              <div className="lg:bg-transparent lg:border-0 lg:shadow-none lg:p-0 bg-card border border-border rounded-xl shadow-sm p-5 sm:p-6">
                {showVerification ? (
                  verificationContent
                ) : (
                  <>
                    <div className="lg:hidden text-center mb-6">
                      <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground">Create Account</h1>
                      <p className="text-sm text-muted-foreground mt-1">Save facilities and track your search</p>
                    </div>

                    <div className="hidden lg:block mb-8">
                      <h2 className="text-2xl font-display font-bold text-foreground">Create your account</h2>
                      <p className="text-muted-foreground mt-1">Fill in the details below to get started</p>
                    </div>

                <form onSubmit={handleSignup} className="space-y-4">
                  {/* Name Fields */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="firstName" className="text-sm">First Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="firstName"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="First"
                          className="h-10 sm:h-11 pl-10"
                          autoComplete="given-name"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="lastName" className="text-sm">Last Name</Label>
                      <Input
                        id="lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Last"
                        className="h-10 sm:h-11"
                        autoComplete="family-name"
                      />
                    </div>
                  </div>
                  
                  {/* Email */}
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-sm">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <EmailInput
                        id="email"
                        value={email}
                        onChange={setEmail}
                        placeholder="you@example.com"
                        className="pl-10 h-10 sm:h-11"
                      />
                    </div>
                  </div>
                  
                  {/* Phone */}
                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-sm">Phone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                      <PhoneInput
                        id="phone"
                        value={phone}
                        onChange={setPhone}
                        placeholder="(555) 123-4567"
                        className="pl-10 h-10 sm:h-11"
                      />
                    </div>
                  </div>
                  
                  {/* Location */}
                  <div className="space-y-1.5">
                    <Label className="text-sm">Location</Label>
                    <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                      <div className="relative">
                        <MapPin className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-3.5 sm:h-4 w-3.5 sm:w-4 text-muted-foreground" />
                        <Input
                          value={zipcode}
                          onChange={(e) => setZipcode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                          placeholder="Zip"
                          className="h-10 sm:h-11 pl-8 sm:pl-10 text-sm"
                          maxLength={5}
                        />
                      </div>
                      <Input
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="City"
                        className="h-10 sm:h-11 text-sm"
                        disabled={zipcodeLookup.isLoading}
                      />
                      <Input
                        value={state}
                        onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
                        placeholder="ST"
                        className="h-10 sm:h-11 text-sm"
                        disabled={zipcodeLookup.isLoading}
                        maxLength={2}
                      />
                    </div>
                    {zipcodeLookup.isLoading && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Looking up...
                      </p>
                    )}
                    {zipcodeLookup.data && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        {zipcodeLookup.data.city}, {zipcodeLookup.data.stateAbbr}
                      </p>
                    )}
                  </div>
                  
                  {/* Password */}
                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-sm">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="h-10 sm:h-11 pl-10 pr-10"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {password && <PasswordStrengthIndicator password={password} showRequirements={false} />}
                  </div>
                  
                  {/* Confirm Password */}
                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword" className="text-sm">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="h-10 sm:h-11 pl-10"
                        autoComplete="new-password"
                      />
                    </div>
                    {confirmPassword && password !== confirmPassword && (
                      <p className="text-xs text-destructive">Passwords do not match</p>
                    )}
                    {confirmPassword && password === confirmPassword && confirmPassword.length >= 6 && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Passwords match
                      </p>
                    )}
                  </div>
                  
                  <Button type="submit" className="w-full h-10 sm:h-11" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </form>
                
                <p className="text-xs text-muted-foreground text-center mt-4">
                  By creating an account, you agree to our{' '}
                  <Link to="/terms-of-service" className="underline hover:text-foreground">Terms</Link>
                  {' '}and{' '}
                  <Link to="/privacy-policy" className="underline hover:text-foreground">Privacy Policy</Link>
                </p>
                
                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card lg:bg-background px-2 text-muted-foreground">Or</span>
                  </div>
                </div>
                
                {/* Provider Link */}
                <Link to="/provider-signup" className="block">
                  <Button variant="outline" className="w-full h-10 sm:h-11 text-sm">
                    List Your Treatment Facility
                  </Button>
                </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
