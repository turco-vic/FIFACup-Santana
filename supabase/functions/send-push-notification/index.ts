// C8: só quem pode editar o campeonato dispara push, e só para os participantes dele.
// O cliente manda apenas { match_id }; título, texto e link são montados aqui.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import WebPush from 'https://esm.sh/web-push@3.6.6'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type MatchRow = {
  id: string
  tournament_id: string
  mode: '1v1' | '2v2'
  home_id: string
  away_id: string
  home_score: number | null
  away_score: number | null
  home_penalties: number | null
  away_penalties: number | null
  played: boolean
}

type SubscriptionRow = { id: string; subscription: WebPush.PushSubscription }

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Não autenticado' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''

    // Cliente com a sessão de quem chamou: auth.uid() e RLS valem normalmente
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) return json({ error: 'Não autenticado' }, 401)

    const { match_id } = await req.json()
    if (typeof match_id !== 'string') return json({ error: 'match_id obrigatório' }, 400)

    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')

    const { data: match, error: matchError } = await admin
      .from('matches')
      .select('id, tournament_id, mode, home_id, away_id, home_score, away_score, home_penalties, away_penalties, played')
      .eq('id', match_id)
      .maybeSingle<MatchRow>()
    if (matchError) throw matchError
    if (!match) return json({ error: 'Partida não encontrada' }, 404)
    if (!match.played) return json({ error: 'Partida sem resultado' }, 400)

    // Mesma regra das policies: admin ativo (campeonato não encerrado) ou supreme
    const { data: canEdit, error: permError } = await userClient
      .rpc('can_edit_tournament', { t_id: match.tournament_id })
    if (permError) throw permError
    if (!canEdit) return json({ error: 'Sem permissão' }, 403)

    const names = await entityNames(admin, match)
    const pens = match.home_penalties !== null && match.away_penalties !== null
      ? ` (${match.home_penalties}×${match.away_penalties} pên.)`
      : ''
    const payload = JSON.stringify({
      title: 'FifaCup: Novo Resultado! ⚽',
      body: `${names[match.home_id] ?? '?'} ${match.home_score} x ${match.away_score} ${names[match.away_id] ?? '?'}${pens}`,
      url: `/tournament/${match.tournament_id}`,
    })

    // Só os participantes do campeonato
    const { data: members, error: membersError } = await admin
      .from('tournament_players')
      .select('player_id')
      .eq('tournament_id', match.tournament_id)
    if (membersError) throw membersError
    const memberIds = (members ?? []).map((m: { player_id: string }) => m.player_id)
    if (memberIds.length === 0) return json({ sent: 0 }, 200)

    const { data: subscriptions, error: subError } = await admin
      .from('push_subscriptions')
      .select('id, subscription')
      .in('user_id', memberIds)
      .returns<SubscriptionRow[]>()
    if (subError) throw subError

    WebPush.setVapidDetails(
      Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com',
      Deno.env.get('VAPID_PUBLIC_KEY') ?? '',
      Deno.env.get('VAPID_PRIVATE_KEY') ?? '',
    )

    const expired: string[] = []
    let sent = 0
    await Promise.all((subscriptions ?? []).map(async (sub) => {
      try {
        await WebPush.sendNotification(sub.subscription, payload)
        sent++
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode
        // 404/410: a inscrição não existe mais no navegador
        if (status === 404 || status === 410) expired.push(sub.id)
        else console.error('Erro ao enviar push:', err)
      }
    }))

    if (expired.length > 0) {
      const { error: delError } = await admin.from('push_subscriptions').delete().in('id', expired)
      if (delError) console.error('Erro ao limpar inscrições expiradas:', delError)
    }

    return json({ sent, expired: expired.length }, 200)
  } catch (error) {
    console.error(error)
    return json({ error: 'Erro interno' }, 500)
  }
})

// 1v1: nome do perfil; 2v2: nome da dupla ou "p1 & p2"
async function entityNames(
  admin: ReturnType<typeof createClient>,
  match: MatchRow,
): Promise<Record<string, string>> {
  const ids = [match.home_id, match.away_id]
  const profileName = (p: { username: string | null; name: string | null } | null) =>
    p?.username ?? p?.name ?? '?'

  if (match.mode === '2v2') {
    const { data, error } = await admin
      .from('duos')
      .select('id, duo_name, player1:player1_id(username, name), player2:player2_id(username, name)')
      .in('id', ids)
    if (error) throw error
    return Object.fromEntries((data ?? []).map((d: {
      id: string
      duo_name: string | null
      player1: { username: string | null; name: string | null } | null
      player2: { username: string | null; name: string | null } | null
    }) => [d.id, d.duo_name ?? `${profileName(d.player1)} & ${profileName(d.player2)}`]))
  }

  const { data, error } = await admin.from('profiles').select('id, username, name').in('id', ids)
  if (error) throw error
  return Object.fromEntries((data ?? []).map((p: { id: string; username: string | null; name: string | null }) =>
    [p.id, profileName(p)]))
}
