import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../../../lib/AuthProvider";
import { getSupabaseClient } from "../../../lib/supabaseClient";

export const Route = createFileRoute("/dashboard/participant/profile")({
  component: ParticipantProfilePage,
});

function ParticipantProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [university, setUniversity] = useState("");
  const [department, setDepartment] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data, error } = await getSupabaseClient()
        .from("profiles")
        .select("full_name, email, roll_number, university, department, academic_year, phone")
        .eq("id", user.id)
        .single();

      if (!error && data) {
        setFullName(data.full_name ?? "");
        setEmail(data.email ?? user.email ?? "");
        setRollNumber(data.roll_number ?? "");
        setUniversity(data.university ?? "");
        setDepartment(data.department ?? "");
        setAcademicYear(data.academic_year ?? "");
        setPhone(data.phone ?? "");
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await getSupabaseClient()
      .from("profiles")
      .update({
        full_name: fullName,
        roll_number: rollNumber || null,
        university: university || null,
        department: department || null,
        academic_year: academicYear || null,
        phone: phone || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) toast.error(error.message);
    else toast.success("Profile updated.");
    setSaving(false);
  };

  if (loading) return <div className="h-64 animate-pulse rounded-3xl bg-zinc-200" />;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Student Profile</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Keep your academic details up to date for faster event registrations.
        </p>
      </div>

      <form
        onSubmit={handleSave}
        className="space-y-4 rounded-3xl border border-[#14141B]/10 bg-white p-8"
      >
        <div>
          <label className="block text-sm font-semibold">Full Name</label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold">Email (read-only)</label>
          <input
            type="email"
            readOnly
            value={email}
            className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-500"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold">Roll Number</label>
            <input
              type="text"
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold">Academic Year</label>
            <input
              type="text"
              placeholder="e.g. 3rd Year"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm"
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold">University / Institution</label>
            <input
              type="text"
              value={university}
              onChange={(e) => setUniversity(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold">Department / Course</label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold">Phone Number (optional)</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-[#7C3AED] px-7 py-3 text-sm font-bold text-white hover:bg-[#6D28D9] disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </form>
    </div>
  );
}
