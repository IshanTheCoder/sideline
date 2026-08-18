-- 008: First-run tutorial flag on profiles.
-- The home-screen walkthrough must appear exactly once, for brand-new accounts
-- only. Keeping the flag on the profile (rather than only on the device) means a
-- coach who signs in on a second phone doesn't get the tour again.
-- Run this in the Supabase SQL editor.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tutorial_seen_at TIMESTAMPTZ;

-- Existing coaches already know the app — backfill them as "seen" so the
-- tutorial only ever shows to accounts created from here on.
UPDATE public.profiles
  SET tutorial_seen_at = COALESCE(created_at, NOW())
  WHERE tutorial_seen_at IS NULL;
