-- ============================================================================
-- EVENTRIX Consolidated Database Setup (PostgreSQL / Supabase)
-- ============================================================================
-- Safe to run on a fresh database or idempotently on an existing database.
-- Consolidates schema.sql, triggers.sql, and all 20261126_* migrations
-- with security hardening, non-recursive RLS, and Google OAuth support.
-- ============================================================================

BEGIN;

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. TABLES
-- ============================================================================

-- 2.1 profiles (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL UNIQUE,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'participant' CHECK (role IN ('participant', 'organizer', 'admin')),
  roll_number TEXT,
  university TEXT,
  department TEXT,
  academic_year TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.2 events
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organizer_id UUID NOT NULL REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  slug TEXT,
  short_description TEXT,
  description TEXT,
  rules TEXT,
  category TEXT,
  venue TEXT,
  cover_image TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  registration_deadline TIMESTAMPTZ,
  capacity INT,
  registration_type TEXT NOT NULL CHECK (registration_type IN ('individual', 'team')),
  min_team_size INT,
  max_team_size INT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'ongoing', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_events_slug_unique
  ON public.events (slug)
  WHERE slug IS NOT NULL;

-- 2.3 event_staff
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

-- 2.4 teams
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  leader_id UUID NOT NULL REFERENCES public.profiles(id),
  invite_code TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_invite_code_unique
  ON public.teams (invite_code)
  WHERE invite_code IS NOT NULL;

-- 2.5 registrations
CREATE TABLE IF NOT EXISTS public.registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('registered', 'confirmed', 'cancelled')),
  registration_ref TEXT,
  attendance_token TEXT,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, participant_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_registrations_ref_unique
  ON public.registrations (registration_ref)
  WHERE registration_ref IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_registrations_token_unique
  ON public.registrations (attendance_token)
  WHERE attendance_token IS NOT NULL;

-- 2.6 team_members
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (team_id, participant_id)
);

-- 2.7 attendance
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  registration_id UUID NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
  qr_token UUID NOT NULL UNIQUE,
  checked_in_at TIMESTAMPTZ,
  checked_in_by UUID REFERENCES public.profiles(id)
);

-- 2.8 rounds
CREATE TABLE IF NOT EXISTS public.rounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  round_number INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.9 results
CREATE TABLE IF NOT EXISTS public.results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  round_id UUID NOT NULL REFERENCES public.rounds(id) ON DELETE CASCADE,
  registration_id UUID NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
  score NUMERIC,
  rank INT,
  feedback TEXT,
  published_at TIMESTAMPTZ
);

-- 2.10 certificates
CREATE TABLE IF NOT EXISTS public.certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  registration_id UUID NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
  certificate_number UUID NOT NULL UNIQUE,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. SECURITY DEFINER HELPER FUNCTIONS (Non-Recursive RLS)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

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

CREATE OR REPLACE FUNCTION public.can_manage_event(p_event_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin() OR EXISTS (
    SELECT 1
    FROM public.events e
    WHERE e.id = p_event_id
      AND (e.organizer_id = auth.uid() OR public.is_event_staff(e.id))
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_event_staff(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_manage_event(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_event_staff(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_event(UUID) TO authenticated;

-- ============================================================================
-- 4. TRIGGERS (Auth User Creation & Role Protection)
-- ============================================================================

-- 4.1 Auto-create participant profile on signup (Email/Password & Google OAuth)
-- Never overwrites existing profiles or privileged roles.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url, role)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''),
      NULLIF(trim(NEW.raw_user_meta_data->>'name'), ''),
      split_part(COALESCE(NEW.email, ''), '@', 1),
      'Participant'
    ),
    COALESCE(NEW.email, NEW.id::text || '@no-email.local'),
    NEW.raw_user_meta_data->>'avatar_url',
    'participant'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4.2 Prevent users from modifying their own role via direct UPDATE
CREATE OR REPLACE FUNCTION public.prevent_profile_role_self_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
      RAISE EXCEPTION 'Unauthorized: you cannot modify your own role.';
    END IF;
    IF auth.uid() = OLD.id THEN
      RAISE EXCEPTION 'Invalid operation: administrators cannot modify their own role.';
    END IF;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_role_self_change ON public.profiles;
CREATE TRIGGER trg_prevent_profile_role_self_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_role_self_change();

-- ============================================================================
-- 5. ENABLE ROW LEVEL SECURITY & POLICIES
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- 5.1 profiles policies (non-recursive)
DROP POLICY IF EXISTS "profile_select_self" ON public.profiles;
CREATE POLICY "profile_select_self"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "profile_update_self" ON public.profiles;
CREATE POLICY "profile_update_self"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
  );

DROP POLICY IF EXISTS "profile_admin_all" ON public.profiles;
CREATE POLICY "profile_admin_all"
  ON public.profiles FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 5.2 events policies
DROP POLICY IF EXISTS "event_select_published" ON public.events;
CREATE POLICY "event_select_published"
  ON public.events FOR SELECT
  USING (status IN ('published', 'ongoing', 'completed'));

DROP POLICY IF EXISTS "event_staff_select" ON public.events;
CREATE POLICY "event_staff_select"
  ON public.events FOR SELECT
  USING (organizer_id = auth.uid() OR public.is_event_staff(id));

DROP POLICY IF EXISTS "event_staff_update" ON public.events;
CREATE POLICY "event_staff_update"
  ON public.events FOR UPDATE
  USING (organizer_id = auth.uid() OR public.is_event_staff(id))
  WITH CHECK (organizer_id = auth.uid() OR public.is_event_staff(id));

DROP POLICY IF EXISTS "event_admin_all" ON public.events;
CREATE POLICY "event_admin_all"
  ON public.events FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 5.3 event_staff policies
DROP POLICY IF EXISTS "Admins manage all event_staff" ON public.event_staff;
CREATE POLICY "Admins manage all event_staff"
  ON public.event_staff FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Staff can view own assignments" ON public.event_staff;
CREATE POLICY "Staff can view own assignments"
  ON public.event_staff FOR SELECT
  USING (user_id = auth.uid());

-- 5.4 registrations policies (no direct INSERT; must use atomic RPCs)
DROP POLICY IF EXISTS "registration_select_self" ON public.registrations;
CREATE POLICY "registration_select_self"
  ON public.registrations FOR SELECT
  USING (auth.uid() = participant_id);

DROP POLICY IF EXISTS "registration_organizer_view" ON public.registrations;
CREATE POLICY "registration_organizer_view"
  ON public.registrations FOR SELECT
  USING (public.can_manage_event(event_id));

DROP POLICY IF EXISTS "registration_admin_all" ON public.registrations;
CREATE POLICY "registration_admin_all"
  ON public.registrations FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 5.5 teams policies
DROP POLICY IF EXISTS "team_select_member_or_leader" ON public.teams;
CREATE POLICY "team_select_member_or_leader"
  ON public.teams FOR SELECT
  USING (
    auth.uid() = leader_id
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = id AND tm.participant_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "team_organizer_view" ON public.teams;
CREATE POLICY "team_organizer_view"
  ON public.teams FOR SELECT
  USING (public.can_manage_event(event_id));

DROP POLICY IF EXISTS "team_admin_all" ON public.teams;
CREATE POLICY "team_admin_all"
  ON public.teams FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 5.6 team_members policies
DROP POLICY IF EXISTS "team_member_select_self" ON public.team_members;
CREATE POLICY "team_member_select_self"
  ON public.team_members FOR SELECT
  USING (
    auth.uid() = participant_id
    OR EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_id AND t.leader_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "team_member_organizer_view" ON public.team_members;
CREATE POLICY "team_member_organizer_view"
  ON public.team_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_id AND public.can_manage_event(t.event_id)
    )
  );

DROP POLICY IF EXISTS "team_member_admin_all" ON public.team_members;
CREATE POLICY "team_member_admin_all"
  ON public.team_members FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 5.7 attendance policies
DROP POLICY IF EXISTS "attendance_select_self" ON public.attendance;
CREATE POLICY "attendance_select_self"
  ON public.attendance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.registrations r
      WHERE r.id = registration_id AND r.participant_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "attendance_organizer_manage" ON public.attendance;
CREATE POLICY "attendance_organizer_manage"
  ON public.attendance FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.registrations r
      WHERE r.id = registration_id AND public.can_manage_event(r.event_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.registrations r
      WHERE r.id = registration_id AND public.can_manage_event(r.event_id)
    )
  );

DROP POLICY IF EXISTS "attendance_admin_all" ON public.attendance;
CREATE POLICY "attendance_admin_all"
  ON public.attendance FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 5.8 rounds, results, certificates policies
DROP POLICY IF EXISTS "round_organizer_manage" ON public.rounds;
CREATE POLICY "round_organizer_manage"
  ON public.rounds FOR ALL
  USING (public.can_manage_event(event_id))
  WITH CHECK (public.can_manage_event(event_id));

DROP POLICY IF EXISTS "round_admin_all" ON public.rounds;
CREATE POLICY "round_admin_all"
  ON public.rounds FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "result_select_self" ON public.results;
CREATE POLICY "result_select_self"
  ON public.results FOR SELECT
  USING (
    published_at IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.registrations r
      WHERE r.id = registration_id AND r.participant_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "result_organizer_manage" ON public.results;
CREATE POLICY "result_organizer_manage"
  ON public.results FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.rounds rd
      WHERE rd.id = round_id AND public.can_manage_event(rd.event_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rounds rd
      WHERE rd.id = round_id AND public.can_manage_event(rd.event_id)
    )
  );

DROP POLICY IF EXISTS "result_admin_all" ON public.results;
CREATE POLICY "result_admin_all"
  ON public.results FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "certificate_select_self" ON public.certificates;
CREATE POLICY "certificate_select_self"
  ON public.certificates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.registrations r
      WHERE r.id = registration_id AND r.participant_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "certificate_organizer_manage" ON public.certificates;
CREATE POLICY "certificate_organizer_manage"
  ON public.certificates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.registrations r
      WHERE r.id = registration_id AND public.can_manage_event(r.event_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.registrations r
      WHERE r.id = registration_id AND public.can_manage_event(r.event_id)
    )
  );

DROP POLICY IF EXISTS "certificate_admin_all" ON public.certificates;
CREATE POLICY "certificate_admin_all"
  ON public.certificates FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- 6. RPC FUNCTIONS (Admin, Organizer Lifecycle, Participant Registration)
-- ============================================================================

-- 6.1 Promote participant to organizer (Admin only)
CREATE OR REPLACE FUNCTION public.promote_participant_to_organizer(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_target_role TEXT;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: only administrators can promote users to organizer.';
  END IF;

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Invalid operation: administrators cannot modify their own role.';
  END IF;

  SELECT role INTO v_target_role FROM public.profiles WHERE id = p_user_id;
  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'Target user profile not found.';
  END IF;

  IF v_target_role <> 'participant' THEN
    RAISE EXCEPTION 'Only participant accounts can be promoted to organizer.';
  END IF;

  UPDATE public.profiles
  SET role = 'organizer', updated_at = NOW()
  WHERE id = p_user_id;
END;
$$;

-- 6.2 Transition event status (Admin or assigned Lead Organizer)
CREATE OR REPLACE FUNCTION public.transition_event_status(
  p_event_id UUID,
  p_new_status TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_is_lead BOOLEAN;
  v_event RECORD;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();

  SELECT EXISTS (
    SELECT 1 FROM public.event_staff
    WHERE event_id = p_event_id
      AND user_id = auth.uid()
      AND staff_role = 'lead_organizer'
  ) INTO v_is_lead;

  IF v_caller_role IS DISTINCT FROM 'admin' AND NOT v_is_lead THEN
    RAISE EXCEPTION 'Unauthorized: only admins or assigned lead organizers can change event status.';
  END IF;

  SELECT * INTO v_event FROM public.events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found.';
  END IF;

  IF v_event.status = 'cancelled' AND v_caller_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Cancelled events can only be restored by an administrator.';
  END IF;

  IF p_new_status = 'published' THEN
    IF v_event.status <> 'draft' AND v_caller_role IS DISTINCT FROM 'admin' THEN
      RAISE EXCEPTION 'Only draft events can be published.';
    END IF;
    IF v_event.title IS NULL OR length(trim(v_event.title)) < 3
       OR v_event.venue IS NULL OR length(trim(v_event.venue)) < 2
       OR v_event.slug IS NULL OR length(trim(v_event.slug)) < 2
       OR v_event.start_date IS NULL OR v_event.end_date IS NULL
       OR v_event.registration_deadline IS NULL
       OR v_event.capacity IS NULL OR v_event.capacity < 1
       OR v_event.end_date <= v_event.start_date
       OR v_event.registration_deadline > v_event.start_date THEN
      RAISE EXCEPTION 'Event is missing required details or has invalid dates/capacity before publishing.';
    END IF;
  ELSIF p_new_status = 'ongoing' THEN
    IF v_event.status <> 'published' THEN
      RAISE EXCEPTION 'Only published events can transition to ongoing.';
    END IF;
  ELSIF p_new_status = 'completed' THEN
    IF v_event.status <> 'ongoing' THEN
      RAISE EXCEPTION 'Only ongoing events can transition to completed.';
    END IF;
  ELSIF p_new_status = 'cancelled' THEN
    IF v_caller_role IS DISTINCT FROM 'admin' THEN
      RAISE EXCEPTION 'Only administrators can cancel events.';
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid target status: %', p_new_status;
  END IF;

  UPDATE public.events
  SET status = p_new_status, updated_at = NOW()
  WHERE id = p_event_id;
END;
$$;

-- 6.3 Atomic Individual Registration RPC
CREATE OR REPLACE FUNCTION public.register_individual_for_event(p_event_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_role TEXT;
  v_event RECORD;
  v_confirmed_count INTEGER;
  v_reg_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = v_user_id;
  IF v_role IS DISTINCT FROM 'participant' THEN
    RAISE EXCEPTION 'Only participant accounts can register for events.';
  END IF;

  SELECT * INTO v_event FROM public.events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found.';
  END IF;

  IF v_event.status <> 'published' THEN
    RAISE EXCEPTION 'Event is not open for registration.';
  END IF;

  IF v_event.registration_type <> 'individual' THEN
    RAISE EXCEPTION 'This event requires team registration.';
  END IF;

  IF v_event.registration_deadline <= NOW() THEN
    RAISE EXCEPTION 'Registration deadline has passed.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.registrations
    WHERE event_id = p_event_id
      AND participant_id = v_user_id
      AND status <> 'cancelled'
  ) THEN
    RAISE EXCEPTION 'You are already registered for this event.';
  END IF;

  SELECT COUNT(*) INTO v_confirmed_count
  FROM public.registrations
  WHERE event_id = p_event_id
    AND status = 'confirmed';

  IF v_confirmed_count >= v_event.capacity THEN
    RAISE EXCEPTION 'Event capacity is full.';
  END IF;

  INSERT INTO public.registrations (
    event_id, participant_id, status, registration_ref, attendance_token
  ) VALUES (
    p_event_id,
    v_user_id,
    'confirmed',
    'EVX-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
    replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
  )
  RETURNING id INTO v_reg_id;

  RETURN v_reg_id;
END;
$$;

-- 6.4 Create Team RPC
CREATE OR REPLACE FUNCTION public.create_event_team(p_event_id UUID, p_team_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_role TEXT;
  v_event RECORD;
  v_team_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = v_user_id;
  IF v_role IS DISTINCT FROM 'participant' THEN
    RAISE EXCEPTION 'Only participant accounts can create event teams.';
  END IF;

  IF p_team_name IS NULL OR length(trim(p_team_name)) < 2 THEN
    RAISE EXCEPTION 'Team name must be at least 2 characters.';
  END IF;

  SELECT * INTO v_event FROM public.events WHERE id = p_event_id;
  IF NOT FOUND OR v_event.status <> 'published' OR v_event.registration_type <> 'team' THEN
    RAISE EXCEPTION 'Team registration is not available for this event.';
  END IF;

  IF v_event.registration_deadline <= NOW() THEN
    RAISE EXCEPTION 'Registration deadline has passed.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.team_members tm
    JOIN public.teams t ON t.id = tm.team_id
    WHERE t.event_id = p_event_id AND tm.participant_id = v_user_id AND t.status <> 'cancelled'
  ) THEN
    RAISE EXCEPTION 'You are already part of a team for this event.';
  END IF;

  INSERT INTO public.teams (event_id, name, leader_id, invite_code, status)
  VALUES (
    p_event_id,
    trim(p_team_name),
    v_user_id,
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
    'draft'
  )
  RETURNING id INTO v_team_id;

  INSERT INTO public.team_members (team_id, participant_id)
  VALUES (v_team_id, v_user_id);

  RETURN v_team_id;
END;
$$;

-- 6.5 Join Team RPC
CREATE OR REPLACE FUNCTION public.join_event_team(p_event_id UUID, p_invite_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_role TEXT;
  v_team RECORD;
  v_event RECORD;
  v_member_count INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = v_user_id;
  IF v_role IS DISTINCT FROM 'participant' THEN
    RAISE EXCEPTION 'Only participant accounts can join event teams.';
  END IF;

  SELECT * INTO v_event FROM public.events WHERE id = p_event_id;
  IF NOT FOUND OR v_event.status <> 'published' OR v_event.registration_deadline <= NOW() THEN
    RAISE EXCEPTION 'Event registration is closed.';
  END IF;

  SELECT * INTO v_team
  FROM public.teams
  WHERE event_id = p_event_id
    AND invite_code = upper(trim(p_invite_code))
    AND status = 'draft';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or finalized invite code for this event.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.team_members tm
    JOIN public.teams t ON t.id = tm.team_id
    WHERE t.event_id = p_event_id AND tm.participant_id = v_user_id AND t.status <> 'cancelled'
  ) THEN
    RAISE EXCEPTION 'You are already in a team for this event.';
  END IF;

  SELECT COUNT(*) INTO v_member_count FROM public.team_members WHERE team_id = v_team.id;
  IF v_member_count >= v_event.max_team_size THEN
    RAISE EXCEPTION 'This team has reached the maximum team size.';
  END IF;

  INSERT INTO public.team_members (team_id, participant_id) VALUES (v_team.id, v_user_id);
  RETURN v_team.id;
END;
$$;

-- 6.6 Finalize Team Registration RPC
CREATE OR REPLACE FUNCTION public.finalize_team_registration(p_team_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_team RECORD;
  v_event RECORD;
  v_member_count INTEGER;
  v_confirmed_count INTEGER;
  v_member RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  SELECT * INTO v_team FROM public.teams WHERE id = p_team_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Team not found.';
  END IF;

  IF v_team.leader_id <> v_user_id THEN
    RAISE EXCEPTION 'Only the team leader can submit the final team registration.';
  END IF;

  IF v_team.status <> 'draft' THEN
    RAISE EXCEPTION 'Team registration has already been finalized.';
  END IF;

  SELECT * INTO v_event FROM public.events WHERE id = v_team.event_id FOR UPDATE;
  IF NOT FOUND OR v_event.status <> 'published' OR v_event.registration_deadline <= NOW() THEN
    RAISE EXCEPTION 'Event registration is closed.';
  END IF;

  SELECT COUNT(*) INTO v_member_count FROM public.team_members WHERE team_id = p_team_id;
  IF v_member_count < v_event.min_team_size OR v_member_count > v_event.max_team_size THEN
    RAISE EXCEPTION 'Team size must be between % and % members.', v_event.min_team_size, v_event.max_team_size;
  END IF;

  SELECT COUNT(*) INTO v_confirmed_count
  FROM public.registrations
  WHERE event_id = v_event.id AND status = 'confirmed';

  IF v_confirmed_count + v_member_count > v_event.capacity THEN
    RAISE EXCEPTION 'Not enough remaining capacity for all team members.';
  END IF;

  UPDATE public.teams SET status = 'confirmed' WHERE id = p_team_id;

  FOR v_member IN SELECT participant_id FROM public.team_members WHERE team_id = p_team_id LOOP
    INSERT INTO public.registrations (
      event_id, participant_id, team_id, status, registration_ref, attendance_token
    ) VALUES (
      v_event.id,
      v_member.participant_id,
      p_team_id,
      'confirmed',
      'EVX-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
      replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
    );
  END LOOP;
END;
$$;

-- 6.7 Cancel Individual Registration RPC
CREATE OR REPLACE FUNCTION public.cancel_individual_registration(p_registration_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_reg RECORD;
  v_event RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  SELECT * INTO v_reg FROM public.registrations WHERE id = p_registration_id;
  IF NOT FOUND OR v_reg.participant_id <> v_user_id THEN
    RAISE EXCEPTION 'Registration not found.';
  END IF;

  IF v_reg.team_id IS NOT NULL THEN
    RAISE EXCEPTION 'Team registrations cannot be individually cancelled.';
  END IF;

  SELECT * INTO v_event FROM public.events WHERE id = v_reg.event_id;
  IF v_event.status <> 'published' OR v_event.registration_deadline <= NOW() THEN
    RAISE EXCEPTION 'Cancellation is closed for this event.';
  END IF;

  UPDATE public.registrations SET status = 'cancelled' WHERE id = p_registration_id;
END;
$$;

REVOKE ALL ON FUNCTION public.promote_participant_to_organizer(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.transition_event_status(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.register_individual_for_event(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_event_team(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.join_event_team(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finalize_team_registration(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_individual_registration(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.promote_participant_to_organizer(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transition_event_status(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_individual_for_event(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_event_team(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_event_team(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_team_registration(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_individual_registration(UUID) TO authenticated;

-- ============================================================================
-- 7. EXPLICIT DATA API GRANTS
-- ============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON public.events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_staff TO authenticated;
GRANT SELECT, UPDATE, DELETE ON public.registrations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rounds TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.results TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.certificates TO authenticated;

-- ============================================================================
-- 8. BACKFILL EXISTING AUTH.USERS INTO PUBLIC.PROFILES
-- ============================================================================

INSERT INTO public.profiles (id, full_name, email, avatar_url, role)
SELECT
  u.id,
  COALESCE(
    NULLIF(trim(u.raw_user_meta_data->>'full_name'), ''),
    NULLIF(trim(u.raw_user_meta_data->>'name'), ''),
    split_part(COALESCE(u.email, ''), '@', 1),
    'Participant'
  ),
  COALESCE(u.email, u.id::text || '@no-email.local'),
  u.raw_user_meta_data->>'avatar_url',
  'participant'
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

COMMIT;

