import type { Venue } from "@/lib/planning";

export const demoVenues: Venue[] = [
  {
    id: "tacombi",
    externalPlaceId: "mock-tacombi-flatiron",
    name: "Tacombi Flatiron",
    address: "30 W 24th St, New York, NY",
    category: "Mexican",
    pricePerPerson: 35,
    priceLevel: "$$",
    rating: 4.5,
    bookingUrl: "https://www.tacombi.com/",
    dietaryTags: ["vegetarian", "gluten-free"],
    travelTimes: { maya: 28, jordan: 24, alex: 12, sam: 32, priya: 36 },
    bookingConfidence: 0.84,
    why: "Balanced travel from Queens and Manhattan, flexible menu, and a realistic reservation window."
  },
  {
    id: "namkeen",
    externalPlaceId: "mock-namkeen",
    name: "Namkeen",
    address: "114 Kenmare St, New York, NY",
    category: "Pakistani",
    pricePerPerson: 28,
    priceLevel: "$$",
    rating: 4.6,
    bookingUrl: "https://www.namkeennyc.com/",
    dietaryTags: ["halal", "vegetarian", "no pork"],
    travelTimes: { maya: 35, jordan: 31, alex: 24, sam: 30, priya: 38 },
    bookingConfidence: 0.68,
    why: "Under budget, strong dietary fit, and no attendee has a sharply worse trip."
  },
  {
    id: "rubirosa",
    externalPlaceId: "mock-rubirosa",
    name: "Rubirosa",
    address: "235 Mulberry St, New York, NY",
    category: "Italian",
    pricePerPerson: 46,
    priceLevel: "$$",
    rating: 4.7,
    bookingUrl: "https://www.rubirosanyc.com/",
    dietaryTags: ["vegetarian", "gluten-free"],
    travelTimes: { maya: 40, jordan: 36, alex: 26, sam: 28, priya: 42 },
    bookingConfidence: 0.62,
    why: "High rating and good preferences fit, with one attendee just above the travel target."
  },
  {
    id: "queensboro",
    externalPlaceId: "mock-queensboro",
    name: "The Queensboro",
    address: "80-02 Northern Blvd, Jackson Heights, NY",
    category: "New American",
    pricePerPerson: 38,
    priceLevel: "$$",
    rating: 4.4,
    bookingUrl: "https://thequeensboro.com/",
    dietaryTags: ["vegetarian", "gluten-free", "vegan"],
    travelTimes: { maya: 18, jordan: 20, alex: 48, sam: 32, priya: 31 },
    bookingConfidence: 0.78,
    why: "Excellent Queens access and broad menu, but a longer ride for one Manhattan attendee."
  }
];
