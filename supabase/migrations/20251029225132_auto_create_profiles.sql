-- Auto-create user profiles when new users sign up
-- This trigger handles profile creation for all user types:
-- - Anonymous users
-- - Email/password users
-- - OAuth users (Google, etc.)

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  display_name_value TEXT;
  username_value TEXT;
BEGIN
  -- Generate display name based on user type
  IF NEW.is_anonymous THEN
    -- Anonymous users get a guest name
    display_name_value := 'Guest_' || SUBSTRING(NEW.id::text, 1, 6);
    username_value := NULL;
  ELSE
    -- Registered users: use full name from metadata, or email prefix, or fallback
    display_name_value := COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      SPLIT_PART(NEW.email, '@', 1),
      'User_' || SUBSTRING(NEW.id::text, 1, 6)
    );

    -- Generate username from email (lowercase, alphanumeric only)
    IF NEW.email IS NOT NULL THEN
      username_value := LOWER(REGEXP_REPLACE(SPLIT_PART(NEW.email, '@', 1), '[^a-z0-9]', '', 'g'));
    ELSE
      username_value := NULL;
    END IF;
  END IF;

  -- Insert profile (ON CONFLICT DO NOTHING prevents errors if profile already exists)
  INSERT INTO public.profiles (
    id,
    username,
    display_name,
    avatar_url,
    is_anonymous,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    username_value,
    display_name_value,
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.is_anonymous, false),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger that fires after user insertion
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add comment for documentation
COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates a profile in public.profiles when a new user signs up';
