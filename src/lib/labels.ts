import type { TournamentFormat, TournamentStatus } from '../types'

export const FORMAT_LABEL: Record<TournamentFormat, string> = {
    groups_knockout: 'Grupos + Mata-mata',
    league: 'Liga',
    knockout: 'Mata-mata',
    league_final: 'Liga + Final',
}

export const STATUS_LABEL: Record<TournamentStatus, string> = {
    setup: 'Em configuração',
    active: 'Em andamento',
    finished: 'Encerrado',
}
