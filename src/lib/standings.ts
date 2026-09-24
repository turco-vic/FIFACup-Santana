import type { Match, Profile, Standing } from '../types'

// Quem aparece numa tabela: jogador (1v1) ou dupla (2v2)
export type Entity = { id: string; name: string }

export function profileEntity(p: Profile): Entity {
    return { id: p.id, name: p.username ?? p.name ?? 'Sem nome' }
}

// Critérios de desempate: pontos, saldo, gols pró
export function compareStandings(a: Standing, b: Standing): number {
    return b.points - a.points || b.goal_diff - a.goal_diff || b.goals_for - a.goals_for
}

export function tiedOnAllCriteria(a: Standing, b: Standing): boolean {
    return compareStandings(a, b) === 0
}

// Classificação ordenada. Vitória 3, empate 1 — pelo placar do tempo normal:
// pênaltis decidem quem avança no mata-mata, mas o jogo conta como empate.
// Cada lado é contado de forma independente, então dá para calcular um único jogador
// sobre partidas contra adversários que não estão na lista.
export function computeStandings(entities: Entity[], matches: Match[]): Standing[] {
    const table: Record<string, Standing> = {}
    for (const e of entities) {
        table[e.id] = {
            id: e.id, name: e.name,
            played: 0, wins: 0, draws: 0, losses: 0,
            goals_for: 0, goals_against: 0, goal_diff: 0, points: 0,
        }
    }

    for (const m of matches) {
        if (!m.played || m.home_score === null || m.away_score === null) continue
        const sides: [string, number, number][] = [
            [m.home_id, m.home_score, m.away_score],
            [m.away_id, m.away_score, m.home_score],
        ]
        for (const [entityId, own, opp] of sides) {
            const s = table[entityId]
            if (!s) continue
            s.played++
            s.goals_for += own
            s.goals_against += opp
            if (own > opp) { s.wins++; s.points += 3 }
            else if (own === opp) { s.draws++; s.points++ }
            else s.losses++
        }
    }

    return Object.values(table)
        .map(s => ({ ...s, goal_diff: s.goals_for - s.goals_against }))
        .sort(compareStandings)
}
