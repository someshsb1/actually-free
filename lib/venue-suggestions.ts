import type { ActivityType, Plan, Venue } from "@/lib/planning";

type VenueSeedInput = Pick<Plan, "activityType" | "budgetMax" | "city" | "area" | "maxTravelMinutes">;

const activityProfiles: Record<ActivityType, { categories: string[]; names: string[] }> = {
  dinner: {
    categories: ["Neighborhood restaurant", "Casual bistro", "Shared plates"],
    names: ["Table", "Kitchen", "Supper Club"]
  },
  brunch: {
    categories: ["Brunch cafe", "Bakery cafe", "All-day restaurant"],
    names: ["Brunch House", "Morning Room", "Cafe"]
  },
  drinks: {
    categories: ["Cocktail bar", "Wine bar", "Pub"],
    names: ["Bar", "Lounge", "Taproom"]
  },
  coffee: {
    categories: ["Coffee shop", "Cafe", "Bakery"],
    names: ["Coffee", "Cafe", "Roasters"]
  },
  activity: {
    categories: ["Group activity", "Casual hangout", "Entertainment"],
    names: ["Social Club", "Playhouse", "Hangout"]
  }
};

export function suggestVenuesForPlan(plan: VenueSeedInput): Venue[] {
  const area = cleanLocation(plan.area, "the preferred area");
  const city = cleanLocation(plan.city, "your city");
  const profile = activityProfiles[plan.activityType];
  const baseBudget = Math.max(15, plan.budgetMax || 40);
  const prices = [Math.round(baseBudget * 0.72), Math.round(baseBudget * 0.9), Math.round(baseBudget * 0.62)];
  const travelTimes = buildBalancedTravelTimes(plan.maxTravelMinutes || 35);

  return [0, 1, 2].map((index) => {
    const category = profile.categories[index];
    const name = `${area} ${profile.names[index]}`;
    const pricePerPerson = Math.max(12, prices[index]);

    return {
      id: `suggested-${index + 1}`,
      externalPlaceId: `suggested-${slugify(city)}-${slugify(area)}-${index + 1}`,
      name,
      address: `${area}, ${city}`,
      category,
      pricePerPerson,
      priceLevel: pricePerPerson > 60 ? "$$$" : pricePerPerson > 25 ? "$$" : "$",
      rating: [4.6, 4.4, 4.3][index],
      bookingUrl: buildMapsSearchUrl(`${category} near ${area}, ${city}`),
      dietaryTags: index === 0 ? ["vegetarian", "gluten-free"] : index === 1 ? ["vegetarian", "vegan"] : ["vegetarian"],
      travelTimes: travelTimes[index],
      bookingConfidence: [0.78, 0.7, 0.66][index],
      why: `A ${category.toLowerCase()} search centered on ${area}, ${city}, ranked for a fair group trip and the stated budget.`
    };
  });
}

export function getVenueSuggestionsForPlan(plan: Plan): Venue[] {
  return suggestVenuesForPlan(plan);
}

function cleanLocation(value: string, fallback: string): string {
  return value.trim() || fallback;
}

function buildBalancedTravelTimes(maxTravelMinutes: number): Record<string, number>[] {
  const target = Math.max(15, maxTravelMinutes);
  return [
    { sample_1: Math.round(target * 0.58), sample_2: Math.round(target * 0.68), sample_3: Math.round(target * 0.76) },
    { sample_1: Math.round(target * 0.7), sample_2: Math.round(target * 0.73), sample_3: Math.round(target * 0.83) },
    { sample_1: Math.round(target * 0.48), sample_2: Math.round(target * 0.88), sample_3: Math.round(target * 0.72) }
  ];
}

function buildMapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "local";
}
