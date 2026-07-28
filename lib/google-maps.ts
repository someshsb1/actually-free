import type { Participant, Plan, Venue } from "@/lib/planning";

type GoogleTextSearchResult = {
  place_id?: string;
  name?: string;
  formatted_address?: string;
  rating?: number;
  price_level?: number;
  types?: string[];
};

type GoogleDistanceElement = {
  status: string;
  duration?: { value: number };
};

export async function findGoogleVenues(plan: Plan): Promise<Venue[] | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  const query = `${plan.activityType === "activity" ? "things to do" : plan.activityType} near ${plan.area}, ${plan.city}`;
  const url = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
  url.searchParams.set("query", query);
  url.searchParams.set("key", apiKey);

  const response = await fetch(url, { next: { revalidate: 60 * 60 } });
  if (!response.ok) return null;

  const payload = (await response.json()) as { status?: string; results?: GoogleTextSearchResult[] };
  if (payload.status !== "OK" || !payload.results?.length) return null;

  return payload.results.slice(0, 6).map((result, index) => {
    const category = titleCase(result.types?.[0]?.replace(/_/g, " ") ?? plan.activityType);
    const priceLevel = priceLevelFromGoogle(result.price_level);
    const estimatedPrice = estimatePrice(plan.budgetMax, result.price_level);

    return {
      id: result.place_id ?? `google-${index + 1}`,
      externalPlaceId: result.place_id ?? `google-${index + 1}`,
      name: result.name ?? `${plan.area} option ${index + 1}`,
      address: result.formatted_address ?? `${plan.area}, ${plan.city}`,
      category,
      pricePerPerson: estimatedPrice,
      priceLevel,
      rating: result.rating ?? 4.2,
      bookingUrl: buildMapsSearchUrl(result.place_id ? `place_id:${result.place_id}` : `${result.name} ${plan.city}`),
      dietaryTags: ["vegetarian"],
      travelTimes: {},
      bookingConfidence: result.rating ? 0.82 : 0.62,
      why: `Real venue result near ${plan.area}, ${plan.city}, matched to the activity and budget target.`
    };
  });
}

export async function estimateGoogleTravelTimes(
  participants: Participant[],
  venues: Venue[],
  plan: Plan
): Promise<Record<string, Record<string, number>> | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey || !participants.length || !venues.length) return null;

  const origins = participants.map((participant) => `${participant.startingLocation}, ${plan.city}`);
  const destinations = venues.map((venue) => venue.address);
  const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");
  url.searchParams.set("origins", origins.join("|"));
  url.searchParams.set("destinations", destinations.join("|"));
  url.searchParams.set("mode", "transit");
  url.searchParams.set("key", apiKey);

  const response = await fetch(url, { next: { revalidate: 15 * 60 } });
  if (!response.ok) return null;

  const payload = (await response.json()) as {
    status?: string;
    rows?: { elements?: GoogleDistanceElement[] }[];
  };
  if (payload.status !== "OK" || !payload.rows) return null;

  return venues.reduce<Record<string, Record<string, number>>>((byVenue, venue, venueIndex) => {
    byVenue[venue.id] = participants.reduce<Record<string, number>>((times, participant, participantIndex) => {
      const element = payload.rows?.[participantIndex]?.elements?.[venueIndex];
      times[participant.id] = element?.status === "OK" && element.duration ? Math.round(element.duration.value / 60) : plan.maxTravelMinutes;
      return times;
    }, {});
    return byVenue;
  }, {});
}

function priceLevelFromGoogle(priceLevel?: number): Venue["priceLevel"] {
  if (!priceLevel || priceLevel <= 1) return "$";
  if (priceLevel === 2) return "$$";
  return "$$$";
}

function estimatePrice(budgetMax: number, priceLevel?: number): number {
  if (!priceLevel) return Math.max(15, Math.round(budgetMax * 0.8));
  return Math.max(12, Math.round([18, 28, 48, 75][Math.min(priceLevel, 4) - 1] ?? budgetMax));
}

function buildMapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function titleCase(value: string): string {
  return value
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
