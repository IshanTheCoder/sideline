import { supabase } from './supabase';

export interface SignUpData {
  email: string;
  password: string;
  username: string;
  sport: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface UserProfile {
  id: string;
  username: string;
  sport: string;
  created_at: string;
  updated_at: string;
}

/**
 * Sign up a new user
 */
export async function signUp({ email, password, username, sport }: SignUpData) {
  try {
    // Create auth user with metadata
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          sport,
        },
      },
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Failed to create user');

    // Create user profile
    // Note: If using database trigger, this might create a duplicate
    // In that case, use ON CONFLICT DO UPDATE or remove the trigger
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        username,
        sport,
      });

    if (profileError) {
      // Profile creation failed - user is still created in auth
      // They can complete profile setup later or we handle this gracefully
      console.error('Profile creation error:', profileError);
      // Still return success since auth user was created
      // Profile can be created on next login if needed
    }

    return { user: authData.user, error: null };
  } catch (error: any) {
    return { user: null, error: error.message || 'Failed to sign up' };
  }
}

/**
 * Sign in an existing user
 */
export async function signIn({ email, password }: SignInData) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return { user: data.user, error: null };
  } catch (error: any) {
    return { user: null, error: error.message || 'Failed to sign in' };
  }
}

/**
 * Sign out the current user
 */
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (error: any) {
    return { error: error.message || 'Failed to sign out' };
  }
}

/**
 * Get the current user's profile
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

/**
 * Get the current session
 */
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}
