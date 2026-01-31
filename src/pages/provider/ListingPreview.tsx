import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeft, Edit3, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export default function ListingPreview() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const publicUrl = `/center/${slug}`;

  // Check if the current user owns this facility
  useEffect(() => {
    const checkAuthorization = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/provider-login", { replace: true });
        return;
      }

      // Check if user owns a facility with this slug
      const { data: facility } = await supabase
        .from("facilities")
        .select("id, user_id")
        .eq("slug", slug)
        .eq("user_id", session.user.id)
        .single();

      if (!facility) {
        // User doesn't own this facility, redirect back
        navigate("/provider/listing", { replace: true });
        return;
      }

      setIsAuthorized(true);
    };

    checkAuthorization();
  }, [slug, navigate]);

  if (isAuthorized === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Preview Header Bar - Fixed at top */}
      <div className="shrink-0 bg-amber-500/10 border-b border-amber-500/30 backdrop-blur-md z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/provider/listing")}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Listings</span>
            </Button>
            <Badge variant="secondary" className="bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30">
              Preview Mode
            </Badge>
            <span className="hidden md:block text-sm text-muted-foreground">
              This is how families will see your listing
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(publicUrl, '_blank')}
              className="gap-1.5"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Open Live</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => navigate("/provider/listing")}
              className="gap-1.5"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Edit</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Iframe Container - Full remaining height */}
      <div className="flex-1 min-h-0">
        <iframe
          src={publicUrl}
          className="w-full h-full border-0"
          title="Listing Preview"
        />
      </div>
    </div>
  );
}
