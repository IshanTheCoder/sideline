import { supabase } from './supabase';

/**
 * Test Supabase connection and basic operations
 */
export async function testSupabaseConnection() {
  try {
    console.log('🧪 Testing Supabase connection...');
    
    // Test 1: Check if client is initialized
    if (!supabase) {
      console.error('❌ Supabase client is not initialized');
      return false;
    }
    console.log('✅ Supabase client initialized');
    
    // Test 2: Try to get session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.log('⚠️  Session check failed:', sessionError.message);
    } else {
      console.log('✅ Session check successful');
      console.log('   User:', sessionData.session?.user?.email || 'No user');
    }
    
    // Test 3: Try to query a table (will fail if table doesn't exist, but connection works)
    const { error: queryError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (queryError) {
      console.log('⚠️  Table query test:', queryError.message);
      console.log('   (This is normal if database is not set up yet)');
    } else {
      console.log('✅ Table query successful');
    }
    
    console.log('✅ Supabase connection test complete');
    return true;
  } catch (error) {
    console.error('❌ Supabase connection test failed:', error);
    return false;
  }
}

/**
 * Test Supabase Storage
 */
export async function testSupabaseStorage() {
  try {
    console.log('🧪 Testing Supabase Storage...');
    
    // List buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.log('❌ Storage test failed:', bucketsError.message);
      return false;
    }
    
    console.log('✅ Storage accessible');
    console.log('   Buckets:', buckets.map(b => b.name).join(', ') || 'None');
    
    return true;
  } catch (error) {
    console.error('❌ Storage test failed:', error);
    return false;
  }
}

/**
 * Run all Supabase tests
 */
export async function runAllSupabaseTests() {
  console.log('🚀 Running all Supabase tests...\n');
  
  const connectionOk = await testSupabaseConnection();
  console.log('');
  
  const storageOk = await testSupabaseStorage();
  console.log('');
  
  if (connectionOk && storageOk) {
    console.log('✅ All tests passed!');
  } else {
    console.log('⚠️  Some tests failed (see details above)');
  }
  
  return connectionOk && storageOk;
}
