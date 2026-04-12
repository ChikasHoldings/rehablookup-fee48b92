import { useState, useCallback } from "react";
import {
  Twitter,
  Facebook,
  Linkedin,
  Mail,
  Copy,
  Check,
  Share2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ArticleShareBarProps {
  title: string;
  description?: string;
  url?: string;
  className?: string;
  label?: string;
  variant?: "inline" | "compact";
}

/**
 * Builds the og-share URL that serves proper OG meta tags to social crawlers
 * and instantly redirects human visitors to the real page.
 */
function getOgShareUrl(canonicalUrl: string): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) return canonicalUrl;

  // Extract the path from the canonical URL
  try {
    const parsed = new URL(canonicalUrl);
    return `${supabaseUrl}/functions/v1/og-share?path=${encodeURIComponent(parsed.pathname)}`;
  } catch {
    return canonicalUrl;
  }
}

/**
 * Sanitizes text for use in share URLs to prevent XSS/injection.
 * Only allows safe characters and truncates to a max length.
 */
function sanitizeShareText(text: string, maxLength = 280): string {
  return text
    .replace(/[<>"'`]/g, "") // Strip potentially dangerous characters
    .slice(0, maxLength)
    .trim();
}

/**
 * Builds a safe, absolute canonical URL for sharing.
 */
function getCanonicalShareUrl(url?: string): string {
  if (url && /^https?:\/\//.test(url)) return url;
  if (typeof window === "undefined") return "https://rehablookup.com";
  // Use canonical link if available, fallback to window.location
  const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  return canonical?.href || window.location.href.split("?")[0].split("#")[0];
}

const SHARE_CHANNELS = [
  {
    id: "twitter",
    label: "Share on X (Twitter)",
    Icon: Twitter,
    getUrl: (url: string, title: string) =>
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
  },
  {
    id: "facebook",
    label: "Share on Facebook",
    Icon: Facebook,
    getUrl: (url: string) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    id: "linkedin",
    label: "Share on LinkedIn",
    Icon: Linkedin,
    getUrl: (url: string, title: string) =>
      `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
  },
  {
    id: "email",
    label: "Share via Email",
    Icon: Mail,
    getUrl: (url: string, title: string, desc?: string) =>
      `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(
        `${desc ? desc + "\n\n" : ""}Read more: ${url}`
      )}`,
  },
] as const;

export function ArticleShareBar({
  title,
  description,
  url,
  className,
  label = "Share this article:",
  variant = "inline",
}: ArticleShareBarProps) {
  const [copied, setCopied] = useState(false);

  const safeTitle = sanitizeShareText(title);
  const safeDesc = description ? sanitizeShareText(description, 200) : undefined;
  const shareUrl = getCanonicalShareUrl(url);
  // Social share links use the og-share proxy so crawlers see proper OG tags
  const ogShareUrl = getOgShareUrl(shareUrl);

  const handleNativeShare = useCallback(async () => {
    if (!navigator.share) return false;
    try {
      await navigator.share({
        title: safeTitle,
        text: safeDesc || safeTitle,
        url: shareUrl,
      });
      return true;
    } catch (err) {
      // User cancelled — not an error
      if (err instanceof Error && err.name === "AbortError") return true;
      return false;
    }
  }, [safeTitle, safeDesc, shareUrl]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({ title: "Link copied to clipboard!" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers / insecure contexts
      const textarea = document.createElement("textarea");
      textarea.value = shareUrl;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        toast({ title: "Link copied to clipboard!" });
        setTimeout(() => setCopied(false), 2000);
      } catch {
        toast({ title: "Failed to copy link", variant: "destructive" });
      }
      document.body.removeChild(textarea);
    }
  }, [shareUrl]);

  const handleShareClick = useCallback(
    async (channel: (typeof SHARE_CHANNELS)[number]) => {
      const href = channel.getUrl(shareUrl, safeTitle, safeDesc);
      if (channel.id === "email") {
        window.location.href = href;
        return;
      }
      // Open in a popup for social platforms
      const width = 600;
      const height = 500;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;
      window.open(
        href,
        `share_${channel.id}`,
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
      );
    },
    [shareUrl, safeTitle, safeDesc]
  );

  const supportsNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  const btnClass =
    "inline-flex items-center justify-center h-10 w-10 rounded-full bg-muted hover:bg-primary/10 hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          variant === "inline"
            ? "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            : "flex items-center gap-2",
          className
        )}
      >
        {variant === "inline" && label && (
          <p className="text-sm font-medium text-foreground">{label}</p>
        )}

        <div className="flex items-center gap-2">
          {/* Native share on supported devices (mainly mobile) */}
          {supportsNativeShare && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleNativeShare}
                  className={btnClass}
                  aria-label="Share"
                >
                  <Share2 className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Share</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Social channels */}
          {SHARE_CHANNELS.map((channel) => (
            <Tooltip key={channel.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleShareClick(channel)}
                  className={btnClass}
                  aria-label={channel.label}
                >
                  <channel.Icon className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{channel.label}</p>
              </TooltipContent>
            </Tooltip>
          ))}

          {/* Copy link */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleCopyLink}
                className={btnClass}
                aria-label={copied ? "Copied!" : "Copy link"}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{copied ? "Copied!" : "Copy link"}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
