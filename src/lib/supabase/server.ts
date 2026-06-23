import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

/**
 * Client Supabase pour les Server Components / ISR.
 * Utilise uniquement la clé anonyme : il ne sert qu'à des LECTURES PUBLIQUES
 * (événements acceptés, etc.), jamais à des données dépendant de la session.
 * Pas de persistance de session ni de cookies (rendu côté serveur sans auth).
 */
export function createServerSupabase() {
  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
