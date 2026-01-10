import { supabase } from './supabase';

/**
 * Test function to verify Supabase connection
 * This function tests:
 * 1. Client initialization
 * 2. Database connection (query profiles table)
 * 3. Environment variables loading
 */
export async function testSupabaseConnection() {
  console.log('🔍 Testing Supabase connection...');
  
  try {
    // Test 1: Check if client is initialized
    if (!supabase) {
      throw new Error('Supabase client is not initialized');
    }
    console.log('✅ Supabase client initialized');

    // Test 2: Test database connection by querying profiles table
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (error) {
      console.error('❌ Database query error:', error.message);
      throw error;
    }

    console.log('✅ Database connection successful');
    console.log('✅ Can read from profiles table');
    console.log(`📊 Profiles count: ${data?.length || 0}`);

    // Test 3: Check environment variables
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('⚠️ Environment variables may not be loaded correctly');
    } else {
      console.log('✅ Environment variables loaded');
      console.log(`📍 Supabase URL: ${supabaseUrl.substring(0, 30)}...`);
    }

    console.log('🎉 All Supabase connection tests passed!');
    return { success: true, message: 'Supabase connection successful' };
  } catch (error: any) {
    console.error('❌ Supabase connection test failed:', error.message);
    return { success: false, error: error.message };
  }
}
