// A) Classificação: pontos, saldo, desempates, empates triplos, time sem jogos
import { describe, expect, it } from 'vitest'
import { compareStandings, computeStandings, profileEntity, tiedOnAllCriteria, type Entity } from '../../src/lib/standings'
import type { Match, Profile, Standing } from '../../src/types'
import { mkMatch, mulberry32, played } from './helpers'

const E = (...ids: string[]): Entity[] => ids.map(id => ({ id, name: id.toUpperCase() }))
const byId = (rows: Standing[]) => Object.fromEntries(rows.map(r => [r.id, r]))
const order = (rows: Standing[]) => rows.map(r => r.id)

function shuffled<T>(arr: T[], rand: () => number): T[] {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1))
        ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
}

describe('computeStandings — pontuação', () => {
    it('vitória 3, empate 1, derrota 0; gols pró/contra e saldo', () => {
        const rows = byId(computeStandings(E('a', 'b', 'c'), [
            played('a', 'b', 3, 1),
            played('b', 'c', 2, 2),
            played('c', 'a', 0, 1),
        ]))
        expect(rows.a).toMatchObject({ played: 2, wins: 2, draws: 0, losses: 0, goals_for: 4, goals_against: 1, goal_diff: 3, points: 6 })
        expect(rows.b).toMatchObject({ played: 2, wins: 0, draws: 1, losses: 1, goals_for: 3, goals_against: 5, goal_diff: -2, points: 1 })
        expect(rows.c).toMatchObject({ played: 2, wins: 0, draws: 1, losses: 1, goals_for: 2, goals_against: 3, goal_diff: -1, points: 1 })
    })

    it('0×0 é empate com 1 ponto para cada', () => {
        const rows = byId(computeStandings(E('a', 'b'), [played('a', 'b', 0, 0)]))
        expect(rows.a.points).toBe(1)
        expect(rows.b.points).toBe(1)
        expect(rows.a.draws).toBe(1)
    })

    it('pênaltis não mudam a conta: o jogo vale como empate (decidem só quem avança)', () => {
        const rows = byId(computeStandings(E('a', 'b'), [
            played('a', 'b', 1, 1, { stage: 'quarters', home_penalties: 5, away_penalties: 4 }),
        ]))
        expect(rows.a).toMatchObject({ draws: 1, points: 1, goals_for: 1 })
        expect(rows.b).toMatchObject({ draws: 1, points: 1, goals_for: 1 })
    })

    it('ignora partidas não jogadas e partidas "jogadas" sem placar', () => {
        const rows = byId(computeStandings(E('a', 'b'), [
            mkMatch({ home_id: 'a', away_id: 'b' }),
            mkMatch({ home_id: 'a', away_id: 'b', played: true, home_score: null, away_score: 2 }),
            mkMatch({ home_id: 'a', away_id: 'b', played: false, home_score: 5, away_score: 0 }),
        ]))
        expect(rows.a.played).toBe(0)
        expect(rows.b.played).toBe(0)
    })

    it('time com 0 jogos aparece zerado (não some da tabela)', () => {
        const rows = computeStandings(E('a', 'b', 'z'), [played('a', 'b', 1, 0)])
        expect(rows).toHaveLength(3)
        expect(byId(rows).z).toMatchObject({ played: 0, wins: 0, draws: 0, losses: 0, goals_for: 0, goals_against: 0, goal_diff: 0, points: 0 })
    })

    it('tabela sem nenhum jogo: todos zerados, ordem estável pelo nome', () => {
        const rows = computeStandings([{ id: '2', name: 'Zeca' }, { id: '1', name: 'Ana' }, { id: '3', name: 'Bia' }], [])
        expect(rows.map(r => r.name)).toEqual(['Ana', 'Bia', 'Zeca'])
    })

    it('jogos contra quem não está na lista contam só para o lado listado (perfil do jogador)', () => {
        const rows = computeStandings(E('a'), [played('a', 'x', 2, 0), played('y', 'a', 3, 3)])
        expect(rows).toHaveLength(1)
        expect(rows[0]).toMatchObject({ played: 2, wins: 1, draws: 1, goals_for: 5, goals_against: 3, points: 4 })
    })

    it('placar alto e goleada não estouram nada', () => {
        const rows = byId(computeStandings(E('a', 'b'), [played('a', 'b', 99, 0)]))
        expect(rows.a.goal_diff).toBe(99)
        expect(rows.b.goal_diff).toBe(-99)
    })

    it('não altera os objetos de entrada', () => {
        const ents = E('a', 'b')
        const ms = [played('a', 'b', 1, 0)]
        const snapshot = JSON.stringify([ents, ms])
        computeStandings(ents, ms)
        expect(JSON.stringify([ents, ms])).toBe(snapshot)
    })
})

describe('computeStandings — critérios de desempate', () => {
    it('1º pontos', () => {
        // b: 3 pts com saldo +1; a: 1 pt com saldo 0 → b na frente
        const rows = computeStandings(E('a', 'b', 'c'), [played('a', 'c', 2, 2), played('b', 'c', 1, 0)])
        expect(order(rows)).toEqual(['b', 'a', 'c'])
    })

    it('2º saldo de gols (mesmos pontos)', () => {
        const rows = computeStandings(E('a', 'b', 'x'), [played('a', 'x', 1, 0), played('b', 'x', 4, 0)])
        expect(order(rows).slice(0, 2)).toEqual(['b', 'a'])
    })

    it('3º gols pró (mesmos pontos e saldo)', () => {
        // a: 3×2 (+1, 3 gols), b: 1×0 (+1, 1 gol)
        const rows = computeStandings(E('a', 'b', 'x', 'y'), [played('a', 'x', 3, 2), played('b', 'y', 1, 0)])
        expect(order(rows).slice(0, 2)).toEqual(['a', 'b'])
    })

    it('saldo vence gols pró: +3 com 3 gols fica à frente de +2 com 8 gols', () => {
        const rows = computeStandings(E('a', 'b', 'x', 'y'), [played('a', 'x', 3, 0), played('b', 'y', 8, 6)])
        expect(order(rows).slice(0, 2)).toEqual(['a', 'b'])
    })

    it('empate em tudo: ordem pelo nome e depois pelo id (não depende da ordem do banco)', () => {
        const ents: Entity[] = [{ id: 'id-2', name: 'Bruno' }, { id: 'id-1', name: 'Bruno' }, { id: 'id-3', name: 'Ana' }]
        const rows = computeStandings(ents, [])
        expect(rows.map(r => r.id)).toEqual(['id-3', 'id-1', 'id-2'])
    })

    it('empate TRIPLO circular (a>b, b>c, c>a, todos 1×0): resolvido por nome, igual em qualquer ordem de entrada', () => {
        const ents = E('c', 'a', 'b')
        const ms = [played('a', 'b', 1, 0), played('b', 'c', 1, 0), played('c', 'a', 1, 0)]
        const base = computeStandings(ents, ms)
        expect(base.every(r => r.points === 3 && r.goal_diff === 0 && r.goals_for === 1)).toBe(true)
        expect(order(base)).toEqual(['a', 'b', 'c'])
        const rand = mulberry32(7)
        for (let i = 0; i < 50; i++) {
            expect(order(computeStandings(shuffled(ents, rand), shuffled(ms, rand)))).toEqual(['a', 'b', 'c'])
        }
    })

    it('empate triplo só em pontos é desfeito por saldo e gols', () => {
        // a>b 3×0, b>c 2×0, c>a 1×0 → todos 3 pts; saldos a +2, b -1, c -1; gols b 2, c 1
        const rows = computeStandings(E('a', 'b', 'c'), [played('a', 'b', 3, 0), played('b', 'c', 2, 0), played('c', 'a', 1, 0)])
        expect(order(rows)).toEqual(['a', 'b', 'c'])
        expect(rows.map(r => r.goal_diff)).toEqual([2, -1, -1])
    })

    it('compareStandings e tiedOnAllCriteria são consistentes', () => {
        const s = (points: number, gd: number, gf: number): Standing => ({
            id: 'x', name: 'x', played: 0, wins: 0, draws: 0, losses: 0,
            goals_for: gf, goals_against: gf - gd, goal_diff: gd, points,
        })
        expect(compareStandings(s(3, 0, 0), s(1, 5, 5))).toBeLessThan(0)
        expect(compareStandings(s(3, 1, 0), s(3, 0, 9))).toBeLessThan(0)
        expect(compareStandings(s(3, 1, 4), s(3, 1, 2))).toBeLessThan(0)
        expect(tiedOnAllCriteria(s(3, 1, 2), s(3, 1, 2))).toBe(true)
        expect(tiedOnAllCriteria(s(3, 1, 2), s(3, 1, 3))).toBe(false)
    })

    it('profileEntity usa apelido, depois nome, depois "Sem nome"', () => {
        const p = (username: string | null, name: string | null) => ({ id: 'p', username, name } as Profile)
        expect(profileEntity(p('turco', 'Enzo')).name).toBe('turco')
        expect(profileEntity(p(null, 'Enzo')).name).toBe('Enzo')
        expect(profileEntity(p(null, null)).name).toBe('Sem nome')
    })
})

// Implementação de referência, escrita do zero e de outro jeito, para comparar em tabelas aleatórias
function referenceStandings(ents: Entity[], ms: Match[]) {
    return ents.map(e => {
        let pts = 0, gf = 0, ga = 0, j = 0
        for (const m of ms) {
            if (!m.played || m.home_score === null || m.away_score === null) continue
            const home = m.home_id === e.id, away = m.away_id === e.id
            if (!home && !away) continue
            const own = home ? m.home_score : m.away_score
            const opp = home ? m.away_score : m.home_score
            j++; gf += own; ga += opp
            pts += own > opp ? 3 : own === opp ? 1 : 0
        }
        return { id: e.id, name: e.name, pts, gd: gf - ga, gf, j }
    }).sort((a, b) =>
        (b.pts - a.pts) || (b.gd - a.gd) || (b.gf - a.gf) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
}

describe('computeStandings — propriedade: bate com a referência em 3.000 tabelas aleatórias', () => {
    it('grupos de 2 a 8 jogadores, placares 0–6, parte dos jogos sem resultado', () => {
        const rand = mulberry32(2026)
        for (let t = 0; t < 3000; t++) {
            const n = 2 + Math.floor(rand() * 7)
            const ents: Entity[] = Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `N${Math.floor(rand() * 4)}` }))
            const ms: Match[] = []
            for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
                ms.push(rand() < 0.85
                    ? played(`p${i}`, `p${j}`, Math.floor(rand() * 7), Math.floor(rand() * 7))
                    : mkMatch({ home_id: `p${i}`, away_id: `p${j}` }))
            }
            const got = computeStandings(ents, ms)
            const ref = referenceStandings(ents, ms)
            expect(got.map(r => [r.id, r.points, r.goal_diff, r.goals_for, r.played]))
                .toEqual(ref.map(r => [r.id, r.pts, r.gd, r.gf, r.j]))
            // Somatório: gols pró = gols contra; vitórias = derrotas (todo jogo é entre dois listados)
            expect(got.reduce((a, r) => a + r.goals_for, 0)).toBe(got.reduce((a, r) => a + r.goals_against, 0))
            expect(got.reduce((a, r) => a + r.wins, 0)).toBe(got.reduce((a, r) => a + r.losses, 0))
        }
    })
})
