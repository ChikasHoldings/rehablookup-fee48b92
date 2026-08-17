interface SaveSearchButtonProps {
  criteria: Record<string, unknown>;
  suggestedName: string;
  searchUrl: string;
  resultCount?: number;
  className?: string;
  size?: "default" | "sm" | "lg";
}

/**
 * Consumer accounts were retired from RehabLookup.
 *
 * Search remains completely public and no longer asks visitors to create an
 * account to save filters or receive search alerts. Keep the component export
 * temporarily so SearchResults does not need a risky large-file refactor; the
 * call site can be removed during the broader RehabLookup simplification.
 */
export function SaveSearchButton(_props: SaveSearchButtonProps) {
  return null;
}
