
-- Update handle_new_user to store extended signup fields
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
    
    INSERT INTO public.organizations (name, slug, owner_user_id, source)
    VALUES (biz_name, slug_val, NEW.id, NEW.raw_user_meta_data->>'referral_source')
    RETURNING id INTO new_org_id;

    INSERT INTO public.organization_members (org_id, user_id, role)
    VALUES (new_org_id, NEW.id, 'owner');
  END IF;

  RETURN NEW;
END;
$function$;
