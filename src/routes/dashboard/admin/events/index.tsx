import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  Calendar,
  MapPin,
  Trash2,
  Ban,
  Eye,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { getSupabaseClient, isSupabaseConfigured } from "../../../../lib/supabaseClient";

export const Route = createFileRoute("/dashboard/admin/events/")({
  component: AdminEventsListPage,
});

interface EventItem {
  id: string;
  title: string;
  category: string;
  venue: string;
  cover_image: string | null;
  start_date: string;
  status: string;
  capacity: number;
  registration_type: string;
}

function AdminEventsListPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [confirmAction, setConfirmAction] = useState<{
    type: "cancel" | "delete";
    event: EventItem;
  } | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await getSupabaseClient()
      .from("events")
      .select(
        "id, title, category, venue, cover_image, start_date, status, capacity, registration_type",
      )
      .order("start_date", { ascending: sortOrder === "asc" });

    if (error) {
      toast.error(error.message);
    } else {
      setEvents(data ?? []);
    }
    setLoading(false);
  }, [sortOrder]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const filtered = useMemo(() => {
    return events.filter((ev) => {
      const matchesSearch = ev.title.toLowerCase().includes(search.toLowerCase());
      const matchesCat = categoryFilter === "all" || ev.category === categoryFilter;
      const matchesStatus = statusFilter === "all" || ev.status === statusFilter;
      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [events, search, categoryFilter, statusFilter]);

  const handleConfirm = async () => {
    if (!confirmAction) return;
    const supabase = getSupabaseClient();
    const { type, event } = confirmAction;

    if (type === "cancel") {
      const { error } = await supabase
        .from("events")
        .update({ status: "cancelled" })
        .eq("id", event.id);
      if (error) toast.error(error.message);
      else {
        toast.success(`"${event.title}" has been cancelled.`);
        fetchEvents();
      }
    } else {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", event.id)
        .eq("status", "draft");
      if (error) toast.error(error.message);
      else {
        toast.success(`Draft "${event.title}" deleted.`);
        fetchEvents();
      }
    }
    setConfirmAction(null);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            Institutional Events
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Create, manage, and assign organizing teams to campus events.
          </p>
        </div>
        <Link
          to="/dashboard/admin/events/new"
          className="inline-flex items-center gap-2 rounded-full bg-[#7C3AED] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#6D28D9]"
        >
          <Plus className="h-4 w-4" />
          Create Event
        </Link>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#14141B]/10 bg-white p-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events by title..."
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
          <option value="cancelled">Cancelled</option>
        </select>

        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
          className="rounded-xl border border-zinc-200 bg-[#FAF8F4] px-3 py-2 text-sm outline-none"
        >
          <option value="desc">Newest First</option>
          <option value="asc">Oldest First</option>
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

      {/* Content */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-64 animate-pulse rounded-3xl bg-zinc-200" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <p className="text-base font-bold">No events found</p>
          <p className="mt-1 text-sm text-zinc-500">
            Create your first institutional event or adjust your filters.
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((ev) => (
            <div
              key={ev.id}
              className="flex flex-col overflow-hidden rounded-3xl border border-[#14141B]/10 bg-white"
            >
              <div className="relative h-40 bg-zinc-100">
                {ev.cover_image ? (
                  <img src={ev.cover_image} alt={ev.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center bg-[#7C3AED]/10 text-xs font-bold text-[#7C3AED]">
                    {ev.category}
                  </div>
                )}
                <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-bold capitalize text-[#14141B]">
                  {ev.status}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h3 className="text-lg font-bold">{ev.title}</h3>
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-zinc-500">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(ev.start_date).toLocaleDateString()}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500">
                  <MapPin className="h-3.5 w-3.5" />
                  {ev.venue}
                </p>
                <div className="mt-5 flex items-center gap-2 border-t border-zinc-100 pt-4">
                  <Link
                    to="/dashboard/admin/events/$eventId"
                    params={{ eventId: ev.id }}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#0D0D12] px-3 py-2 text-xs font-semibold text-white hover:bg-zinc-800"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Details
                  </Link>
                  <Link
                    to="/dashboard/admin/events/$eventId/edit"
                    params={{ eventId: ev.id }}
                    className="rounded-full border border-zinc-200 p-2 text-zinc-600 hover:bg-zinc-100"
                    aria-label="Edit event"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Link>
                  {ev.status === "draft" ? (
                    <button
                      type="button"
                      onClick={() => setConfirmAction({ type: "delete", event: ev })}
                      aria-label="Delete draft"
                      className="rounded-full border border-red-200 p-2 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    ev.status !== "cancelled" && (
                      <button
                        type="button"
                        onClick={() => setConfirmAction({ type: "cancel", event: ev })}
                        aria-label="Cancel event"
                        className="rounded-full border border-amber-200 p-2 text-amber-600 hover:bg-amber-50"
                      >
                        <Ban className="h-3.5 w-3.5" />
                      </button>
                    )
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
                <th className="px-5 py-3.5">Title</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Venue</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.map((ev) => (
                <tr key={ev.id} className="hover:bg-zinc-50">
                  <td className="px-5 py-3.5 font-bold">{ev.title}</td>
                  <td className="px-5 py-3.5 text-zinc-600">{ev.category}</td>
                  <td className="px-5 py-3.5 text-zinc-600">
                    {new Date(ev.start_date).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3.5 text-zinc-600">{ev.venue}</td>
                  <td className="px-5 py-3.5 capitalize">{ev.status}</td>
                  <td className="px-5 py-3.5 text-right">
                    <Link
                      to="/dashboard/admin/events/$eventId"
                      params={{ eventId: ev.id }}
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

      {/* Confirmation Dialog */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold">
              {confirmAction.type === "delete" ? "Delete Draft Event?" : "Cancel Event?"}
            </h3>
            <p className="mt-2 text-sm text-zinc-600">
              {confirmAction.type === "delete"
                ? `Are you sure you want to permanently delete "${confirmAction.event.title}"?`
                : `Are you sure you want to mark "${confirmAction.event.title}" as cancelled?`}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold"
              >
                Keep
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                {confirmAction.type === "delete" ? "Delete Draft" : "Confirm Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
