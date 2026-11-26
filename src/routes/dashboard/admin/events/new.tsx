import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import {
  AdminEventForm,
  generateEventSlug,
  type EventFormValues,
} from "../../../../components/AdminEventForm";
import { useAuth } from "../../../../lib/AuthProvider";
import { getSupabaseClient } from "../../../../lib/supabaseClient";

export const Route = createFileRoute("/dashboard/admin/events/new")({
  component: CreateEventPage,
});

function CreateEventPage() {
  const { user } = useAuth();
  const router = useRouter();

  const handleCreate = async (values: EventFormValues) => {
    if (!user) return;
    const slug = generateEventSlug(values.title);

    const { data, error } = await getSupabaseClient()
      .from("events")
      .insert({
        organizer_id: user.id,
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
        slug,
        status: "draft",
      })
      .select("id")
      .single();

    if (error) {
      toast.error(error.message);
      throw error;
    }

    toast.success("Draft event created successfully.");
    router.navigate({ to: "/dashboard/admin/events/$eventId", params: { eventId: data.id } });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        to="/dashboard/admin/events"
        className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 hover:text-[#14141B]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Events
      </Link>

      <div className="rounded-3xl border border-[#14141B]/10 bg-white p-8">
        <h1 className="text-2xl font-extrabold tracking-tight">Create Institutional Event</h1>
        <p className="mt-1 text-sm text-zinc-600">
          New events are saved as drafts by default until an assigned organizer publishes them.
        </p>
        <div className="mt-6">
          <AdminEventForm submitLabel="Save as Draft" onSubmit={handleCreate} />
        </div>
      </div>
    </div>
  );
}
