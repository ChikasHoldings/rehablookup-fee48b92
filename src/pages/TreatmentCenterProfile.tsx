import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

/**
 * Legacy route handler for /treatment-centers/:slug and /rehab-centers/:id
 *
 * The standalone "Treatment Center Profile" page has been deprecated in favor
 * of the unified /center/:slug experience (CenterProfile). This component now
 * acts purely as a smart redirect:
 *
 *   1. If the URL param matches a facility slug → /center/{slug}
 *   2. If the URL param matches a facility id   → /center/{slug}
 *   3. Otherwise → /rehab-centers (directory)
 *
 * This eliminates "Center Not Found" dead-ends from any stale internal links,
 * inbound backlinks, or indexed pages still pointing at the legacy URL pattern.
 */
interface TreatmentCenterProfileProps {
  /**
   * Optional override for the URL param. Defaults to the `:slug` route param,
   * but callers (e.g. StatePage handling stale `/rehab-centers/{uuid}` links)
   * can pass an explicit value when their route uses a different param name.
   */
  paramOverride?: string;
}

const TreatmentCenterProfile = ({ paramOverride }: TreatmentCenterProfileProps = {}) => {
  const { slug: routeSlug } = useParams<{ slug: string }>();
  const slug = paramOverride ?? routeSlug;
  const [resolvedSlug, setResolvedSlug] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!slug) {
      setNotFound(true);
      return;
    }

    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        slug,
      );

    (async () => {
      const query = supabase
        .from("public_facilities")
        .select("slug, id")
        .limit(1);

      const { data, error } = isUuid
        ? await query.eq("id", slug).maybeSingle()
        : await query.eq("slug", slug).maybeSingle();

      if (cancelled) return;

      if (error || !data) {
        setNotFound(true);
        return;
      }

      setResolvedSlug(data.slug ?? null);
      if (!data.slug) setNotFound(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (resolvedSlug) {
    return <Navigate to={`/center/${resolvedSlug}`} replace />;
  }

  if (notFound) {
    return <Navigate to="/rehab-centers" replace />;
  }

  return (
    <Layout>
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    </Layout>
  );
};

export default TreatmentCenterProfile;
