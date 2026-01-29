import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useSeekerAuth } from '@/hooks/useSeekerAuth';
import { supabase } from '@/integrations/supabase/client';
import { Heart, Mail, Lock, User, ArrowLeft } from 'lucide-react';
import { SEO } from '@/components/SEO';

export default function SeekerAuth() {
  const navigate = useNavigate();
  const { signUp, signIn, isAuthenticated, isLoading } = useSeekerAuth();
  
  const searchParams = new URLSearchParams(window.location.search);
  const returnTo = searchParams.get('returnTo') || '/account';
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate(returnTo);
    }
  }, [isAuthenticated, isLoading, navigate, returnTo]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    
    setIsSubmitting(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setIsSubmitting(false);
    
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Invalid email or password');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Welcome back!');
      navigate(returnTo);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupEmail || !signupPassword || !signupConfirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    
    if (signupPassword !== signupConfirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    if (signupPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    setIsSubmitting(true);
    const { error } = await signUp(signupEmail, signupPassword, displayName);
    setIsSubmitting(false);
    
    if (error) {
      if (error.message.includes('already registered')) {
        toast.error('An account with this email already exists');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Account created successfully!');
      navigate(returnTo);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      toast.error('Please enter your email address');
      return;
    }
    
    setIsSendingReset(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setIsSendingReset(false);
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Check your email for a password reset link');
      setShowForgotPassword(false);
      setForgotEmail('');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <SEO 
        title="Sign In | RehabLookup"
        description="Sign in or create an account to save your favorite treatment centers and manage your recovery journey."
      />
      
      <div className="min-h-screen flex flex-col bg-background">
        {/* Header */}
        <header className="flex items-center justify-between p-4 sm:p-6">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back</span>
          </Link>
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <Heart className="h-4 w-4 text-primary" />
            </div>
            <span className="font-semibold text-foreground">RehabLookup</span>
          </Link>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center px-4 pb-8">
          <div className="w-full max-w-sm space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                Welcome
              </h1>
              <p className="text-sm text-muted-foreground">
                Sign in to save facilities and track your search
              </p>
            </div>

            {/* Auth Tabs */}
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-10 bg-muted/50">
                <TabsTrigger value="login" className="text-sm data-[state=active]:bg-background">
                  Sign In
                </TabsTrigger>
                <TabsTrigger value="signup" className="text-sm data-[state=active]:bg-background">
                  Create Account
                </TabsTrigger>
              </TabsList>
              
              {/* Login Form */}
              <TabsContent value="login" className="mt-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="login-email" className="text-sm">
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="you@example.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="h-10 pl-10"
                        autoComplete="email"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password" className="text-sm">
                        Password
                      </Label>
                      <Button
                        type="button"
                        variant="link"
                        className="px-0 h-auto text-xs text-muted-foreground hover:text-primary"
                        onClick={() => setShowForgotPassword(true)}
                      >
                        Forgot?
                      </Button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="h-10 pl-10"
                        autoComplete="current-password"
                      />
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full h-10" 
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>
              
              {/* Signup Form */}
              <TabsContent value="signup" className="mt-4">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="display-name" className="text-sm">
                      Name <span className="text-muted-foreground">(optional)</span>
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="display-name"
                        type="text"
                        placeholder="Your name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="h-10 pl-10"
                        autoComplete="name"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-email" className="text-sm">
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="you@example.com"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        className="h-10 pl-10"
                        autoComplete="email"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-password" className="text-sm">
                        Password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-password"
                          type="password"
                          placeholder="••••••"
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          className="h-10 pl-10"
                          autoComplete="new-password"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label htmlFor="confirm-password" className="text-sm">
                        Confirm
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="confirm-password"
                          type="password"
                          placeholder="••••••"
                          value={signupConfirmPassword}
                          onChange={(e) => setSignupConfirmPassword(e.target.value)}
                          className="h-10 pl-10"
                          autoComplete="new-password"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full h-10" 
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Creating account...' : 'Create Account'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
            
            {/* Terms */}
            <p className="text-xs text-muted-foreground text-center">
              By continuing, you agree to our{' '}
              <Link to="/terms" className="underline hover:text-foreground">Terms</Link>
              {' '}and{' '}
              <Link to="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>
            </p>
            
            {/* Provider Link */}
            <div className="pt-4 border-t border-border text-center">
              <p className="text-sm text-muted-foreground">
                Are you a treatment provider?{' '}
                <Link to="/provider-login" className="text-primary font-medium hover:underline">
                  Sign in here
                </Link>
              </p>
            </div>
          </div>
        </main>
      </div>
      
      {/* Forgot Password Dialog */}
      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription className="text-sm">
              Enter your email and we'll send you a reset link.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="forgot-email" className="text-sm">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                placeholder="you@example.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-10"
                onClick={() => setShowForgotPassword(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1 h-10" disabled={isSendingReset}>
                {isSendingReset ? 'Sending...' : 'Send Link'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
