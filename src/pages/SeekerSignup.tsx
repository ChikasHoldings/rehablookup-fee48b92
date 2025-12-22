import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Heart, Mail, Lock, User, ArrowLeft, Phone, MapPin, Eye, EyeOff, Loader2, CheckCircle, Search, Shield, Clock } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { PhoneInput } from '@/components/ui/phone-input';
import { EmailInput } from '@/components/ui/email-input';
import { isValidPhoneNumber } from '@/lib/phoneUtils';
import { isValidEmail } from '@/lib/emailUtils';
import { useZipcodeLookup } from '@/hooks/useZipcodeLookup';
import { PasswordStrengthIndicator } from '@/components/ui/password-strength-indicator';

export default function SeekerSignup() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
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
  
  // Check if already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/account');
      }
    };
    checkAuth();
  }, [navigate]);
  
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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!firstName.trim() || !lastName.trim()) {
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
    
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const displayName = `${firstName.trim()} ${lastName.trim()}`;
      
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/account`,
          data: {
            display_name: displayName,
            first_name: firstName.trim(),
            last_name: lastName.trim()
          }
        }
      });
      
      if (error) {
        if (error.message.includes('already registered')) {
          toast.error('An account with this email already exists');
        } else {
          toast.error(error.message);
        }
        return;
      }
      
      if (data.user) {
        // Update seeker_profiles with additional info
        const { error: profileError } = await supabase
          .from('seeker_profiles')
          .update({
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            display_name: displayName,
            phone: phone,
            zipcode: zipcode,
            city: city,
            state: state
          })
          .eq('user_id', data.user.id);
        
        if (profileError) {
          console.error('Profile update error:', profileError);
        }
        
        toast.success('Account created successfully!');
        navigate('/account');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/account`,
      },
    });
    
    if (error) {
      toast.error(error.message);
      setIsGoogleLoading(false);
    }
  };

  return (
    <>
      <SEO 
        title="Create Account | Find Treatment Centers"
        description="Create an account to save your favorite treatment centers and manage your recovery journey."
      />
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
        {/* Header */}
        <div className="p-4 lg:p-6">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>
        
        {/* Main Content - Horizontal Layout */}
        <div className="flex-1 flex items-center justify-center px-4 pb-8">
          <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
            
            {/* Left Side - Branding & Benefits */}
            <div className="hidden lg:flex flex-col space-y-8 sticky top-8">
              <div className="space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
                  <Heart className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-foreground">
                  Your Journey to <span className="text-primary">Recovery</span> Starts Here
                </h1>
                <p className="text-lg text-muted-foreground">
                  Create a free account to save treatment centers, track your search, and get personalized recommendations.
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Search className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Save & Compare</h3>
                    <p className="text-sm text-muted-foreground">Bookmark your favorite facilities and compare them side by side.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Private & Secure</h3>
                    <p className="text-sm text-muted-foreground">Your information is protected and never shared without consent.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Quick Access</h3>
                    <p className="text-sm text-muted-foreground">Sign in anytime to continue your search right where you left off.</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right Side - Signup Form */}
            <div className="w-full max-w-md mx-auto lg:mx-0">
              <div className="bg-card rounded-2xl shadow-xl border border-border/50 p-6 sm:p-8">
                {/* Mobile Header */}
                <div className="lg:hidden text-center mb-6">
                  <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                    <Heart className="h-6 w-6 text-primary" />
                  </div>
                  <h1 className="text-2xl font-bold">Create Account</h1>
                  <p className="text-muted-foreground text-sm mt-1">Sign up to save facilities and track your search</p>
                </div>
                
                {/* Google Sign In */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2 h-11"
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleLoading}
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  {isGoogleLoading ? 'Connecting...' : 'Continue with Google'}
                </Button>
                
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or sign up with email</span>
                  </div>
                </div>

                <form onSubmit={handleSignup} className="space-y-4">
                  {/* Name Fields - Side by side */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="firstName">First Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="firstName"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="First"
                          className="pl-10"
                          autoComplete="given-name"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Last"
                        autoComplete="family-name"
                      />
                    </div>
                  </div>
                  
                  {/* Email */}
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <EmailInput
                        id="email"
                        value={email}
                        onChange={setEmail}
                        placeholder="you@example.com"
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  {/* Phone */}
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Phone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                      <PhoneInput
                        id="phone"
                        value={phone}
                        onChange={setPhone}
                        placeholder="(555) 123-4567"
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  {/* Location - Zipcode with auto-detect */}
                  <div className="space-y-1.5">
                    <Label>Location</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={zipcode}
                          onChange={(e) => setZipcode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                          placeholder="Zip"
                          className="pl-10"
                          maxLength={5}
                        />
                      </div>
                      <Input
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="City"
                        disabled={zipcodeLookup.isLoading}
                        className={zipcodeLookup.data ? 'bg-muted/50' : ''}
                      />
                      <Input
                        value={state}
                        onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
                        placeholder="State"
                        disabled={zipcodeLookup.isLoading}
                        className={zipcodeLookup.data ? 'bg-muted/50' : ''}
                        maxLength={2}
                      />
                    </div>
                    {zipcodeLookup.isLoading && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Looking up location...
                      </p>
                    )}
                    {zipcodeLookup.data && (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        {zipcodeLookup.data.city}, {zipcodeLookup.data.stateAbbr}
                      </p>
                    )}
                  </div>
                  
                  {/* Password */}
                  <div className="space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pl-10 pr-10"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {password && <PasswordStrengthIndicator password={password} showRequirements={false} />}
                  </div>
                  
                  {/* Confirm Password */}
                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pl-10"
                        autoComplete="new-password"
                      />
                    </div>
                    {confirmPassword && password !== confirmPassword && (
                      <p className="text-xs text-destructive">Passwords do not match</p>
                    )}
                    {confirmPassword && password === confirmPassword && confirmPassword.length >= 6 && (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Passwords match
                      </p>
                    )}
                  </div>
                  
                  <Button type="submit" className="w-full h-11" disabled={isSubmitting}>
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
                
                <p className="text-xs text-muted-foreground text-center mt-5">
                  By creating an account, you agree to our{' '}
                  <Link to="/terms" className="underline hover:text-foreground">Terms</Link>
                  {' '}and{' '}
                  <Link to="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>
                </p>
                
                {/* Sign In Link */}
                <div className="mt-5 pt-4 border-t border-border text-center">
                  <p className="text-sm text-muted-foreground">
                    Already have an account?{' '}
                    <Link to="/auth" className="text-primary font-medium hover:underline">
                      Sign in
                    </Link>
                  </p>
                </div>
                
                {/* Provider Link - Prominent */}
                <div className="mt-4">
                  <div className="bg-muted/50 rounded-lg p-4 text-center">
                    <p className="text-sm font-medium text-foreground mb-1">
                      Are you a treatment provider?
                    </p>
                    <Link 
                      to="/provider-login" 
                      className="text-primary font-semibold hover:underline inline-flex items-center gap-1"
                    >
                      Sign in here →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
