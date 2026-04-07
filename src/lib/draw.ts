import type { Profile, Duo } from '../types'

// Embaralha array aleatoriamente (Fisher-Yates)
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Sorteia grupos 1v1
// Retorna array de grupos, cada grupo é um array de jogadores
export function drawGroups(players: Profile[], groupCount = 4): Profile[][] {
  const shuffled = shuffle(players)
  const groups: Profile[][] = Array.from({ length: groupCount }, () => [])

  shuffled.forEach((player, index) => {
    groups[index % groupCount].push(player)
  })

  return groups
}

// Sorteia duplas 2v2
// Retorna array de pares de jogadores
export function drawDuos(players: Profile[]): [Profile, Profile][] {
  const shuffled = shuffle(players)
  const duos: [Profile, Profile][] = []

  for (let i = 0; i < shuffled.length - 1; i += 2) {
    duos.push([shuffled[i], shuffled[i + 1]])
  }

  // Se número ímpar sobrar um jogador, retorna sem par (tratado na UI)
  return duos
}

// Gera partidas de um grupo (todos contra todos)
export function generateGroupMatches(
  groupIndex: number,
  players: Profile[]
): { home_id: string; away_id: string; group_index: number }[] {
  const matches = []
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      matches.push({
        home_id: players[i].id,
        away_id: players[j].id,
        group_index: groupIndex,
      })
    }
  }
  return matches
}

// Gera partidas da liga 2v2 (todos contra todos)
export function generateLeagueMatches(
  duos: Duo[]
): { home_id: string; away_id: string }[] {
  const matches = []
  for (let i = 0; i < duos.length; i++) {
    for (let j = i + 1; j < duos.length; j++) {
      matches.push({
        home_id: duos[i].id,
        away_id: duos[j].id,
      })
    }
  }
  return matches
}
