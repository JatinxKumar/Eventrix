import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Calendar,
  MapPin,
  Search,
  Clock,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { getSupabaseClient, isSupabaseConfigured } from "../../../../lib/supabaseClient";
import { useAuth } from "../../../../lib/AuthProvider";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/participant/events/")({
  component: ParticipantEventsExplorePage,
});

interface PublicEvent {
  id: string;
  title: string;
  category: string;
  venue: string;
  cover_image: string | null;
  start_date: string;
  registration_deadline: string;
  registration_type: string;
  slug: string | null;
  status: string;
}

const categories = [
  "All",
  "Hackathon",
  "Workshop",
  "Competition",
  "Seminar",
  "Cultural",
];

function ParticipantEventsExplorePage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const loadEvents = useCallback(async () => {
    if (!user || !isSupabaseConfigured) {
      setLoading(false);
      setErrorMsg("");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("events")
        .select(
          "id, title, category, venue, cover_image, start_date, registration_deadline, registration_type, slug, status",
        )
        .in("status", ["published", "ongoing"])
        .order("start_date", { ascending: true });

      if (error) throw error;
      setEvents((data as PublicEvent[]) ?? []);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to load events.");
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const filtered = useMemo(() => {
    return events.filter((ev) => {
      const matchSearch =
        ev.title.toLowerCase().includes(search.toLowerCase()) ||
        (ev.venue?.toLowerCase() ?? "").toLowerCase().includes(search.toLowerCase());
      const matchCat = category === "All" || ev.category === category;
      return matchSearch && matchCat;
    });
  }, [events, search, category]);

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
        <h2 className="mt-3 text-lg font-bold text-red-900">Unable to load events.</h2>
        <p className="mt-1 text-sm text-red-700">{errorMsg}</p>
        <button
          type="button"
          onClick={loadEvents}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#6D28D9]"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="mx-auto max-w-6xl rounded-3xl border border-dashed border-zinc-300 bg-white p-12 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500 mb-4" />
        <h2 className="text-xl font-bold text-zinc-600">No events found</h2>
        <p className="mt-2 text-sm text-zinc-500">Try adjusting your search or category filters.</p>
        <Link
          to="/dashboard/participant/registrations"
          className="mt-4 inline-block text-sm font-bold text-[#7C3AED] underline"
        >
          View My Registrations
        </Link>
        <Link
          to="/dashboard/participant/events"
          className="mt-2 inline-block text-sm font-bold text-[#7C3AED] underline"
        >
          Explore Events
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Explore Events</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Discover published campus events, register solo or with a team.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search events by title or venue..."
              className="w-full rounded-full border border-zinc-200 bg-[#FAF8F4] py-2 pl-9 pr-3 text-sm outline-none focus:border-[#7C3AED]"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl border border-zinc-200 bg-[#FAF8F4] px-3 py-2 text-sm outline-none"
          >
            <option value="All">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((ev) => {
          const isOpen = new Date(ev.registration_deadline) > new Date();
          return (
            <article
              key={ev.id}
              className="group flex flex-col overflow-hidden rounded-3xl border border-[#14141B]/10 bg-white"
            >
              <div className="relative h-52 overflow-hidden bg-zinc-900">
                {ev.cover_image ? (
                  <img
                    src={ev.cover_image}
                    alt={ev.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-[#7C3AED]/20 text-sm font-bold text-[#A78BFA]">
                    {ev.category}
                  </div>
                )}
                <span className="absolute left-4 top-4 rounded-full bg-[#0D0D12]/85 px-3 py-1 text-xs font-semibold text-[#FACC15]">
                  {ev.category}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-6">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-[#A78BFA]" />
                    {new Date(ev.start_date).toLocaleDateString()}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 font-semibold ${
                      isOpen ? "bg-emerald-500/15 text-emerald-300" : "bg-zinc-700/40 text-zinc-400"
                    }`}
                  >
                    {isOpen ? `Open (${ev.registration_type})` : "Closed"}
                  </span>
                </div>
                <h2 className="mt-3 text-xl font-bold">{ev.title}</h2>
                {ev.venue && (
                  <p className="mt-1 text-xs text-zinc-500">
                    <MapPin className="h-3.5 w-3.5" /> {ev.venue}
                  </p>
                )}
                <div className="mt-6 border-t border-[#14141B]/10 pt-4">
                  <Link
                    to={`/events/${ev.slug}`}
                    params={{ slug: ev.slug }}
                    className="inline-flex items-center gap-2 text-sm font-bold text-[#7C3AED] hover:underline"
                  >
                    View Event
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
