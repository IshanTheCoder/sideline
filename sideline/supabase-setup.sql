-- =====================================================
-- SIDELINE APP - COMPLETE SUPABASE SETUP SCRIPT
-- =====================================================
-- Run this entire script in Supabase SQL Editor
-- to set up all required tables and policies
-- =====================================================

-- 1. CREATE PROFILES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  username TEXT,
  name TEXT,
  sport TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);


-- 2. CREATE TEAMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  sport TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own teams"
  ON public.teams FOR SELECT
  USING (auth.uid() = coach_id);

CREATE POLICY "Users can insert own teams"
  ON public.teams FOR INSERT
  WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Users can update own teams"
  ON public.teams FOR UPDATE
  USING (auth.uid() = coach_id);

CREATE POLICY "Users can delete own teams"
  ON public.teams FOR DELETE
  USING (auth.uid() = coach_id);


-- 3. CREATE GAME_SESSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.game_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  opponent_name TEXT NOT NULL,
  date DATE NOT NULL,
  location TEXT,
  match_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.game_sessions
ADD COLUMN IF NOT EXISTS match_type TEXT;

ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own game sessions"
  ON public.game_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = game_sessions.team_id
      AND teams.coach_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own game sessions"
  ON public.game_sessions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = game_sessions.team_id
      AND teams.coach_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own game sessions"
  ON public.game_sessions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = game_sessions.team_id
      AND teams.coach_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own game sessions"
  ON public.game_sessions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = game_sessions.team_id
      AND teams.coach_id = auth.uid()
    )
  );


-- 4. CREATE PLAYERS (ROSTER) TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  number TEXT,
  position TEXT,
  grade TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_players_team_id ON public.players(team_id);

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view players of own teams"
  ON public.players FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = players.team_id AND teams.coach_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert players to own teams"
  ON public.players FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = players.team_id AND teams.coach_id = auth.uid()
    )
  );

CREATE POLICY "Users can update players of own teams"
  ON public.players FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = players.team_id AND teams.coach_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete players of own teams"
  ON public.players FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = players.team_id AND teams.coach_id = auth.uid()
    )
  );


-- 5. CREATE RECORDINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.recordings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  game_session_id UUID REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  audio_url TEXT NOT NULL,
  duration INTEGER NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'new',
  transcription TEXT,
  ai_labels TEXT,
  manual_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recordings"
  ON public.recordings FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.game_sessions
      JOIN public.teams ON teams.id = game_sessions.team_id
      WHERE game_sessions.id = recordings.game_session_id
      AND teams.coach_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own recordings"
  ON public.recordings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recordings"
  ON public.recordings FOR UPDATE
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.game_sessions
      JOIN public.teams ON teams.id = game_sessions.team_id
      WHERE game_sessions.id = recordings.game_session_id
      AND teams.coach_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own recordings"
  ON public.recordings FOR DELETE
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.game_sessions
      JOIN public.teams ON teams.id = game_sessions.team_id
      WHERE game_sessions.id = recordings.game_session_id
      AND teams.coach_id = auth.uid()
    )
  );


-- =====================================================
-- VERIFICATION QUERY
-- =====================================================
-- Run this after the above to verify all tables were created:

SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE columns.table_name = tables.table_name) as column_count
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('profiles', 'teams', 'game_sessions', 'players', 'recordings')
ORDER BY table_name;

-- Expected output: 5 rows showing all tables with their column counts
