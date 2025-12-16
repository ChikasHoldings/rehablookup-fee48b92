import { useState } from "react";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface LazyVideoEmbedProps {
  videoId: string;
  platform: "youtube" | "vimeo";
  title?: string;
  className?: string;
  onPlay?: () => void;
}

export function LazyVideoEmbed({ 
  videoId, 
  platform, 
  title = "Video",
  className,
  onPlay 
}: LazyVideoEmbedProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  const handlePlay = () => {
    setIsLoaded(true);
    onPlay?.();
  };

  // Generate thumbnail URL
  const thumbnailUrl = platform === "youtube"
    ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    : null; // Vimeo requires API call for thumbnail, we'll use a placeholder

  // Generate embed URL with autoplay
  const embedUrl = platform === "youtube"
    ? `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`
    : `https://player.vimeo.com/video/${videoId}?autoplay=1&title=0&byline=0&portrait=0`;

  if (isLoaded) {
    return (
      <div className={cn("relative aspect-video rounded-2xl overflow-hidden bg-muted", className)}>
        <iframe
          src={embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handlePlay}
      className={cn(
        "relative aspect-video w-full rounded-2xl overflow-hidden border border-border cursor-pointer group shadow-sm hover:shadow-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        className
      )}
      aria-label={`Play ${title}`}
    >
      {/* Thumbnail */}
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10" />
      )}
      
      {/* Overlay gradient for better play button visibility */}
      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
      
      {/* Play button */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200">
          <Play className="w-6 h-6 md:w-8 md:h-8 text-primary-foreground ml-1" fill="currentColor" />
        </div>
      </div>
    </button>
  );
}
