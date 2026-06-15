import { supabaseAdmin } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

const globalForDb = globalThis as unknown as {
  __supabaseAdmin?: SupabaseClient;
};

export const getDb = (): SupabaseClient => {
  if (globalForDb.__supabaseAdmin) {
    return globalForDb.__supabaseAdmin;
  }
  globalForDb.__supabaseAdmin = supabaseAdmin;
  return supabaseAdmin;
};
