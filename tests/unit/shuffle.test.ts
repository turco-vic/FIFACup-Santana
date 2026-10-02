// C) Sorteio Fisher-Yates: sem viés, ninguém some nem duplica
import { describe, expect, it } from 'vitest'
import { shuffle } from '../../src/lib/shuffle'
import { chiSquare, chiSquareCritical, withSeededRandom } from './helpers'

// Todas as permutações de [0..n-1] como chave "0,1,2,3"
function permutations(n: number): string[] {
    const out: string[] = []
    const rec = (prefix: number[], rest: number[]) => {
        if (rest.length === 0) { out.push(prefix.join(',')); return }
        rest.forEach((x, i) => rec([...prefix, x], [...rest.slice(0, i), ...rest.slice(i + 1)]))
    }
    rec([], Array.from({ length: n }, (_, i) => i))
    return out
}

describe('shuffle — integridade', () => {
    it('não altera a entrada e devolve exatamente os mesmos itens (0 a 40 itens, milhares de vezes)', () => {
        withSeededRandom(1, () => {
            for (let n = 0; n <= 40; n++) {
                const input = Array.from({ length: n }, (_, i) => `j${i}`)
                const frozen = Object.freeze([...input])
                for (let r = 0; r < 100; r++) {
                    const out = shuffle(frozen)
                    expect(out).toHaveLength(n)
                    expect(new Set(out).size).toBe(n)
                    expect([...out].sort()).toEqual([...input].sort())
                    expect(out).not.toBe(frozen)
                }
            }
        })
    })

    it('itens repetidos e objetos são preservados (por referência)', () => {
        const a = { id: 1 }, b = { id: 2 }
        const out = shuffle([a, b, a])
        expect(out.filter(x => x === a)).toHaveLength(2)
        expect(out.filter(x => x === b)).toHaveLength(1)
    })

    it('com Math.random real também: 10 mil sorteios de 20 jogadores sem perder ninguém', () => {
        const input = Array.from({ length: 20 }, (_, i) => i)
        for (let r = 0; r < 10_000; r++) {
            const out = shuffle(input)
            expect(out.reduce((x, y) => x + y, 0)).toBe(190)
            expect(new Set(out).size).toBe(20)
        }
    })
})

describe('shuffle — uniformidade (qui-quadrado)', () => {
    it('4 itens: as 24 ordens saem com a mesma frequência (240 mil sorteios)', () => {
        const perms = permutations(4)
        const counts = new Map(perms.map(p => [p, 0]))
        const RUNS = 240_000
        withSeededRandom(42, () => {
            for (let r = 0; r < RUNS; r++) {
                const key = shuffle([0, 1, 2, 3]).join(',')
                counts.set(key, counts.get(key)! + 1)
            }
        })
        expect(counts.size).toBe(24)
        expect(chiSquare([...counts.values()], RUNS / 24)).toBeLessThan(chiSquareCritical(23))
    })

    it('8 jogadores: cada um em cada posição com ~12,5% (200 mil sorteios)', () => {
        const RUNS = 200_000
        const pos = Array.from({ length: 8 }, () => Array(8).fill(0))
        withSeededRandom(7, () => {
            for (let r = 0; r < RUNS; r++) {
                shuffle([0, 1, 2, 3, 4, 5, 6, 7]).forEach((player, i) => pos[player][i]++)
            }
        })
        for (const row of pos) {
            expect(chiSquare(row, RUNS / 8)).toBeLessThan(chiSquareCritical(7))
            for (const c of row) expect(Math.abs(c / RUNS - 0.125)).toBeLessThan(0.005)
        }
    })

    it('com o Math.random do sistema (sem semente) também passa', () => {
        const RUNS = 120_000
        const pos = Array.from({ length: 5 }, () => Array(5).fill(0))
        for (let r = 0; r < RUNS; r++) shuffle([0, 1, 2, 3, 4]).forEach((p, i) => pos[p][i]++)
        for (const row of pos) expect(chiSquare(row, RUNS / 5)).toBeLessThan(chiSquareCritical(4))
    })

    it('controle: o teste detecta o viés do antigo sort(() => Math.random() - 0.5)', () => {
        const RUNS = 120_000
        const pos = Array.from({ length: 8 }, () => Array(8).fill(0))
        withSeededRandom(7, () => {
            for (let r = 0; r < RUNS; r++) {
                ;[0, 1, 2, 3, 4, 5, 6, 7].sort(() => Math.random() - 0.5).forEach((p, i) => pos[p][i]++)
            }
        })
        const worst = Math.max(...pos.map(row => chiSquare(row, RUNS / 8)))
        expect(worst).toBeGreaterThan(chiSquareCritical(7))
    })
})
