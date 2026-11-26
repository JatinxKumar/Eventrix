-- Non-destructive migration for Organizer event publication & lifecycle transitions

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
  SELECT role INTO v_caller_role
  FROM public.profiles
  WHERE id = auth.uid();

  SELECT EXISTS (
    SELECT 1 FROM public.event_staff
    WHERE event_id = p_event_id
      AND user_id = auth.uid()
      AND staff_role = 'lead_organizer'
  ) INTO v_is_lead;

  IF v_caller_role IS DISTINCT FROM 'admin' AND NOT v_is_lead THEN
    RAISE EXCEPTION 'Unauthorized: only admins or assigned lead organizers can change event status.';
  END IF;

  SELECT * INTO v_event
  FROM public.events
  WHERE id = p_event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found.';
  END IF;

  IF v_event.status = 'cancelled' AND v_caller_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Cancelled events can only be restored by an administrator.';
  END IF;

  -- Validate allowed transitions
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
  SET status = p_new_status,
      updated_at = NOW()
  WHERE id = p_event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.transition_event_status(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transition_event_status(UUID, TEXT) TO authenticated;

