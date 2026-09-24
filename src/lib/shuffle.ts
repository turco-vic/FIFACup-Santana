// Embaralhamento Fisher-Yates: toda ordem tem a mesma chance.
// sort(() => Math.random() - 0.5) é viciado (depende do algoritmo de ordenação do navegador)
// e tende a deixar os itens perto da posição original.
export function shuffle<T>(items: readonly T[]): T[] {
    const a = [...items]
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
}
