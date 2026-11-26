import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Calendar, MapPin, Search, ArrowRight, Clock } from "lucide-react";
import { CustomCursor } from "../../components/CustomCursor";
import { getSupabaseClient, isSupabaseConfigured } from "../../lib/supabaseClient";

export const Route = createFileRoute("/events/")({
  head: () => ({
    meta: [{ title: "Explore Events — EVENTRIX" }],
  }),
  component: PublicEventsPage,
});

interface PublicEvent {
  id: string;
  title: string;
  short_description: string | null;
  category: string;
  venue: string;
  cover_image: string | null;
  start_date: string;
  registration_deadline: string;
  registration_type: string;
  capacity: number;
  slug: string | null;
  status: string;
}

const categories = ["All", "Hackathon", "Workshop", "Competition", "Seminar", "Cultural"];

function PublicEventsPage() {
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  useEffect(() => {
    const load = async () => {
      if (!isSupabaseConfigured) {
        setLoading(false);
        return;
      }
      const { data } = await getSupabaseClient()
        .from("events")
        .select(
          "id, title, short_description, category, venue, cover_image, start_date, registration_deadline, registration_type, capacity, slug, status",
        )
        .in("status", ["published", "ongoing"])
        .order("start_date", { ascending: true });

      setEvents((data as PublicEvent[]) ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    return events.filter((ev) => {
      const matchSearch =
        ev.title.toLowerCase().includes(search.toLowerCase()) ||
        (ev.short_description ?? "").toLowerCase().includes(search.toLowerCase());
      const matchCat = category === "All" || ev.category === category;
      return matchSearch && matchCat;
    });
  }, [events, search, category]);

  return (
    <div className="min-h-screen bg-[#0D0D12] text-white">
      <CustomCursor />

      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0D0D12]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5 text-xl font-bold tracking-tight">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#7C3AED] text-sm font-black text-white">
              E
            </span>
            <span>EVENTRIX</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-zinc-300 hover:text-white">
              Login
            </Link>
            <Link
              to="/signup"
              className="rounded-full bg-[#7C3AED] px-5 py-2 text-sm font-semibold text-white hover:bg-[#6D28D9]"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-widest text-[#FACC15]">
            Campus Discovery
          </p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-6xl">
            Explore Live Events
          </h1>
          <p className="mt-3 max-w-2xl text-base text-zinc-300">
            Discover hackathons, workshops, and competitions across your campus.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search events..."
                className="w-full rounded-full border border-white/15 bg-white/5 py-3 pl-11 pr-5 text-sm text-white outline-none focus:border-[#7C3AED]"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`rounded-full px-4 py-2 text-xs font-bold transition-colors ${
                    category === cat
                      ? "bg-[#7C3AED] text-white"
                      : "border border-white/15 bg-white/5 text-zinc-300 hover:bg-white/10"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-80 animate-pulse rounded-3xl bg-white/5" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="mt-12 rounded-3xl border border-dashed border-white/20 bg-[#14141C] p-12 text-center">
              <Clock className="mx-auto h-10 w-10 text-[#A78BFA]" />
              <h2 className="mt-4 text-xl font-bold">No published events found</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Check back soon or adjust your search and category filters.
              </p>
            </div>
          ) : (
            <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((ev) => {
                const isOpen = new Date(ev.registration_deadline) > new Date();
                return (
                  <article
                    key={ev.id}
                    data-cursor-label="View"
                    className="group flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#16161F]"
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
                            isOpen
                              ? "bg-emerald-500/15 text-emerald-300"
                              : "bg-zinc-700/40 text-zinc-400"
                          }`}
                        >
                          {isOpen ? `Open (${ev.registration_type})` : "Closed"}
                        </span>
                      </div>
                      <h2 className="mt-3 text-xl font-bold">{ev.title}</h2>
                      {ev.short_description && (
                        <p className="mt-2 line-clamp-2 text-sm text-zinc-400">
                          {ev.short_description}
                        </p>
                      )}
                      <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-zinc-400">
                        <MapPin className="h-3.5 w-3.5" />
                        {ev.venue}
                      </p>
                      <div className="mt-6 border-t border-white/10 pt-4">
                        {ev.slug ? (
                          <Link
                            to="/events/$slug"
                            params={{ slug: ev.slug }}
                            className="inline-flex items-center gap-2 text-sm font-bold text-[#A78BFA] hover:text-white"
                          >
                            View Event
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        ) : (
                          <span className="text-xs text-zinc-500">Link unavailable</span>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
