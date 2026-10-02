// Permissões no banco (RLS + triggers das migrations do repo), pelo supabase-js de verdade,
// como um usuário mal-intencionado faria pelo console do navegador
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
// @ts-expect-error módulo .mjs sem tipos
import { ANON_KEY, LOCAL_URL } from './local-stack/keys.mjs'
import { PASSWORD, RUN, createUser, expect, sql, test } from './support'
import { seedPlayers, seedTournament, type Seeded } from './seed'

test.describe.configure({ mode: 'serial' })

const run = RUN.toLowerCase()
let admin: Seeded, player: Seeded, outsider: Seeded
let pendingEmail = ''
let tid = ''
let matchId = ''

async function as(email: string): Promise<SupabaseClient> {
    const c = createClient(LOCAL_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
    const { error } = await c.auth.signInWithPassword({ email, password: PASSWORD })
    expect(error).toBeNull()
    return c
}

test.beforeAll(async () => {
    const ps = await seedPlayers('Sec', 5)
    ;[admin, player, outsider] = [ps[0], ps[1], ps[4]]
    tid = (await seedTournament({ tag: 'Sec', admin, players: ps.slice(0, 4), groups: [ps.slice(0, 2), ps.slice(2, 4)] })).id
    const [m] = await sql<{ id: string }>(`select id from public.matches where tournament_id = $1 limit 1`, [tid])
    matchId = m.id
    pendingEmail = `secpending+${run}@fifatest.local`
    await createUser({ email: pendingEmail, name: 'ZZZTEST_SecPendente', status: 'pending' })
})

test('S1 — sem login não se lê nada (I1)', async () => {
    const anon = createClient(LOCAL_URL, ANON_KEY, { auth: { persistSession: false } })
    for (const t of ['profiles', 'tournaments', 'matches', 'goals', 'tournament_players', 'groups']) {
        const { data, error } = await anon.from(t).select('*').limit(5)
        expect(error).toBeNull()
        expect(data, t).toEqual([])
    }
})

test('S2 — ninguém muda o próprio status/role (C1); conta pendente não cria nem entra em campeonato', async () => {
    const p = await as(pendingEmail)
    const me = (await p.auth.getUser()).data.user!.id
    const up = await p.from('profiles').update({ status: 'active' }).eq('id', me).select()
    expect(up.error?.code).toBe('42501')
    const up2 = await p.from('profiles').update({ role: 'supreme' }).eq('id', me).select()
    expect(up2.error?.code).toBe('42501')
    const t = await p.from('tournaments').insert({ name: `${RUN}_hack`, mode: '1v1', format: 'league', invite_code: 'HACK22', created_by: me }).select()
    expect(t.error).not.toBeNull()
    const j = await p.from('tournament_players').insert({ tournament_id: tid, player_id: me, role: 'player' }).select()
    expect(j.error).not.toBeNull()
})

test('S3 — jogador comum não lança placar, não vira admin e não apaga partidas', async () => {
    const c = await as(player.email)
    const upd = await c.from('matches').update({ home_score: 9, away_score: 0, played: true }).eq('id', matchId).select('id')
    expect(upd.data ?? []).toEqual([]) // RLS: 0 linhas
    const del = await c.from('matches').delete().eq('tournament_id', tid).select('id')
    expect(del.data ?? []).toEqual([])
    const promote = await c.from('tournament_players').update({ role: 'admin' }).eq('tournament_id', tid).eq('player_id', player.id).select()
    expect(promote.data ?? []).toEqual([])
    // Entrar em outro campeonato como admin (C2): só como player
    const o = await as(outsider.email)
    const asAdmin = await o.from('tournament_players').insert({ tournament_id: tid, player_id: outsider.id, role: 'admin' }).select()
    expect(asAdmin.error).not.toBeNull()
    const [{ played }] = await sql<{ played: boolean }>(`select played from public.matches where id = $1`, [matchId])
    expect(played).toBe(false)
})

test('S4 — push: só quem pode editar o campeonato dispara (C8)', async () => {
    await sql(`update public.matches set home_score = 1, away_score = 0, played = true where id = $1`, [matchId])
    const c = await as(player.email)
    const r1 = await c.functions.invoke('send-push-notification', { body: { match_id: matchId } })
    expect(r1.error).not.toBeNull()
    expect((r1.error as { context?: Response }).context?.status).toBe(403)
    const a = await as(admin.email)
    const r2 = await a.functions.invoke('send-push-notification', { body: { match_id: matchId } })
    expect(r2.error).toBeNull()
})

test('S5 — admin com campeonato ENCERRADO não edita; supreme edita (can_edit_tournament)', async () => {
    await sql(`update public.tournaments set status = 'finished' where id = $1`, [tid])
    const a = await as(admin.email)
    const upd = await a.from('matches').update({ home_score: 5 }).eq('id', matchId).select('id')
    expect(upd.data ?? []).toEqual([])
    const supEmail = `secsup+${run}@fifatest.local`
    await createUser({ email: supEmail, name: 'ZZZTEST_SecSup', role: 'supreme' })
    const s = await as(supEmail)
    const upd2 = await s.from('matches').update({ home_score: 5 }).eq('id', matchId).select('id')
    expect(upd2.data).toHaveLength(1)
    // Admin ainda consegue reabrir (status) — senão ninguém destrava
    const reopen = await a.from('tournaments').update({ status: 'active' }).eq('id', tid).select('id')
    expect(reopen.data).toHaveLength(1)
})

test('S6 — banco recusa mata-mata empatado sem pênaltis e pênaltis empatados (I2)', async () => {
    const a = await as(admin.email)
    const ins = await a.from('matches').insert({
        tournament_id: tid, mode: '1v1', stage: 'final', match_order: 0, home_id: admin.id, away_id: player.id,
        home_score: 1, away_score: 1, played: true,
    }).select()
    expect(ins.error?.code).toBe('23514')
    const ins2 = await a.from('matches').insert({
        tournament_id: tid, mode: '1v1', stage: 'final', match_order: 0, home_id: admin.id, away_id: player.id,
        home_score: 1, away_score: 1, home_penalties: 3, away_penalties: 3, played: true,
    }).select()
    expect(ins2.error?.code).toBe('23514')
    // Pênaltis num jogo que não empatou são zerados pelo trigger
    const ok = await a.from('matches').insert({
        tournament_id: tid, mode: '1v1', stage: 'final', match_order: 0, home_id: admin.id, away_id: player.id,
        home_score: 2, away_score: 1, home_penalties: 5, away_penalties: 4, played: true,
    }).select().single()
    expect(ok.error).toBeNull()
    expect([ok.data.home_penalties, ok.data.away_penalties]).toEqual([null, null])
    // Gols vieram do placar, no mesmo insert (trigger)
    const goals = await sql<{ player_id: string; quantity: number }>(
        `select player_id, quantity from public.goals where match_id = $1 order by quantity desc`, [ok.data.id])
    expect(goals).toEqual([{ player_id: admin.id, quantity: 2 }, { player_id: player.id, quantity: 1 }])
    // Editar o placar refaz os gols; 0 gols não cria linha
    await a.from('matches').update({ home_score: 0, away_score: 3 }).eq('id', ok.data.id)
    const goals2 = await sql(`select player_id, quantity from public.goals where match_id = $1`, [ok.data.id])
    expect(goals2).toEqual([{ player_id: player.id, quantity: 3 }])
})
