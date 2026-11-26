-- Non-destructive migration for Participant Profile, Individual & Team Registration, and Digital Passes

-- 1. Extend public.profiles with student fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS roll_number TEXT,
  ADD COLUMN IF NOT EXISTS university TEXT,
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS academic_year TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- 2. Extend public.teams with invite_code and status
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS invite_code TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'confirmed', 'cancelled'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_invite_code_unique
  ON public.teams (invite_code)
  WHERE invite_code IS NOT NULL;

-- 3. Extend public.registrations with registration_ref, attendance_token, and team_id
ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS registration_ref TEXT,
  ADD COLUMN IF NOT EXISTS attendance_token TEXT,
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_registrations_ref_unique
  ON public.registrations (registration_ref)
  WHERE registration_ref IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_registrations_token_unique
  ON public.registrations (attendance_token)
  WHERE attendance_token IS NOT NULL;

-- 4. Atomic Individual Registration RPC
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
    event_id,
    participant_id,
    status,
    registration_ref,
    attendance_token
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

-- 5. Create Team RPC
CREATE OR REPLACE FUNCTION public.create_event_team(p_event_id UUID, p_team_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_event RECORD;
  v_team_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
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
    WHERE t.event_id = p_event_id AND tm.user_id = v_user_id AND t.status <> 'cancelled'
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

  INSERT INTO public.team_members (team_id, user_id)
  VALUES (v_team_id, v_user_id);

  RETURN v_team_id;
END;
$$;

-- 6. Join Team RPC
CREATE OR REPLACE FUNCTION public.join_event_team(p_event_id UUID, p_invite_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_team RECORD;
  v_event RECORD;
  v_member_count INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
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
    WHERE t.event_id = p_event_id AND tm.user_id = v_user_id AND t.status <> 'cancelled'
  ) THEN
    RAISE EXCEPTION 'You are already in a team for this event.';
  END IF;

  SELECT COUNT(*) INTO v_member_count FROM public.team_members WHERE team_id = v_team.id;
  IF v_member_count >= v_event.max_team_size THEN
    RAISE EXCEPTION 'This team has reached the maximum team size.';
  END IF;

  INSERT INTO public.team_members (team_id, user_id) VALUES (v_team.id, v_user_id);
  RETURN v_team.id;
END;
$$;

-- 7. Finalize Team Registration RPC (atomic capacity + member registration creation)
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

  FOR v_member IN SELECT user_id FROM public.team_members WHERE team_id = p_team_id LOOP
    INSERT INTO public.registrations (
      event_id,
      participant_id,
      team_id,
      status,
      registration_ref,
      attendance_token
    ) VALUES (
      v_event.id,
      v_member.user_id,
      p_team_id,
      'confirmed',
      'EVX-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
      replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
    );
  END LOOP;
END;
$$;

-- 8. Cancel Individual Registration RPC
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

REVOKE ALL ON FUNCTION public.register_individual_for_event(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_event_team(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.join_event_team(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finalize_team_registration(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_individual_registration(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.register_individual_for_event(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_event_team(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_event_team(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_team_registration(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_individual_registration(UUID) TO authenticated;

