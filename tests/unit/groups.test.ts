// B) Dimensionamento dinâmico dos grupos + distribuição do sorteio + todos-contra-todos
import { describe, expect, it } from 'vitest'
import { drawGroups, planGroups, roundRobinPairs } from '../../src/lib/groups'
import { draftProblem, emptyDraft, moveInDraft, POOL } from '../../src/lib/groupDraft'
import { firstKoStage } from '../../src/lib/bracket'
import { chiSquare, chiSquareCritical, withSeededRandom } from './helpers'

const ids = (n: number) => Array.from({ length: n }, (_, i) => `p${String(i).padStart(2, '0')}`)

describe('planGroups — nº de grupos pelo nº de jogadores', () => {
    it.each([
        [0, null], [1, null], [2, null], [3, null],
        [4, 2], [5, 2], [6, 2], [7, 2],
        [8, 4], [9, 4], [13, 4], [16, 4], [19, 4], [20, 4],
        [21, 8], [22, 8], [30, 8], [33, 8], [39, 8], [40, 8],
        [41, null], [64, null], [-1, null],
    ])('%i jogadores → %s grupos', (n, expected) => {
        expect(planGroups(n)).toBe(expected)
    })

    it('limites exatos: 3/4, 7/8, 20/21, 40/41', () => {
        expect([planGroups(3), planGroups(4)]).toEqual([null, 2])
        expect([planGroups(7), planGroups(8)]).toEqual([2, 4])
        expect([planGroups(20), planGroups(21)]).toEqual([4, 8])
        expect([planGroups(40), planGroups(41)]).toEqual([8, null])
    })

    it('todo nº de grupos aceito tem 1ª fase de mata-mata (2→semis, 4→quartas, 8→oitavas)', () => {
        expect(firstKoStage(2)).toBe('semis')
        expect(firstKoStage(4)).toBe('quarters')
        expect(firstKoStage(8)).toBe('round16')
        for (let n = 4; n <= 40; n++) expect(firstKoStage(planGroups(n)!)).not.toBeNull()
        expect(firstKoStage(3)).toBeNull()
        expect(firstKoStage(0)).toBeNull()
    })
})

describe('drawGroups — sorteio dos grupos', () => {
    it('para 4..40 jogadores: ninguém some nem duplica, tamanhos diferem no máx. 1, todo grupo com 2+', () => {
        withSeededRandom(11, () => {
            for (let n = 4; n <= 40; n++) {
                const g = planGroups(n)!
                for (let rep = 0; rep < 20; rep++) {
                    const groups = drawGroups(ids(n), g)
                    expect(groups).toHaveLength(g)
                    const flat = groups.flat()
                    expect(flat).toHaveLength(n)
                    expect(new Set(flat).size).toBe(n)
                    expect([...flat].sort()).toEqual(ids(n))
                    const sizes = groups.map(x => x.length)
                    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1)
                    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(2)
                }
            }
        })
    })

    it('números que não dividem igual: 7 → 4+3, 9 → 3+2+2+2, 21 → 5×3 + 3×2, 22 → 6×3 + 2×2', () => {
        withSeededRandom(3, () => {
            const sizes = (n: number) => drawGroups(ids(n), planGroups(n)!).map(x => x.length)
            expect(sizes(7)).toEqual([4, 3])
            expect(sizes(9)).toEqual([3, 2, 2, 2])
            expect(sizes(20)).toEqual([5, 5, 5, 5])
            expect(sizes(21)).toEqual([3, 3, 3, 3, 3, 2, 2, 2])
            expect(sizes(22)).toEqual([3, 3, 3, 3, 3, 3, 2, 2])
            expect(sizes(40)).toEqual([5, 5, 5, 5, 5, 5, 5, 5])
        })
    })

    it('não altera a lista de entrada', () => {
        const list = ids(20)
        const copy = [...list]
        drawGroups(list, 4)
        expect(list).toEqual(copy)
    })

    it('justo: com 20 jogadores, cada um cai em cada grupo com chance ~25% (qui-quadrado, 40 mil sorteios)', () => {
        const players = ids(20)
        const RUNS = 40_000
        const counts: Record<string, number[]> = Object.fromEntries(players.map(p => [p, [0, 0, 0, 0]]))
        withSeededRandom(2026, () => {
            for (let r = 0; r < RUNS; r++) {
                drawGroups(players, 4).forEach((group, gi) => group.forEach(p => counts[p][gi]++))
            }
        })
        const crit = chiSquareCritical(3)
        for (const p of players) {
            expect(chiSquare(counts[p], RUNS / 4)).toBeLessThan(crit)
        }
        // E quem dividia grupo com quem também é uniforme (par p00/p01 juntos ~ 4/19)
        let together = 0
        withSeededRandom(99, () => {
            for (let r = 0; r < RUNS; r++) {
                const gs = drawGroups(players, 4)
                if (gs.some(g => g.includes('p00') && g.includes('p01'))) together++
            }
        })
        expect(together / RUNS).toBeGreaterThan(4 / 19 - 0.012)
        expect(together / RUNS).toBeLessThan(4 / 19 + 0.012)
    })
})

describe('roundRobinPairs — todos contra todos', () => {
    it('n(n-1)/2 partidas, cada par uma única vez, ninguém contra si mesmo (n = 0..40)', () => {
        for (let n = 0; n <= 40; n++) {
            const pairs = roundRobinPairs(ids(n))
            expect(pairs).toHaveLength((n * (n - 1)) / 2)
            const keys = new Set(pairs.map(([a, b]) => [a, b].sort().join('|')))
            expect(keys.size).toBe(pairs.length)
            expect(pairs.every(([a, b]) => a !== b)).toBe(true)
            // cada jogador joga n-1 vezes
            for (const p of ids(n)) {
                expect(pairs.filter(([a, b]) => a === p || b === p)).toHaveLength(n - 1)
            }
        }
    })

    it('20 jogadores em 4 grupos de 5 → 40 jogos de grupo (10 por grupo, 4 por jogador)', () => {
        withSeededRandom(5, () => {
            const groups = drawGroups(ids(20), 4)
            const total = groups.reduce((a, g) => a + roundRobinPairs(g).length, 0)
            expect(total).toBe(40)
        })
    })

    it('ordem atual: 0×1, 0×2, 0×3 ... (o 1º do grupo joga as primeiras partidas em sequência)', () => {
        expect(roundRobinPairs(['a', 'b', 'c', 'd'])).toEqual([
            ['a', 'b'], ['a', 'c'], ['a', 'd'], ['b', 'c'], ['b', 'd'], ['c', 'd'],
        ])
    })
})

describe('groupDraft — montagem manual (fluxo 4, lógica)', () => {
    const players = ids(8)

    it('montar à mão começa com todos em "Sem grupo" e não deixa confirmar', () => {
        const d = emptyDraft(4, players)
        expect(d.groups).toEqual([[], [], [], []])
        expect(d.pool).toEqual(players)
        expect(draftProblem(d, players)).toMatch(/Falta colocar 8 jogadores/)
    })

    it('mover um jogador tira de onde estava e põe no fim do destino; mover de novo não duplica', () => {
        let d = emptyDraft(2, players.slice(0, 4))
        d = moveInDraft(d, 'p00', 0)
        d = moveInDraft(d, 'p00', 1)
        d = moveInDraft(d, 'p00', 1)
        expect(d.groups).toEqual([[], ['p00']])
        expect(d.pool).toEqual(['p01', 'p02', 'p03'])
        d = moveInDraft(d, 'p00', POOL)
        expect(d.pool).toEqual(['p01', 'p02', 'p03', 'p00'])
        expect(d.groups.flat()).toEqual([])
    })

    it('não altera o rascunho anterior (estado do React)', () => {
        const d0 = emptyDraft(2, ['a', 'b'])
        const snap = JSON.stringify(d0)
        moveInDraft(d0, 'a', 0)
        expect(JSON.stringify(d0)).toBe(snap)
    })

    it('grupo com menos de 2 bloqueia; todos alocados com 2+ libera', () => {
        let d = emptyDraft(2, ['a', 'b', 'c', 'd'])
        for (const p of ['a', 'b', 'c']) d = moveInDraft(d, p, 0)
        d = moveInDraft(d, 'd', 1)
        expect(draftProblem(d, ['a', 'b', 'c', 'd'])).toMatch(/pelo menos 2/)
        d = moveInDraft(d, 'c', 1)
        expect(draftProblem(d, ['a', 'b', 'c', 'd'])).toBeNull()
    })

    it('lista de jogadores mudou depois do sorteio (alguém entrou/saiu) → pede para sortear de novo', () => {
        const d = { groups: [['a', 'b'], ['c', 'd']], pool: [] }
        expect(draftProblem(d, ['a', 'b', 'c', 'd', 'e'])).toMatch(/mudou/)
        expect(draftProblem(d, ['a', 'b', 'c'])).toMatch(/mudou/)
        expect(draftProblem(d, ['a', 'b', 'c', 'x'])).toMatch(/mudou/)
    })
})
