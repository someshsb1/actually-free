export type ActivityType = "dinner" | "brunch" | "drinks" | "coffee" | "activity";

export type TimeSlot = {
  start: Date;
  end: Date;
};

export type Plan = {
  id: string;
  title: string;
  activityType: ActivityType;
  startDate: string;
  endDate: string;
  budgetMax: number;
  city: string;
  timeZone: string;
  area: string;
  maxTravelMinutes: number;
  organizerName: string;
  inviteCode: string;
  preferredDate: string;
  status: "draft" | "collecting" | "voting" | "confirmed" | "cancelled";
  createdAt: string;
};

export type Participant = {
  id: string;
  name: string;
  startingLocation: string;
  budgetMax: number;
  dietaryPreferences: string[];
  availability: TimeSlot[];
};

export type Venue = {
  id: string;
  externalPlaceId: string;
  name: string;
  address: string;
  category: string;
  pricePerPerson: number;
  priceLevel: "$" | "$$" | "$$$";
  rating: number;
  bookingUrl: string;
  dietaryTags: string[];
  travelTimes: Record<string, number>;
  bookingConfidence: number;
  why: string;
};

export type RankedTime = {
  start: Date;
  end: Date;
  availableParticipantIds: string[];
  unavailableParticipantIds: string[];
  score: number;
};

export type RankedVenue = Venue & {
  averageTravelTime: number;
  worstTravelTime: number;
  score: number;
};

export type VoteValue = "first" | "acceptable" | "no";

export type Vote = {
  participantId: string;
  venueId: string;
  vote: VoteValue;
};

const voteScores: Record<VoteValue, number> = {
  first: 2,
  acceptable: 1,
  no: 0
};

export function overlaps(a: TimeSlot, b: TimeSlot): boolean {
  return a.start < b.end && b.start < a.end;
}

export function makeDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00`);
}

export function getBrowserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function formatDateRange(startDate: string, endDate: string): string {
  const formatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
  return `${formatter.format(new Date(`${startDate}T12:00:00`))} to ${formatter.format(
    new Date(`${endDate}T12:00:00`)
  )}`;
}

export function formatSlot(slot: Pick<TimeSlot, "start" | "end">): string {
  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric"
  });
  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });
  return `${dateFormatter.format(slot.start)}, ${timeFormatter.format(slot.start)}-${timeFormatter.format(slot.end)}`;
}

export function splitDateRangeIntoBlocks(
  startDate: string,
  endDate: string,
  dayStartHour = 17,
  dayEndHour = 22
): TimeSlot[] {
  const blocks: TimeSlot[] = [];
  const cursor = new Date(`${startDate}T12:00:00`);
  const last = new Date(`${endDate}T12:00:00`);

  while (cursor <= last) {
    for (let hour = dayStartHour; hour < dayEndHour; hour += 0.5) {
      const wholeHour = Math.floor(hour);
      const minutes = hour % 1 === 0 ? "00" : "30";
      const blockStart = new Date(cursor);
      blockStart.setHours(wholeHour, Number(minutes), 0, 0);
      const blockEnd = new Date(blockStart.getTime() + 30 * 60 * 1000);
      blocks.push({ start: blockStart, end: blockEnd });
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return blocks;
}

export function rankAvailability(
  plan: Plan,
  participants: Participant[],
  minimumDurationMinutes = 90
): RankedTime[] {
  const blocks = splitDateRangeIntoBlocks(plan.startDate, plan.endDate);
  const minimumBlocks = minimumDurationMinutes / 30;
  const grouped: RankedTime[] = [];

  for (let index = 0; index <= blocks.length - minimumBlocks; index += 1) {
    const window = blocks.slice(index, index + minimumBlocks);
    const first = window[0];
    const last = window[window.length - 1];
    const available = participants.filter((participant) =>
      window.every((block) => participant.availability.some((slot) => overlaps(slot, block)))
    );

    const startDay = first.start.toISOString().slice(0, 10);
    const preferredDateBonus = startDay === plan.preferredDate ? 12 : 0;
    const earlierBonus = Math.max(0, 10 - index);
    const completeGroupBonus = available.length === participants.length ? 100 : 0;
    const score = available.length * 30 + completeGroupBonus + preferredDateBonus + earlierBonus;

    grouped.push({
      start: first.start,
      end: last.end,
      availableParticipantIds: available.map((participant) => participant.id),
      unavailableParticipantIds: participants
        .filter((participant) => !available.some((availableParticipant) => availableParticipant.id === participant.id))
        .map((participant) => participant.id),
      score
    });
  }

  return grouped.sort((a, b) => b.score - a.score || a.start.getTime() - b.start.getTime()).slice(0, 5);
}

export function scoreVenues(plan: Plan, participants: Participant[], venues: Venue[]): RankedVenue[] {
  const requestedDietary = new Set(participants.flatMap((participant) => participant.dietaryPreferences));

  return venues
    .map((venue) => {
      const travelValues = participants.length
        ? participants.map((participant) => venue.travelTimes[participant.id] ?? plan.maxTravelMinutes)
        : Object.values(venue.travelTimes).slice(0, 3);
      const averageTravelTime = Math.round(
        travelValues.reduce((total, minutes) => total + minutes, 0) / Math.max(travelValues.length, 1)
      );
      const worstTravelTime = travelValues.length ? Math.max(...travelValues) : plan.maxTravelMinutes;
      const overLimitPenalty = Math.max(0, worstTravelTime - plan.maxTravelMinutes) * 2.5;
      const fairnessPenalty = Math.max(0, worstTravelTime - averageTravelTime) * 1.5;
      const travelConvenience = Math.max(0, 100 - averageTravelTime - overLimitPenalty - fairnessPenalty);
      const budgetMatch = Math.max(0, 100 - Math.max(0, venue.pricePerPerson - plan.budgetMax) * 4);
      const rating = (venue.rating / 5) * 100;
      const dietaryMatch =
        requestedDietary.size === 0
          ? 100
          : (Array.from(requestedDietary).filter((tag) => venue.dietaryTags.includes(tag)).length /
              requestedDietary.size) *
            100;
      const bookingConfidence = venue.bookingConfidence * 100;

      const score =
        travelConvenience * 0.35 +
        budgetMatch * 0.25 +
        rating * 0.2 +
        dietaryMatch * 0.1 +
        bookingConfidence * 0.1;

      return {
        ...venue,
        averageTravelTime,
        worstTravelTime,
        score: Math.round(score)
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

export function calculateVoteTotals(votes: Vote[], venueIds: string[]): Record<string, number> {
  return venueIds.reduce<Record<string, number>>((totals, venueId) => {
    totals[venueId] = votes
      .filter((vote) => vote.venueId === venueId)
      .reduce((total, vote) => total + voteScores[vote.vote], 0);
    return totals;
  }, {});
}

export function buildGoogleCalendarUrl(plan: Plan, venue: Venue, slot: TimeSlot): string {
  const start = slot.start.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const end = slot.end.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: plan.title,
    dates: `${start}/${end}`,
    location: venue.address,
    details: `Confirmed with Actually Free. Reservation: ${venue.bookingUrl}`
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildIcs(plan: Plan, venue: Venue, slot: TimeSlot): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const start = slot.start.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const end = slot.end.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Actually Free//MVP//EN",
    "BEGIN:VEVENT",
    `UID:${plan.id}@actually-free.local`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeIcs(plan.title)}`,
    `LOCATION:${escapeIcs(venue.address)}`,
    `DESCRIPTION:${escapeIcs(`Reservation: ${venue.bookingUrl}`)}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");
}

function escapeIcs(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}
