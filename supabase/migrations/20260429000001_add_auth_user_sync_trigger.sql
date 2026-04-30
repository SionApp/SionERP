-- Create missing trigger to sync auth.users with public.users
-- Without this, users created via Auth Studio (magic links, email/password)
-- only get a row in auth.users but NOT in public.users, causing 404s on GET /users/me

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
