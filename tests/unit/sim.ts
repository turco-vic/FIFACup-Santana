// Campeonato em memória que segue os mesmos passos da tela:
//   Gerenciar → sortear grupos → gerar partidas
//   Dashboard → lançar placares → "Gerar <fase>" / "Recalcular confrontos" → confirmar → aplicar
// As funções de decisão são as mesmas do app (src/lib); aqui só o "banco" é um array.
import {
    KO_STAGE_ORDER, bracketFromGroups, nextStageToGenerate, planBracket, planIsEmpty,
    type BracketPlan, type Pair,
} from '../../src/lib/bracket'
import { drawGroups, planGroups, roundRobinPairs } from '../../src/lib/groups'
import { getWinner } from '../../src/lib/matches'
import type { Entity } from '../../src/lib/standings'
import type { Match, MatchStage } from '../../src/types'
import { mkMatch, withSeededRandom } from './helpers'

export type Sim = {
    groups: Entity[][]
    matches: Match[]
    seq: number
}

export function playerIds(n: number): string[] {
    return Array.from({ length: n }, (_, i) => `J${String(i + 1).padStart(2, '0')}`)
}

// Sorteio + partidas de grupo, igual ao TournamentManage.generateGroups
export function createTournament(nPlayers: number, seed: number): Sim {
    const numGroups = planGroups(nPlayers)
    if (numGroups === null) throw new Error(`nº de jogadores não suportado: ${nPlayers}`)
    const buckets = withSeededRandom(seed, () => drawGroups(playerIds(nPlayers), numGroups))
    return fromGroups(buckets)
}

export function fromGroups(buckets: string[][]): Sim {
    const sim: Sim = { groups: buckets.map(g => g.map(id => ({ id, name: id }))), matches: [], seq: 0 }
    for (const g of buckets) {
        roundRobinPairs(g).forEach(([home, away], i) => {
            sim.matches.push(mkMatch({ id: `g${++sim.seq}`, home_id: home, away_id: away, stage: 'groups', match_order: i }))
        })
    }
    return sim
}

export function source(sim: Sim) {
    return bracketFromGroups(sim.groups, sim.matches)
}

export function koMatches(sim: Sim): Match[] {
    return sim.matches.filter(m => KO_STAGE_ORDER.includes(m.stage))
}

// Lança um placar (ScoreModal + triggers do banco: pênaltis só valem em empate de mata-mata)
export function setScore(sim: Sim, matchId: string, hs: number, as: number, hp: number | null = null, ap: number | null = null) {
    const m = sim.matches.find(x => x.id === matchId)
    if (!m) throw new Error(`partida ${matchId} não existe`)
    const ko = m.stage !== 'groups' && m.stage !== 'league'
    if (ko && hs === as && (hp === null || ap === null || hp === ap)) throw new Error('mata-mata empatado precisa de pênaltis')
    const draw = hs === as
    Object.assign(m, {
        home_score: hs, away_score: as, played: true,
        home_penalties: draw ? hp : null, away_penalties: draw ? ap : null,
    })
}

export function randomScore(rand: () => number, ko: boolean): [number, number, number | null, number | null] {
    const hs = Math.floor(rand() * 5), as = Math.floor(rand() * 5)
    if (ko && hs === as) {
        const hp = 3 + Math.floor(rand() * 3)
        let ap = 3 + Math.floor(rand() * 3)
        if (ap === hp) ap = hp - 1
        return [hs, as, hp, ap]
    }
    return [hs, as, null, null]
}

export function playUnplayed(sim: Sim, rand: () => number, stage?: MatchStage) {
    for (const m of sim.matches) {
        if (m.played || (stage && m.stage !== stage)) continue
        setScore(sim, m.id, ...randomScore(rand, m.stage !== 'groups'))
    }
}

export type RequestResult =
    | { kind: 'not-ready' }
    | { kind: 'undecided'; plan: BracketPlan }
    | { kind: 'empty'; plan: BracketPlan }
    | { kind: 'applied'; plan: BracketPlan; confirmed: boolean }

// TournamentDashboard.requestPlan + PlanConfirmModal (confirmando) + applyPlan
export function request(sim: Sim, createStage?: MatchStage): RequestResult {
    const src = source(sim)
    if (!src) return { kind: 'not-ready' }
    const plan = planBracket(src.firstStage, src.pairs, sim.matches, createStage)
    if (plan.undecided.length > 0) return { kind: 'undecided', plan }
    if (planIsEmpty(plan)) return { kind: 'empty', plan }
    applyPlan(sim, plan)
    return { kind: 'applied', plan, confirmed: plan.remove.length > 0 }
}

export function applyPlan(sim: Sim, plan: BracketPlan) {
    const gone = new Set(plan.remove.map(m => m.id))
    sim.matches = sim.matches.filter(m => !gone.has(m.id))
    for (const a of plan.add) {
        sim.matches.push(mkMatch({ id: `k${++sim.seq}`, ...a }))
    }
}

export function nextStage(sim: Sim): MatchStage | null {
    const src = source(sim)
    return src ? nextStageToGenerate(src.firstStage, src.pairs.length, koMatches(sim)) : null
}

export function champion(sim: Sim): string | null {
    const f = sim.matches.find(m => m.stage === 'final')
    return f ? getWinner(f) : null
}

// O admin aperta "Gerar <fase>" e lança os placares até ter campeão.
// Guarda o que o botão mostrou e o que de fato foi criado, para checar o rótulo.
export type Step = { button: MatchStage; created: MatchStage[] }

export function runToChampion(sim: Sim, rand: () => number, maxSteps = 50): Step[] {
    const steps: Step[] = []
    for (let i = 0; i < maxSteps; i++) {
        playUnplayed(sim, rand)
        if (champion(sim)) return steps
        const next = nextStage(sim)
        if (!next) throw new Error('beco sem saída: sem campeão e sem botão "Gerar"')
        const r = request(sim, next)
        if (r.kind !== 'applied') throw new Error(`"Gerar ${next}" não fez nada (${r.kind})`)
        steps.push({ button: next, created: r.plan.add.map(a => a.stage) })
    }
    throw new Error('não terminou')
}

// Confronto esperado de cada vaga, calculado de forma independente do planBracket:
// 1ª fase pelos grupos; depois vaga i da fase k vem das vagas da fase k-1
// (final: 0×1; blocos de 4: [4b+j] × [4b+j+2]).
export function expectedPairs(sim: Sim): Map<string, Pair> {
    const out = new Map<string, Pair>()
    const src = source(sim)
    if (!src) return out
    const stages = KO_STAGE_ORDER.slice(KO_STAGE_ORDER.indexOf(src.firstStage))
    let prev: Pair[] = src.pairs
    stages.forEach((stage, k) => {
        if (k > 0) {
            const winnerOf = (slot: number): string | null => {
                const [h, a] = prev[slot] ?? [null, null]
                const m = sim.matches.find(x => x.stage === stages[k - 1] && (x.stage === 'final' ? 0 : x.match_order) === slot)
                if (!m || h === null || a === null || m.home_id !== h || m.away_id !== a) return null
                return getWinner(m)
            }
            const cur: Pair[] = []
            if (prev.length === 2) cur.push([winnerOf(0), winnerOf(1)])
            else for (let i = 0; i < prev.length / 2; i++) {
                const b = Math.floor(i / 2), j = i % 2
                cur.push([winnerOf(4 * b + j), winnerOf(4 * b + j + 2)])
            }
            prev = cur
        }
        prev.forEach((p, slot) => out.set(`${stage}#${slot}`, p))
    })
    return out
}

export function slotKey(m: Match): string {
    return `${m.stage}#${m.stage === 'final' ? 0 : m.match_order}`
}
