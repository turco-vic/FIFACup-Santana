// D) Geração do chaveamento e avanço de fase (grupos → semis/quartas/oitavas → final)
import { describe, expect, it } from 'vitest'
import {
    KO_STAGE_ORDER, bracketFromGroups, firstRoundFromGroups, nextRoundPairs, nextStageToGenerate, planBracket, planIsEmpty,
} from '../../src/lib/bracket'
import { computeStandings } from '../../src/lib/standings'
import { getWinner } from '../../src/lib/matches'
import { planGroups } from '../../src/lib/groups'
import { mkMatch, mulberry32, played } from './helpers'
import {
    champion, createTournament, expectedPairs, koMatches, nextStage, playUnplayed, request, runToChampion, slotKey, source,
} from './sim'

describe('firstRoundFromGroups — 1ª fase cruzando 1º × 2º do grupo vizinho', () => {
    it('2 grupos → semifinais A1×B2 e B1×A2', () => {
        expect(firstRoundFromGroups([['a1', 'a2', 'a3'], ['b1', 'b2', 'b3']])).toEqual([['a1', 'b2'], ['b1', 'a2']])
    })

    it('4 grupos → quartas A1×B2, B1×A2, C1×D2, D1×C2', () => {
        const g = ['a', 'b', 'c', 'd'].map(x => [`${x}1`, `${x}2`, `${x}3`])
        expect(firstRoundFromGroups(g)).toEqual([['a1', 'b2'], ['b1', 'a2'], ['c1', 'd2'], ['d1', 'c2']])
    })

    it('8 grupos → 8 jogos de oitavas na mesma lógica', () => {
        const g = 'abcdefgh'.split('').map(x => [`${x}1`, `${x}2`])
        expect(firstRoundFromGroups(g)).toEqual([
            ['a1', 'b2'], ['b1', 'a2'], ['c1', 'd2'], ['d1', 'c2'],
            ['e1', 'f2'], ['f1', 'e2'], ['g1', 'h2'], ['h1', 'g2'],
        ])
    })

    it('grupo com menos de 2 (não deveria acontecer): vaga fica null, não quebra', () => {
        expect(firstRoundFromGroups([['a1'], ['b1', 'b2']])).toEqual([['a1', 'b2'], ['b1', null]])
    })
})

describe('nextRoundPairs — próxima fase pelos vencedores', () => {
    it('2 vencedores (semis) → final', () => {
        expect(nextRoundPairs(['x', 'y'])).toEqual([['x', 'y']])
    })
    it('4 vencedores (quartas) → semis 0×2 e 1×3', () => {
        expect(nextRoundPairs(['q0', 'q1', 'q2', 'q3'])).toEqual([['q0', 'q2'], ['q1', 'q3']])
    })
    it('8 vencedores (oitavas) → quartas em blocos de 4', () => {
        expect(nextRoundPairs(['o0', 'o1', 'o2', 'o3', 'o4', 'o5', 'o6', 'o7']))
            .toEqual([['o0', 'o2'], ['o1', 'o3'], ['o4', 'o6'], ['o5', 'o7']])
    })
    it('vencedor ainda indefinido passa como null', () => {
        expect(nextRoundPairs([null, 'q1', 'q2', null])).toEqual([[null, 'q2'], ['q1', null]])
    })
})

describe('bracketFromGroups — de onde sai a 1ª fase', () => {
    const groups = [['a1', 'a2', 'a3'], ['b1', 'b2', 'b3']].map(g => g.map(id => ({ id, name: id })))

    it('null enquanto falta resultado em algum jogo de grupo', () => {
        const ms = [played('a1', 'a2', 1, 0), played('a1', 'a3', 1, 0), played('a2', 'a3', 1, 0),
            played('b1', 'b2', 1, 0), played('b1', 'b3', 1, 0), mkMatch({ home_id: 'b2', away_id: 'b3' })]
        expect(bracketFromGroups(groups, ms)).toBeNull()
    })

    it('null sem jogos de grupo e com nº de grupos sem mata-mata (3 grupos)', () => {
        expect(bracketFromGroups(groups, [])).toBeNull()
        expect(bracketFromGroups([...groups, groups[0]], [played('a1', 'a2', 1, 0)])).toBeNull()
    })

    it('ranking de cada grupo usa só os jogos entre jogadores do grupo', () => {
        const ms = [played('a1', 'a2', 1, 0), played('a1', 'a3', 1, 0), played('a2', 'a3', 1, 0),
            played('b1', 'b2', 1, 0), played('b1', 'b3', 1, 0), played('b2', 'b3', 1, 0),
            // jogo de mata-mata entre a3 e b3 não pode mexer no ranking dos grupos
            played('a3', 'b3', 9, 0, { stage: 'semis' })]
        expect(bracketFromGroups(groups, ms)).toEqual({ firstStage: 'semis', pairs: [['a1', 'b2'], ['b1', 'a2']] })
    })
})

describe('planBracket — gerar fases', () => {
    const pairs4: [string, string][] = [['a1', 'b2'], ['b1', 'a2'], ['c1', 'd2'], ['d1', 'c2']]

    it('sem mata-mata: "Gerar Quartas" cria só as 4 quartas, com match_order 0..3', () => {
        const plan = planBracket('quarters', pairs4, [], 'quarters')
        expect(plan.remove).toEqual([])
        expect(plan.add).toEqual(pairs4.map(([h, a], i) => ({ stage: 'quarters', match_order: i, home_id: h, away_id: a })))
    })

    it('quartas jogadas: "Gerar Semifinais" cria 0×2 e 1×3 e NÃO cria a final', () => {
        const qf = pairs4.map(([h, a], i) => played(h, a, 2, 1, { stage: 'quarters', match_order: i }))
        const plan = planBracket('quarters', pairs4, qf, 'semis')
        expect(plan.keep).toHaveLength(4)
        expect(plan.add).toEqual([
            { stage: 'semis', match_order: 0, home_id: 'a1', away_id: 'c1' },
            { stage: 'semis', match_order: 1, home_id: 'b1', away_id: 'd1' },
        ])
    })

    it('quarta sem resultado: a semi correspondente não é criada (vaga indefinida)', () => {
        const qf = pairs4.map(([h, a], i) => i === 2
            ? mkMatch({ home_id: h, away_id: a, stage: 'quarters', match_order: i })
            : played(h, a, 2, 1, { stage: 'quarters', match_order: i }))
        const plan = planBracket('quarters', pairs4, qf, 'semis')
        expect(plan.add).toEqual([{ stage: 'semis', match_order: 1, home_id: 'b1', away_id: 'd1' }])
    })

    it('final antiga gravada com match_order 999 é reconhecida (não é apagada)', () => {
        const sf = [played('a1', 'c1', 1, 0, { stage: 'semis', match_order: 0 }), played('b1', 'd1', 1, 0, { stage: 'semis', match_order: 1 })]
        const final = mkMatch({ home_id: 'a1', away_id: 'b1', stage: 'final', match_order: 999 })
        const plan = planBracket('semis', [['a1', 'c1'], ['b1', 'd1']], [...sf, final])
        expect(planIsEmpty(plan)).toBe(true)
        expect(plan.keep).toContain(final)
    })

    it('partida duplicada na mesma vaga (dois admins gerando juntos): a cópia sai, o original fica', () => {
        const q0 = played('a1', 'b2', 1, 0, { stage: 'quarters', match_order: 0 })
        const dup = mkMatch({ home_id: 'a1', away_id: 'b2', stage: 'quarters', match_order: 0 })
        const rest = pairs4.slice(1).map(([h, a], i) => mkMatch({ home_id: h, away_id: a, stage: 'quarters', match_order: i + 1 }))
        const plan = planBracket('quarters', pairs4, [q0, dup, ...rest])
        expect(plan.keep).toContain(q0)
        expect(plan.remove).toEqual([dup])
        expect(plan.add).toEqual([])
    })

    it('cópia duplicada em que o placar foi lançado na SEGUNDA: fica a jogada, sai a vazia', () => {
        const empty = mkMatch({ home_id: 'a1', away_id: 'b2', stage: 'quarters', match_order: 0 })
        const scored = played('a1', 'b2', 2, 0, { stage: 'quarters', match_order: 0 })
        const rest = pairs4.slice(1).map(([h, a], i) => mkMatch({ home_id: h, away_id: a, stage: 'quarters', match_order: i + 1 }))
        const plan = planBracket('quarters', pairs4, [empty, scored, ...rest])
        expect(plan.keep).toContain(scored)
        expect(plan.remove).toEqual([empty])
    })

    it('vaga a mais na fase (match_order >= nº de jogos) é removida', () => {
        const qf = pairs4.map(([h, a], i) => mkMatch({ home_id: h, away_id: a, stage: 'quarters', match_order: i }))
        const extra = mkMatch({ home_id: 'x', away_id: 'y', stage: 'quarters', match_order: 4 })
        expect(planBracket('quarters', pairs4, [...qf, extra]).remove).toEqual([extra])
    })

    it('mata-mata jogado empatado SEM pênaltis (dado antigo) bloqueia o plano em "undecided"', () => {
        const qf = pairs4.map(([h, a], i) => played(h, a, i === 1 ? 1 : 2, 1, { stage: 'quarters', match_order: i }))
        const plan = planBracket('quarters', pairs4, qf, 'semis')
        expect(plan.undecided.map(m => m.match_order)).toEqual([1])
        expect(getWinner(qf[1])).toBeNull()
    })

    it('empate com pênaltis decide o vencedor', () => {
        const m = played('a', 'b', 2, 2, { stage: 'final', home_penalties: 3, away_penalties: 4 })
        expect(getWinner(m)).toBe('b')
    })
})

describe('campeonato completo (simulado): grupos → mata-mata → campeão', () => {
    const SIZES = [4, 5, 6, 7, 8, 9, 12, 16, 19, 20, 21, 24, 32, 40]

    it.each(SIZES)('%i jogadores: chave fecha, sem repetidos, campeão único, botões coerentes', n => {
        for (let seed = 1; seed <= 25; seed++) {
            const rand = mulberry32(seed * 1000 + n)
            const sim = createTournament(n, seed)
            const numGroups = planGroups(n)!
            expect(source(sim)).toBeNull()
            expect(nextStage(sim)).toBeNull() // sem resultado nos grupos não há botão "Gerar"
            playUnplayed(sim, rand, 'groups')

            const src = source(sim)!
            expect(src.pairs).toHaveLength(numGroups)
            const qualifiers = new Set(sim.groups.flatMap(g => {
                const ids = new Set(g.map(p => p.id))
                const own = sim.matches.filter(m => m.stage === 'groups' && ids.has(m.home_id) && ids.has(m.away_id))
                return computeStandings(g, own).slice(0, 2).map(s => s.id)
            }))
            expect(new Set(src.pairs.flat())).toEqual(qualifiers)

            const steps = runToChampion(sim, rand)
            // "Gerar X" cria jogos de X e só de X
            for (const s of steps) expect(new Set(s.created)).toEqual(new Set([s.button]))
            // Fases na ordem, cada uma com metade dos jogos da anterior
            const stages = KO_STAGE_ORDER.slice(KO_STAGE_ORDER.indexOf(src.firstStage))
            expect(steps.map(s => s.button)).toEqual(stages)
            stages.forEach((st, k) => {
                const ms = koMatches(sim).filter(m => m.stage === st)
                expect(ms).toHaveLength(numGroups / 2 ** k)
                const players = ms.flatMap(m => [m.home_id, m.away_id])
                expect(new Set(players).size).toBe(players.length)
            })
            // Todo confronto bate com o esperado (cálculo independente)
            const exp = expectedPairs(sim)
            for (const m of koMatches(sim)) expect([m.home_id, m.away_id]).toEqual(exp.get(slotKey(m)))
            // 1º e 2º do mesmo grupo só podem se reencontrar na final
            const groupOf = new Map(sim.groups.flatMap((g, gi) => g.map(p => [p.id, gi] as const)))
            for (const m of koMatches(sim).filter(x => x.stage !== 'final')) {
                expect(groupOf.get(m.home_id)).not.toBe(groupOf.get(m.away_id))
            }
            const champ = champion(sim)!
            expect(qualifiers.has(champ)).toBe(true)
            // Depois do campeão: nada a gerar nem a recalcular
            expect(nextStage(sim)).toBeNull()
            expect(request(sim).kind).toBe('empty')
        }
    })
})

describe('nextStageToGenerate — botão "Gerar <fase>"', () => {
    const qf = (playedFlags: boolean[]) => playedFlags.map((p, i) => p
        ? played(`h${i}`, `a${i}`, 1, 0, { stage: 'quarters', match_order: i })
        : mkMatch({ home_id: `h${i}`, away_id: `a${i}`, stage: 'quarters', match_order: i }))

    it('sem mata-mata → 1ª fase', () => {
        expect(nextStageToGenerate('quarters', 4, [])).toBe('quarters')
        expect(nextStageToGenerate('semis', 2, [])).toBe('semis')
        expect(nextStageToGenerate('round16', 8, [])).toBe('round16')
    })
    it('fase em andamento → nenhum botão', () => {
        expect(nextStageToGenerate('quarters', 4, qf([true, true, false, true]))).toBeNull()
    })
    it('fase terminada → próxima', () => {
        expect(nextStageToGenerate('quarters', 4, qf([true, true, true, true]))).toBe('semis')
    })
    it('final existe → nenhum botão (jogada ou não)', () => {
        const sf = [played('a', 'b', 1, 0, { stage: 'semis', match_order: 0 }), played('c', 'd', 1, 0, { stage: 'semis', match_order: 1 })]
        expect(nextStageToGenerate('semis', 2, [...sf, mkMatch({ home_id: 'a', away_id: 'c', stage: 'final' })])).toBeNull()
        expect(nextStageToGenerate('semis', 2, [...sf, played('a', 'c', 2, 0, { stage: 'final' })])).toBeNull()
    })
    it('BUG CORRIGIDO: semi apagada pelo recálculo (a outra jogada) → botão é "Gerar Semifinais", não "Gerar Final"', () => {
        const sf1 = played('b1', 'd1', 1, 0, { stage: 'semis', match_order: 1 })
        expect(nextStageToGenerate('quarters', 4, [...qf([true, true, true, true]), sf1])).toBe('semis')
    })
    it('quarta refeita sem resultado e semi faltando → nenhum botão (antes: "Gerar Final" → "Nada a gerar ainda")', () => {
        const sf0 = played('h0', 'h2', 1, 0, { stage: 'semis', match_order: 0 })
        expect(nextStageToGenerate('quarters', 4, [...qf([true, false, true, true]), sf0])).toBeNull()
    })
    it('vaga faltando na 1ª fase → a própria 1ª fase', () => {
        expect(nextStageToGenerate('quarters', 4, qf([true, true, true]))).toBe('quarters')
    })
})
