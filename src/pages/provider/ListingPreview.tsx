import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function ListingPreview() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const previewUrl = `/center/${slug}`;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Preview Header Bar */}
      <div className="sticky top-0 z-50 bg-amber-500/10 border-b border-amber-500/30 backdrop-blur-sm shrink-0">
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
            <span className="hidden sm:block text-sm text-muted-foreground">
              This is how families will see your listing
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(previewUrl, '_blank')}
              className="gap-1.5"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Open in New Tab</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => navigate("/provider/listing")}
            >
              Edit Listing
            </Button>
          </div>
        </div>
      </div>

      {/* Iframe Preview */}
      <div className="flex-1 relative">
        <iframe
          src={previewUrl}
          className="w-full h-full absolute inset-0 border-0"
          title="Listing Preview"
        />
      </div>
    </div>
  );
}
