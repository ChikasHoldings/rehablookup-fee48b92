import { useState, useEffect, useCallback } from "react";
import { FileText, Download, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface RefreshableAttachmentProps {
  url: string;
  name: string;
  storagePath?: string;
}

export function RefreshableAttachment({ url, name, storagePath }: RefreshableAttachmentProps) {
  const [currentUrl, setCurrentUrl] = useState(url);
  const [isExpired, setIsExpired] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(name);
  const fileExt = name.split(".").pop()?.toUpperCase() || "FILE";

  // Extract storage path from URL if not provided
  const getStoragePath = useCallback(() => {
    if (storagePath) return storagePath;
    
    // Try to extract path from signed URL
    try {
      const urlObj = new URL(url);
      const pathMatch = urlObj.pathname.match(/\/object\/sign\/concierge-attachments\/(.+)/);
      if (pathMatch) return pathMatch[1];
      
      // Try alternate pattern for public URLs
      const publicMatch = urlObj.pathname.match(/\/object\/public\/concierge-attachments\/(.+)/);
      if (publicMatch) return publicMatch[1];
    } catch {
      // URL parsing failed
    }
    return null;
  }, [url, storagePath]);

  // Check if URL is expired (signed URLs typically have a token parameter)
  const checkExpiry = useCallback(async () => {
    try {
      const response = await fetch(currentUrl, { method: "HEAD" });
      if (response.status === 400 || response.status === 403) {
        setIsExpired(true);
      }
    } catch {
      // Network error - might be expired
      setIsExpired(true);
    }
  }, [currentUrl]);

  // Refresh the signed URL
  const refreshUrl = useCallback(async () => {
    const path = getStoragePath();
    if (!path) {
      setError(true);
      return;
    }

    setIsRefreshing(true);
    setError(false);

    try {
      const { data, error: signError } = await supabase.storage
        .from("concierge-attachments")
        .createSignedUrl(path, 60 * 60 * 24 * 7); // 7 days

      if (signError) throw signError;
      
      setCurrentUrl(data.signedUrl);
      setIsExpired(false);
    } catch (err) {
      console.error("Failed to refresh attachment URL:", err);
      setError(true);
    } finally {
      setIsRefreshing(false);
    }
  }, [getStoragePath]);

  // Auto-check expiry on mount for signed URLs
  useEffect(() => {
    if (url.includes("token=")) {
      // It's a signed URL, check if expired after a short delay
      const timer = setTimeout(checkExpiry, 100);
      return () => clearTimeout(timer);
    }
  }, [url, checkExpiry]);

  if (error) {
    return (
      <div className="flex items-center gap-2 mt-2 bg-destructive/10 rounded-lg px-3 py-2 text-sm border border-destructive/20">
        <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
        <span className="text-destructive text-xs">File unavailable</span>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="flex items-center gap-2 mt-2 bg-muted rounded-lg px-3 py-2 text-sm border">
        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="truncate max-w-[100px] text-muted-foreground">{name}</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 ml-auto"
          onClick={refreshUrl}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} />
          <span className="ml-1 text-xs">Refresh</span>
        </Button>
      </div>
    );
  }

  if (isImage) {
    return (
      <a
        href={currentUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block mt-2"
      >
        <img
          src={currentUrl}
          alt={name}
          className="max-w-[200px] max-h-[150px] rounded-lg object-cover border"
          loading="lazy"
          onError={() => setIsExpired(true)}
        />
      </a>
    );
  }

  return (
    <a
      href={currentUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 mt-2 bg-background/50 rounded-lg px-3 py-2 text-sm border hover:bg-background/80 transition-colors"
    >
      <FileText className="h-4 w-4 shrink-0" />
      <span className="truncate max-w-[120px]">{name}</span>
      <span className="text-xs text-muted-foreground shrink-0">{fileExt}</span>
      <Download className="h-3 w-3 ml-auto shrink-0" />
    </a>
  );
}
