import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Lança o erro de uma resposta do Supabase, para sequências de escritas pararem no
// primeiro erro e caírem num único catch
export function check<T extends { error: unknown }>(res: T): T {
  if (res.error) throw res.error
  return res
}
