import { useProviderRedirect } from "@/hooks/useProviderRedirect";

interface PublicRouteGuardProps {
  children: React.ReactNode;
}

/**
 * Wrapper component for public routes that redirects authenticated providers
 * to their provider panel. This ensures providers cannot access the public
 * website while logged in.
 */
export function PublicRouteGuard({ children }: PublicRouteGuardProps) {
  const { isProvider, isLoading } = useProviderRedirect();

  // Show loading while checking provider status
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If user is a provider, don't render public content (redirect is happening)
  if (isProvider) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
}
