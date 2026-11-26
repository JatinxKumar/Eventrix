import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Pencil,
  Users,
  UserPlus,
  Trash2,
  Search,
  Crown,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../../../../lib/AuthProvider";
import { getSupabaseClient } from "../../../../../lib/supabaseClient";

export const Route = createFileRoute("/dashboard/admin/events/$eventId/")({
  component: AdminEventDetailsPage,
});

interface EventDetail {
  id: string;
  title: string;
  short_description: string | null;
  description: string | null;
  category: string;
  venue: string;
  cover_image: string | null;
  start_date: string;
  end_date: string;
  registration_deadline: string;
  capacity: number;
  registration_type: string;
  min_team_size: number;
  max_team_size: number;
  status: string;
  slug: string | null;
  rules: string | null;
}

interface StaffMember {
  id: string;
  user_id: string;
  staff_role: "lead_organizer" | "organizer" | "judge";
  assigned_at: string;
  profiles: { full_name: string | null; email: string | null } | null;
}

interface OrganizerOption {
  id: string;
  full_name: string | null;
  email: string | null;
}

const lifecycleOrder = ["draft", "published", "ongoing", "completed"];

function AdminEventDetailsPage() {
  const { eventId } = Route.useParams();
  const { user } = useAuth();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [organizers, setOrganizers] = useState<OrganizerOption[]>([]);
  const [regCount, setRegCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [orgSearch, setOrgSearch] = useState("");
  const [selectedOrgIds, setSelectedOrgIds] = useState<string[]>([]);
  const [assignRole, setAssignRole] = useState<"lead_organizer" | "organizer">("organizer");
  const [assigning, setAssigning] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseClient();
    const [evRes, staffRes, orgRes, regRes] = await Promise.all([
      supabase.from("events").select("*").eq("id", eventId).single(),
      supabase
        .from("event_staff")
        .select("id, user_id, staff_role, assigned_at, profiles(full_name, email)")
        .eq("event_id", eventId),
      supabase.from("profiles").select("id, full_name, email").eq("role", "organizer"),
      supabase
        .from("registrations")
        .select("id", { count: "exact", head: true })
        .eq("event_id", eventId),
    ]);

    if (evRes.error) {
      toast.error(evRes.error.message);
    } else {
      setEvent(evRes.data as EventDetail);
    }
    setStaff((staffRes.data as unknown as StaffMember[]) ?? []);
    setOrganizers(orgRes.data ?? []);
    setRegCount(regRes.count ?? 0);
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const assignedUserIds = useMemo(() => new Set(staff.map((s) => s.user_id)), [staff]);

  const availableOrganizers = useMemo(() => {
    return organizers.filter(
      (o) =>
        !assignedUserIds.has(o.id) &&
        ((o.full_name ?? "").toLowerCase().includes(orgSearch.toLowerCase()) ||
          (o.email ?? "").toLowerCase().includes(orgSearch.toLowerCase())),
    );
  }, [organizers, assignedUserIds, orgSearch]);

  const toggleSelectOrg = (id: string) => {
    setSelectedOrgIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleAssignSelected = async () => {
    if (!user || selectedOrgIds.length === 0) return;
    setAssigning(true);
    const rows = selectedOrgIds.map((uid, idx) => ({
      event_id: eventId,
      user_id: uid,
      staff_role: assignRole === "lead_organizer" && idx === 0 ? "lead_organizer" : "organizer",
      assigned_by: user.id,
    }));

    const { error } = await getSupabaseClient().from("event_staff").insert(rows);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Assigned ${rows.length} organizer(s) to this event.`);
      setSelectedOrgIds([]);
      loadData();
    }
    setAssigning(false);
  };

  const handleRemoveStaff = async (staffId: string) => {
    const { error } = await getSupabaseClient().from("event_staff").delete().eq("id", staffId);
    if (error) toast.error(error.message);
    else {
      toast.success("Organizer removed from event.");
      loadData();
    }
  };

  const handleMakeLead = async (staffId: string) => {
    const { error } = await getSupabaseClient()
      .from("event_staff")
      .update({ staff_role: "lead_organizer" })
      .eq("id", staffId);
    if (error) toast.error(error.message);
    else {
      toast.success("Updated to Lead Organizer.");
      loadData();
    }
  };

  if (loading) {
    return <div className="h-64 animate-pulse rounded-3xl bg-zinc-200" />;
  }

  if (!event) {
    return (
      <div className="rounded-3xl bg-white p-8 text-center">
        <p className="font-bold">Event not found.</p>
      </div>
    );
  }

  const currentStageIdx = lifecycleOrder.indexOf(event.status);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          to="/dashboard/admin/events"
          className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 hover:text-[#14141B]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Events
        </Link>
        <Link
          to="/dashboard/admin/events/$eventId/edit"
          params={{ eventId: event.id }}
          className="inline-flex items-center gap-2 rounded-full bg-[#0D0D12] px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
        >
          <Pencil className="h-4 w-4" />
          Edit Event
        </Link>
      </div>

      {/* Overview Card */}
      <div className="overflow-hidden rounded-3xl border border-[#14141B]/10 bg-white">
        {event.cover_image && (
          <img src={event.cover_image} alt={event.title} className="h-60 w-full object-cover" />
        )}
        <div className="p-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-[#7C3AED]/10 px-3 py-1 text-xs font-bold text-[#7C3AED]">
              {event.category}
            </span>
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold capitalize text-zinc-700">
              {event.status}
            </span>
            {event.slug && (
              <span className="text-xs text-zinc-500">Slug: /events/{event.slug}</span>
            )}
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight">{event.title}</h1>
          {event.short_description && (
            <p className="mt-2 text-base font-medium text-zinc-700">{event.short_description}</p>
          )}
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">{event.description}</p>

          <div className="mt-6 grid gap-4 border-t border-zinc-100 pt-6 sm:grid-cols-4">
            <div>
              <p className="text-xs font-semibold text-zinc-400">Venue</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-bold">
                <MapPin className="h-4 w-4 text-[#7C3AED]" />
                {event.venue}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-400">Start Date</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-bold">
                <Calendar className="h-4 w-4 text-[#7C3AED]" />
                {new Date(event.start_date).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-400">Registration</p>
              <p className="mt-1 text-sm font-bold capitalize">
                {event.registration_type} (Cap: {event.capacity})
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-400">Registrations</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-bold">
                <Users className="h-4 w-4 text-emerald-600" />
                {regCount}
              </p>
            </div>
          </div>

          {/* Lifecycle Progress */}
          <div className="mt-6 border-t border-zinc-100 pt-6">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Event Lifecycle Progress
            </p>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {lifecycleOrder.map((stage, idx) => {
                const done = currentStageIdx >= idx;
                return (
                  <div key={stage} className="space-y-1.5">
                    <div className={`h-2 rounded-full ${done ? "bg-[#7C3AED]" : "bg-zinc-200"}`} />
                    <p className="text-xs font-semibold capitalize text-zinc-600">{stage}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Assign Organizing Team */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="rounded-3xl border border-[#14141B]/10 bg-white p-6 lg:col-span-6">
          <h2 className="text-lg font-bold">Assigned Organizing Team ({staff.length})</h2>
          {staff.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">
              No organizers assigned yet. Assign at least one organizer from the right panel.
            </p>
          ) : (
            <div className="mt-4 divide-y divide-zinc-100">
              {staff.map((member) => (
                <div key={member.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-bold">
                      {member.profiles?.full_name || member.profiles?.email || "Organizer"}
                    </p>
                    <p className="text-xs text-zinc-500">{member.profiles?.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-[#7C3AED]/10 px-2.5 py-0.5 text-xs font-bold capitalize text-[#7C3AED]">
                      {member.staff_role.replace("_", " ")}
                    </span>
                    {member.staff_role !== "lead_organizer" && (
                      <button
                        type="button"
                        onClick={() => handleMakeLead(member.id)}
                        title="Make Lead Organizer"
                        className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-50"
                      >
                        <Crown className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveStaff(member.id)}
                      title="Remove assignment"
                      className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-[#14141B]/10 bg-white p-6 lg:col-span-6">
          <h2 className="text-lg font-bold">Assign Organizers</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Only users with the organizer role can be assigned to manage this event.
          </p>

          <div className="mt-4 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={orgSearch}
                onChange={(e) => setOrgSearch(e.target.value)}
                placeholder="Search organizers..."
                className="w-full rounded-xl border border-zinc-200 bg-[#FAF8F4] py-2 pl-9 pr-3 text-sm outline-none"
              />
            </div>
            <select
              value={assignRole}
              onChange={(e) => setAssignRole(e.target.value as "lead_organizer" | "organizer")}
              className="rounded-xl border border-zinc-200 bg-[#FAF8F4] px-3 py-2 text-sm outline-none"
            >
              <option value="organizer">Organizer</option>
              <option value="lead_organizer">Lead Organizer</option>
            </select>
          </div>

          <div className="mt-4 max-h-52 space-y-2 overflow-y-auto">
            {availableOrganizers.length === 0 ? (
              <p className="text-xs text-zinc-500">No unassigned organizers match your search.</p>
            ) : (
              availableOrganizers.map((org) => {
                const checked = selectedOrgIds.includes(org.id);
                return (
                  <label
                    key={org.id}
                    className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 text-sm ${
                      checked ? "border-[#7C3AED] bg-[#7C3AED]/5" : "border-zinc-200"
                    }`}
                  >
                    <div>
                      <p className="font-bold">{org.full_name || "Unnamed Organizer"}</p>
                      <p className="text-xs text-zinc-500">{org.email}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSelectOrg(org.id)}
                      className="h-4 w-4 accent-[#7C3AED]"
                    />
                  </label>
                );
              })
            )}
          </div>

          <button
            type="button"
            disabled={selectedOrgIds.length === 0 || assigning}
            onClick={handleAssignSelected}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#7C3AED] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#6D28D9] disabled:opacity-50"
          >
            <UserPlus className="h-4 w-4" />
            {assigning ? "Assigning..." : `Assign Selected (${selectedOrgIds.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}
