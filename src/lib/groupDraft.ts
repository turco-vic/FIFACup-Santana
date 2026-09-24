// Prévia dos grupos no Gerenciar, antes de gravar: por sorteio ou montada à mão.
// `pool` são os jogadores ainda sem grupo (só existe na montagem manual).
export type GroupDraft = { groups: string[][]; pool: string[] }

export const POOL = 'pool' as const
export type DraftTarget = number | typeof POOL

export function emptyDraft(numGroups: number, playerIds: string[]): GroupDraft {
    return { groups: Array.from({ length: numGroups }, () => []), pool: [...playerIds] }
}

// Tira o jogador de onde estiver e coloca no fim do destino
export function moveInDraft(draft: GroupDraft, playerId: string, target: DraftTarget): GroupDraft {
    const groups = draft.groups.map(g => g.filter(pid => pid !== playerId))
    const pool = draft.pool.filter(pid => pid !== playerId)
    if (target === POOL) pool.push(playerId)
    else groups[target].push(playerId)
    return { groups, pool }
}

// Motivo para não poder confirmar, ou null. Os 2 primeiros de cada grupo avançam,
// então cada grupo precisa de pelo menos 2 jogadores.
export function draftProblem(draft: GroupDraft, playerIds: string[]): string | null {
    if (draft.pool.length > 0) {
        return `Falta colocar ${draft.pool.length} jogador${draft.pool.length !== 1 ? 'es' : ''} em um grupo.`
    }
    if (draft.groups.some(g => g.length < 2)) return 'Cada grupo precisa de pelo menos 2 jogadores.'
    const drafted = draft.groups.flat()
    if (drafted.length !== playerIds.length || !playerIds.every(pid => drafted.includes(pid))) {
        return 'A lista de jogadores mudou desde a montagem dos grupos. Monte ou sorteie de novo.'
    }
    return null
}
