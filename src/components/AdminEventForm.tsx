import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";

const eventFormSchema = z
  .object({
    title: z.string().min(3, "Title must be at least 3 characters"),
    short_description: z.string().min(10, "Short description must be at least 10 characters"),
    description: z.string().min(20, "Detailed description must be at least 20 characters"),
    category: z.string().min(2, "Category is required"),
    cover_image: z.string().url("Must be a valid URL").or(z.literal("")),
    venue: z.string().min(2, "Venue is required"),
    start_date: z.string().min(1, "Start date & time is required"),
    end_date: z.string().min(1, "End date & time is required"),
    registration_deadline: z.string().min(1, "Registration deadline is required"),
    capacity: z.coerce.number().int().min(1, "Capacity must be at least 1"),
    registration_type: z.enum(["individual", "team"]),
    min_team_size: z.coerce.number().int().min(1),
    max_team_size: z.coerce.number().int().min(1),
    rules: z.string().optional(),
  })
  .refine((d) => new Date(d.end_date) > new Date(d.start_date), {
    path: ["end_date"],
    message: "End date must be after start date",
  })
  .refine((d) => new Date(d.registration_deadline) <= new Date(d.start_date), {
    path: ["registration_deadline"],
    message: "Registration deadline must be on or before start date",
  })
  .refine((d) => d.registration_type === "individual" || d.max_team_size >= d.min_team_size, {
    path: ["max_team_size"],
    message: "Max team size must be >= min team size",
  });

export type EventFormValues = z.infer<typeof eventFormSchema>;

interface AdminEventFormProps {
  defaultValues?: Partial<EventFormValues>;
  submitLabel: string;
  onSubmit: (values: EventFormValues) => Promise<void>;
}

export function generateEventSlug(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base || "event"}-${suffix}`;
}

export function AdminEventForm({ defaultValues, submitLabel, onSubmit }: AdminEventFormProps) {
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: "",
      short_description: "",
      description: "",
      category: "Hackathon",
      cover_image: "",
      venue: "",
      start_date: "",
      end_date: "",
      registration_deadline: "",
      capacity: 100,
      registration_type: "individual",
      min_team_size: 1,
      max_team_size: 4,
      rules: "",
      ...defaultValues,
    },
  });

  const regType = watch("registration_type");

  const handleFormSubmit = async (values: EventFormValues) => {
    setSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-sm font-semibold">Event Title</label>
          <input
            type="text"
            placeholder="e.g. BuildFest 2026"
            className="mt-1.5 w-full rounded-xl border border-[#14141B]/15 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#7C3AED]"
            {...register("title")}
          />
          {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-semibold">Short Description</label>
          <input
            type="text"
            placeholder="A concise one-line summary for event cards"
            className="mt-1.5 w-full rounded-xl border border-[#14141B]/15 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#7C3AED]"
            {...register("short_description")}
          />
          {errors.short_description && (
            <p className="mt-1 text-xs text-red-600">{errors.short_description.message}</p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-semibold">Detailed Description</label>
          <textarea
            rows={4}
            placeholder="Full event overview, tracks, and expectations..."
            className="mt-1.5 w-full rounded-xl border border-[#14141B]/15 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#7C3AED]"
            {...register("description")}
          />
          {errors.description && (
            <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold">Category</label>
          <select
            className="mt-1.5 w-full rounded-xl border border-[#14141B]/15 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#7C3AED]"
            {...register("category")}
          >
            <option value="Hackathon">Hackathon</option>
            <option value="Workshop">Workshop</option>
            <option value="Competition">Competition</option>
            <option value="Seminar">Seminar</option>
            <option value="Cultural">Cultural</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold">Venue</label>
          <input
            type="text"
            placeholder="e.g. Main Auditorium"
            className="mt-1.5 w-full rounded-xl border border-[#14141B]/15 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#7C3AED]"
            {...register("venue")}
          />
          {errors.venue && <p className="mt-1 text-xs text-red-600">{errors.venue.message}</p>}
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-semibold">Cover Image URL (optional)</label>
          <input
            type="url"
            placeholder="https://images.unsplash.com/..."
            className="mt-1.5 w-full rounded-xl border border-[#14141B]/15 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#7C3AED]"
            {...register("cover_image")}
          />
          {errors.cover_image && (
            <p className="mt-1 text-xs text-red-600">{errors.cover_image.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold">Start Date &amp; Time</label>
          <input
            type="datetime-local"
            className="mt-1.5 w-full rounded-xl border border-[#14141B]/15 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#7C3AED]"
            {...register("start_date")}
          />
          {errors.start_date && (
            <p className="mt-1 text-xs text-red-600">{errors.start_date.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold">End Date &amp; Time</label>
          <input
            type="datetime-local"
            className="mt-1.5 w-full rounded-xl border border-[#14141B]/15 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#7C3AED]"
            {...register("end_date")}
          />
          {errors.end_date && (
            <p className="mt-1 text-xs text-red-600">{errors.end_date.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold">Registration Deadline</label>
          <input
            type="datetime-local"
            className="mt-1.5 w-full rounded-xl border border-[#14141B]/15 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#7C3AED]"
            {...register("registration_deadline")}
          />
          {errors.registration_deadline && (
            <p className="mt-1 text-xs text-red-600">{errors.registration_deadline.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold">Maximum Capacity</label>
          <input
            type="number"
            min={1}
            className="mt-1.5 w-full rounded-xl border border-[#14141B]/15 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#7C3AED]"
            {...register("capacity")}
          />
          {errors.capacity && (
            <p className="mt-1 text-xs text-red-600">{errors.capacity.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold">Registration Type</label>
          <select
            className="mt-1.5 w-full rounded-xl border border-[#14141B]/15 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#7C3AED]"
            {...register("registration_type")}
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
                className="mt-1.5 w-full rounded-xl border border-[#14141B]/15 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#7C3AED]"
                {...register("min_team_size")}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold">Max Team Size</label>
              <input
                type="number"
                min={1}
                className="mt-1.5 w-full rounded-xl border border-[#14141B]/15 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#7C3AED]"
                {...register("max_team_size")}
              />
              {errors.max_team_size && (
                <p className="mt-1 text-xs text-red-600">{errors.max_team_size.message}</p>
              )}
            </div>
          </div>
        )}

        <div className="sm:col-span-2">
          <label className="block text-sm font-semibold">Event Rules &amp; Instructions</label>
          <textarea
            rows={3}
            placeholder="Eligibility, submission rules, or venue guidelines..."
            className="mt-1.5 w-full rounded-xl border border-[#14141B]/15 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#7C3AED]"
            {...register("rules")}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="rounded-full bg-[#7C3AED] px-7 py-3 text-sm font-bold text-white transition-colors hover:bg-[#6D28D9] disabled:opacity-50"
      >
        {submitting ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
