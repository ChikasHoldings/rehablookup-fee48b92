import { statesData } from "@/data/locationSeoData";
import { createLocationHubResolver } from "@/lib/seo/cityHubs.mjs";

/** Shared resolver: links only to location hubs that exist. */
export const locationHubs = createLocationHubResolver(statesData);
