import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_URL = process.env.SUPABASE_URL || 'https://wyvxxsrlnnlajscvqofy.supabase.co';
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5dnh4c3Jsbm5sYWpzY3Zxb2Z5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3NTk2MDUsImV4cCI6MjEwNDMzNTYwNX0.w-KoBZpfZQxNEhavOpl-Rqub6pw-VoocuiwxzPxl-o8';

export const supabaseServer: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

/**
 * Verify Supabase JWT token and retrieve the user.
 * Diagnostic logs safely mask the token and details the verification outcome without exposing secrets.
 */
export async function verifySupabaseToken(token: string) {
  const maskedToken = token.length > 12 
    ? `${token.substring(0, 6)}...${token.slice(-4)} (longueur: ${token.length})` 
    : '***';
  
  try {
    const { data: { user }, error } = await supabaseServer.auth.getUser(token);
    if (error) {
      console.warn(`[SupabaseServer] Échec validation token (${maskedToken}): ${error.message} (code: ${error.status || 401})`);
      return null;
    }
    if (!user) {
      console.warn(`[SupabaseServer] Token valide mais aucun utilisateur renvoyé (${maskedToken})`);
      return null;
    }
    console.log(`[SupabaseServer] Token vérifié avec succès: user_id=${user.id}, email=${user.email || 'non spécifié'}`);
    return user;
  } catch (err: any) {
    console.error(`[SupabaseServer] Exception vérification token (${maskedToken}):`, err?.message || err);
    return null;
  }
}

/**
 * Check connection health to Supabase (Auth, Storage, DB)
 */
export async function checkSupabaseStatus() {
  const result = {
    connected: true,
    url: SUPABASE_URL,
    authStatus: 'operational',
    storageStatus: 'operational',
    dbStatus: 'operational',
    buckets: [] as string[],
    details: {} as any,
  };

  try {
    // 1. Check Auth
    const { error: authError } = await supabaseServer.auth.getSession();
    if (authError) {
      result.authStatus = `error: ${authError.message}`;
    }

    // 2. Check Storage
    const { data: buckets, error: storageError } = await supabaseServer.storage.listBuckets();
    if (storageError) {
      result.storageStatus = `restricted: ${storageError.message}`;
    } else if (buckets) {
      result.buckets = buckets.map((b) => b.name);
    }

    // 3. Check DB
    const { error: dbError } = await supabaseServer.from('landing_pages').select('id').limit(1);
    if (dbError) {
      result.dbStatus = `note: ${dbError.message}`;
    } else {
      result.dbStatus = 'connected';
    }
  } catch (err: any) {
    result.connected = false;
    result.details.error = err?.message || String(err);
  }

  return result;
}

/**
 * Upload a file buffer to Supabase Storage
 */
export async function uploadToSupabaseStorage(
  bucket: string,
  filePath: string,
  buffer: Buffer,
  contentType: string
): Promise<{ url: string | null; error: string | null }> {
  try {
    const { data, error } = await supabaseServer.storage
      .from(bucket)
      .upload(filePath, buffer, {
        contentType,
        upsert: true,
      });

    if (error) {
      return { url: null, error: error.message };
    }

    const { data: urlData } = supabaseServer.storage.from(bucket).getPublicUrl(filePath);
    return { url: urlData?.publicUrl || null, error: null };
  } catch (err: any) {
    return { url: null, error: err?.message || 'Storage error' };
  }
}
