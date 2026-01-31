import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Lock, User, Phone, MapPin, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';
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
        
        // Send welcome email and create welcome notification
        supabase.functions.invoke('send-seeker-emails', {
          body: {
            type: 'welcome',
            seekerId: data.user.id,
            email: email.trim()
          }
        }).catch(err => console.error('Failed to send welcome email:', err));
        
        toast.success('Account created successfully!');
        navigate('/account');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create account');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <SEO 
        title="Create Account | RehabLookup"
        description="Create an account to save your favorite treatment centers and manage your recovery journey."
      />
      
      <div className="min-h-screen flex flex-col bg-background">
        {/* Header */}
        <header className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-50">
          <div className="container h-14 flex items-center justify-between">
            <Link to="/" className="flex items-center">
              <img src="/logo.png" alt="RehabLookup" className="h-7 md:h-8 w-auto" />
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
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
            </div>
            
            <div className="relative max-w-md text-white">
              <h1 className="text-4xl xl:text-5xl font-display font-bold mb-6">
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
              {/* Mobile/Tablet Container */}
              <div className="lg:bg-transparent lg:border-0 lg:shadow-none lg:p-0 bg-card border border-border rounded-xl shadow-sm p-5 sm:p-6">
                {/* Mobile Header */}
                <div className="lg:hidden text-center mb-6">
                  <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground">Create Account</h1>
                  <p className="text-sm text-muted-foreground mt-1">Save facilities and track your search</p>
                </div>

                {/* Desktop Header */}
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
                  <Link to="/terms" className="underline hover:text-foreground">Terms</Link>
                  {' '}and{' '}
                  <Link to="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
