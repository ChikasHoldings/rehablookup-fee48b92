import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export function MidArticleCTA() {
  return (
    <Link to="/search-results"
      className="my-6 flex items-center gap-3 rounded-lg bg-primary/5 border border-primary/15 px-4 py-3 group hover:bg-primary/10 hover:border-primary/25 transition-all"
    >
      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <Search className="h-4 w-4 text-primary" />
      </div>
      <span className="text-sm font-medium text-foreground flex-1">
        Need help finding treatment?
      </span>
      <ArrowRight className="h-4 w-4 text-primary opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
    </Link>
  );
}
