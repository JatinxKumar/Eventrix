import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Ticket, ExternalLink, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../../../lib/AuthProvider";
import { getSupabaseClient } from "../../../../lib/supabaseClient";

export const Route = createFileRoute("/dashboard/participant/registrations/")({
  component: MyRegistrationsPage,
});

interface MyReg {
  id: string;
  status: string;
  registration_ref: string | null;
  team_id: string | null;
  events: {
    id: string;
    title: string;
    cover_image: string | null;
    start_date: string;
    registration_deadline: string;
    venue: string;
    registration_type: string;
    status: string;
    slug: string | null;
  } | null;
}

function MyRegistrationsPage() {
  const { user } = useAuth();
  const [regs, setRegs] = useState<MyReg[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadRegs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await getSupabaseClient()
      .from("registrations")
      .select(
        "id, status, registration_ref, team_id, events(id, title, cover_image, start_date, registration_deadline, venue, registration_type, status, slug)",
      )
      .eq("participant_id", user.id)
      .order("registered_at", { ascending: false });

    if (error) toast.error(error.message);
    else setRegs((data as unknown as MyReg[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadRegs();
  }, [loadRegs]);

  const filtered = useMemo(() => {
    return regs.filter((r) => {
      const matchTitle = (r.events?.title ?? "").toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || r.status === statusFilter;
      return matchTitle && matchStatus;
    });
  }, [regs, search, statusFilter]);

  const handleCancel = async (regId: string) => {
    const { error } = await getSupabaseClient().rpc("cancel_individual_registration", {
      p_registration_id: regId,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Registration cancelled.");
      loadRegs();
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">My Registrations</h1>
        <p className="mt-1 text-sm text-zinc-600">
          View your confirmed event passes and manage upcoming registrations.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 rounded-2xl border border-[#14141B]/10 bg-white p-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by event title..."
            className="w-full rounded-xl border border-zinc-200 bg-[#FAF8F4] py-2 pl-9 pr-3 text-sm outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-zinc-200 bg-[#FAF8F4] px-3 py-2 text-sm outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <div className="h-48 animate-pulse rounded-3xl bg-zinc-200" />
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <p className="font-bold">No registrations found</p>
          <Link
            to="/dashboard/participant/events"
            className="mt-2 inline-block text-sm font-bold text-[#7C3AED] underline"
          >
            Explore Events
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {filtered.map((r) => {
            const canCancel =
              r.status === "confirmed" &&
              !r.team_id &&
              r.events?.status === "published" &&
              new Date(r.events.registration_deadline) > new Date();

            return (
              <div
                key={r.id}
                className="flex flex-col overflow-hidden rounded-3xl border border-[#14141B]/10 bg-white"
              >
                {r.events?.cover_image && (
                  <img
                    src={r.events.cover_image}
                    alt={r.events.title}
                    className="h-36 w-full object-cover"
                  />
                )}
                <div className="flex flex-1 flex-col p-6">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-[#7C3AED]">
                      {r.registration_ref ?? "PENDING"}
                    </span>
                    <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 font-bold capitalize">
                      {r.status}
                    </span>
                  </div>
                  <h2 className="mt-2 text-lg font-bold">{r.events?.title}</h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    {r.events?.venue} •{" "}
                    {r.events ? new Date(r.events.start_date).toLocaleDateString() : ""}
                  </p>
                  <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-4">
                    <Link
                      to="/dashboard/participant/registrations/$registrationId"
                      params={{ registrationId: r.id }}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#7C3AED] px-4 py-2 text-xs font-bold text-white hover:bg-[#6D28D9]"
                    >
                      <Ticket className="h-3.5 w-3.5" />
                      Digital Pass
                    </Link>
                    {r.events?.slug && (
                      <Link
                        to="/events/$slug"
                        params={{ slug: r.events.slug }}
                        className="inline-flex items-center gap-1 rounded-full border border-zinc-200 px-3.5 py-2 text-xs font-bold"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Event
                      </Link>
                    )}
                    {canCancel && (
                      <button
                        type="button"
                        onClick={() => handleCancel(r.id)}
                        className="ml-auto inline-flex items-center gap-1 rounded-full border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
