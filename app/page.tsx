"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { suggestVenuesForPlan } from "@/lib/venue-suggestions";
import {
  ActivityType,
  Participant,
  Plan,
  RankedTime,
  RankedVenue,
  TimeSlot,
  Vote,
  VoteValue,
  buildGoogleCalendarUrl,
  buildIcs,
  calculateVoteTotals,
  formatDateRange,
  formatSlot,
  getBrowserTimeZone,
  rankAvailability,
  scoreVenues
} from "@/lib/planning";

type Screen = "landing" | "create" | "invite" | "join" | "status" | "vote" | "final";

type PlanBundle = {
  plan: Plan;
  participants: Participant[];
  venues: ReturnType<typeof suggestVenuesForPlan>;
  votes: Vote[];
};

const activityOptions: ActivityType[] = ["dinner", "brunch", "drinks", "coffee", "activity"];
const dietaryOptions = ["vegetarian", "vegan", "gluten-free", "halal", "no pork"];

const initialPlan: Plan = {
  id: "new-plan",
  title: "",
  activityType: "dinner",
  startDate: "2026-08-07",
  endDate: "2026-08-09",
  budgetMax: 50,
  city: "",
  timeZone: "UTC",
  area: "",
  maxTravelMinutes: 40,
  organizerName: "",
  inviteCode: "NEW",
  preferredDate: "2026-08-08",
  status: "collecting",
  createdAt: new Date().toISOString()
};

export default function Home() {
  return <ActuallyFreeApp />;
}

export function ActuallyFreeApp({ initialScreen = "landing" }: { initialScreen?: Screen }) {
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [plan, setPlan] = useState<Plan>(initialPlan);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [planVenues, setPlanVenues] = useState(() => suggestVenuesForPlan(initialPlan));
  const [votes, setVotes] = useState<Vote[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState("tacombi");
  const [confirmed, setConfirmed] = useState(false);
  const [notice, setNotice] = useState("Ready to create a plan.");
  const [joinName, setJoinName] = useState("");
  const [joinLocation, setJoinLocation] = useState("");
  const [joinBudget, setJoinBudget] = useState(50);
  const [joinDietary, setJoinDietary] = useState<string[]>([]);
  const [joinAvailability, setJoinAvailability] = useState<string[]>([]);

  const rankedTimes = useMemo(() => rankAvailability(plan, participants), [plan, participants]);
  const bestTime = rankedTimes[0];
  const rankedVenues = useMemo(() => scoreVenues(plan, participants, planVenues), [participants, plan, planVenues]);
  const voteTotals = useMemo(
    () => calculateVoteTotals(votes, rankedVenues.map((venue) => venue.id)),
    [rankedVenues, votes]
  );
  const selectedVenue = rankedVenues.find((venue) => venue.id === selectedVenueId) ?? rankedVenues[0];
  const inviteUrl =
    typeof window === "undefined" ? `/join/${plan.inviteCode}` : `${window.location.origin}/join/${plan.inviteCode}`;

  useEffect(() => {
    setPlan((current) => ({ ...current, timeZone: getBrowserTimeZone() }));
    const routeMatch = window.location.pathname.match(/^\/(join|status|final)\/([^/]+)/);
    const inviteCode = routeMatch?.[2] ?? new URLSearchParams(window.location.search).get("invite");
    if (inviteCode) {
      const routeScreen = routeMatch?.[1] === "status" ? "status" : routeMatch?.[1] === "final" ? "final" : "join";
      void loadPlan(inviteCode, routeScreen);
    }
  }, []);

  useEffect(() => {
    if (plan.inviteCode === "NEW" || !["status", "vote", "final"].includes(screen)) return;
    const interval = window.setInterval(() => {
      void loadPlan(plan.inviteCode, screen, true);
    }, 8000);
    return () => window.clearInterval(interval);
  }, [plan.inviteCode, screen]);

  async function loadPlan(inviteCode: string, nextScreen: Screen = "join", quiet = false) {
    try {
      const bundle = await apiRequest<PlanBundle>(`/api/plans/${inviteCode}`);
      applyPlanBundle(bundle);
      setScreen(nextScreen);
      if (!quiet) setNotice("Plan loaded from Supabase.");
    } catch (error) {
      if (!quiet) setNotice(apiFallbackMessage(error, "Could not load this invite from Supabase."));
    }
  }

  function applyPlanBundle(bundle: PlanBundle) {
    const participantsWithDates = bundle.participants.map(normalizeParticipant);
    setPlan(bundle.plan);
    setParticipants(participantsWithDates);
    setPlanVenues(bundle.venues);
    setVotes(bundle.votes);
    setSelectedVenueId(bundle.venues[0]?.id ?? "tacombi");
    setConfirmed(bundle.plan.status === "confirmed");
  }

  async function createPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const startDate = String(form.get("startDate"));
    const inviteCode = `AF-${Math.floor(1000 + Math.random() * 9000)}`;
    const nextPlan = {
      id: crypto.randomUUID(),
      title: String(form.get("title") || "Untitled plan"),
      activityType: String(form.get("activityType")) as ActivityType,
      startDate,
      endDate: String(form.get("endDate")),
      budgetMax: Number(form.get("budgetMax")),
      city: String(form.get("city") || ""),
      timeZone: String(form.get("timeZone") || getBrowserTimeZone()),
      area: String(form.get("area")),
      maxTravelMinutes: Number(form.get("maxTravelMinutes")),
      organizerName: String(form.get("organizerName") || "Organizer"),
      inviteCode,
      preferredDate: startDate,
      status: "collecting" as const,
      createdAt: new Date().toISOString()
    };

    try {
      const bundle = await apiRequest<PlanBundle>("/api/plans", {
        method: "POST",
        body: JSON.stringify(nextPlan)
      });
      applyPlanBundle(bundle);
      setNotice("Plan saved to Supabase.");
    } catch (error) {
      setPlan(nextPlan);
      setPlanVenues(suggestVenuesForPlan(nextPlan));
      setNotice(apiFallbackMessage(error, "Plan was not saved to Supabase; it is only in this browser session."));
    }
    setParticipants([]);
    setVotes([]);
    setConfirmed(false);
    setScreen("invite");
  }

  async function addParticipant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = joinName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || crypto.randomUUID();
    const availability = joinAvailability.map((value) => {
      const start = new Date(value);
      return { start, end: new Date(start.getTime() + 150 * 60 * 1000) };
    });

    const nextParticipant = {
      id,
      name: joinName,
      startingLocation: joinLocation,
      budgetMax: joinBudget,
      dietaryPreferences: joinDietary,
      availability
    };

    try {
      const response = await apiRequest<{ participant: Participant; bundle?: PlanBundle }>(`/api/plans/${plan.inviteCode}/participants`, {
        method: "POST",
        body: JSON.stringify(nextParticipant)
      });
      if (response.bundle) {
        applyPlanBundle(response.bundle);
      } else {
        const participant = normalizeParticipant(response.participant);
        setParticipants((current) => [...current.filter((item) => item.id !== participant.id), participant]);
      }
      setNotice("Response saved to Supabase.");
    } catch (error) {
      setParticipants((current) => [...current.filter((participant) => participant.id !== id), nextParticipant]);
      setNotice(apiFallbackMessage(error, "Response was not saved to Supabase; it is only in this browser session."));
    }
    setScreen("status");
  }

  async function setVote(participantId: string, venueId: string, vote: VoteValue) {
    setVotes((current) => [
      ...current.filter((item) => !(item.participantId === participantId && item.venueId === venueId)),
      { participantId, venueId, vote }
    ]);

    try {
      await apiRequest(`/api/plans/${plan.inviteCode}/votes`, {
        method: "PUT",
        body: JSON.stringify({ participantId, venueId, vote })
      });
      setNotice("Vote saved to Supabase.");
    } catch (error) {
      setNotice(apiFallbackMessage(error, "Vote was not saved to Supabase; it is only in this browser session."));
    }
  }

  async function confirmFinalPlan() {
    if (!bestTime || !selectedVenue) return;
    setConfirmed(true);
    setPlan((current) => ({ ...current, status: "confirmed" }));

    try {
      await apiRequest(`/api/plans/${plan.inviteCode}/final`, {
        method: "PUT",
        body: JSON.stringify({
          venueId: selectedVenue.id,
          confirmedBy: plan.organizerName,
          slot: bestTime
        })
      });
      setNotice("Final plan saved to Supabase.");
    } catch (error) {
      setNotice(apiFallbackMessage(error, "Confirmation was not saved to Supabase; it is only in this browser session."));
    }
    setScreen("final");
  }

  function downloadIcs() {
    if (!bestTime || !selectedVenue) return;
    const file = new Blob([buildIcs(plan, selectedVenue, bestTime)], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${plan.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.ics`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function updatePlanStatus(status: Plan["status"]) {
    if (plan.inviteCode === "NEW") {
      setPlan((current) => ({ ...current, status }));
      return;
    }

    try {
      const bundle = await apiRequest<PlanBundle>(`/api/plans/${plan.inviteCode}/status`, {
        method: "PUT",
        body: JSON.stringify({ status })
      });
      applyPlanBundle(bundle);
      setNotice(`Plan status set to ${status}.`);
    } catch (error) {
      setNotice(apiFallbackMessage(error, "Plan status was not saved."));
    }
  }

  return (
    <main className="screen-shell">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <TopBar screen={screen} setScreen={setScreen} />
        <p className="mb-4 rounded-md bg-white/90 px-3 py-2 text-sm font-bold text-ink/70 shadow-soft">{notice}</p>

        {screen === "landing" && <Landing onCreate={() => setScreen("create")} />}
        {screen === "create" && <CreatePlanForm plan={plan} onSubmit={createPlan} />}
        {screen === "invite" && (
          <InvitePage plan={plan} inviteUrl={inviteUrl} onJoin={() => setScreen("join")} onStatus={() => setScreen("status")} />
        )}
        {screen === "join" && (
          <JoinForm
            plan={plan}
            joinName={joinName}
            setJoinName={setJoinName}
            joinLocation={joinLocation}
            setJoinLocation={setJoinLocation}
            joinBudget={joinBudget}
            setJoinBudget={setJoinBudget}
            joinDietary={joinDietary}
            setJoinDietary={setJoinDietary}
            joinAvailability={joinAvailability}
            setJoinAvailability={setJoinAvailability}
            onSubmit={addParticipant}
          />
        )}
        {screen === "status" && (
          <StatusPage
            plan={plan}
            participants={participants}
            bestTime={bestTime}
            rankedTimes={rankedTimes}
            rankedVenues={rankedVenues}
            votes={votes}
            updateStatus={updatePlanStatus}
            onInvite={() => setScreen("invite")}
            onVote={() => setScreen("vote")}
          />
        )}
        {screen === "vote" && (
          <VotingPage
            plan={plan}
            participants={participants}
            rankedVenues={rankedVenues}
            votes={votes}
            voteTotals={voteTotals}
            selectedVenueId={selectedVenueId}
            setSelectedVenueId={setSelectedVenueId}
            setVote={setVote}
            onConfirm={confirmFinalPlan}
          />
        )}
        {screen === "final" && bestTime && selectedVenue && (
          <FinalPage
            plan={plan}
            participants={participants}
            slot={bestTime}
            venue={selectedVenue}
            confirmed={confirmed}
            googleUrl={buildGoogleCalendarUrl(plan, selectedVenue, bestTime)}
            onDownloadIcs={downloadIcs}
            inviteUrl={inviteUrl}
          />
        )}
      </div>
    </main>
  );
}

function TopBar({ screen, setScreen }: { screen: Screen; setScreen: (screen: Screen) => void }) {
  const items: { id: Screen; label: string }[] = [
    { id: "create", label: "Create" },
    { id: "status", label: "Status" },
    { id: "vote", label: "Vote" },
    { id: "final", label: "Final" }
  ];

  return (
    <header className="mb-5 flex items-center justify-between gap-3 rounded-lg bg-white/88 px-3 py-3 shadow-soft backdrop-blur">
      <button className="text-left text-lg font-black tracking-normal text-ink" onClick={() => setScreen("landing")}>
        Actually Free?
      </button>
      <nav className="flex gap-1 overflow-x-auto">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => setScreen(item.id)}
            className={`rounded-md px-3 py-2 text-sm font-bold transition ${
              screen === item.id ? "bg-ink text-white" : "text-ink hover:bg-ink/10"
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </header>
  );
}

function Landing({ onCreate }: { onCreate: () => void }) {
  return (
    <section className="grid flex-1 items-end pb-10 pt-20 sm:pt-28">
      <div className="max-w-2xl">
        <p className="mb-4 inline-flex rounded-md bg-white/90 px-3 py-2 text-sm font-bold text-lake shadow-soft">
          No accounts. No group-chat chaos. One link.
        </p>
        <h1 className="text-5xl font-black leading-none tracking-normal text-ink sm:text-7xl">
          Find the time and place your group can agree on.
        </h1>
        <p className="mt-5 max-w-xl text-lg font-semibold leading-7 text-ink/80">
          Send one invite, watch the plan come together, and land on a fair option without the endless back-and-forth.
        </p>
        <div className="mt-6 grid max-w-xl gap-2 sm:grid-cols-3">
          <MiniStat value="30 sec" label="Friend response" />
          <MiniStat value="3 picks" label="Only the best places" />
          <MiniStat value="Fair" label="Commute-aware ranking" />
        </div>
        <button
          onClick={onCreate}
          className="mt-8 rounded-md bg-tomato px-5 py-4 text-base font-black text-white shadow-soft transition hover:bg-[#bd4f39]"
        >
          Create a plan
        </button>
      </div>
    </section>
  );
}

function CreatePlanForm({ plan, onSubmit }: { plan: Plan; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <section className="mx-auto w-full max-w-2xl rounded-lg bg-white/94 p-5 shadow-soft">
      <ScreenTitle eyebrow="Create your plan" title="What are you planning?" />
      <form onSubmit={onSubmit} className="mt-5 grid gap-4">
        <Field label="Plan name">
          <input name="title" defaultValue={plan.title} placeholder="Birthday dinner" className="field" required />
        </Field>
        <Field label="Organizer">
          <input name="organizerName" defaultValue={plan.organizerName} placeholder="Your name" className="field" required />
        </Field>
        <Field label="Activity">
          <select name="activityType" defaultValue={plan.activityType} className="field">
            {activityOptions.map((activity) => (
              <option key={activity} value={activity}>
                {titleCase(activity)}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Start date">
            <input name="startDate" type="date" defaultValue={plan.startDate} className="field" />
          </Field>
          <Field label="End date">
            <input name="endDate" type="date" defaultValue={plan.endDate} className="field" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Budget per person">
            <input name="budgetMax" type="number" min="10" defaultValue={plan.budgetMax} className="field" />
          </Field>
          <Field label="Maximum travel time">
            <input name="maxTravelMinutes" type="number" min="10" defaultValue={plan.maxTravelMinutes} className="field" />
          </Field>
        </div>
        <Field label="Preferred area">
          <input name="area" defaultValue={plan.area} placeholder="Manhattan, Bandra, Indiranagar" className="field" required />
        </Field>
        <Field label="City or region">
          <input name="city" defaultValue={plan.city} placeholder="Boston, Mumbai, Bengaluru" className="field" required />
        </Field>
        <Field label="Plan timezone">
          <input name="timeZone" defaultValue={plan.timeZone} className="field" required />
        </Field>
        <button className="rounded-md bg-ink px-4 py-4 font-black text-white">Create invite</button>
      </form>
    </section>
  );
}

function InvitePage({
  plan,
  inviteUrl,
  onJoin,
  onStatus
}: {
  plan: Plan;
  inviteUrl: string;
  onJoin: () => void;
  onStatus: () => void;
}) {
  const shareText = `${plan.title}\n${titleCase(plan.activityType)} · ${formatDateRange(plan.startDate, plan.endDate)}\n${plan.area} · under $${plan.budgetMax}\n\nHelp pick the time and place: ${inviteUrl}`;
  const encodedShareText = encodeURIComponent(shareText);
  const statusUrl = inviteUrl.replace("/join/", "/status/");
  const finalUrl = inviteUrl.replace("/join/", "/final/");

  return (
    <section className="mx-auto w-full max-w-2xl rounded-lg bg-white/94 p-5 shadow-soft">
      <ScreenTitle eyebrow="Share invitation" title={plan.title} />
      <div className="mt-5 rounded-lg bg-ink p-5 text-white">
        <p className="text-sm font-black uppercase tracking-normal text-white/60">Plan card</p>
        <h2 className="mt-2 text-3xl font-black tracking-normal">{plan.title}</h2>
        <p className="mt-3 font-bold text-white/82">
          {titleCase(plan.activityType)} · {formatDateRange(plan.startDate, plan.endDate)}
        </p>
        <p className="mt-1 font-bold text-white/82">
          {plan.area} · under ${plan.budgetMax} · max {plan.maxTravelMinutes} min
        </p>
      </div>
      <div className="mt-5 rounded-lg border border-ink/10 bg-paper p-4">
        <p className="text-sm font-bold text-ink/60">Invite link</p>
        <a
          href={inviteUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 block break-all text-base font-black text-lake underline decoration-lake/35 underline-offset-4"
        >
          {inviteUrl}
        </a>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          onClick={() => navigator.clipboard?.writeText(inviteUrl)}
          className="rounded-md bg-lake px-4 py-3 font-black text-white"
        >
          Copy invite link
        </button>
        <a href={inviteUrl} target="_blank" rel="noreferrer" className="rounded-md bg-ink px-4 py-3 text-center font-black text-white">
          Open invite
        </a>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <a href={`sms:?&body=${encodedShareText}`} className="rounded-md bg-saffron px-4 py-3 text-center font-black text-ink">
          Share by text
        </a>
        <a
          href={`https://wa.me/?text=${encodedShareText}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-md bg-moss px-4 py-3 text-center font-black text-white"
        >
          Share on WhatsApp
        </a>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <button onClick={onJoin} className="rounded-md border border-ink/15 px-4 py-3 font-black text-ink">
          Preview form
        </button>
        <button onClick={onStatus} className="rounded-md border border-ink/15 px-4 py-3 font-black text-ink">
          View group status
        </button>
      </div>
      <div className="mt-5 grid gap-2 rounded-lg bg-paper p-4 text-sm font-bold text-ink/70">
        <a href={statusUrl} target="_blank" rel="noreferrer" className="break-all text-lake underline underline-offset-4">
          Public status: {statusUrl}
        </a>
        <a href={finalUrl} target="_blank" rel="noreferrer" className="break-all text-lake underline underline-offset-4">
          Final page: {finalUrl}
        </a>
      </div>
    </section>
  );
}

function JoinForm(props: {
  plan: Plan;
  joinName: string;
  setJoinName: (value: string) => void;
  joinLocation: string;
  setJoinLocation: (value: string) => void;
  joinBudget: number;
  setJoinBudget: (value: number) => void;
  joinDietary: string[];
  setJoinDietary: (value: string[]) => void;
  joinAvailability: string[];
  setJoinAvailability: (value: string[]) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const { plan, joinDietary, setJoinDietary, joinAvailability, setJoinAvailability } = props;
  const dateChoices = buildAvailabilityChoices(plan.startDate, plan.endDate);
  const responseProgress =
    Number(Boolean(props.joinName.trim())) +
    Number(Boolean(props.joinLocation.trim())) +
    Number(joinAvailability.length > 0);

  return (
    <section className="mx-auto w-full max-w-2xl rounded-lg bg-white/94 p-5 shadow-soft">
      <ScreenTitle eyebrow="No account needed" title={`Join ${plan.title}`} />
      <div className="mt-4 grid grid-cols-3 gap-2">
        <MiniStat value={`${responseProgress}/3`} label="Done" />
        <MiniStat value={`${joinAvailability.length}`} label="Slots" />
        <MiniStat value={`$${props.joinBudget}`} label="Budget" />
      </div>
      <form onSubmit={props.onSubmit} className="mt-5 grid gap-4">
        <Field label="Name">
          <input value={props.joinName} onChange={(event) => props.setJoinName(event.target.value)} placeholder="Your name" className="field" required />
        </Field>
        <Field label="Starting ZIP or neighborhood">
          <input
            value={props.joinLocation}
            onChange={(event) => props.setJoinLocation(event.target.value)}
            placeholder="Neighborhood or ZIP"
            className="field"
            required
          />
        </Field>
        <Field label="Budget preference">
          <div className="rounded-md border border-ink/15 bg-white px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-bold text-ink/60">Comfortable up to</span>
              <span className="text-xl font-black text-ink">${props.joinBudget}</span>
            </div>
            <input
              type="range"
              min="10"
              max="150"
              step="5"
              value={props.joinBudget}
              onChange={(event) => props.setJoinBudget(Number(event.target.value))}
              className="mt-3 w-full accent-lake"
            />
          </div>
        </Field>
        <ChoiceGroup
          label="Available time slots"
          options={dateChoices.map((value) => ({ value, label: formatSlotLabel(value) }))}
          values={joinAvailability}
          setValues={setJoinAvailability}
        />
        <ChoiceGroup
          label="Food preferences"
          options={dietaryOptions.map((value) => ({ value, label: titleCase(value) }))}
          values={joinDietary}
          setValues={setJoinDietary}
        />
        <button className="rounded-md bg-ink px-4 py-4 font-black text-white">Submit availability</button>
      </form>
    </section>
  );
}

function StatusPage({
  plan,
  participants,
  bestTime,
  rankedTimes,
  rankedVenues,
  votes,
  updateStatus,
  onInvite,
  onVote
}: {
  plan: Plan;
  participants: Participant[];
  bestTime?: TimeSlot & { availableParticipantIds: string[] };
  rankedTimes: RankedTime[];
  rankedVenues: RankedVenue[];
  votes: Vote[];
  updateStatus: (status: Plan["status"]) => void;
  onInvite: () => void;
  onVote: () => void;
}) {
  const perfectMatches = rankedTimes.filter((slot) => participants.length > 0 && slot.availableParticipantIds.length === participants.length).length;
  const leadingVenue = getLeadingVenue(rankedVenues, votes);

  return (
    <section className="grid gap-5">
      <div className="rounded-lg bg-white/94 p-5 shadow-soft">
        <ScreenTitle eyebrow="Plan pulse" title="The group is converging" />
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <PulseCard value={`${participants.length}`} label="friends responded" tone="lake" />
          <PulseCard value={`${perfectMatches}`} label="perfect time matches" tone="moss" />
          <PulseCard value={leadingVenue?.name ?? "No winner yet"} label="place currently leading" tone="tomato" />
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-lg bg-white/94 p-5 shadow-soft">
        <ScreenTitle eyebrow={`${participants.length} ${participants.length === 1 ? "person has" : "people have"} responded`} title={plan.title} />
        <div className="mt-5 grid gap-2">
          {participants.length ? (
            participants.map((participant) => (
              <div key={participant.id} className="flex items-center justify-between rounded-md border border-ink/10 px-3 py-3">
                <span className="font-bold">{participant.name}</span>
                <span className="font-black text-moss">Responded</span>
              </div>
            ))
          ) : (
            <div className="rounded-md border border-ink/10 px-3 py-3 font-bold text-ink/55">No responses yet</div>
          )}
        </div>
        <button onClick={onInvite} className="mt-4 w-full rounded-md border border-ink/15 px-4 py-3 font-black text-ink">
          Share invite
        </button>
      </div>
      <div className="rounded-lg bg-ink p-5 text-white shadow-soft">
        <p className="text-sm font-bold uppercase tracking-normal text-white/65">Best matching time so far</p>
        <h2 className="mt-3 text-3xl font-black leading-tight tracking-normal">{bestTime ? formatSlot(bestTime) : "Waiting for responses"}</h2>
        <p className="mt-4 text-white/75">
          {bestTime
            ? `${bestTime.availableParticipantIds.length} of ${participants.length} available. Complete-group matches rank first; partial matches appear only when needed.`
            : "Invite friends to unlock overlap ranking."}
        </p>
        <button onClick={onVote} className="mt-6 w-full rounded-md bg-saffron px-4 py-4 font-black text-ink">
          Choose a place
        </button>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={() => updateStatus("voting")} className="rounded-md border border-white/25 px-3 py-2 text-sm font-black text-white">
            Open voting
          </button>
          <button onClick={() => updateStatus("collecting")} className="rounded-md border border-white/25 px-3 py-2 text-sm font-black text-white">
            Reopen responses
          </button>
        </div>
      </div>
      </div>
      <div className="rounded-lg bg-white/94 p-5 shadow-soft">
        <ScreenTitle eyebrow="Availability heatmap" title="Best overlap windows" />
        <div className="mt-4 grid gap-2">
          {rankedTimes.length && participants.length ? (
            rankedTimes.map((slot) => (
              <HeatmapRow key={`${slot.start.toISOString()}-${slot.end.toISOString()}`} slot={slot} total={participants.length} />
            ))
          ) : (
            <div className="rounded-md border border-ink/10 px-3 py-3 font-bold text-ink/55">Responses will turn into a live overlap map here.</div>
          )}
        </div>
      </div>
    </section>
  );
}

function VotingPage(props: {
  plan: Plan;
  participants: Participant[];
  rankedVenues: RankedVenue[];
  votes: Vote[];
  voteTotals: Record<string, number>;
  selectedVenueId: string;
  setSelectedVenueId: (id: string) => void;
  setVote: (participantId: string, venueId: string, vote: VoteValue) => void;
  onConfirm: () => void;
}) {
  const voterId = props.participants[props.participants.length - 1]?.id;
  const leadingVenue = getLeadingVenue(props.rankedVenues, props.votes);

  return (
    <section className="grid gap-5">
      <div className="rounded-lg bg-white/94 p-5 shadow-soft">
        <ScreenTitle eyebrow="Choose a place" title="Three recommendations" />
        <p className="mt-2 text-sm font-semibold text-ink/65">
          Ranked by travel equity, budget, rating, dietary fit, and booking confidence.
        </p>
        <div className="mt-4 rounded-md bg-paper px-3 py-3 text-sm font-bold text-ink/70">
          {leadingVenue ? `${leadingVenue.name} is winning right now.` : "Votes will appear here as people choose."}{" "}
          {buildVoteStory(leadingVenue, props.votes, props.participants)}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {props.rankedVenues.map((venue, index) => {
          const ownVote = voterId ? props.votes.find((vote) => vote.participantId === voterId && vote.venueId === venue.id)?.vote : undefined;
          const voteBreakdown = getVoteBreakdown(venue.id, props.votes);
          return (
            <article
              key={venue.id}
              className={`rounded-lg bg-white/94 p-4 shadow-soft ${
                props.selectedVenueId === venue.id ? "ring-4 ring-lake/35" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-tomato">Option {index + 1}</p>
                  <h3 className="mt-1 text-xl font-black tracking-normal">{venue.name}</h3>
                </div>
                <span className="rounded-md bg-paper px-2 py-1 text-sm font-black">{venue.score}</span>
              </div>
              <p className="mt-2 text-sm font-bold text-ink/65">
                {venue.category} · {venue.priceLevel} · ${venue.pricePerPerson}/person
              </p>
              <p className="mt-3 text-sm leading-6 text-ink/75">{venue.why}</p>
              <div className="mt-3 grid gap-2">
                {buildVenueReasons(venue, props.plan, props.participants).map((reason) => (
                  <div key={reason} className="rounded-md bg-paper px-3 py-2 text-sm font-bold text-ink/70">
                    {reason}
                  </div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <Metric label="Avg travel" value={`${venue.averageTravelTime} min`} />
                <Metric label="Longest trip" value={`${venue.worstTravelTime} min`} />
                <Metric label="Rating" value={venue.rating.toFixed(1)} />
                <Metric label="Votes" value={`${props.voteTotals[venue.id] ?? 0} pts`} />
              </div>
              <p className="mt-3 text-xs font-black uppercase tracking-normal text-ink/45">
                {voteBreakdown.first} first · {voteBreakdown.acceptable} okay · {voteBreakdown.no} no
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {(["first", "acceptable", "no"] as VoteValue[]).map((vote) => (
                  <button
                    key={vote}
                    onClick={() => voterId && props.setVote(voterId, venue.id, vote)}
                    disabled={!voterId}
                    className={`min-h-12 rounded-md border px-2 text-sm font-black ${
                      ownVote === vote ? "border-ink bg-ink text-white" : "border-ink/15 text-ink"
                    } disabled:cursor-not-allowed disabled:opacity-45`}
                  >
                    {vote === "first" ? "First" : vote === "acceptable" ? "Okay" : "No"}
                  </button>
                ))}
              </div>
              <button
                onClick={() => props.setSelectedVenueId(venue.id)}
                className="mt-3 w-full rounded-md bg-lake px-4 py-3 font-black text-white"
              >
                Pick this
              </button>
            </article>
          );
        })}
      </div>
      <button onClick={props.onConfirm} disabled={!props.participants.length} className="rounded-md bg-tomato px-4 py-4 font-black text-white shadow-soft disabled:cursor-not-allowed disabled:opacity-50">
        Confirm final plan
      </button>
    </section>
  );
}

function FinalPage(props: {
  plan: Plan;
  participants: Participant[];
  slot: TimeSlot;
  venue: RankedVenue;
  confirmed: boolean;
  googleUrl: string;
  onDownloadIcs: () => void;
  inviteUrl: string;
}) {
  const confirmationText = `${props.plan.title} is set.\n${formatSlot(props.slot)}\n${props.venue.name}\n${props.venue.address}`;
  const encodedConfirmation = encodeURIComponent(confirmationText);
  const replacedMessages = Math.max(12, props.participants.length * 8 + 13);

  return (
    <section className="mx-auto w-full max-w-3xl rounded-lg bg-white/94 p-5 shadow-soft">
      <ScreenTitle eyebrow={props.confirmed ? "We’re set" : "Final plan"} title={props.plan.title} />
      <div className="mt-5 grid gap-4">
        <div className="rounded-lg bg-ink p-5 text-white">
          <p className="text-sm font-bold uppercase tracking-normal text-white/65">Time and place</p>
          <h2 className="mt-2 text-3xl font-black tracking-normal">{props.venue.name}</h2>
          <p className="mt-2 text-white/80">{props.venue.address}</p>
          <p className="mt-4 text-xl font-black">{formatSlot(props.slot)}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label="Attendees" value={props.participants.map((participant) => participant.name).join(", ") || "No responses yet"} />
          <Metric label="Reservation" value="Link ready" />
          <Metric label="Messages replaced" value={`${replacedMessages}`} />
        </div>
        <div className="rounded-lg bg-paper p-4">
          <p className="text-sm font-black uppercase tracking-normal text-ink/45">Shareable confirmation</p>
          <p className="mt-2 whitespace-pre-line text-sm font-bold leading-6 text-ink/75">{confirmationText}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <a
            href={props.venue.bookingUrl}
            target="_blank"
            className="rounded-md bg-lake px-4 py-3 text-center font-black text-white"
          >
            Reservation link
          </a>
          <a href={props.googleUrl} target="_blank" className="rounded-md bg-saffron px-4 py-3 text-center font-black text-ink">
            Add to Google
          </a>
          <button onClick={props.onDownloadIcs} className="rounded-md border border-ink/15 px-4 py-3 font-black text-ink">
            Download .ics
          </button>
          <a href={`sms:?&body=${encodedConfirmation}`} className="rounded-md border border-ink/15 px-4 py-3 text-center font-black text-ink">
            Share final
          </a>
        </div>
      </div>
    </section>
  );
}

function ScreenTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="text-sm font-black uppercase tracking-normal text-lake">{eyebrow}</p>
      <h1 className="mt-1 text-3xl font-black leading-tight tracking-normal text-ink">{title}</h1>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-black text-ink">
      {label}
      {children}
    </label>
  );
}

function ChoiceGroup({
  label,
  options,
  values,
  setValues
}: {
  label: string;
  options: { value: string; label: string }[];
  values: string[];
  setValues: (values: string[]) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-black text-ink">{label}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const checked = values.includes(option.value);
          return (
            <label
              key={option.value}
              className={`flex min-h-12 items-center gap-3 rounded-md border px-3 py-2 font-bold ${
                checked ? "border-lake bg-lake/10" : "border-ink/15"
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={(event) =>
                  setValues(event.target.checked ? [...values, option.value] : values.filter((value) => value !== option.value))
                }
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-ink/10 bg-paper px-3 py-3">
      <p className="text-xs font-black uppercase tracking-normal text-ink/45">{label}</p>
      <p className="mt-1 text-sm font-black text-ink">{value}</p>
    </div>
  );
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-md bg-white/90 px-3 py-3 shadow-soft">
      <p className="text-lg font-black leading-none text-ink">{value}</p>
      <p className="mt-1 text-xs font-black uppercase tracking-normal text-ink/45">{label}</p>
    </div>
  );
}

function PulseCard({ value, label, tone }: { value: string; label: string; tone: "lake" | "moss" | "tomato" }) {
  const toneClass = tone === "lake" ? "bg-lake" : tone === "moss" ? "bg-moss" : "bg-tomato";

  return (
    <div className="rounded-lg border border-ink/10 bg-paper p-4">
      <div className={`mb-3 h-2 w-12 rounded-full ${toneClass}`} />
      <p className="truncate text-2xl font-black tracking-normal text-ink">{value}</p>
      <p className="mt-1 text-sm font-bold text-ink/58">{label}</p>
    </div>
  );
}

function HeatmapRow({ slot, total }: { slot: RankedTime; total: number }) {
  const available = slot.availableParticipantIds.length;
  const percent = total ? Math.round((available / total) * 100) : 0;
  const isPerfect = total > 0 && available === total;

  return (
    <div className="grid gap-2 rounded-md border border-ink/10 px-3 py-3 sm:grid-cols-[1fr_150px_70px] sm:items-center">
      <p className="font-black text-ink">{formatSlot(slot)}</p>
      <div className="h-3 overflow-hidden rounded-full bg-ink/10">
        <div className={`h-full ${isPerfect ? "bg-moss" : "bg-lake"}`} style={{ width: `${percent}%` }} />
      </div>
      <p className="text-sm font-black text-ink/65">
        {available}/{total}
      </p>
    </div>
  );
}

function titleCase(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getLeadingVenue(venues: RankedVenue[], votes: Vote[]): RankedVenue | null {
  if (!venues.length) return null;
  const totals = calculateVoteTotals(
    votes,
    venues.map((venue) => venue.id)
  );
  const sorted = [...venues].sort((a, b) => (totals[b.id] ?? 0) - (totals[a.id] ?? 0) || b.score - a.score);
  return sorted[0] ?? null;
}

function getVoteBreakdown(venueId: string, votes: Vote[]) {
  return votes
    .filter((vote) => vote.venueId === venueId)
    .reduce(
      (breakdown, vote) => {
        breakdown[vote.vote] += 1;
        return breakdown;
      },
      { first: 0, acceptable: 0, no: 0 } as Record<VoteValue, number>
    );
}

function buildVoteStory(venue: RankedVenue | null, votes: Vote[], participants: Participant[]): string {
  if (!venue) return "";
  const firstChoiceNames = votes
    .filter((vote) => vote.venueId === venue.id && vote.vote === "first")
    .map((vote) => participants.find((participant) => participant.id === vote.participantId)?.name)
    .filter(Boolean);
  const noVotes = votes.filter((vote) => vote.venueId === venue.id && vote.vote === "no").length;

  if (!firstChoiceNames.length && noVotes === 0) return "No one has objected yet.";
  const firstChoiceText = firstChoiceNames.length ? `${firstChoiceNames.join(", ")} picked it first.` : "";
  const noText = noVotes === 0 ? "No one said no." : `${noVotes} ${noVotes === 1 ? "person said" : "people said"} no.`;
  return [firstChoiceText, noText].filter(Boolean).join(" ");
}

function buildVenueReasons(venue: RankedVenue, plan: Plan, participants: Participant[]): string[] {
  const underBudget = venue.pricePerPerson <= plan.budgetMax;
  const fairTravel = venue.worstTravelTime <= plan.maxTravelMinutes;
  const dietaryNeeds = new Set(participants.flatMap((participant) => participant.dietaryPreferences));
  const matchingDietary = Array.from(dietaryNeeds).filter((tag) => venue.dietaryTags.includes(tag));

  return [
    fairTravel ? `Fair commute: no one above ${venue.worstTravelTime} min` : `Watch commute: longest trip is ${venue.worstTravelTime} min`,
    underBudget ? `Fits the $${plan.budgetMax} budget` : `$${venue.pricePerPerson} average is above budget`,
    matchingDietary.length ? `Covers ${matchingDietary.join(", ")}` : "Flexible menu for a mixed group"
  ];
}

function formatSlotLabel(value: string): string {
  const start = new Date(value);
  return formatSlot({ start, end: new Date(start.getTime() + 150 * 60 * 1000) });
}

function buildAvailabilityChoices(startDate: string, endDate: string): string[] {
  const choices: string[] = [];
  const cursor = new Date(`${startDate}T12:00:00`);
  const last = new Date(`${endDate}T12:00:00`);

  while (cursor <= last && choices.length < 12) {
    const date = cursor.toISOString().slice(0, 10);
    choices.push(`${date}T18:00`, `${date}T19:00`, `${date}T20:00`);
    cursor.setDate(cursor.getDate() + 1);
  }

  return choices;
}

async function apiRequest<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers
    }
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof body.error === "string" ? body.error : "Request failed.");
  }

  return body as T;
}

function normalizeParticipant(participant: Participant): Participant {
  return {
    ...participant,
    availability: participant.availability.map((slot) => ({
      start: new Date(slot.start),
      end: new Date(slot.end)
    }))
  };
}

function apiFallbackMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : "";
  return message ? `${fallback} ${message}` : fallback;
}
