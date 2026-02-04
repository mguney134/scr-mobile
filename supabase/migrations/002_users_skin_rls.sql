-- RLS policies for public.users so authenticated users can read/insert/update their own row.
-- Run this if skin_type / skin_concerns are not saving (often due to RLS blocking UPDATE).
-- If RLS is not enabled on public.users yet, enable it in Dashboard first, then run this.

-- Allow users to select their own row
DROP POLICY IF EXISTS users_select_own ON public.users;
CREATE POLICY users_select_own ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Allow users to insert their own row (e.g. on first signup)
DROP POLICY IF EXISTS users_insert_own ON public.users;
CREATE POLICY users_insert_own ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow users to update their own row (e.g. skin_type, skin_concerns, updated_at)
DROP POLICY IF EXISTS users_update_own ON public.users;
CREATE POLICY users_update_own ON public.users
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
