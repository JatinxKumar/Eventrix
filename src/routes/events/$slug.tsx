import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Calendar, MapPin, Users, Share2, ArrowLeft, Clock } from "lucide-react";
import { toast } from "sonner";
import { CustomCursor } from "../../components/CustomCursor";
import { ShareEventDialog } from "../../components/ShareEventDialog";
import { useAuth } from "../../lib/AuthProvider";
import { getSupabaseClient, isSupabaseConfigured } from "../../lib/supabaseClient";

export const Route = createFileRoute("/events/$slug")({
  component: PublicEventDetailsPage,
});

interface PublicEventDetail {
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
  slug: string;
  rules: string | null;
}

function PublicEventDetailsPage() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const router = useRouter();
  const [event, setEvent] = useState<PublicEventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!isSupabaseConfigured) {
        setLoading(false);
        return;
      }
      const { data } = await getSupabaseClient()
        .from("events")
        .select(
          "id, title, short_description, description, category, venue, cover_image, start_date, end_date, registration_deadline, capacity, registration_type, min_team_size, max_team_size, status, slug, rules",
        )
        .eq("slug", slug)
        .in("status", ["published", "ongoing", "completed"])
        .maybeSingle();

      setEvent((data as PublicEventDetail) ?? null);
      setLoading(false);
    };
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0D0D12] text-sm text-zinc-400">
        Loading event...
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0D0D12] px-6 text-center text-white">
        <h1 className="text-3xl font-extrabold">Event Unavailable</h1>
        <p className="mt-2 max-w-md text-sm text-zinc-400">
          This event does not exist or has not been published yet.
        </p>
        <Link
          to="/events"
          className="mt-6 rounded-full bg-[#7C3AED] px-6 py-2.5 text-sm font-bold text-white"
        >
          Explore Other Events
        </Link>
      </div>
    );
  }

  const deadlinePassed = new Date(event.registration_deadline) <= new Date();
  const registrationClosed = deadlinePassed || event.status !== "published";

  const handleRegisterClick = () => {
    if (registrationClosed) return;
    if (!user) {
      router.navigate({
        to: "/login",
        search: { redirect: `/events/${event.slug}/register` },
      });
      return;
    }
    router.navigate({
      to: "/events/$slug/register",
      params: { slug: event.slug },
    });
  };

  return (
    <div className="min-h-screen bg-[#FAF8F4] text-[#14141B]">
      <CustomCursor />

      <header className="border-b border-[#14141B]/10 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link
            to="/events"
            className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 hover:text-[#14141B]"
          >
            <ArrowLeft className="h-4 w-4" />
            All Events
          </Link>
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-[#14141B]/15 px-4 py-2 text-xs font-bold hover:bg-zinc-50"
          >
            <Share2 className="h-3.5 w-3.5 text-[#7C3AED]" />
            Share Event
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12 space-y-8">
        {event.cover_image && (
          <img
            src={event.cover_image}
            alt={event.title}
            className="h-72 w-full rounded-3xl object-cover sm:h-96"
          />
        )}

        <div className="rounded-3xl border border-[#14141B]/10 bg-white p-8 sm:p-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#7C3AED]/10 px-3 py-1 text-xs font-bold text-[#7C3AED]">
              {event.category}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                registrationClosed ? "bg-zinc-100 text-zinc-600" : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {registrationClosed ? "Registration Closed" : "Registration Open"}
            </span>
          </div>

          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-5xl">{event.title}</h1>
          {event.short_description && (
            <p className="mt-3 text-lg text-zinc-700">{event.short_description}</p>
          )}

          <div className="mt-8 grid gap-4 border-y border-zinc-100 py-6 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs font-semibold text-zinc-400">Date &amp; Time</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-bold">
                <Calendar className="h-4 w-4 text-[#7C3AED]" />
                {new Date(event.start_date).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-400">Venue</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-bold">
                <MapPin className="h-4 w-4 text-[#7C3AED]" />
                {event.venue}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-400">Registration Type</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-bold capitalize">
                <Users className="h-4 w-4 text-[#7C3AED]" />
                {event.registration_type}
                {event.registration_type === "team" &&
                  ` (${event.min_team_size}–${event.max_team_size})`}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-400">Deadline</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-bold">
                <Clock className="h-4 w-4 text-[#7C3AED]" />
                {new Date(event.registration_deadline).toLocaleDateString()}
              </p>
            </div>
          </div>

          {event.description && (
            <div className="mt-8">
              <h2 className="text-lg font-bold">About this event</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-zinc-600">
                {event.description}
              </p>
            </div>
          )}

          {event.rules && (
            <div className="mt-8">
              <h2 className="text-lg font-bold">Rules &amp; Instructions</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-zinc-600">
                {event.rules}
              </p>
            </div>
          )}

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <button
              type="button"
              disabled={registrationClosed}
              onClick={handleRegisterClick}
              data-cursor="magnetic"
              className="rounded-full bg-[#7C3AED] px-8 py-3.5 text-sm font-bold text-white transition-colors hover:bg-[#6D28D9] disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-600"
            >
              {registrationClosed ? "Registration Closed" : "Register Now"}
            </button>
            {registrationClosed && (
              <p className="text-xs text-zinc-500">
                {deadlinePassed
                  ? "The registration deadline for this event has passed."
                  : "This event is no longer accepting new registrations."}
              </p>
            )}
          </div>
        </div>
      </main>

      <ShareEventDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title={event.title}
        slug={event.slug}
        coverImage={event.cover_image}
      />
    </div>
  );
}
