import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user profile from database
  const loadProfile = async (userId) => {
    try {
      console.log('📥 Loading profile for user:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // Avoid console.error here (it triggers the red error overlay in Expo)
        console.log('❌ Error loading profile:', error);
        // Silently handle missing profiles (common for new/OAuth users)
        setProfile(null);
        return;
      }

      console.log('✅ Profile loaded:', data);
      setProfile(data);
    } catch (error) {
      console.log('❌ Unexpected error loading profile:', error);
      setProfile(null);
    }
  };

  // Initialize auth state
  useEffect(() => {
    // Safety timeout - ensure loading never gets stuck
    const loadingTimeout = setTimeout(() => {
      setLoading(false);
    }, 3000); // 3 second timeout for faster web loading
    
    // Get initial session
    supabase.auth.getSession()
      .then(async ({ data: { session }, error }) => {
        clearTimeout(loadingTimeout);
        
        if (error) {
          setLoading(false);
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        
        // Load profile in background without blocking UI
        if (session?.user) {
          loadProfile(session.user.id);
        }
        
        setLoading(false);
      })
      .catch((error) => {
        clearTimeout(loadingTimeout);
        setLoading(false);
      });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          loadProfile(session.user.id);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    return () => {
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, []);

  // Sign up function
  const signUp = async (email, password, metadata) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      });

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  };

  // Sign in function
  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) {
        // Fallback to global sign-out if local fails
        await supabase.auth.signOut({ scope: 'global' });
      }
      setUser(null);
      setSession(null);
      setProfile(null);
    } catch (error) {
      // Ensure local state is cleared even if sign out fails
      setUser(null);
      setSession(null);
      setProfile(null);
    }
  };

  // Refresh profile function
  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id);
    }
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use the AuthContext
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
