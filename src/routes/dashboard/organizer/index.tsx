import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  ClipboardList,
  RefreshCw,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "../../../lib/AuthProvider";
import { getSupabaseClient, isSupabaseConfigured } from "../../../lib/supabaseClient";

export const Route = createFileRoute("/dashboard/organizer/")({
  component: OrganizerOverviewPage,
});

interface AssignedEvent {
  id: string;
  title: string;
  category: string;
  venue: string;
  start_date: string;
  status: string;
  slug: string | null;
}

interface StaffAssignmentRow {
  staff_role: string;
  events: AssignedEvent | null;
}

interface RecentReg {
  id: string;
  status: string;
  registered_at: string;
  events: { title: string } | null;
  profiles: { full_name: string | null; email: string | null } | null;
}

function OrganizerOverviewPage() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [assignedEvents, setAssignedEvents] = useState<AssignedEvent[]>([]);
  const [totalRegs, setTotalRegs] = useState(0);
  const [recentRegs, setRecentRegs] = useState<RecentReg[]>([]);

  const loadOverview = useCallback(async () => {
    if (!user || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      const supabase = getSupabaseClient();
      const { data: staffRows, error: staffErr } = await supabase
        .from("event_staff")
        .select("staff_role, events(id, title, category, venue, start_date, status, slug)")
        .eq("user_id", user.id);

      if (staffErr) throw staffErr;

      const eventsList = ((staffRows as unknown as StaffAssignmentRow[]) ?? [])
        .map((r) => r.events)
        .filter((e): e is AssignedEvent => Boolean(e));

      setAssignedEvents(eventsList);

      if (eventsList.length > 0) {
        const eventIds = eventsList.map((e) => e.id);
        const [countRes, recentRes] = await Promise.all([
          supabase
            .from("registrations")
            .select("id", { count: "exact", head: true })
            .in("event_id", eventIds),
          supabase
            .from("registrations")
            .select("id, status, registered_at, events(title), profiles(full_name, email)")
            .in("event_id", eventIds)
            .order("registered_at", { ascending: false })
            .limit(5),
        ]);
        if (countRes.error) throw countRes.error;
        setTotalRegs(countRes.count ?? 0);
        setRecentRegs((recentRes.data as unknown as RecentReg[]) ?? []);
      } else {
        setTotalRegs(0);
        setRecentRegs([]);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to load organizer overview.");
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((n) => (
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
        <h2 className="mt-3 text-lg font-bold text-red-900">Unable to load organizer overview</h2>
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

  const draftCount = assignedEvents.filter((e) => e.status === "draft").length;
  const publishedCount = assignedEvents.filter((e) => e.status === "published").length;
  const ongoingCount = assignedEvents.filter((e) => e.status === "ongoing").length;
  const completedCount = assignedEvents.filter((e) => e.status === "completed").length;

  const kpis = [
    { label: "Total Assigned Events", value: assignedEvents.length, icon: CalendarDays },
    { label: "Draft Events", value: draftCount, icon: Clock },
    { label: "Published Events", value: publishedCount, icon: CheckCircle2 },
    { label: "Ongoing Events", value: ongoingCount, icon: Clock },
    { label: "Completed Events", value: completedCount, icon: CheckCircle2 },
    { label: "Total Registrations", value: totalRegs, icon: ClipboardList },
  ];

  const nowIso = new Date().toISOString();
  const upcoming = assignedEvents
    .filter((e) => e.start_date >= nowIso && e.status !== "cancelled")
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
    .slice(0, 5);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-[#0D0D12] p-8 text-white">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#FACC15]">
            Organizer Control Center
          </p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
            Welcome, {profile?.full_name ?? "Organizer"}
          </h1>
          <p className="mt-1 text-sm text-zinc-300">
            Configure assigned events, publish registration links, and track participant signups.
          </p>
        </div>
        <Link
          to="/dashboard/organizer/events"
          className="inline-flex items-center gap-2 rounded-full bg-[#7C3AED] px-6 py-3 text-sm font-bold text-white hover:bg-[#6D28D9]"
        >
          Manage Assigned Events
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
          <h2 className="text-lg font-bold">Upcoming Assigned Events</h2>
          {upcoming.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">No upcoming assigned events.</p>
          ) : (
            <div className="mt-4 divide-y divide-zinc-100">
              {upcoming.map((ev) => (
                <Link
                  key={ev.id}
                  to="/dashboard/organizer/events/$eventId"
                  params={{ eventId: ev.id }}
                  className="flex items-center justify-between rounded-xl px-2 py-3 hover:bg-zinc-50"
                >
                  <div>
                    <p className="text-sm font-bold">{ev.title}</p>
                    <p className="text-xs text-zinc-500">
                      {ev.venue} • {new Date(ev.start_date).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold capitalize">
                    {ev.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-[#14141B]/10 bg-white p-6">
          <h2 className="text-lg font-bold">Recent Registration Activity</h2>
          {recentRegs.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">No registrations yet for your events.</p>
          ) : (
            <div className="mt-4 divide-y divide-zinc-100">
              {recentRegs.map((reg) => (
                <div key={reg.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-bold">
                      {reg.profiles?.full_name || reg.profiles?.email || "Participant"}
                    </p>
                    <p className="text-xs text-zinc-500">{reg.events?.title ?? "Event"}</p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold capitalize text-emerald-700">
                    {reg.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
