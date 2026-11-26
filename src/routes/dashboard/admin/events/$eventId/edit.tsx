import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { AdminEventForm, type EventFormValues } from "../../../../../components/AdminEventForm";
import { getSupabaseClient } from "../../../../../lib/supabaseClient";

export const Route = createFileRoute("/dashboard/admin/events/$eventId/edit")({
  component: EditEventPage,
});

function toLocalDatetimeInput(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 16);
}

function EditEventPage() {
  const { eventId } = Route.useParams();
  const router = useRouter();
  const [defaults, setDefaults] = useState<Partial<EventFormValues> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await getSupabaseClient()
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

      if (error) {
        toast.error(error.message);
      } else if (data) {
        setDefaults({
          title: data.title,
          short_description: data.short_description ?? "",
          description: data.description ?? "",
          category: data.category,
          cover_image: data.cover_image ?? "",
          venue: data.venue,
          start_date: toLocalDatetimeInput(data.start_date),
          end_date: toLocalDatetimeInput(data.end_date),
          registration_deadline: toLocalDatetimeInput(data.registration_deadline),
          capacity: data.capacity,
          registration_type: data.registration_type,
          min_team_size: data.min_team_size ?? 1,
          max_team_size: data.max_team_size ?? 4,
          rules: data.rules ?? "",
        });
      }
      setLoading(false);
    };
    load();
  }, [eventId]);

  const handleUpdate = async (values: EventFormValues) => {
    const { error } = await getSupabaseClient()
      .from("events")
      .update({
        title: values.title,
        short_description: values.short_description,
        description: values.description,
        category: values.category,
        cover_image: values.cover_image || null,
        venue: values.venue,
        start_date: new Date(values.start_date).toISOString(),
        end_date: new Date(values.end_date).toISOString(),
        registration_deadline: new Date(values.registration_deadline).toISOString(),
        capacity: values.capacity,
        registration_type: values.registration_type,
        min_team_size: values.registration_type === "team" ? values.min_team_size : 1,
        max_team_size: values.registration_type === "team" ? values.max_team_size : 1,
        rules: values.rules || null,
      })
      .eq("id", eventId);

    if (error) {
      toast.error(error.message);
      throw error;
    }

    toast.success("Event updated.");
    router.navigate({ to: "/dashboard/admin/events/$eventId", params: { eventId } });
  };

  if (loading) return <div className="h-64 animate-pulse rounded-3xl bg-zinc-200" />;
  if (!defaults) return <p className="text-sm text-zinc-500">Event not found.</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        to="/dashboard/admin/events/$eventId"
        params={{ eventId }}
        className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 hover:text-[#14141B]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Event Details
      </Link>

      <div className="rounded-3xl border border-[#14141B]/10 bg-white p-8">
        <h1 className="text-2xl font-extrabold tracking-tight">Edit Event</h1>
        <div className="mt-6">
          <AdminEventForm
            defaultValues={defaults}
            submitLabel="Save Changes"
            onSubmit={handleUpdate}
          />
        </div>
      </div>
    </div>
  );
}
