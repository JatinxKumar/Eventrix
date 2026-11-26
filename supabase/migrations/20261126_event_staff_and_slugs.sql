-- Non-destructive migration: add unique event slugs and event_staff assignments

-- 1. Add unique shareable slug to events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS slug TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_events_slug_unique
  ON public.events (slug)
  WHERE slug IS NOT NULL;

-- 2. Create event_staff table for assigning multiple organizers to an event
CREATE TABLE IF NOT EXISTS public.event_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  staff_role TEXT NOT NULL DEFAULT 'organizer' CHECK (staff_role IN ('lead_organizer', 'organizer', 'judge')),
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_staff_event_id ON public.event_staff(event_id);
CREATE INDEX IF NOT EXISTS idx_event_staff_user_id ON public.event_staff(user_id);

ALTER TABLE public.event_staff ENABLE ROW LEVEL SECURITY;

-- 3. Non-recursive helper to check if current user is assigned staff for an event
CREATE OR REPLACE FUNCTION public.is_event_staff(p_event_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.event_staff
    WHERE event_id = p_event_id
      AND user_id = auth.uid()
  );
$$;

-- 4. RLS policies for event_staff
DROP POLICY IF EXISTS "Admins manage all event_staff" ON public.event_staff;
CREATE POLICY "Admins manage all event_staff"
  ON public.event_staff
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Staff can view own assignments" ON public.event_staff;
CREATE POLICY "Staff can view own assignments"
  ON public.event_staff
  FOR SELECT
  USING (user_id = auth.uid());

-- 5. Allow assigned event_staff organizers to view and update their assigned events
DROP POLICY IF EXISTS "Assigned staff can view assigned events" ON public.events;
CREATE POLICY "Assigned staff can view assigned events"
  ON public.events
  FOR SELECT
  USING (public.is_event_staff(id));

DROP POLICY IF EXISTS "Assigned staff can update assigned events" ON public.events;
CREATE POLICY "Assigned staff can update assigned events"
  ON public.events
  FOR UPDATE
  USING (public.is_event_staff(id))
  WITH CHECK (public.is_event_staff(id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_staff TO authenticated;

