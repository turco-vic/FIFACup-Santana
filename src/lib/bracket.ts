import type { Match, MatchStage } from '../types'
import { getWinner } from './matches'

// Ordem das fases eliminatórias. Um campeonato começa na fase que o nº de grupos define
// (ou direto na final, no liga + final) e segue até a final.
export const KO_STAGE_ORDER: MatchStage[] = ['round32', 'round16', 'quarters', 'semis', 'final']

// [mandante, visitante]; null = ainda não definido (jogo anterior sem resultado)
export type Pair = [string | null, string | null]

export type NewMatch = { stage: MatchStage; match_order: number; home_id: string; away_id: string }

export type BracketPlan = {
    keep: Match[]       // confronto continua certo: fica com o resultado
    remove: Match[]     // confronto mudou ou deixou de existir
    add: NewMatch[]     // confrontos novos
    undecided: Match[]  // jogados sem vencedor (empate antigo sem pênaltis): bloqueiam o plano
}

// 1ª fase a partir dos grupos (ranking de ids por grupo, já ordenado):
// 1º do grupo A × 2º do B, 1º do B × 2º do A, e assim por diante em pares de grupos
export function firstRoundFromGroups(groupRankings: string[][]): Pair[] {
    const pairs: Pair[] = []
    for (let i = 0; i + 1 < groupRankings.length; i += 2) {
        const a = groupRankings[i], b = groupRankings[i + 1]
        pairs.push([a[0] ?? null, b[1] ?? null], [b[0] ?? null, a[1] ?? null])
    }
    return pairs
}

// Próxima fase a partir dos vencedores da anterior, na ordem de match_order.
// Em blocos de 4 jogos cruza 0×2 e 1×3: 1º e 2º do mesmo grupo só se reencontram na final.
// Com 2 jogos (semifinais), é a final.
export function nextRoundPairs(winners: (string | null)[]): Pair[] {
    if (winners.length === 2) return [[winners[0], winners[1]]]
    const pairs: Pair[] = []
    for (let b = 0; b + 3 < winners.length; b += 4) {
        pairs.push([winners[b], winners[b + 2]], [winners[b + 1], winners[b + 3]])
    }
    return pairs
}

// A final antiga foi gravada com match_order 999; as demais fases usam 0..n-1
function slotOf(m: Match): number {
    return m.stage === 'final' ? 0 : m.match_order ?? 0
}

// Compara os confrontos esperados com os existentes, da `firstStage` até a final.
// Uma fase só recebe partidas novas se for a primeira, se já existir, ou se for `createStage`
// (botão "Gerar ..."). Fases seguintes que não existem ficam para quando a anterior terminar.
export function planBracket(
    firstStage: MatchStage,
    firstPairs: Pair[],
    matches: Match[],
    createStage?: MatchStage,
): BracketPlan {
    const plan: BracketPlan = { keep: [], remove: [], add: [], undecided: [] }
    let pairs: Pair[] | null = firstPairs

    for (const stage of KO_STAGE_ORDER.slice(KO_STAGE_ORDER.indexOf(firstStage))) {
        const existing = matches.filter(m => m.stage === stage)
        const active = pairs !== null && (stage === firstStage || stage === createStage || existing.length > 0)
        if (!active || pairs === null) {
            // Sem a fase anterior não há como esta estar certa
            plan.remove.push(...existing)
            pairs = null
            continue
        }

        const winners: (string | null)[] = []
        pairs.forEach(([home, away], slot) => {
            const inSlot = existing.filter(m => slotOf(m) === slot)
            const same = inSlot.find(m => m.home_id === home && m.away_id === away)
            plan.remove.push(...inSlot.filter(m => m !== same))
            if (same) {
                plan.keep.push(same)
                const w = getWinner(same)
                if (same.played && w === null) plan.undecided.push(same)
                winners.push(w)
            } else {
                if (home && away) plan.add.push({ stage, match_order: slot, home_id: home, away_id: away })
                winners.push(null)
            }
        })
        const slots = pairs.length
        plan.remove.push(...existing.filter(m => slotOf(m) >= slots))

        pairs = stage === 'final' ? null : nextRoundPairs(winners)
    }
    return plan
}

export function planIsEmpty(plan: BracketPlan): boolean {
    return plan.remove.length === 0 && plan.add.length === 0
}
