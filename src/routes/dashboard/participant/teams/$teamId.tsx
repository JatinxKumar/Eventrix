import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Copy, CheckCircle2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../../../lib/AuthProvider";
import { getSupabaseClient } from "../../../../lib/supabaseClient";

export const Route = createFileRoute("/dashboard/participant/teams/$teamId")({
  component: TeamDetailPage,
});

interface TeamDetail {
  id: string;
  name: string;
  status: string;
  invite_code: string | null;
  leader_id: string;
  events: {
    id: string;
    title: string;
    min_team_size: number;
    max_team_size: number;
  } | null;
}

interface MemberRow {
  id: string;
  user_id: string;
  profiles: { full_name: string | null; email: string | null } | null;
}

function TeamDetailPage() {
  const { teamId } = Route.useParams();
  const { user } = useAuth();
  const router = useRouter();
  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [finalizing, setFinalizing] = useState(false);

  const loadTeam = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseClient();
    const [tRes, mRes] = await Promise.all([
      supabase
        .from("teams")
        .select(
          "id, name, status, invite_code, leader_id, events(id, title, min_team_size, max_team_size)",
        )
        .eq("id", teamId)
        .maybeSingle(),
      supabase
        .from("team_members")
        .select("id, user_id, profiles(full_name, email)")
        .eq("team_id", teamId),
    ]);
    setTeam((tRes.data as unknown as TeamDetail) ?? null);
    setMembers((mRes.data as unknown as MemberRow[]) ?? []);
    setLoading(false);
  }, [teamId]);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  const handleFinalize = async () => {
    setFinalizing(true);
    const { error } = await getSupabaseClient().rpc("finalize_team_registration", {
      p_team_id: teamId,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Team registration confirmed for all members!");
      loadTeam();
    }
    setFinalizing(false);
  };

  const handleRemoveMember = async (memberRowId: string, isSelf: boolean) => {
    const { error } = await getSupabaseClient().from("team_members").delete().eq("id", memberRowId);
    if (error) toast.error(error.message);
    else {
      toast.success(isSelf ? "You left the team." : "Member removed.");
      if (isSelf) router.navigate({ to: "/dashboard/participant/teams" });
      else loadTeam();
    }
  };

  if (loading) return <div className="h-64 animate-pulse rounded-3xl bg-zinc-200" />;
  if (!team) return <p className="text-sm text-zinc-500">Team not found.</p>;

  const isLeader = team.leader_id === user?.id;
  const minSize = team.events?.min_team_size ?? 1;
  const maxSize = team.events?.max_team_size ?? 4;
  const canFinalize =
    isLeader && team.status === "draft" && members.length >= minSize && members.length <= maxSize;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        to="/dashboard/participant/teams"
        className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 hover:text-[#14141B]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to My Teams
      </Link>

      <div className="rounded-3xl border border-[#14141B]/10 bg-white p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold capitalize">
              {team.status}
            </span>
            <h1 className="mt-2 text-2xl font-extrabold">{team.name}</h1>
            <p className="text-sm text-zinc-500">{team.events?.title}</p>
          </div>

          {isLeader && team.invite_code && team.status === "draft" && (
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(team.invite_code!);
                toast.success("Invite code copied!");
              }}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-200 px-4 py-2 text-xs font-bold"
            >
              <Copy className="h-3.5 w-3.5 text-[#7C3AED]" />
              Code: {team.invite_code}
            </button>
          )}
        </div>

        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
            Team Members ({members.length} / {minSize}–{maxSize})
          </h2>
          <div className="mt-3 divide-y divide-zinc-100">
            {members.map((m) => {
              const isSelf = m.user_id === user?.id;
              const memberIsLeader = m.user_id === team.leader_id;
              return (
                <div key={m.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-bold">
                      {m.profiles?.full_name || m.profiles?.email || "Member"}
                      {memberIsLeader && (
                        <span className="ml-2 rounded-full bg-[#7C3AED]/10 px-2 py-0.5 text-[10px] font-bold text-[#7C3AED]">
                          Leader
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-zinc-500">{m.profiles?.email}</p>
                  </div>
                  {team.status === "draft" && !memberIsLeader && (isLeader || isSelf) && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(m.id, isSelf)}
                      className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                      title={isSelf ? "Leave team" : "Remove member"}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {isLeader && team.status === "draft" && (
          <button
            type="button"
            disabled={!canFinalize || finalizing}
            onClick={handleFinalize}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#7C3AED] px-6 py-3.5 text-sm font-bold text-white hover:bg-[#6D28D9] disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            {finalizing
              ? "Submitting..."
              : members.length < minSize
                ? `Need at least ${minSize} members to submit`
                : "Submit Final Team Registration"}
          </button>
        )}
      </div>
    </div>
  );
}
