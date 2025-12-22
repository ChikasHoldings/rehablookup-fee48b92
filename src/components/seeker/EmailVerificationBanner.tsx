import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mail, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EmailVerificationBannerProps {
  email?: string;
}

export function EmailVerificationBanner({ email }: EmailVerificationBannerProps) {
  const [isResending, setIsResending] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const handleResend = async () => {
    if (!email) {
      toast.error('No email found');
      return;
    }

    setIsResending(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/account`,
      },
    });
    setIsResending(false);

    if (error) {
      toast.error('Failed to send verification email');
    } else {
      toast.success('Verification email sent! Check your inbox.');
    }
  };

  if (isDismissed) return null;

  return (
    <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Mail className="h-5 w-5 text-yellow-600 flex-shrink-0" />
          <p className="text-sm text-yellow-800 dark:text-yellow-200 truncate">
            <span className="font-medium">Verify your email</span>
            <span className="hidden sm:inline"> to unlock all features like leaving reviews.</span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="border-yellow-500/30 hover:bg-yellow-500/10 text-yellow-800 dark:text-yellow-200"
            onClick={handleResend}
            disabled={isResending}
          >
            {isResending ? 'Sending...' : 'Resend Email'}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-yellow-800 dark:text-yellow-200 hover:bg-yellow-500/10"
            onClick={() => setIsDismissed(true)}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Dismiss</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
