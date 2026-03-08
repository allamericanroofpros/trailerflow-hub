
-- Update handle_new_user to also create an organization for the first user (owner)
-- and for any user who signs up with a business_name in metadata
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
  -- Create profile
  INSERT INTO public.profiles (user_id, full_name, avatar_url, business_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'business_name'
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

  -- If business_name provided, create an organization
  biz_name := NEW.raw_user_meta_data->>'business_name';
  IF biz_name IS NOT NULL AND biz_name != '' THEN
    slug_val := lower(regexp_replace(biz_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(gen_random_uuid()::text, 1, 8);
    
    INSERT INTO public.organizations (name, slug, owner_user_id)
    VALUES (biz_name, slug_val, NEW.id)
    RETURNING id INTO new_org_id;

    INSERT INTO public.organization_members (org_id, user_id, role)
    VALUES (new_org_id, NEW.id, 'owner');
  END IF;

  RETURN NEW;
END;
$function$;
