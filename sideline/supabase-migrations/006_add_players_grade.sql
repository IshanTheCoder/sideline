-- Add any missing columns to players (number, position, grade).
-- Run this in Supabase Dashboard → SQL Editor if you see schema cache errors like:
-- "Could not find the 'number' / 'position' / 'grade' column of 'players' in the schema cache"
--
-- Step 1: Add columns if missing (safe to run even if they exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'players' AND column_name = 'number') THEN
    ALTER TABLE public.players ADD COLUMN number TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'players' AND column_name = 'position') THEN
    ALTER TABLE public.players ADD COLUMN position TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'players' AND column_name = 'grade') THEN
    ALTER TABLE public.players ADD COLUMN grade TEXT;
  END IF;
END $$;

-- Step 2: Reload PostgREST schema cache so new columns are recognized
NOTIFY pgrst, 'reload schema';
