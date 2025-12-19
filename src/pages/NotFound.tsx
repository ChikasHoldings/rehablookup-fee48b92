import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Home, Search, ArrowLeft, MapPin } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <Layout>
      <SEO
        title="Page Not Found - RehabLookup"
        description="The page you're looking for doesn't exist. Find addiction treatment centers and get help at RehabLookup."
        noindex
      />
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center bg-gradient-to-b from-muted/30 to-background py-16 px-4">
        <div className="text-center max-w-md mx-auto">
          {/* 404 Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-destructive/10 px-4 py-2">
            <MapPin className="h-4 w-4 text-destructive" />
            <span className="text-sm font-medium text-destructive">Page Not Found</span>
          </div>
          
          {/* Large 404 */}
          <h1 className="mb-4 font-display text-7xl font-bold text-primary md:text-8xl">
            404
          </h1>
          
          {/* Message */}
          <p className="mb-3 text-xl font-semibold text-foreground">
            Oops! This page doesn't exist
          </p>
          <p className="mb-8 text-muted-foreground leading-relaxed">
            The page you're looking for may have been moved or no longer exists. 
            Let us help you find your way.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/">
              <Button size="lg" className="gap-2 w-full sm:w-auto">
                <Home className="h-4 w-4" />
                Go Home
              </Button>
            </Link>
            <Link to="/rehab-centers">
              <Button variant="outline" size="lg" className="gap-2 w-full sm:w-auto">
                <Search className="h-4 w-4" />
                Find Treatment
              </Button>
            </Link>
          </div>

          {/* Back Link */}
          <button 
            onClick={() => window.history.back()}
            className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            Go back to previous page
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default NotFound;