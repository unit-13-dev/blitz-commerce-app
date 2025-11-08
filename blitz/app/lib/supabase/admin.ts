import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!client) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      const missingVars = [];
      if (!supabaseUrl) missingVars.push('SUPABASE_URL');
      if (!serviceRoleKey) missingVars.push('SUPABASE_SERVICE_ROLE_KEY');
      
      throw new Error(
        `Supabase environment variables are not set: ${missingVars.join(', ')}. ` +
        `Please ensure these are set in your .env.local file or environment configuration.`
      );
    }

    try {
      client = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          persistSession: false,
        },
        db: {
          schema: 'public',
        },
      });
    } catch (error) {
      console.error('[getSupabaseAdmin] Failed to create Supabase client:', error);
      throw new Error(
        `Failed to initialize Supabase client: ${error instanceof Error ? error.message : String(error)}. ` +
        `Please check your SUPABASE_URL format.`
      );
    }
  }

  return client;
}
