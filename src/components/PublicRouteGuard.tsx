interface PublicRouteGuardProps {
  children: React.ReactNode;
}

/**
 * Public route guard — pass-through.
 * Public pages are completely separated from admin/provider portals.
 * No role checks, no redirects. Everyone can view public content.
 */
export function PublicRouteGuard({ children }: PublicRouteGuardProps) {
  return <>{children}</>;
}
