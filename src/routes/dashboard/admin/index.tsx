import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  Users,
  UserCheck,
  ClipboardList,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../../../lib/AuthProvider";
import { getSupabaseClient, isSupabaseConfigured } from "../../../lib/supabaseClient";

export const Route = createFileRoute("/dashboard/admin/")({
  component: AdminOverviewPage,
});

interface EventRow {
  id: string;
  title: string;
  category: string;
  venue: string;
  start_date: string;
  status: string;
}

interface RegistrationRow {
  id: string;
  status: string;
  registered_at: string;
  events: { title: string } | null;
  profiles: { full_name: string | null; email: string | null } | null;
}

interface OverviewStats {
  totalEvents: number;
  publishedEvents: number;
  ongoingEvents: number;
  completedEvents: number;
  draftEvents: number;
  cancelledEvents: number;
  totalOrganizers: number;
  totalParticipants: number;
  totalRegistrations: number;
  recentEvents: EventRow[];
  upcomingEvents: EventRow[];
  recentRegistrations: RegistrationRow[];
}

function AdminOverviewPage() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const loadOverview = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setErrorMsg("Supabase is not configured. Add credentials to .env.local.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      const supabase = getSupabaseClient();
      const [eventsRes, profilesRes, regsRes, recentRegsRes] = await Promise.all([
        supabase
          .from("events")
          .select("id, title, category, venue, start_date, status, created_at")
          .order("created_at", { ascending: false }),
        supabase.from("profiles").select("id, role"),
        supabase.from("registrations").select("id", { count: "exact", head: true }),
        supabase
          .from("registrations")
          .select("id, status, registered_at, events(title), profiles(full_name, email)")
          .order("registered_at", { ascending: false })
          .limit(5),
      ]);

      if (eventsRes.error) throw eventsRes.error;
      if (profilesRes.error) throw profilesRes.error;
      if (regsRes.error) throw regsRes.error;

      const events = eventsRes.data ?? [];
      const profiles = profilesRes.data ?? [];
      const nowIso = new Date().toISOString();

      setStats({
        totalEvents: events.length,
        publishedEvents: events.filter((e) => e.status === "published").length,
        ongoingEvents: events.filter((e) => e.status === "ongoing").length,
        completedEvents: events.filter((e) => e.status === "completed").length,
        draftEvents: events.filter((e) => e.status === "draft").length,
        cancelledEvents: events.filter((e) => e.status === "cancelled").length,
        totalOrganizers: profiles.filter((p) => p.role === "organizer").length,
        totalParticipants: profiles.filter((p) => p.role === "participant").length,
        totalRegistrations: regsRes.count ?? 0,
        recentEvents: events.slice(0, 5),
        upcomingEvents: events
          .filter((e) => e.status === "published" && e.start_date >= nowIso)
          .sort((a, b) => a.start_date.localeCompare(b.start_date))
          .slice(0, 5),
        recentRegistrations: (recentRegsRes.data as unknown as RegistrationRow[]) ?? [],
      });
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to load admin overview.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="h-32 animate-pulse rounded-3xl bg-zinc-200" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-zinc-200" />
          ))}
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="mx-auto max-w-3xl rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-red-600" />
        <h2 className="mt-3 text-lg font-bold text-red-900">Unable to load dashboard data</h2>
        <p className="mt-1 text-sm text-red-700">{errorMsg}</p>
        <button
          type="button"
          onClick={loadOverview}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  const statCards = [
    {
      label: "Total Events",
      value: stats?.totalEvents ?? 0,
      icon: Calendar,
      color: "text-[#7C3AED]",
    },
    {
      label: "Published Events",
      value: stats?.publishedEvents ?? 0,
      icon: CheckCircle2,
      color: "text-emerald-600",
    },
    {
      label: "Ongoing Events",
      value: stats?.ongoingEvents ?? 0,
      icon: Clock,
      color: "text-amber-600",
    },
    {
      label: "Completed Events",
      value: stats?.completedEvents ?? 0,
      icon: CheckCircle2,
      color: "text-sky-600",
    },
    {
      label: "Total Organizers",
      value: stats?.totalOrganizers ?? 0,
      icon: Users,
      color: "text-[#7C3AED]",
    },
    {
      label: "Total Participants",
      value: stats?.totalParticipants ?? 0,
      icon: UserCheck,
      color: "text-indigo-600",
    },
    {
      label: "Total Registrations",
      value: stats?.totalRegistrations ?? 0,
      icon: ClipboardList,
      color: "text-emerald-600",
    },
  ];

  const statusDist = [
    { label: "Draft", count: stats?.draftEvents ?? 0, bar: "bg-zinc-400" },
    { label: "Published", count: stats?.publishedEvents ?? 0, bar: "bg-emerald-500" },
    { label: "Ongoing", count: stats?.ongoingEvents ?? 0, bar: "bg-amber-500" },
    { label: "Completed", count: stats?.completedEvents ?? 0, bar: "bg-sky-500" },
    { label: "Cancelled", count: stats?.cancelledEvents ?? 0, bar: "bg-red-500" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-[#0D0D12] p-8 text-white">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#FACC15]">
            Admin Control Center
          </p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
            Welcome back, {profile?.full_name ?? "Administrator"}
          </h1>
          <p className="mt-1 text-sm text-zinc-300">
            Monitor institutional events, assign organizing teams, and track campus participation.
          </p>
        </div>
        <Link
          to="/dashboard/admin/events/new"
          className="inline-flex items-center gap-2 rounded-full bg-[#7C3AED] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#6D28D9]"
        >
          <Plus className="h-4 w-4" />
          Create Event
        </Link>
      </div>

      {/* KPI Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-2xl border border-[#14141B]/10 bg-white p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  {card.label}
                </span>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
              <p className="mt-3 text-3xl font-extrabold text-[#14141B]">{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Status Distribution & Recent Events */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="rounded-3xl border border-[#14141B]/10 bg-white p-6 lg:col-span-5">
          <h2 className="text-lg font-bold">Event Status Distribution</h2>
          <div className="mt-5 space-y-4">
            {statusDist.map((item) => {
              const total = stats?.totalEvents || 1;
              const pct = Math.round((item.count / total) * 100);
              return (
                <div key={item.label}>
                  <div className="flex justify-between text-xs font-semibold">
                    <span>{item.label}</span>
                    <span className="text-zinc-500">{item.count}</span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className={`h-full rounded-full ${item.bar}`}
                      style={{ width: `${stats?.totalEvents ? pct : 0}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-[#14141B]/10 bg-white p-6 lg:col-span-7">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Recent Events</h2>
            <Link
              to="/dashboard/admin/events"
              className="text-xs font-bold text-[#7C3AED] hover:underline"
            >
              View all
            </Link>
          </div>
          {stats?.recentEvents.length ? (
            <div className="mt-4 divide-y divide-zinc-100">
              {stats.recentEvents.map((ev) => (
                <Link
                  key={ev.id}
                  to="/dashboard/admin/events/$eventId"
                  params={{ eventId: ev.id }}
                  className="flex items-center justify-between py-3 hover:bg-zinc-50 rounded-xl px-2 transition-colors"
                >
                  <div>
                    <p className="text-sm font-bold text-[#14141B]">{ev.title}</p>
                    <p className="text-xs text-zinc-500">
                      {ev.category} • {ev.venue}
                    </p>
                  </div>
                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold capitalize text-zinc-700">
                    {ev.status}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-6 text-sm text-zinc-500">No events created yet.</p>
          )}
        </div>
      </div>

      {/* Upcoming Events & Recent Registrations */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-[#14141B]/10 bg-white p-6">
          <h2 className="text-lg font-bold">Upcoming Published Events</h2>
          {stats?.upcomingEvents.length ? (
            <div className="mt-4 divide-y divide-zinc-100">
              {stats.upcomingEvents.map((ev) => (
                <div key={ev.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-bold">{ev.title}</p>
                    <p className="text-xs text-zinc-500">{ev.venue}</p>
                  </div>
                  <span className="text-xs font-medium text-zinc-600">
                    {new Date(ev.start_date).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-6 text-sm text-zinc-500">No upcoming published events.</p>
          )}
        </div>

        <div className="rounded-3xl border border-[#14141B]/10 bg-white p-6">
          <h2 className="text-lg font-bold">Recent Registration Activity</h2>
          {stats?.recentRegistrations.length ? (
            <div className="mt-4 divide-y divide-zinc-100">
              {stats.recentRegistrations.map((reg) => (
                <div key={reg.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-bold">
                      {reg.profiles?.full_name || reg.profiles?.email || "Participant"}
                    </p>
                    <p className="text-xs text-zinc-500">{reg.events?.title ?? "Event"}</p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold capitalize text-emerald-700">
                    {reg.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-6 text-sm text-zinc-500">No registrations recorded yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
