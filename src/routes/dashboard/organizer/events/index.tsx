import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, LayoutGrid, List, Calendar, MapPin, ExternalLink, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../../../lib/AuthProvider";
import { getSupabaseClient, isSupabaseConfigured } from "../../../../lib/supabaseClient";

export const Route = createFileRoute("/dashboard/organizer/events/")({
  component: OrganizerAssignedEventsPage,
});

interface AssignedEventItem {
  staff_role: string;
  event: {
    id: string;
    title: string;
    category: string;
    venue: string;
    cover_image: string | null;
    start_date: string;
    status: string;
    slug: string | null;
  };
}

function OrganizerAssignedEventsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<AssignedEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadAssigned = useCallback(async () => {
    if (!user || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await getSupabaseClient()
      .from("event_staff")
      .select(
        "staff_role, events(id, title, category, venue, cover_image, start_date, status, slug)",
      )
      .eq("user_id", user.id);

    if (error) {
      toast.error(error.message);
    } else {
      const parsed = (
        (data as unknown as { staff_role: string; events: AssignedEventItem["event"] | null }[]) ??
        []
      )
        .filter((r): r is { staff_role: string; events: AssignedEventItem["event"] } =>
          Boolean(r.events),
        )
        .map((r) => ({ staff_role: r.staff_role, event: r.events }));
      setItems(parsed);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadAssigned();
  }, [loadAssigned]);

  const filtered = useMemo(() => {
    return items.filter(({ event }) => {
      const matchSearch = event.title.toLowerCase().includes(search.toLowerCase());
      const matchCat = categoryFilter === "all" || event.category === categoryFilter;
      const matchStatus = statusFilter === "all" || event.status === statusFilter;
      return matchSearch && matchCat && matchStatus;
    });
  }, [items, search, categoryFilter, statusFilter]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Assigned Events</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Events assigned to you by an administrator. Only your assigned events appear here.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#14141B]/10 bg-white p-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search assigned events..."
            className="w-full rounded-xl border border-zinc-200 bg-[#FAF8F4] py-2 pl-9 pr-3 text-sm outline-none focus:border-[#7C3AED]"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-xl border border-zinc-200 bg-[#FAF8F4] px-3 py-2 text-sm outline-none"
        >
          <option value="all">All Categories</option>
          <option value="Hackathon">Hackathon</option>
          <option value="Workshop">Workshop</option>
          <option value="Competition">Competition</option>
          <option value="Seminar">Seminar</option>
          <option value="Cultural">Cultural</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-zinc-200 bg-[#FAF8F4] px-3 py-2 text-sm outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="ongoing">Ongoing</option>
          <option value="completed">Completed</option>
        </select>

        <div className="flex rounded-xl border border-zinc-200 p-1">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            aria-label="Grid view"
            className={`rounded-lg p-1.5 ${viewMode === "grid" ? "bg-[#7C3AED] text-white" : "text-zinc-500"}`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("table")}
            aria-label="Table view"
            className={`rounded-lg p-1.5 ${viewMode === "table" ? "bg-[#7C3AED] text-white" : "text-zinc-500"}`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-64 animate-pulse rounded-3xl bg-zinc-200" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <p className="text-base font-bold">No assigned events</p>
          <p className="mt-1 text-sm text-zinc-500">
            Once an administrator assigns you to an event, it will appear here.
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(({ staff_role, event }) => (
            <div
              key={event.id}
              className="flex flex-col overflow-hidden rounded-3xl border border-[#14141B]/10 bg-white"
            >
              <div className="relative h-40 bg-zinc-100">
                {event.cover_image ? (
                  <img
                    src={event.cover_image}
                    alt={event.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-[#7C3AED]/10 text-xs font-bold text-[#7C3AED]">
                    {event.category}
                  </div>
                )}
                <span className="absolute left-3 top-3 rounded-full bg-[#0D0D12]/85 px-2.5 py-0.5 text-[11px] font-bold text-[#FACC15]">
                  {staff_role === "lead_organizer" ? "Lead Organizer" : "Organizing Staff"}
                </span>
                <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-bold capitalize text-[#14141B]">
                  {event.status}
                </span>
              </div>

              <div className="flex flex-1 flex-col p-5">
                <h3 className="text-lg font-bold">{event.title}</h3>
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-zinc-500">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(event.start_date).toLocaleDateString()}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500">
                  <MapPin className="h-3.5 w-3.5" />
                  {event.venue}
                </p>

                <div className="mt-5 flex items-center gap-2 border-t border-zinc-100 pt-4">
                  <Link
                    to="/dashboard/organizer/events/$eventId"
                    params={{ eventId: event.id }}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#7C3AED] px-3 py-2 text-xs font-bold text-white hover:bg-[#6D28D9]"
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                    Manage Event
                  </Link>
                  {event.status === "published" && event.slug && (
                    <Link
                      to="/events/$slug"
                      params={{ slug: event.slug }}
                      className="rounded-full border border-zinc-200 p-2 text-zinc-700 hover:bg-zinc-100"
                      title="View Public Page"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-[#14141B]/10 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-100 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-5 py-3.5">Event</th>
                <th className="px-5 py-3.5">Your Role</th>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.map(({ staff_role, event }) => (
                <tr key={event.id} className="hover:bg-zinc-50">
                  <td className="px-5 py-3.5 font-bold">{event.title}</td>
                  <td className="px-5 py-3.5 text-xs font-semibold text-[#7C3AED]">
                    {staff_role === "lead_organizer" ? "Lead Organizer" : "Organizing Staff"}
                  </td>
                  <td className="px-5 py-3.5 text-zinc-600">
                    {new Date(event.start_date).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3.5 capitalize">{event.status}</td>
                  <td className="px-5 py-3.5 text-right">
                    <Link
                      to="/dashboard/organizer/events/$eventId"
                      params={{ eventId: event.id }}
                      className="font-semibold text-[#7C3AED] hover:underline"
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
