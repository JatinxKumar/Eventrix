-- Non-destructive migration for Admin Control Center
-- 1. Add short_description and rules to public.events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS short_description TEXT,
  ADD COLUMN IF NOT EXISTS rules TEXT;

-- 2. Secure RPC for Admin to promote a participant to organizer
-- Never allows self-promotion or creating admin accounts
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
  SELECT role INTO v_caller_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_caller_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: only administrators can promote users to organizer.';
  END IF;

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Invalid operation: administrators cannot modify their own role.';
  END IF;

  SELECT role INTO v_target_role
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'Target user profile not found.';
  END IF;

  IF v_target_role <> 'participant' THEN
    RAISE EXCEPTION 'Only participant accounts can be promoted to organizer.';
  END IF;

  UPDATE public.profiles
  SET role = 'organizer',
      updated_at = NOW()
  WHERE id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.promote_participant_to_organizer(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.promote_participant_to_organizer(UUID) TO authenticated;

