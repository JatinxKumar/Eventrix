import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users, Copy, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../../../lib/AuthProvider";
import { getSupabaseClient } from "../../../../lib/supabaseClient";

export const Route = createFileRoute("/dashboard/participant/teams/")({
  component: MyTeamsPage,
});

interface MyTeamRow {
  team_id: string;
  teams: {
    id: string;
    name: string;
    status: string;
    invite_code: string | null;
    leader_id: string;
    events: {
      title: string;
      min_team_size: number;
      max_team_size: number;
    } | null;
  } | null;
}

function MyTeamsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<MyTeamRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data } = await getSupabaseClient()
        .from("team_members")
        .select(
          "team_id, teams(id, name, status, invite_code, leader_id, events(title, min_team_size, max_team_size))",
        )
        .eq("user_id", user.id);

      setRows((data as unknown as MyTeamRow[]) ?? []);
      setLoading(false);
    };
    load();
  }, [user]);

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    toast.success("Invite code copied!");
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">My Teams</h1>
        <p className="mt-1 text-sm text-zinc-600">Manage your draft and confirmed event teams.</p>
      </div>

      {loading ? (
        <div className="h-48 animate-pulse rounded-3xl bg-zinc-200" />
      ) : rows.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <Users className="mx-auto h-10 w-10 text-[#7C3AED]" />
          <p className="mt-3 font-bold">You are not in any teams yet</p>
          <Link
            to="/events"
            className="mt-2 inline-block text-sm font-bold text-[#7C3AED] underline"
          >
            Browse Team Events
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {rows.map(({ teams: t }) => {
            if (!t) return null;
            const isLeader = t.leader_id === user?.id;
            return (
              <div key={t.id} className="rounded-3xl border border-[#14141B]/10 bg-white p-6">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-[#7C3AED]/10 px-3 py-1 text-xs font-bold text-[#7C3AED]">
                    {isLeader ? "Team Leader" : "Member"}
                  </span>
                  <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-bold capitalize">
                    {t.status}
                  </span>
                </div>
                <h2 className="mt-3 text-xl font-bold">{t.name}</h2>
                <p className="mt-1 text-xs text-zinc-500">{t.events?.title}</p>

                {isLeader && t.invite_code && t.status === "draft" && (
                  <div className="mt-4 flex items-center justify-between rounded-xl bg-[#FAF8F4] px-3 py-2 text-xs">
                    <span className="font-mono font-bold">{t.invite_code}</span>
                    <button
                      type="button"
                      onClick={() => copyCode(t.invite_code!)}
                      className="inline-flex items-center gap-1 font-bold text-[#7C3AED]"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy Code
                    </button>
                  </div>
                )}

                <div className="mt-5 border-t border-zinc-100 pt-4">
                  <Link
                    to="/dashboard/participant/teams/$teamId"
                    params={{ teamId: t.id }}
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-[#7C3AED] hover:underline"
                  >
                    Manage Team
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
