import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Calendar, MapPin, CheckCircle2, ArrowLeft } from "lucide-react";
import { useAuth } from "../../../../lib/AuthProvider";
import { getSupabaseClient } from "../../../../lib/supabaseClient";

export const Route = createFileRoute("/dashboard/participant/registrations/$registrationId")({
  component: DigitalEventPassPage,
});

interface PassData {
  id: string;
  status: string;
  registration_ref: string | null;
  attendance_token: string | null;
  events: {
    title: string;
    cover_image: string | null;
    start_date: string;
    venue: string;
    slug: string | null;
  } | null;
  teams: { name: string } | null;
}

function DigitalEventPassPage() {
  const { registrationId } = Route.useParams();
  const { user, profile } = useAuth();
  const [pass, setPass] = useState<PassData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data } = await getSupabaseClient()
        .from("registrations")
        .select(
          "id, status, registration_ref, attendance_token, events(title, cover_image, start_date, venue, slug), teams(name)",
        )
        .eq("id", registrationId)
        .eq("participant_id", user.id)
        .maybeSingle();

      setPass((data as unknown as PassData) ?? null);
      setLoading(false);
    };
    load();
  }, [registrationId, user]);

  if (loading) return <div className="h-64 animate-pulse rounded-3xl bg-zinc-200" />;
  if (!pass) return <p className="text-sm text-zinc-500">Registration pass not found.</p>;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center justify-between">
        <Link
          to="/dashboard/participant/registrations"
          className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 hover:text-[#14141B]"
        >
          <ArrowLeft className="h-4 w-4" />
          My Registrations
        </Link>
        {pass.events?.slug && (
          <Link
            to="/events/$slug"
            params={{ slug: pass.events.slug }}
            className="text-sm font-bold text-[#7C3AED] hover:underline"
          >
            Back to Event
          </Link>
        )}
      </div>

      {/* Confirmation Banner */}
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
        <div>
          <p className="text-sm font-bold">Registration {pass.status}</p>
          <p className="text-xs">Present this digital pass at the venue for check-in.</p>
        </div>
      </div>

      {/* Digital Event Pass */}
      <div className="overflow-hidden rounded-3xl bg-[#0D0D12] text-white shadow-2xl">
        {pass.events?.cover_image && (
          <img
            src={pass.events.cover_image}
            alt={pass.events.title}
            className="h-44 w-full object-cover opacity-80"
          />
        )}
        <div className="p-8 space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black tracking-widest text-[#FACC15]">EVENTRIX PASS</span>
            <span className="rounded-full bg-[#7C3AED] px-3 py-1 font-mono text-xs font-bold">
              {pass.registration_ref ?? "CONFIRMED"}
            </span>
          </div>

          <div>
            <h1 className="text-2xl font-extrabold">{pass.events?.title}</h1>
            <p className="mt-1 text-sm text-zinc-300">
              Participant: <strong>{profile?.full_name || user?.email}</strong>
            </p>
            {pass.teams?.name && (
              <p className="mt-1 text-xs font-semibold text-[#38BDF8]">Team: {pass.teams.name}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 border-y border-white/10 py-4 text-xs">
            <div>
              <p className="text-zinc-400">Date</p>
              <p className="mt-1 flex items-center gap-1.5 font-semibold">
                <Calendar className="h-3.5 w-3.5 text-[#A78BFA]" />
                {pass.events ? new Date(pass.events.start_date).toLocaleDateString() : ""}
              </p>
            </div>
            <div>
              <p className="text-zinc-400">Venue</p>
              <p className="mt-1 flex items-center gap-1.5 font-semibold">
                <MapPin className="h-3.5 w-3.5 text-[#A78BFA]" />
                {pass.events?.venue}
              </p>
            </div>
          </div>

          {pass.attendance_token && (
            <div className="flex flex-col items-center gap-3 pt-2">
              <div className="rounded-2xl bg-white p-3">
                <QRCodeSVG value={pass.attendance_token} size={140} level="M" />
              </div>
              <p className="text-[11px] text-zinc-400">
                Opaque check-in token • Do not share publicly
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
