-- Backend enforcement: block trailer/staff creation above plan limits
-- Uses validation triggers instead of check constraints

CREATE OR REPLACE FUNCTION public.enforce_trailer_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  org_plan text;
  current_count integer;
  max_allowed integer;
BEGIN
  IF NEW.org_id IS NULL THEN RETURN NEW; END IF;

  SELECT plan INTO org_plan FROM public.organizations WHERE id = NEW.org_id;
  org_plan := COALESCE(org_plan, 'free');

  SELECT COUNT(*) INTO current_count FROM public.trailers WHERE org_id = NEW.org_id;

  CASE org_plan
    WHEN 'free' THEN max_allowed := 1;
    WHEN 'starter' THEN max_allowed := 1;
    WHEN 'pro' THEN max_allowed := 999999;
    WHEN 'enterprise' THEN max_allowed := 999999;
    ELSE max_allowed := 1;
  END CASE;

  IF current_count >= max_allowed THEN
    RAISE EXCEPTION 'Trailer limit reached for % plan (max: %). Please upgrade your plan.', org_plan, max_allowed;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_trailer_limit ON public.trailers;
CREATE TRIGGER check_trailer_limit
  BEFORE INSERT ON public.trailers
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_trailer_limit();

CREATE OR REPLACE FUNCTION public.enforce_staff_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  org_plan text;
  current_count integer;
  max_allowed integer;
BEGIN
  IF NEW.org_id IS NULL THEN RETURN NEW; END IF;

  SELECT plan INTO org_plan FROM public.organizations WHERE id = NEW.org_id;
  org_plan := COALESCE(org_plan, 'free');

  SELECT COUNT(*) INTO current_count FROM public.staff_members WHERE org_id = NEW.org_id;

  CASE org_plan
    WHEN 'free' THEN max_allowed := 2;
    WHEN 'starter' THEN max_allowed := 5;
    WHEN 'pro' THEN max_allowed := 999999;
    WHEN 'enterprise' THEN max_allowed := 999999;
    ELSE max_allowed := 2;
  END CASE;

  IF current_count >= max_allowed THEN
    RAISE EXCEPTION 'Staff limit reached for % plan (max: %). Please upgrade your plan.', org_plan, max_allowed;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_staff_limit ON public.staff_members;
CREATE TRIGGER check_staff_limit
  BEFORE INSERT ON public.staff_members
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_staff_limit();