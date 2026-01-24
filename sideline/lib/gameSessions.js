import { supabase } from './supabase';

// Helper to get or create default team
const getOrCreateDefaultTeam = async (userId) => {
  try {
    const { data: existingTeam } = await supabase
      .from('teams')
      .select('id')
      .eq('coach_id', userId)
      .limit(1)
      .single();

    if (existingTeam) {
      return { id: existingTeam.id, error: null };
    }

    const { data: newTeam, error: teamError } = await supabase
      .from('teams')
      .insert({
        coach_id: userId,
        name: 'My Team',
        sport: 'volleyball',
      })
      .select()
      .single();

    if (teamError || !newTeam) {
      return {
        id: '',
        error: new Error('Failed to create team. Please try again.'),
      };
    }

    return { id: newTeam.id, error: null };
  } catch (error) {
    return {
      id: '',
      error: error,
    };
  }
};

// Create a new game session
export const createGameSession = async ({ userId, opponentName, date, location }) => {
  try {
    const { id: teamId, error: teamError } = await getOrCreateDefaultTeam(userId);
    if (teamError || !teamId) {
      return {
        id: '',
        error: teamError || new Error('Failed to get team'),
      };
    }

    const { data, error } = await supabase
      .from('game_sessions')
      .insert({
        team_id: teamId,
        opponent_name: opponentName,
        date: date.toISOString().split('T')[0],
        location: location ?? null,
      })
      .select('id')
      .single();

    if (error || !data) {
      return {
        id: '',
        error: error || new Error('Failed to create game session'),
      };
    }

    return { id: data.id, error: null };
  } catch (error) {
    return {
      id: '',
      error: error,
    };
  }
};
