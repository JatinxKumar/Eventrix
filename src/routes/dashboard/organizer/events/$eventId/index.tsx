import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Share2, Rocket, Users, Calendar, MapPin, Lock } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../../../../lib/AuthProvider";
import { getSupabaseClient } from "../../../../../lib/supabaseClient";
import { ShareEventDialog } from "../../../../../components/ShareEventDialog";

export const Route = createFileRoute("/dashboard/organizer/events/$eventId/")({
  component: OrganizerEventManagePage,
});

interface EventRecord {
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
  registration_type: "individual" | "team";
  min_team_size: number;
  max_team_size: number;
  status: string;
  slug: string | null;
  rules: string | null;
}

interface StaffMember {
  id: string;
  staff_role: string;
  profiles: { full_name: string | null; email: string | null } | null;
}

type TabKey =
  "overview" | "registration" | "team" | "participants" | "attendance" | "rounds" | "certificates";

function toLocalInput(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function OrganizerEventManagePage() {
  const { eventId } = Route.useParams();
  const { user } = useAuth();
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [staffRole, setStaffRole] = useState<string | null>(null);
  const [team, setTeam] = useState<StaffMember[]>([]);
  const [regCount, setRegCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [saving, setSaving] = useState(false);
  const [publishConfirm, setPublishConfirm] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  // Editable form state
  const [shortDesc, setShortDesc] = useState("");
  const [desc, setDesc] = useState("");
  const [rules, setRules] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [venue, setVenue] = useState("");
  const [regDeadline, setRegDeadline] = useState("");
  const [capacity, setCapacity] = useState(100);
  const [regType, setRegType] = useState<"individual" | "team">("individual");
  const [minTeam, setMinTeam] = useState(1);
  const [maxTeam, setMaxTeam] = useState(4);

  const loadEvent = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const supabase = getSupabaseClient();
    const [evRes, myStaffRes, teamRes, regRes] = await Promise.all([
      supabase.from("events").select("*").eq("id", eventId).single(),
      supabase
        .from("event_staff")
        .select("staff_role")
        .eq("event_id", eventId)
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("event_staff")
        .select("id, staff_role, profiles(full_name, email)")
        .eq("event_id", eventId),
      supabase
        .from("registrations")
        .select("id", { count: "exact", head: true })
        .eq("event_id", eventId),
    ]);

    if (evRes.error || !myStaffRes.data) {
      setEvent(null);
      setStaffRole(null);
    } else {
      const ev = evRes.data as EventRecord;
      setEvent(ev);
      setStaffRole(myStaffRes.data.staff_role);
      setShortDesc(ev.short_description ?? "");
      setDesc(ev.description ?? "");
      setRules(ev.rules ?? "");
      setCoverImage(ev.cover_image ?? "");
      setVenue(ev.venue);
      setRegDeadline(toLocalInput(ev.registration_deadline));
      setCapacity(ev.capacity);
      setRegType(ev.registration_type);
      setMinTeam(ev.min_team_size ?? 1);
      setMaxTeam(ev.max_team_size ?? 4);
    }
    setTeam((teamRes.data as unknown as StaffMember[]) ?? []);
    setRegCount(regRes.count ?? 0);
    setLoading(false);
  }, [eventId, user]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;
    setSaving(true);
    const payload: Record<string, unknown> = {
      short_description: shortDesc || null,
      description: desc || null,
      rules: rules || null,
      cover_image: coverImage || null,
      venue,
      capacity,
      registration_deadline: new Date(regDeadline).toISOString(),
    };
    if (regCount === 0) {
      payload["registration_type"] = regType;
      payload["min_team_size"] = regType === "team" ? minTeam : 1;
      payload["max_team_size"] = regType === "team" ? maxTeam : 1;
    }

    const { error } = await getSupabaseClient().from("events").update(payload).eq("id", event.id);

    if (error) toast.error(error.message);
    else {
      toast.success("Event settings saved.");
      loadEvent();
    }
    setSaving(false);
  };

  const handleTransition = async (targetStatus: string) => {
    if (!event) return;
    const { error } = await getSupabaseClient().rpc("transition_event_status", {
      p_event_id: event.id,
      p_new_status: targetStatus,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Event status updated to ${targetStatus}.`);
      loadEvent();
    }
    setPublishConfirm(null);
  };

  if (loading) return <div className="h-64 animate-pulse rounded-3xl bg-zinc-200" />;

  if (!event || !staffRole) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
        <p className="font-bold text-red-900">Access Restricted</p>
        <p className="mt-1 text-sm text-red-700">
          This event was not found or is not assigned to your organizer account.
        </p>
        <Link
          to="/dashboard/organizer/events"
          className="mt-4 inline-block text-sm font-bold text-red-800 underline"
        >
          Back to Assigned Events
        </Link>
      </div>
    );
  }

  const isLead = staffRole === "lead_organizer";
  const nextStatus =
    event.status === "draft"
      ? "published"
      : event.status === "published"
        ? "ongoing"
        : event.status === "ongoing"
          ? "completed"
          : null;

  const tabs: { id: TabKey; label: string; soon?: boolean }[] = [
    { id: "overview", label: "Overview" },
    { id: "registration", label: "Registration Settings" },
    { id: "team", label: "Organizing Team" },
    { id: "participants", label: "Participants", soon: true },
    { id: "attendance", label: "Attendance", soon: true },
    { id: "rounds", label: "Rounds & Results", soon: true },
    { id: "certificates", label: "Certificates", soon: true },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          to="/dashboard/organizer/events"
          className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 hover:text-[#14141B]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Assigned Events
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          {event.status === "published" && event.slug && (
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-[#14141B]/15 bg-white px-4 py-2 text-sm font-bold hover:bg-zinc-50"
            >
              <Share2 className="h-4 w-4 text-[#7C3AED]" />
              Share Event
            </button>
          )}

          {isLead && nextStatus && (
            <button
              type="button"
              onClick={() => setPublishConfirm(nextStatus)}
              className="inline-flex items-center gap-2 rounded-full bg-[#7C3AED] px-5 py-2 text-sm font-bold text-white hover:bg-[#6D28D9]"
            >
              <Rocket className="h-4 w-4" />
              {nextStatus === "published"
                ? "Publish Event"
                : nextStatus === "ongoing"
                  ? "Mark Ongoing"
                  : "Mark Completed"}
            </button>
          )}
        </div>
      </div>

      {/* Header */}
      <div className="rounded-3xl border border-[#14141B]/10 bg-white p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#7C3AED]/10 px-3 py-1 text-xs font-bold text-[#7C3AED]">
            {event.category}
          </span>
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold capitalize">
            {event.status}
          </span>
          <span className="rounded-full bg-[#FACC15]/25 px-3 py-1 text-xs font-bold">
            {isLead ? "Lead Organizer" : "Organizing Staff"}
          </span>
        </div>
        <h1 className="mt-3 text-2xl font-extrabold sm:text-3xl">{event.title}</h1>
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-zinc-500">
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {new Date(event.start_date).toLocaleString()}
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {event.venue}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {regCount} / {event.capacity} registered
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-colors ${
              activeTab === t.id
                ? "bg-[#0D0D12] text-white"
                : "bg-white text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            {t.label}
            {t.soon && (
              <span className="rounded-full bg-zinc-200/70 px-1.5 py-0.5 text-[10px] text-zinc-600">
                Soon
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <form
          onSubmit={handleSaveDetails}
          className="space-y-5 rounded-3xl border border-[#14141B]/10 bg-white p-6"
        >
          <h2 className="text-lg font-bold">Event Overview &amp; Content</h2>
          <div>
            <label className="block text-sm font-semibold">Short Description</label>
            <input
              type="text"
              value={shortDesc}
              onChange={(e) => setShortDesc(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold">Detailed Description</label>
            <textarea
              rows={4}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold">Venue</label>
              <input
                type="text"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold">Cover Image URL</label>
              <input
                type="url"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold">Rules &amp; Instructions</label>
            <textarea
              rows={3}
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-[#7C3AED] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#6D28D9] disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Overview"}
          </button>
        </form>
      )}

      {activeTab === "registration" && (
        <form
          onSubmit={handleSaveDetails}
          className="space-y-5 rounded-3xl border border-[#14141B]/10 bg-white p-6"
        >
          <h2 className="text-lg font-bold">Registration Settings</h2>
          {regCount > 0 && (
            <div className="flex items-center gap-2 rounded-2xl bg-amber-50 p-3 text-xs font-medium text-amber-900">
              <Lock className="h-4 w-4 text-amber-600" />
              Registration type and team size limits are locked because {regCount} registration(s)
              already exist.
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold">Registration Deadline</label>
              <input
                type="datetime-local"
                value={regDeadline}
                onChange={(e) => setRegDeadline(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold">Participant Capacity</label>
              <input
                type="number"
                min={Math.max(1, regCount)}
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="mt-1.5 w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold">Registration Type</label>
              <select
                disabled={regCount > 0}
                value={regType}
                onChange={(e) => setRegType(e.target.value as "individual" | "team")}
                className="mt-1.5 w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm disabled:opacity-60"
              >
                <option value="individual">Individual</option>
                <option value="team">Team</option>
              </select>
            </div>
            {regType === "team" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold">Min Team Size</label>
                  <input
                    type="number"
                    min={1}
                    disabled={regCount > 0}
                    value={minTeam}
                    onChange={(e) => setMinTeam(Number(e.target.value))}
                    className="mt-1.5 w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold">Max Team Size</label>
                  <input
                    type="number"
                    min={minTeam}
                    disabled={regCount > 0}
                    value={maxTeam}
                    onChange={(e) => setMaxTeam(Number(e.target.value))}
                    className="mt-1.5 w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm disabled:opacity-60"
                  />
                </div>
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-[#7C3AED] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#6D28D9] disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Registration Settings"}
          </button>
        </form>
      )}

      {activeTab === "team" && (
        <div className="rounded-3xl border border-[#14141B]/10 bg-white p-6">
          <h2 className="text-lg font-bold">Assigned Organizing Team</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Staff assignments are managed by administrators.
          </p>
          <div className="mt-4 divide-y divide-zinc-100">
            {team.map((m) => (
              <div key={m.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-bold">
                    {m.profiles?.full_name || m.profiles?.email || "Organizer"}
                  </p>
                  <p className="text-xs text-zinc-500">{m.profiles?.email}</p>
                </div>
                <span className="rounded-full bg-[#7C3AED]/10 px-3 py-1 text-xs font-bold capitalize text-[#7C3AED]">
                  {m.staff_role.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(activeTab === "participants" ||
        activeTab === "attendance" ||
        activeTab === "rounds" ||
        activeTab === "certificates") && (
        <div className="rounded-3xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <p className="text-base font-bold capitalize">{activeTab} Module Upcoming</p>
          <p className="mt-1 text-sm text-zinc-500">
            This module will be enabled in the next implementation phase.
          </p>
        </div>
      )}

      {publishConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold capitalize">
              Confirm: Move Event to {publishConfirm}?
            </h3>
            <p className="mt-2 text-sm text-zinc-600">
              {publishConfirm === "published"
                ? "Publishing makes this event visible on the public discovery page and enables its shareable registration link."
                : `This will transition "${event.title}" to ${publishConfirm}.`}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPublishConfirm(null)}
                className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleTransition(publishConfirm)}
                className="rounded-full bg-[#7C3AED] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6D28D9]"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {event.slug && (
        <ShareEventDialog
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          title={event.title}
          slug={event.slug}
          coverImage={event.cover_image}
        />
      )}
    </div>
  );
}
