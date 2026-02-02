import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// This page has been merged into the unified Placement Command Center
// Redirect to /admin/concierge with the international tab selected
export default function AdminInternational() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to unified command center
    navigate("/admin/concierge", { replace: true });
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <p className="text-muted-foreground">Redirecting to Placement Command Center...</p>
    </div>
  );
}
