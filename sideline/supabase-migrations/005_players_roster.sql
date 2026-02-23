-- Roster / Players table (per team)
-- Run in Supabase SQL Editor if you already have the main schema

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
