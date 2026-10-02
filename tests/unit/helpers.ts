import { vi } from 'vitest'
import type { Match, MatchStage } from '../../src/types'

// PRNG determinístico (mulberry32): os testes estatísticos e as simulações são reprodutíveis
export function mulberry32(seed: number): () => number {
    let a = seed >>> 0
    return () => {
        a = (a + 0x6D2B79F5) >>> 0
        let t = a
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

// Troca Math.random por um gerador com semente durante `fn` (shuffle/drawGroups usam Math.random)
export function withSeededRandom<T>(seed: number, fn: () => T): T {
    const rand = mulberry32(seed)
    const spy = vi.spyOn(Math, 'random').mockImplementation(rand)
    try { return fn() } finally { spy.mockRestore() }
}

let matchSeq = 0
export function mkMatch(p: Partial<Match> & { home_id: string; away_id: string }): Match {
    matchSeq++
    return {
        id: p.id ?? `m${matchSeq}`,
        tournament_id: 't1',
        mode: '1v1',
        stage: 'groups' as MatchStage,
        home_score: null,
        away_score: null,
        home_penalties: null,
        away_penalties: null,
        played: false,
        match_order: 0,
        created_at: '2026-10-03T12:00:00Z',
        ...p,
    }
}

// Partida jogada com placar (e pênaltis opcionais)
export function played(home_id: string, away_id: string, hs: number, as: number,
    extra: Partial<Match> = {}): Match {
    return mkMatch({ home_id, away_id, home_score: hs, away_score: as, played: true, ...extra })
}

// Estatística qui-quadrado de contagens observadas contra frequência esperada uniforme
export function chiSquare(observed: number[], expectedEach: number): number {
    return observed.reduce((acc, o) => acc + (o - expectedEach) ** 2 / expectedEach, 0)
}

// Valor crítico aproximado (Wilson–Hilferty) do qui-quadrado para `df` graus de liberdade.
// z = 3.29 → p ≈ 0.0005 unicaudal: falso alarme raríssimo, mas pega viés de verdade.
export function chiSquareCritical(df: number, z = 3.29): number {
    const a = 2 / (9 * df)
    return df * (1 - a + z * Math.sqrt(a)) ** 3
}
