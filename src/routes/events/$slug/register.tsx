import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Users, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../../lib/AuthProvider";
import { getSupabaseClient } from "../../../lib/supabaseClient";

export const Route = createFileRoute("/events/$slug/register")({
  component: EventRegisterPage,
});

interface EventForReg {
  id: string;
  title: string;
  category: string;
  venue: string;
  start_date: string;
  registration_deadline: string;
  capacity: number;
  registration_type: "individual" | "team";
  min_team_size: number;
  max_team_size: number;
  status: string;
  slug: string;
  rules: string | null;
}

function EventRegisterPage() {
  const { slug } = Route.useParams();
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [event, setEvent] = useState<EventForReg | null>(null);
  const [loading, setLoading] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [teamMode, setTeamMode] = useState<"create" | "join">("create");
  const [teamName, setTeamName] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.navigate({ to: "/login", search: { redirect: `/events/${slug}/register` } });
    }
  }, [authLoading, user, slug, router]);

  useEffect(() => {
    const load = async () => {
      const { data } = await getSupabaseClient()
        .from("events")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      setEvent((data as EventForReg) ?? null);
      setLoading(false);
    };
    load();
  }, [slug]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF8F4] text-sm text-zinc-500">
        Loading registration...
      </div>
    );
  }

  if (!user || !profile) return null;

  if (!event) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAF8F4] p-6 text-center">
        <h1 className="text-2xl font-bold">Registration Unavailable</h1>
        <Link to="/events" className="mt-4 text-sm font-bold text-[#7C3AED] underline">
          Back to Events
        </Link>
      </div>
    );
  }

  const handleIndividualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      toast.error("Please accept the event rules to continue.");
      return;
    }
    setSubmitting(true);
    const { data, error } = await getSupabaseClient().rpc("register_individual_for_event", {
      p_event_id: event.id,
    });
    if (error) {
      toast.error(error.message);
      setSubmitting(false);
      return;
    }
    toast.success("Registration confirmed!");
    router.navigate({
      to: "/dashboard/participant/registrations/$registrationId",
      params: { registrationId: data as string },
    });
  };

  const handleTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const supabase = getSupabaseClient();
    if (teamMode === "create") {
      const { data, error } = await supabase.rpc("create_event_team", {
        p_event_id: event.id,
        p_team_name: teamName,
      });
      if (error) {
        toast.error(error.message);
        setSubmitting(false);
        return;
      }
      toast.success("Team created! Invite members and submit final registration.");
      router.navigate({
        to: "/dashboard/participant/teams/$teamId",
        params: { teamId: data as string },
      });
    } else {
      const { data, error } = await supabase.rpc("join_event_team", {
        p_event_id: event.id,
        p_invite_code: inviteCode,
      });
      if (error) {
        toast.error(error.message);
        setSubmitting(false);
        return;
      }
      toast.success("Joined team successfully!");
      router.navigate({
        to: "/dashboard/participant/teams/$teamId",
        params: { teamId: data as string },
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F4] px-6 py-12 text-[#14141B]">
      <div className="mx-auto max-w-2xl space-y-6">
        <Link
          to="/events/$slug"
          params={{ slug }}
          className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 hover:text-[#14141B]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {event.title}
        </Link>

        <div className="rounded-3xl border border-[#14141B]/10 bg-white p-8">
          <span className="rounded-full bg-[#7C3AED]/10 px-3 py-1 text-xs font-bold text-[#7C3AED] capitalize">
            {event.registration_type} Registration
          </span>
          <h1 className="mt-3 text-2xl font-extrabold">{event.title}</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Registering as <strong>{profile.full_name || user.email}</strong>
          </p>

          {event.rules && (
            <div className="mt-6 rounded-2xl bg-[#FAF8F4] p-4 text-xs leading-relaxed text-zinc-700">
              <p className="font-bold uppercase tracking-wider text-zinc-500">Event Rules</p>
              <p className="mt-1 whitespace-pre-line">{event.rules}</p>
            </div>
          )}

          {event.registration_type === "individual" ? (
            <form onSubmit={handleIndividualSubmit} className="mt-6 space-y-5">
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-[#7C3AED]"
                />
                <span>I confirm my eligibility and agree to follow the event rules.</span>
              </label>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#7C3AED] px-6 py-3.5 text-sm font-bold text-white hover:bg-[#6D28D9] disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                {submitting ? "Confirming..." : "Confirm Registration"}
              </button>
            </form>
          ) : (
            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTeamMode("create")}
                  className={`flex items-center justify-center gap-2 rounded-2xl border p-3.5 text-sm font-bold ${
                    teamMode === "create"
                      ? "border-[#7C3AED] bg-[#7C3AED] text-white"
                      : "border-zinc-200 bg-white"
                  }`}
                >
                  <Users className="h-4 w-4" />
                  Create a Team
                </button>
                <button
                  type="button"
                  onClick={() => setTeamMode("join")}
                  className={`flex items-center justify-center gap-2 rounded-2xl border p-3.5 text-sm font-bold ${
                    teamMode === "join"
                      ? "border-[#7C3AED] bg-[#7C3AED] text-white"
                      : "border-zinc-200 bg-white"
                  }`}
                >
                  <UserPlus className="h-4 w-4" />
                  Join a Team
                </button>
              </div>

              <form onSubmit={handleTeamSubmit} className="space-y-4">
                {teamMode === "create" ? (
                  <div>
                    <label className="block text-sm font-semibold">Team Name</label>
                    <input
                      type="text"
                      required
                      minLength={2}
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="e.g. ByteBuilders"
                      className="mt-1.5 w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm"
                    />
                    <p className="mt-1 text-xs text-zinc-500">
                      Required team size: {event.min_team_size}–{event.max_team_size} members.
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-semibold">Team Invite Code</label>
                    <input
                      type="text"
                      required
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      placeholder="Enter 8-character invite code"
                      className="mt-1.5 w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm uppercase"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-full bg-[#7C3AED] px-6 py-3.5 text-sm font-bold text-white hover:bg-[#6D28D9] disabled:opacity-50"
                >
                  {submitting
                    ? "Processing..."
                    : teamMode === "create"
                      ? "Create Team"
                      : "Join Team"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
