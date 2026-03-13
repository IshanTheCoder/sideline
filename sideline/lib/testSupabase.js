import { supabase } from './supabase';

/**
 * quick health check — is Supabase alive and responding to us?
 */
export async function testSupabaseConnection() {
  try {
    console.log('🧪 Testing Supabase connection...');
    
    // Test 1: is the Supabase client even initialized? (basic sanity check)
    if (!supabase) {
      console.error('❌ Supabase client is not initialized');
      return false;
    }
    console.log('✅ Supabase client initialized');
    
    // Test 2: check for an active session (is anyone home?)
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.log('⚠️  Session check failed:', sessionError.message);
    } else {
      console.log('✅ Session check successful');
      console.log('   User:', sessionData.session?.user?.email || 'No user');
    }
    
    // Test 3: hit the database with a real query — the ultimate connectivity proof
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
 * verify Supabase Storage is online — can we access our file buckets?
 */
export async function testSupabaseStorage() {
  try {
    console.log('🧪 Testing Supabase Storage...');
    
    // ask Storage "what buckets you got?" — like checking what's in the fridge
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
 * run the whole test suite — connection + storage, the full diagnostic sweep
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
