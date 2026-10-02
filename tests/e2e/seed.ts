// Semeadura rápida (SQL direto no Postgres local) para os fluxos que não são o foco do teste
import { RUN, createUser, sql } from './support'

export type Seeded = { id: string; name: string; email: string }

export async function seedPlayers(tag: string, n: number): Promise<Seeded[]> {
    const run = RUN.toLowerCase()
    const out: Seeded[] = []
    for (let i = 1; i <= n; i++) {
        const name = `ZZZTEST_${tag}${String(i).padStart(2, '0')}`
        const email = `bot+${run}-${tag.toLowerCase()}${i}@fifatest.local`
        out.push({ id: await createUser({ email, name }), name, email })
    }
    return out
}

let codeSeq = 0
export async function seedTournament(opts: {
    tag: string; admin: Seeded; players: Seeded[]; groups?: Seeded[][]; results?: boolean
    status?: 'setup' | 'active' | 'finished'
}): Promise<{ id: string; code: string }> {
    const code = `Z${String(Date.now() % 100000 + ++codeSeq).padStart(5, '2')}`.replace(/[01]/g, '9')
    const [t] = await sql<{ id: string }>(
        `insert into public.tournaments (name, mode, format, invite_code, created_by, status)
         values ($1, '1v1', 'groups_knockout', $2, $3, $4) returning id`,
        [`${RUN}_${opts.tag}`, code, opts.admin.id, opts.status ?? 'active'])
    for (const p of opts.players) {
        if (p.id !== opts.admin.id) await sql(`insert into public.tournament_players (tournament_id, player_id) values ($1, $2)`, [t.id, p.id])
    }
    for (const [gi, members] of (opts.groups ?? []).entries()) {
        const [g] = await sql<{ id: string }>(`insert into public.groups (tournament_id, name) values ($1, $2) returning id`,
            [t.id, `Grupo ${'ABCDEFGH'[gi]}`])
        let order = 0
        for (const p of members) await sql(`insert into public.group_members (group_id, player_id) values ($1, $2)`, [g.id, p.id])
        for (let i = 0; i < members.length; i++) for (let j = i + 1; j < members.length; j++) {
            await sql(`insert into public.matches (tournament_id, mode, stage, match_order, home_id, away_id, home_score, away_score, played)
                       values ($1, '1v1', 'groups', $2, $3, $4, $5, $6, $7)`,
                [t.id, order++, members[i].id, members[j].id,
                    opts.results ? 2 : null, opts.results ? 1 : null, !!opts.results])
        }
    }
    return { id: t.id, code }
}
