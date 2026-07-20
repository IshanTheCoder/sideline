-- 007: Schedule support on game_sessions.
-- Adds time-of-day, home/away venue, and a scheduled/played status so the app
-- can show an upcoming-games schedule and flip a scheduled game to "played"
-- the moment the coach starts capturing. Run this in the Supabase SQL editor.

ALTER TABLE public.game_sessions
  ADD COLUMN IF NOT EXISTS time TEXT,          -- e.g. '6:00 PM' (freeform, display-only)
  ADD COLUMN IF NOT EXISTS venue TEXT,         -- 'Home' | 'Away'
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'played';  -- 'scheduled' | 'played'

-- Existing rows were all created at record time, so they stay 'played' via the default.
