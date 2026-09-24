import type { Match, MatchStage } from '../types'

export const KNOCKOUT_STAGES: MatchStage[] = ['round32', 'round16', 'quarters', 'semis', 'final', 'knockout']

export function isKnockoutStage(stage: MatchStage): boolean {
    return KNOCKOUT_STAGES.includes(stage)
}

// Vencedor pelo placar; empatado, pelos pênaltis. null se não jogado ou sem vencedor definido.
export function getWinner(m: Match): string | null {
    if (!m.played || m.home_score === null || m.away_score === null) return null
    if (m.home_score !== m.away_score) return m.home_score > m.away_score ? m.home_id : m.away_id
    if (m.home_penalties === null || m.away_penalties === null || m.home_penalties === m.away_penalties) return null
    return m.home_penalties > m.away_penalties ? m.home_id : m.away_id
}

// "(4×3 pên.)" ou ''
export function penaltiesLabel(m: Match): string {
    return m.home_penalties !== null && m.away_penalties !== null
        ? `(${m.home_penalties}×${m.away_penalties} pên.)`
        : ''
}
