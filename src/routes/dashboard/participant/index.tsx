import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  Compass,
  ClipboardCheck,
  Calendar,
  Users,
  Award,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "../../../lib/AuthProvider";
import { getSupabaseClient, isSupabaseConfigured } from "../../../lib/supabaseClient";

export const Route = createFileRoute("/dashboard/participant/")({
  component: ParticipantOverviewPage,
});

interface RegRow {
  id: string;
  status: string;
  registration_ref: string | null;
  registered_at: string;
  events: {
    id: string;
    title: string;
    category: string;
    venue: string;
    start_date: string;
    status: string;
    slug: string | null;
  } | null;
}

interface RecommendedEvent {
  id: string;
  title: string;
  category: string;
  venue: string;
  start_date: string;
  slug: string | null;
}

function ParticipantOverviewPage() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [regs, setRegs] = useState<RegRow[]>([]);
  const [teamCount, setTeamCount] = useState(0);
  const [certCount, setCertCount] = useState(0);
  const [recommended, setRecommended] = useState<RecommendedEvent[]>([]);

  const loadOverview = useCallback(async () => {
    if (!user || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      const supabase = getSupabaseClient();
      const [regRes, teamRes, certRes, recRes] = await Promise.all([
        supabase
          .from("registrations")
          .select(
            "id, status, registration_ref, registered_at, events(id, title, category, venue, start_date, status, slug)",
          )
          .eq("participant_id", user.id)
          .order("registered_at", { ascending: false }),
        supabase
          .from("team_members")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("certificates")
          .select("id", { count: "exact", head: true })
          .eq("participant_id", user.id),
        supabase
          .from("events")
          .select("id, title, category, venue, start_date, slug")
          .eq("status", "published")
          .order("start_date", { ascending: true })
          .limit(3),
      ]);

      if (regRes.error) throw regRes.error;
      setRegs((regRes.data as unknown as RegRow[]) ?? []);
      setTeamCount(teamRes.count ?? 0);
      setCertCount(certRes.count ?? 0);
      setRecommended((recRes.data as RecommendedEvent[]) ?? []);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to load participant overview.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="h-32 animate-pulse rounded-3xl bg-zinc-200" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="h-28 animate-pulse rounded-2xl bg-zinc-200" />
          ))}
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="mx-auto max-w-3xl rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-red-600" />
        <h2 className="mt-3 text-lg font-bold text-red-900">Unable to load dashboard</h2>
        <p className="mt-1 text-sm text-red-700">{errorMsg}</p>
        <button
          type="button"
          onClick={loadOverview}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  const confirmedRegs = regs.filter((r) => r.status === "confirmed");
  const nowIso = new Date().toISOString();
  const upcomingRegs = confirmedRegs.filter(
    (r) => r.events && r.events.start_date >= nowIso && r.events.status !== "cancelled",
  );
  const completedCount = confirmedRegs.filter((r) => r.events?.status === "completed").length;

  const kpis = [
    { label: "Registered Events", value: confirmedRegs.length, icon: ClipboardCheck },
    { label: "Upcoming Events", value: upcomingRegs.length, icon: Calendar },
    { label: "Completed Events", value: completedCount, icon: CheckCircle2 },
    { label: "My Teams", value: teamCount, icon: Users },
    { label: "Certificates", value: certCount, icon: Award },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-[#0D0D12] p-8 text-white">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#38BDF8]">
            Participant Portal
          </p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
            Welcome, {profile?.full_name ?? "Participant"}
          </h1>
          <p className="mt-1 text-sm text-zinc-300">
            Discover campus events, manage your teams, and access your digital event passes.
          </p>
        </div>
        <Link
          to="/dashboard/participant/events"
          className="inline-flex items-center gap-2 rounded-full bg-[#7C3AED] px-6 py-3 text-sm font-bold text-white hover:bg-[#6D28D9]"
        >
          <Compass className="h-4 w-4" />
          Explore Events
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="rounded-2xl border border-[#14141B]/10 bg-white p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  {k.label}
                </span>
                <Icon className="h-4 w-4 text-[#7C3AED]" />
              </div>
              <p className="mt-3 text-3xl font-extrabold">{k.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-[#14141B]/10 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Upcoming Registered Events</h2>
            <Link
              to="/dashboard/participant/registrations"
              className="text-xs font-bold text-[#7C3AED] hover:underline"
            >
              View all
            </Link>
          </div>
          {upcomingRegs.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">
              You have no upcoming registered events yet.
            </p>
          ) : (
            <div className="mt-4 divide-y divide-zinc-100">
              {upcomingRegs.slice(0, 5).map((r) => (
                <Link
                  key={r.id}
                  to="/dashboard/participant/registrations/$registrationId"
                  params={{ registrationId: r.id }}
                  className="flex items-center justify-between rounded-xl px-2 py-3 hover:bg-zinc-50"
                >
                  <div>
                    <p className="text-sm font-bold">{r.events?.title}</p>
                    <p className="text-xs text-zinc-500">
                      {r.events?.venue} •{" "}
                      {r.events ? new Date(r.events.start_date).toLocaleDateString() : ""}
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                    Pass Ready
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-[#14141B]/10 bg-white p-6">
          <h2 className="text-lg font-bold">Published Events to Explore</h2>
          {recommended.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">No published events available right now.</p>
          ) : (
            <div className="mt-4 divide-y divide-zinc-100">
              {recommended.map((ev) => (
                <div key={ev.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-bold">{ev.title}</p>
                    <p className="text-xs text-zinc-500">
                      {ev.category} • {ev.venue}
                    </p>
                  </div>
                  {ev.slug && (
                    <Link
                      to="/events/$slug"
                      params={{ slug: ev.slug }}
                      className="text-xs font-bold text-[#7C3AED] hover:underline"
                    >
                      View
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
