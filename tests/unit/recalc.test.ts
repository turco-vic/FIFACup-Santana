// E) Recalcular confrontos depois de corrigir um placar com a fase seguinte já gerada
import { describe, expect, it } from 'vitest'
import { getWinner } from '../../src/lib/matches'
import type { Match } from '../../src/types'
import { mulberry32 } from './helpers'
import {
    champion, createTournament, expectedPairs, fromGroups, koMatches, nextStage, playUnplayed, randomScore,
    request, runToChampion, setScore, slotKey, type Sim,
} from './sim'

// 4 grupos de 5 (o formato de amanhã). Em cada grupo o de número menor ganha de 2×0:
// X1 12 pts, X2 9, X3 6, X4 3, X5 0 → classificam X1 e X2.
function copa20(): Sim {
    const sim = fromGroups(['A', 'B', 'C', 'D'].map(g => [1, 2, 3, 4, 5].map(i => `${g}${i}`)))
    for (const m of sim.matches) {
        const h = Number(m.home_id.slice(1)), a = Number(m.away_id.slice(1))
        setScore(sim, m.id, h < a ? 2 : 0, h < a ? 0 : 2)
    }
    return sim
}

function groupMatch(sim: Sim, x: string, y: string): Match {
    const m = sim.matches.find(m => m.stage === 'groups' &&
        ((m.home_id === x && m.away_id === y) || (m.home_id === y && m.away_id === x)))
    if (!m) throw new Error(`sem jogo ${x}×${y}`)
    return m
}

// Corrige o placar a partir do ponto de vista de x (x marcou gx, y marcou gy)
function correct(sim: Sim, x: string, y: string, gx: number, gy: number) {
    const m = groupMatch(sim, x, y)
    if (m.home_id === x) setScore(sim, m.id, gx, gy)
    else setScore(sim, m.id, gy, gx)
}

function ko(sim: Sim, stage: string, slot: number): Match {
    const m = sim.matches.find(m => m.stage === stage && (stage === 'final' ? 0 : m.match_order) === slot)
    if (!m) throw new Error(`sem ${stage}#${slot}`)
    return m
}

const pairs = (sim: Sim, stage: string) =>
    koMatches(sim).filter(m => m.stage === stage).sort((a, b) => (a.match_order ?? 0) - (b.match_order ?? 0))
        .map(m => `${m.home_id}×${m.away_id}`)

// Joga o mata-mata com o mandante sempre vencendo, exceto onde `away` manda
function playKo(sim: Sim, stage: string, awayWins: number[] = []) {
    for (const m of koMatches(sim).filter(m => m.stage === stage && !m.played)) {
        const slot = m.stage === 'final' ? 0 : m.match_order!
        if (awayWins.includes(slot)) setScore(sim, m.id, 0, 1)
        else setScore(sim, m.id, 1, 0)
    }
}

describe('cenários do evento (20 jogadores, 4 grupos → quartas)', () => {
    it('base: quartas A1×B2, B1×A2, C1×D2, D1×C2', () => {
        const sim = copa20()
        expect(request(sim, 'quarters').kind).toBe('applied')
        expect(pairs(sim, 'quarters')).toEqual(['A1×B2', 'B1×A2', 'C1×D2', 'D1×C2'])
    })

    it('E1 — corrigir placar de grupo que troca o 2º classificado, com quartas geradas e sem jogar', () => {
        const sim = copa20()
        request(sim, 'quarters')
        const before = new Map(koMatches(sim).map(m => [m.id, m]))
        correct(sim, 'A2', 'A3', 0, 5) // A3 passa A2 (9 pts × 6)
        const r = request(sim) // "Recalcular confrontos"
        expect(r.kind).toBe('applied')
        if (r.kind !== 'applied') return
        expect(r.confirmed).toBe(true) // modal de confirmação aparece (há jogo saindo)
        expect(r.plan.remove.map(m => `${m.home_id}×${m.away_id}`)).toEqual(['B1×A2'])
        expect(r.plan.add).toEqual([{ stage: 'quarters', match_order: 1, home_id: 'B1', away_id: 'A3' }])
        expect(pairs(sim, 'quarters')).toEqual(['A1×B2', 'B1×A3', 'C1×D2', 'D1×C2'])
        // As outras 3 quartas são as MESMAS linhas (mesmo id)
        for (const m of koMatches(sim).filter(m => m.match_order !== 1)) expect(before.has(m.id)).toBe(true)
        expect(request(sim).kind).toBe('empty')
    })

    it('E2 — corrigir placar de grupo DEPOIS do campeão definido: cascata até a final, o resto fica', () => {
        const sim = copa20()
        request(sim, 'quarters'); playKo(sim, 'quarters', [1])            // A2 vence B1
        request(sim, 'semis'); playKo(sim, 'semis', [])                  // SF0 A1×C1 → A1; SF1 A2×D1 → A2
        expect(pairs(sim, 'semis')).toEqual(['A1×C1', 'A2×D1'])
        request(sim, 'final'); playKo(sim, 'final', [0])                 // A2 campeão
        expect(champion(sim)).toBe('A2')
        const kept = ['quarters#0', 'quarters#2', 'quarters#3', 'semis#0']
            .map(k => koMatches(sim).find(m => slotKey(m) === k)!)
        const keptScores = kept.map(m => [m.id, m.home_score, m.away_score])

        correct(sim, 'A2', 'A3', 0, 5)
        const r = request(sim)
        expect(r.kind).toBe('applied')
        if (r.kind !== 'applied') return
        // Saem a quarta com A2 e tudo que dependia dela (todas com resultado)
        expect(r.plan.remove.map(slotKey).sort()).toEqual(['final#0', 'quarters#1', 'semis#1'])
        expect(r.plan.remove.every(m => m.played)).toBe(true)
        expect(r.plan.add.map(a => `${a.stage}:${a.home_id}×${a.away_id}`)).toEqual(['quarters:B1×A3'])
        expect(champion(sim)).toBeNull() // campeão some até a nova final
        // O que não mudou continua com o placar
        expect(kept.map(m => { const x = sim.matches.find(y => y.id === m.id)!; return [x.id, x.home_score, x.away_score] }))
            .toEqual(keptScores)

        // Segue o campeonato: joga a quarta nova, gera a semi que faltava, a final
        playKo(sim, 'quarters', [])                                       // B1 vence A3
        expect(nextStage(sim)).toBe('semis')
        const steps = runToChampion(sim, mulberry32(1))
        expect(steps.map(s => s.button)).toEqual(['semis', 'final'])
        expect(pairs(sim, 'semis')).toEqual(['A1×C1', 'B1×D1'])
        expect(champion(sim)).not.toBeNull()
    })

    it('E3 — corrigir placar sem mudar a classificação (2×0 → 3×0): nada a recalcular', () => {
        const sim = copa20()
        request(sim, 'quarters'); playKo(sim, 'quarters')
        request(sim, 'semis')
        correct(sim, 'A1', 'A2', 3, 0)
        expect(request(sim).kind).toBe('empty')
    })

    it('E4 — corrigir placar de QUARTA que troca o vencedor, com semis e final geradas', () => {
        const sim = copa20()
        request(sim, 'quarters'); playKo(sim, 'quarters')                // A1, B1, C1, D1
        request(sim, 'semis'); playKo(sim, 'semis')                      // A1, B1
        request(sim, 'final')
        const q0 = ko(sim, 'quarters', 0)
        setScore(sim, q0.id, 1, 2)                                        // B2 elimina A1
        const r = request(sim)
        expect(r.kind).toBe('applied')
        if (r.kind !== 'applied') return
        expect(r.plan.remove.map(slotKey).sort()).toEqual(['final#0', 'semis#0'])
        expect(r.plan.add).toEqual([{ stage: 'semis', match_order: 0, home_id: 'B2', away_id: 'C1' }])
        expect(nextStage(sim)).toBeNull() // semi nova sem resultado: ainda não há final a gerar
    })

    it('E5 — corrigir placar de quarta mantendo o vencedor (1×0 → 3×1): nada muda', () => {
        const sim = copa20()
        request(sim, 'quarters'); playKo(sim, 'quarters')
        request(sim, 'semis')
        setScore(sim, ko(sim, 'quarters', 2).id, 3, 1)
        expect(request(sim).kind).toBe('empty')
    })

    it('E6 — quarta corrigida para empate: pênaltis com o mesmo vencedor não mudam nada; com outro, recalcula', () => {
        const sim = copa20()
        request(sim, 'quarters'); playKo(sim, 'quarters')
        request(sim, 'semis')
        const q3 = ko(sim, 'quarters', 3) // D1×C2, D1 venceu
        setScore(sim, q3.id, 2, 2, 5, 4)
        expect(request(sim).kind).toBe('empty')
        setScore(sim, q3.id, 2, 2, 3, 4)
        const r = request(sim)
        expect(r.kind === 'applied' && r.plan.add).toEqual([{ stage: 'semis', match_order: 1, home_id: 'B1', away_id: 'C2' }])
    })

    it('E7 — 2 grupos (semis direto): inverter 1º e 2º do grupo A troca as duas semis e apaga a final', () => {
        const sim = fromGroups([['A1', 'A2', 'A3'], ['B1', 'B2', 'B3']])
        for (const m of sim.matches) {
            const h = Number(m.home_id.slice(1)), a = Number(m.away_id.slice(1))
            setScore(sim, m.id, h < a ? 2 : 0, h < a ? 0 : 2)
        }
        request(sim, 'semis'); playKo(sim, 'semis')
        request(sim, 'final'); playKo(sim, 'final')
        expect(pairs(sim, 'semis')).toEqual(['A1×B2', 'B1×A2'])
        correct(sim, 'A1', 'A2', 0, 4)
        const r = request(sim)
        expect(r.kind === 'applied' && r.plan.remove.map(slotKey).sort()).toEqual(['final#0', 'semis#0', 'semis#1'])
        expect(pairs(sim, 'semis')).toEqual(['A2×B2', 'B1×A1'])
        expect(sim.matches.some(m => m.stage === 'final')).toBe(false)
    })

    it('E8 — "Gerar Semifinais" com correção pendente: o mesmo botão também corrige (com confirmação)', () => {
        const sim = copa20()
        request(sim, 'quarters'); playKo(sim, 'quarters')
        correct(sim, 'C2', 'C3', 0, 5) // C3 passa C2; a quarta D1×C2 (já jogada) fica errada
        expect(nextStage(sim)).toBe('semis')
        const r = request(sim, 'semis')
        expect(r.kind === 'applied' && r.confirmed).toBe(true)
        expect(pairs(sim, 'quarters')[3]).toBe('D1×C3')
        // A semi que depende da quarta refeita não é criada ainda; a outra sim
        expect(pairs(sim, 'semis')).toEqual(['A1×C1'])
    })
})

describe('E — propriedade: correções aleatórias em campeonatos aleatórios (600 casos)', () => {
    it('recalcular converge, preserva resultados válidos, não repete jogador e o campeonato termina', () => {
        let corrections = 0, removedWithResult = 0
        for (let seed = 1; seed <= 600; seed++) {
            const rand = mulberry32(seed)
            const n = 4 + Math.floor(rand() * 37)
            const sim = createTournament(n, seed)
            playUnplayed(sim, rand, 'groups')

            // Avança um nº aleatório de fases (às vezes deixando a última pela metade)
            const depth = Math.floor(rand() * 6)
            for (let d = 0; d < depth; d++) {
                const next = nextStage(sim)
                if (!next) break
                request(sim, next)
                for (const m of koMatches(sim).filter(m => !m.played)) {
                    if (d < depth - 1 || rand() < 0.6) setScore(sim, m.id, ...randomScore(rand, true))
                }
            }

            // 1 a 3 correções em partidas já jogadas (grupo ou mata-mata)
            const k = 1 + Math.floor(rand() * 3)
            for (let c = 0; c < k; c++) {
                const playedNow = sim.matches.filter(m => m.played)
                const m = playedNow[Math.floor(rand() * playedNow.length)]
                setScore(sim, m.id, ...randomScore(rand, m.stage !== 'groups'))
                corrections++
            }

            const before = new Map(koMatches(sim).map(m => [m.id, { ...m }]))
            // Metade das vezes pelo "Recalcular", metade pelo "Gerar <fase>"
            const viaGenerate = rand() < 0.5 ? nextStage(sim) ?? undefined : undefined
            const r = request(sim, viaGenerate)
            expect(r.kind).not.toBe('undecided')
            expect(r.kind).not.toBe('not-ready')
            if (r.kind === 'applied') {
                removedWithResult += r.plan.remove.filter(m => m.played).length
                // Toda remoção passa pela confirmação
                if (r.plan.remove.length > 0) expect(r.confirmed).toBe(true)
            }

            // (1) Converge: recalcular de novo não muda nada
            expect(request(sim).kind).toBe('empty')

            // (2) Cada jogo do mata-mata bate com o confronto esperado; uma partida por vaga
            const exp = expectedPairs(sim)
            const seen = new Set<string>()
            for (const m of koMatches(sim)) {
                const key = slotKey(m)
                expect(seen.has(key)).toBe(false)
                seen.add(key)
                expect([m.home_id, m.away_id]).toEqual(exp.get(key))
            }

            // (3) Nenhum resultado válido perdido: se o confronto da vaga continua o mesmo, a linha continua
            for (const [id, old] of before) {
                const e = exp.get(slotKey(old))
                const stillRight = e && e[0] === old.home_id && e[1] === old.away_id
                const now = sim.matches.find(m => m.id === id)
                if (stillRight) {
                    expect(now).toBeDefined()
                    expect([now!.home_score, now!.away_score, now!.played]).toEqual([old.home_score, old.away_score, old.played])
                } else {
                    expect(now).toBeUndefined()
                }
            }

            // (4) Ninguém joga duas vezes na mesma fase
            for (const st of new Set(koMatches(sim).map(m => m.stage))) {
                const ps = koMatches(sim).filter(m => m.stage === st).flatMap(m => [m.home_id, m.away_id])
                expect(new Set(ps).size).toBe(ps.length)
            }

            // (5) O campeonato chega ao fim pelos botões, e cada "Gerar X" cria só jogos de X
            const steps = runToChampion(sim, rand)
            for (const s of steps) expect(new Set(s.created)).toEqual(new Set([s.button]))
            const champ = champion(sim)!
            expect(getWinner(sim.matches.find(m => m.stage === 'final')!)).toBe(champ)
        }
        // O teste exercitou de fato a cascata
        expect(corrections).toBeGreaterThan(600)
        expect(removedWithResult).toBeGreaterThan(50)
    })
})
