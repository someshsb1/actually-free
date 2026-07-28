import { getVenueSuggestionsForPlan } from "@/lib/venue-suggestions";
import type { Database } from "@/lib/database.types";
import type { ActivityType, Participant, Plan, TimeSlot, VoteValue } from "@/lib/planning";
import { mapParticipant, mapPlan, mapVenue, mapVote, toAvailabilityRows, toDate, toTime, toVenueInsert } from "@/lib/supabase/mappers";

type SupabaseClient = ReturnType<typeof import("@supabase/supabase-js").createClient<Database>>;

export type PlanBundle = {
  plan: Plan;
  participants: Participant[];
  venues: ReturnType<typeof mapVenue>[];
  votes: ReturnType<typeof mapVote>[];
};

export async function createPlanRecord(
  supabase: SupabaseClient,
  input: {
    title: string;
    activityType: ActivityType;
    startDate: string;
    endDate: string;
    budgetMax: number;
    city: string;
    area: string;
    maxTravelMinutes: number;
    organizerName: string;
    timeZone: string;
  }
): Promise<PlanBundle> {
  const inviteCode = `AF-${Math.floor(1000 + Math.random() * 9000)}`;
  const { data: planRow, error: planError } = await supabase
    .from("plans")
    .insert({
      title: input.title,
      activity_type: input.activityType,
      start_date: input.startDate,
      end_date: input.endDate,
      budget_max: input.budgetMax,
      city: input.city || "Unspecified",
      time_zone: input.timeZone,
      preferred_area: input.area,
      organizer_name: input.organizerName,
      max_travel_minutes: input.maxTravelMinutes,
      preferred_date: input.startDate,
      invite_code: inviteCode
    })
    .select()
    .single();

  if (planError) throw planError;

  const suggestedVenues = getVenueSuggestionsForPlan(mapPlan(planRow));
  const { data: venueRows, error: venueError } = await supabase
    .from("venues")
    .insert(suggestedVenues.map((venue) => toVenueInsert(planRow.id, venue)))
    .select();

  if (venueError) throw venueError;

  return {
    plan: mapPlan(planRow),
    participants: [],
    venues: (venueRows ?? []).map(mapVenue),
    votes: []
  };
}

export async function getPlanBundleByInviteCode(supabase: SupabaseClient, inviteCode: string): Promise<PlanBundle | null> {
  const { data: planRow, error: planError } = await supabase
    .from("plans")
    .select()
    .eq("invite_code", inviteCode.toUpperCase())
    .maybeSingle();

  if (planError) throw planError;
  if (!planRow) return null;

  const [{ data: participantRows, error: participantsError }, { data: venueRows, error: venuesError }] = await Promise.all([
    supabase.from("participants").select().eq("plan_id", planRow.id).order("created_at"),
    supabase.from("venues").select().eq("plan_id", planRow.id).order("recommendation_score", { ascending: false, nullsFirst: false })
  ]);

  if (participantsError) throw participantsError;
  if (venuesError) throw venuesError;

  const participantIds = (participantRows ?? []).map((participant) => participant.id);
  const venueIds = (venueRows ?? []).map((venue) => venue.id);

  const [{ data: availabilityRows, error: availabilityError }, { data: voteRows, error: votesError }] = await Promise.all([
    participantIds.length
      ? supabase.from("availability").select().in("participant_id", participantIds).order("date").order("start_time")
      : Promise.resolve({ data: [], error: null }),
    venueIds.length ? supabase.from("votes").select().in("venue_id", venueIds) : Promise.resolve({ data: [], error: null })
  ]);

  if (availabilityError) throw availabilityError;
  if (votesError) throw votesError;

  return {
    plan: mapPlan(planRow),
    participants: (participantRows ?? []).map((participant) => mapParticipant(participant, availabilityRows ?? [])),
    venues: (venueRows ?? []).map(mapVenue),
    votes: (voteRows ?? []).map(mapVote)
  };
}

export async function addParticipantRecord(
  supabase: SupabaseClient,
  inviteCode: string,
  input: {
    name: string;
    startingLocation: string;
    budgetMax: number;
    dietaryPreferences: string[];
    availability: TimeSlot[];
  }
): Promise<Participant> {
  const bundle = await getPlanBundleByInviteCode(supabase, inviteCode);
  if (!bundle) throw new Error("Plan not found.");

  const { data: participantRow, error: participantError } = await supabase
    .from("participants")
    .insert({
      plan_id: bundle.plan.id,
      name: input.name,
      starting_location: input.startingLocation,
      budget_max: input.budgetMax,
      dietary_preferences: input.dietaryPreferences
    })
    .select()
    .single();

  if (participantError) throw participantError;

  const availabilityRows = toAvailabilityRows(participantRow.id, input.availability, bundle.plan.timeZone);
  if (availabilityRows.length) {
    const { error: availabilityError } = await supabase.from("availability").insert(availabilityRows);
    if (availabilityError) throw availabilityError;
  }

  return mapParticipant(participantRow, availabilityRows.map((row) => ({ ...row, id: "", created_at: "" })));
}

export async function refreshTravelTimesForPlan(supabase: SupabaseClient, inviteCode: string): Promise<PlanBundle | null> {
  const bundle = await getPlanBundleByInviteCode(supabase, inviteCode);
  if (!bundle || !bundle.participants.length || !bundle.venues.length) return bundle;
  const travelTimes = estimateNoCostTravelTimes(bundle.participants, bundle.venues, bundle.plan.maxTravelMinutes);

  await Promise.all(
    bundle.venues.map((venue) =>
      supabase
        .from("venues")
        .update({
          travel_times: travelTimes[venue.id] ?? venue.travelTimes,
          average_travel_minutes: averageMinutes(travelTimes[venue.id]),
          worst_travel_minutes: worstMinutes(travelTimes[venue.id])
        })
        .eq("id", venue.id)
    )
  );

  return getPlanBundleByInviteCode(supabase, inviteCode);
}

export async function upsertVoteRecord(
  supabase: SupabaseClient,
  input: {
    participantId: string;
    venueId: string;
    vote: VoteValue;
  }
) {
  const { data, error } = await supabase
    .from("votes")
    .upsert(
      {
        participant_id: input.participantId,
        venue_id: input.venueId,
        vote: input.vote
      },
      { onConflict: "participant_id,venue_id" }
    )
    .select()
    .single();

  if (error) throw error;
  return mapVote(data);
}

export async function confirmFinalPlanRecord(
  supabase: SupabaseClient,
  inviteCode: string,
  input: {
    venueId: string;
    slot: TimeSlot;
    confirmedBy: string;
  }
) {
  const bundle = await getPlanBundleByInviteCode(supabase, inviteCode);
  if (!bundle) throw new Error("Plan not found.");
  const venueId = resolveVenueId(bundle.venues, input.venueId);
  if (!venueId) throw new Error("Selected venue was not found for this plan. Reload the invite and choose a place again.");

  const { error: finalError } = await supabase.from("final_plans").upsert({
    plan_id: bundle.plan.id,
    venue_id: venueId,
    final_date: toDate(input.slot.start, bundle.plan.timeZone),
    final_start_time: toTime(input.slot.start, bundle.plan.timeZone),
    final_end_time: toTime(input.slot.end, bundle.plan.timeZone),
    confirmed_by: input.confirmedBy
  });

  if (finalError) throw finalError;

  const { error: planError } = await supabase.from("plans").update({ status: "confirmed" }).eq("id", bundle.plan.id);
  if (planError) throw planError;

  return { ok: true };
}

export async function updatePlanStatusRecord(
  supabase: SupabaseClient,
  inviteCode: string,
  status: "collecting" | "voting" | "confirmed" | "cancelled"
) {
  const bundle = await getPlanBundleByInviteCode(supabase, inviteCode);
  if (!bundle) throw new Error("Plan not found.");

  const { error } = await supabase.from("plans").update({ status }).eq("id", bundle.plan.id);
  if (error) throw error;

  return getPlanBundleByInviteCode(supabase, inviteCode);
}

function resolveVenueId(venues: PlanBundle["venues"], selectedVenueId: string): string | null {
  const exactVenue = venues.find((venue) => venue.id === selectedVenueId || venue.externalPlaceId === selectedVenueId);
  if (exactVenue) return exactVenue.id;

  const suggestedIndex = selectedVenueId.match(/^suggested-(\d+)$/)?.[1];
  return suggestedIndex ? venues[Number(suggestedIndex) - 1]?.id ?? null : null;
}

function averageMinutes(times?: Record<string, number>): number | null {
  const values = Object.values(times ?? {});
  return values.length ? Math.round(values.reduce((total, value) => total + value, 0) / values.length) : null;
}

function worstMinutes(times?: Record<string, number>): number | null {
  const values = Object.values(times ?? {});
  return values.length ? Math.max(...values) : null;
}

function estimateNoCostTravelTimes(participants: Participant[], venues: PlanBundle["venues"], maxTravelMinutes: number) {
  return venues.reduce<Record<string, Record<string, number>>>((byVenue, venue, venueIndex) => {
    byVenue[venue.id] = participants.reduce<Record<string, number>>((times, participant, participantIndex) => {
      const seed = stableHash(`${participant.startingLocation}-${venue.address}-${venueIndex}`);
      const spread = Math.max(8, Math.round(maxTravelMinutes * 0.45));
      times[participant.id] = Math.max(8, Math.min(maxTravelMinutes + 12, Math.round(maxTravelMinutes * 0.55) + (seed % spread)));
      return times;
    }, {});
    return byVenue;
  }, {});
}

function stableHash(value: string): number {
  return value.split("").reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 0);
}
