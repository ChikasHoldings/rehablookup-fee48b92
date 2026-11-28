export interface LocationHubResolver {
  statePath(state: string | null | undefined): string | null;
  cityPath(state: string | null | undefined, city: string | null | undefined): string | null;
}
export function createLocationHubResolver(
  states: ReadonlyArray<{ name: string; slug: string; cities: ReadonlyArray<{ name: string; slug: string }> }>,
): LocationHubResolver;
