import type { Database, Json } from "@/lib/database.types";
import { makeDateTime, type Participant, type Plan, type TimeSlot, type Venue, type Vote } from "@/lib/planning";

type PlanRow = Database["public"]["Tables"]["plans"]["Row"];
type ParticipantRow = Database["public"]["Tables"]["participants"]["Row"];
type AvailabilityRow = Database["public"]["Tables"]["availability"]["Row"];
type VenueRow = Database["public"]["Tables"]["venues"]["Row"];
type VoteRow = Database["public"]["Tables"]["votes"]["Row"];

const priceMap = ["$", "$$", "$$$", "$$$"] as const;
const reversePriceMap = { $: 1, $$: 2, $$$: 3 };

export function mapPlan(row: PlanRow): Plan {
  return {
    id: row.id,
    title: row.title,
    activityType: row.activity_type,
    startDate: row.start_date,
    endDate: row.end_date,
    budgetMax: row.budget_max,
    city: row.city,
    timeZone: row.time_zone,
    area: row.preferred_area,
    maxTravelMinutes: row.max_travel_minutes,
    organizerName: row.organizer_name,
    inviteCode: row.invite_code,
    preferredDate: row.preferred_date ?? row.start_date,
    expectedGuestCount: row.expected_guest_count,
    responseDeadline: row.response_deadline,
    status: row.status,
    createdAt: row.created_at
  };
}

export function mapParticipant(row: ParticipantRow, availabilityRows: AvailabilityRow[]): Participant {
  return {
    id: row.id,
    name: row.name,
    startingLocation: row.starting_location,
    budgetMax: row.budget_max,
    dietaryPreferences: row.dietary_preferences,
    areaPreferences: row.area_preferences,
    responseToken: row.response_token,
    availability: availabilityRows
      .filter((availability) => availability.participant_id === row.id)
      .map((availability) => ({
        start: makeDateTime(availability.date, availability.start_time.slice(0, 5)),
        end: makeDateTime(availability.date, availability.end_time.slice(0, 5))
      }))
  };
}

export function mapVenue(row: VenueRow): Venue {
  return {
    id: row.id,
    externalPlaceId: row.external_place_id ?? "",
    name: row.name,
    address: row.address,
    category: row.category,
    pricePerPerson: row.price_per_person ?? 0,
    priceLevel: priceMap[Math.max(0, Math.min((row.price_level ?? 2) - 1, priceMap.length - 1))],
    rating: row.rating ?? 0,
    bookingUrl: row.booking_url ?? "",
    dietaryTags: row.dietary_tags,
    travelTimes: isTravelTimes(row.travel_times) ? row.travel_times : {},
    bookingConfidence: row.booking_confidence ?? 0,
    why: row.why_it_matches ?? ""
  };
}

export function mapVote(row: VoteRow): Vote {
  return {
    participantId: row.participant_id,
    venueId: row.venue_id,
    vote: row.vote
  };
}

export function toAvailabilityRows(participantId: string, availability: TimeSlot[], timeZone: string) {
  return availability.map((slot) => ({
    participant_id: participantId,
    date: toDate(slot.start, timeZone),
    start_time: toTime(slot.start, timeZone),
    end_time: toTime(slot.end, timeZone)
  }));
}

export function toVenueInsert(planId: string, venue: Venue) {
  return {
    plan_id: planId,
    external_place_id: venue.externalPlaceId,
    name: venue.name,
    address: venue.address,
    category: venue.category,
    price_level: reversePriceMap[venue.priceLevel],
    price_per_person: venue.pricePerPerson,
    rating: venue.rating,
    booking_url: venue.bookingUrl,
    dietary_tags: venue.dietaryTags,
    travel_times: venue.travelTimes,
    booking_confidence: venue.bookingConfidence,
    why_it_matches: venue.why
  };
}

export function toDate(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: normalizeTimeZone(timeZone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

export function toTime(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: normalizeTimeZone(timeZone),
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(date);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.hour}:${byType.minute}:${byType.second}`;
}

function isTravelTimes(value: Json): value is Record<string, number> {
  return Boolean(value) && !Array.isArray(value) && typeof value === "object";
}

function normalizeTimeZone(timeZone: string): string {
  try {
    Intl.DateTimeFormat(undefined, { timeZone });
    return timeZone;
  } catch {
    return "UTC";
  }
}
