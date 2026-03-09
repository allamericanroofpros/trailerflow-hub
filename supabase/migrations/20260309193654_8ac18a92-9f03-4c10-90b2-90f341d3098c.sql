
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_org_id uuid;
  biz_name text;
  slug_val text;
  v_founders_enabled boolean;
  v_founders_limit integer;
  v_current_count integer;
  v_next_number integer;
BEGIN
  -- Create profile with extended fields
  INSERT INTO public.profiles (user_id, full_name, avatar_url, business_name, phone, vendor_type, trailer_count, team_size, primary_use_case, referral_source)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'business_name',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'vendor_type',
    NEW.raw_user_meta_data->>'trailer_count',
    NEW.raw_user_meta_data->>'team_size',
    NEW.raw_user_meta_data->>'primary_use_case',
    NEW.raw_user_meta_data->>'referral_source'
  );

  -- Assign owner role to first user, staff to rest
  IF (SELECT COUNT(*) FROM public.user_roles) = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'owner');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'staff');
  END IF;

  -- Auto-link staff_members entry if email matches
  UPDATE public.staff_members
  SET user_id = NEW.id
  WHERE email = NEW.email AND user_id IS NULL;

  -- Auto-accept pending team invites for this email
  UPDATE public.team_invites
  SET status = 'accepted', accepted_at = now()
  WHERE email = NEW.email AND status = 'pending';

  -- Auto-join orgs from accepted invites
  INSERT INTO public.organization_members (org_id, user_id, role)
  SELECT org_id, NEW.id, role FROM public.team_invites
  WHERE email = NEW.email AND status = 'accepted'
  ON CONFLICT DO NOTHING;

  -- If business_name provided, create an organization
  biz_name := NEW.raw_user_meta_data->>'business_name';
  IF biz_name IS NOT NULL AND biz_name != '' THEN
    slug_val := lower(regexp_replace(biz_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(gen_random_uuid()::text, 1, 8);

    -- Check founders availability (with row lock for atomicity)
    SELECT founders_enabled, founders_limit
    INTO v_founders_enabled, v_founders_limit
    FROM public.platform_limits
    WHERE id = 1
    FOR UPDATE;

    IF v_founders_enabled THEN
      SELECT COUNT(*) INTO v_current_count
      FROM public.organizations
      WHERE is_founder = true;
    END IF;

    IF v_founders_enabled AND v_current_count < v_founders_limit THEN
      v_next_number := v_current_count + 1;

      INSERT INTO public.organizations (name, slug, owner_user_id, source, plan, is_founder, founder_number, plan_price_locked, founder_pricing_version)
      VALUES (biz_name, slug_val, NEW.id, NEW.raw_user_meta_data->>'referral_source', 'founders', true, v_next_number, true, 'beta_2026_03')
      RETURNING id INTO new_org_id;

      -- If this was the last founder slot, disable further founders
      IF v_next_number >= v_founders_limit THEN
        UPDATE public.platform_limits SET founders_enabled = false WHERE id = 1;
      END IF;
    ELSE
      -- Standard plan assignment (pro is the base paid plan post-founders)
      INSERT INTO public.organizations (name, slug, owner_user_id, source, plan)
      VALUES (biz_name, slug_val, NEW.id, NEW.raw_user_meta_data->>'referral_source', 'pro')
      RETURNING id INTO new_org_id;
    END IF;

    INSERT INTO public.organization_members (org_id, user_id, role)
    VALUES (new_org_id, NEW.id, 'owner');
  END IF;

  RETURN NEW;
END;
$function$;
