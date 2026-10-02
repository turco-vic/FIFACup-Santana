import { shuffle } from './shuffle'

// Top 2 de cada grupo avançam: o nº de grupos precisa ser potência de 2 para a chave fechar
// (2 grupos → semis, 4 → quartas, 8 → oitavas). Retorna null se o nº de jogadores não é suportado.
export function planGroups(playerCount: number): number | null {
    if (playerCount >= 4 && playerCount <= 7) return 2
    if (playerCount >= 8 && playerCount <= 20) return 4
    if (playerCount >= 21 && playerCount <= 40) return 8
    return null
}

// Sorteio: embaralha e distribui em rodízio. Os tamanhos diferem no máximo em 1 e nunca há grupo vazio.
export function drawGroups(playerIds: readonly string[], numGroups: number): string[][] {
    const buckets: string[][] = Array.from({ length: numGroups }, () => [])
    shuffle(playerIds).forEach((pid, i) => buckets[i % numGroups].push(pid))
    return buckets
}

// Todos contra todos, cada par uma vez, na ordem (0×1, 0×2, ..., 1×2, ...)
export function roundRobinPairs<T>(ids: readonly T[]): [T, T][] {
    const pairs: [T, T][] = []
    for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) pairs.push([ids[i], ids[j]])
    }
    return pairs
}
