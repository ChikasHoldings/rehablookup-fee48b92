import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mail, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EmailVerificationBannerProps {
  email?: string;
  onVerified?: () => void;
}

export function EmailVerificationBanner({ email, onVerified }: EmailVerificationBannerProps) {
  const [isResending, setIsResending] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSendCode = async () => {
    if (!email) {
      toast.error('No email found');
      return;
    }

    setIsResending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-verification-code', {
        body: { email }
      });

      if (error || data?.error) {
        toast.error(data?.error || 'Failed to send verification code');
        return;
      }

      toast.success('Verification code sent! Check your inbox.');
      setShowCodeInput(true);
      setResendCooldown(60);
      setCode(['', '', '', '', '', '']);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch {
      toast.error('Failed to send verification code');
    } finally {
      setIsResending(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join('');
    if (fullCode.length !== 6) return;

    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-code', {
        body: { email, code: fullCode }
      });

      if (error || data?.error) {
        toast.error(data?.error || 'Invalid code. Please try again.');
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        return;
      }

      toast.success('Email verified!');
      setIsDismissed(true);
      onVerified?.();
    } catch {
      toast.error('Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  // Auto-verify when 6 digits entered
  useEffect(() => {
    if (code.join('').length === 6 && showCodeInput) {
      handleVerify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  if (isDismissed) return null;

  return (
    <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-3 sm:px-4 py-2 sm:py-3">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-2 sm:gap-4 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600 flex-shrink-0" />
            <p className="text-xs sm:text-sm text-yellow-800 dark:text-yellow-200 truncate">
              <span className="font-medium">Verify your email</span>
              <span className="hidden sm:inline"> to unlock all features like leaving reviews.</span>
            </p>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {!showCodeInput ? (
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-2.5 sm:px-3 text-xs sm:text-sm border-yellow-500/30 hover:bg-yellow-500/10 text-yellow-800 dark:text-yellow-200"
                onClick={handleSendCode}
                disabled={isResending}
              >
                {isResending ? (
                  <>
                    <Loader2 className="h-3 w-3 sm:mr-1 animate-spin" />
                    <span className="hidden sm:inline">Sending...</span>
                  </>
                ) : (
                  <>
                    <span className="sm:hidden">Verify</span>
                    <span className="hidden sm:inline">Send Code</span>
                  </>
                )}
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                {resendCooldown > 0 ? (
                  <span className="text-xs text-yellow-700 dark:text-yellow-300 tabular-nums">{resendCooldown}s</span>
                ) : (
                  <button
                    onClick={handleSendCode}
                    disabled={isResending}
                    className="text-xs text-yellow-700 dark:text-yellow-300 hover:underline"
                  >
                    Resend
                  </button>
                )}
              </div>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 sm:h-8 sm:w-8 text-yellow-800 dark:text-yellow-200 hover:bg-yellow-500/10 shrink-0"
              onClick={() => setIsDismissed(true)}
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Code input row */}
        {showCodeInput && (
          <div className="flex items-center justify-center flex-wrap gap-1.5 sm:gap-2 mt-3" onPaste={handlePaste}>
            {code.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleCodeChange(i, e.target.value)}
                onKeyDown={(e) => handleCodeKeyDown(i, e)}
                className="w-8 h-10 sm:w-9 sm:h-10 text-center text-base sm:text-lg font-bold border-2 border-yellow-500/30 rounded-md bg-background text-foreground focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none"
                disabled={isVerifying}
              />
            ))}
            {isVerifying && <Loader2 className="h-4 w-4 animate-spin text-yellow-600 ml-2" />}
          </div>
        )}
      </div>
    </div>
  );
}
