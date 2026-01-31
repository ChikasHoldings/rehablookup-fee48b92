import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Component that handles trailing slash normalization.
 * Redirects URLs with trailing slashes to their canonical version without.
 * This helps prevent duplicate content issues in search engines.
 */
export function TrailingSlashRedirect() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const { pathname, search, hash } = location;
    
    // If path has trailing slash (and isn't just "/"), redirect to non-trailing version
    if (pathname.length > 1 && pathname.endsWith('/')) {
      const newPath = pathname.slice(0, -1);
      navigate(newPath + search + hash, { replace: true });
    }
  }, [location, navigate]);

  return null;
}
