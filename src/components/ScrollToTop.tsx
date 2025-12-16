import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    // If there's a hash (anchor link), scroll to that element instantly
    if (hash) {
      const element = document.getElementById(hash.slice(1));
      if (element) {
        element.scrollIntoView({ behavior: "instant" });
        return;
      }
    }
    
    // Scroll to top instantly
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname, hash]);

  return null;
}

