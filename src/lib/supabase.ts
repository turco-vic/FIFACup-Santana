import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Link de redefinição de senha: se a URL /reset-password não estiver nas Redirect URLs do
// Supabase, o link cai na Site URL ("/") e a pessoa entrava logada sem nunca ver a tela de nova
// senha. Onde quer que caia, leva para lá (a sessão de recuperação já fica salva).
// Registrado aqui, junto da criação do cliente, para não perder o evento disparado ao ler o link.
supabase.auth.onAuthStateChange(event => {
  if (event === 'PASSWORD_RECOVERY' && window.location.pathname !== '/reset-password') {
    window.location.replace('/reset-password')
  }
})

// Lança o erro de uma resposta do Supabase, para sequências de escritas pararem no
// primeiro erro e caírem num único catch
export function check<T extends { error: unknown }>(res: T): T {
  if (res.error) throw res.error
  return res
}

// Apaga partidas e os gols delas. Os gols saem antes para funcionar mesmo que a FK
// goals.match_id não tenha ON DELETE CASCADE no banco (sem isso o delete de um jogo com gols
// falha com 23503). Em lotes, para a URL do filtro .in() não ficar grande demais.
export async function deleteMatches(ids: string[]) {
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100)
    check(await supabase.from('goals').delete().in('match_id', batch))
    check(await supabase.from('matches').delete().in('id', batch))
  }
}

// Todas as partidas do campeonato (regerar / resetar)
export async function deleteTournamentMatches(tournamentId: string) {
  const { data } = check(await supabase.from('matches').select('id').eq('tournament_id', tournamentId))
  await deleteMatches((data ?? []).map(m => m.id))
}
