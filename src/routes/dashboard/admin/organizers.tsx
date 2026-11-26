import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Search, UserPlus, Shield } from "lucide-react";
import { toast } from "sonner";
import { getSupabaseClient, isSupabaseConfigured } from "../../../lib/supabaseClient";

export const Route = createFileRoute("/dashboard/admin/organizers")({
  component: AdminOrganizersPage,
});

interface OrganizerProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  assignmentCount: number;
}

interface ParticipantProfile {
  id: string;
  full_name: string | null;
  email: string | null;
}

function AdminOrganizersPage() {
  const [organizers, setOrganizers] = useState<OrganizerProfile[]>([]);
  const [participants, setParticipants] = useState<ParticipantProfile[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirmPromote, setConfirmPromote] = useState<ParticipantProfile | null>(null);

  const loadOrganizers = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const supabase = getSupabaseClient();
    const [orgRes, staffRes, partRes] = await Promise.all([
      supabase.from("profiles").select("id, full_name, email").eq("role", "organizer"),
      supabase.from("event_staff").select("user_id"),
      supabase.from("profiles").select("id, full_name, email").eq("role", "participant"),
    ]);

    const counts = new Map<string, number>();
    (staffRes.data ?? []).forEach((row) => {
      counts.set(row.user_id, (counts.get(row.user_id) ?? 0) + 1);
    });

    setOrganizers(
      (orgRes.data ?? []).map((o) => ({
        ...o,
        assignmentCount: counts.get(o.id) ?? 0,
      })),
    );
    setParticipants(partRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadOrganizers();
  }, [loadOrganizers]);

  const filteredParticipants = participants.filter(
    (p) =>
      search.trim().length > 0 &&
      ((p.full_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (p.email ?? "").toLowerCase().includes(search.toLowerCase())),
  );

  const handlePromote = async () => {
    if (!confirmPromote) return;
    const { error } = await getSupabaseClient().rpc("promote_participant_to_organizer", {
      p_user_id: confirmPromote.id,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`${confirmPromote.full_name || confirmPromote.email} is now an Organizer.`);
      setSearch("");
      loadOrganizers();
    }
    setConfirmPromote(null);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Organizing Teams</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Manage authorized organizers and promote participant accounts via verified admin RPC.
        </p>
      </div>

      {/* Promote Participant */}
      <div className="rounded-3xl border border-[#14141B]/10 bg-white p-6">
        <div className="flex items-center gap-2 text-sm font-bold text-[#7C3AED]">
          <Shield className="h-4 w-4" />
          <span>Promote Participant to Organizer</span>
        </div>
        <div className="relative mt-3 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search participant by name or email..."
            className="w-full rounded-xl border border-zinc-200 bg-[#FAF8F4] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#7C3AED]"
          />
        </div>
        {filteredParticipants.length > 0 && (
          <div className="mt-3 divide-y divide-zinc-100 rounded-2xl border border-zinc-200">
            {filteredParticipants.slice(0, 5).map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3">
                <div>
                  <p className="text-sm font-bold">{p.full_name || "Participant"}</p>
                  <p className="text-xs text-zinc-500">{p.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmPromote(p)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#7C3AED] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#6D28D9]"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Promote
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Organizers Table */}
      <div className="overflow-hidden rounded-3xl border border-[#14141B]/10 bg-white">
        <div className="border-b border-zinc-100 px-6 py-4">
          <h2 className="text-lg font-bold">Authorized Organizers ({organizers.length})</h2>
        </div>
        {loading ? (
          <div className="p-6 text-sm text-zinc-500">Loading organizers...</div>
        ) : organizers.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-500">
            No organizers found yet. Promote a participant above to get started.
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-100 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Active Assignments</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {organizers.map((org) => (
                <tr key={org.id}>
                  <td className="px-6 py-3.5 font-bold">{org.full_name || "Organizer"}</td>
                  <td className="px-6 py-3.5 text-zinc-600">{org.email}</td>
                  <td className="px-6 py-3.5 font-semibold text-[#7C3AED]">
                    {org.assignmentCount} event(s)
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {confirmPromote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold">Promote to Organizer?</h3>
            <p className="mt-2 text-sm text-zinc-600">
              Grant organizer permissions to{" "}
              <span className="font-semibold">
                {confirmPromote.full_name || confirmPromote.email}
              </span>
              ?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmPromote(null)}
                className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePromote}
                className="rounded-full bg-[#7C3AED] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6D28D9]"
              >
                Confirm Promote
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
