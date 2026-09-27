import { Link } from 'react-router-dom'
import type { Match, Profile } from '../types'
import { Pencil, Plus, Trophy } from 'lucide-react'
import { getWinner } from '../lib/matches'
import { cx } from '../lib/cx'
import Avatar from './ui/Avatar'

type Props = {
    matches: Match[]
    players: Profile[]
    isAdmin: boolean
    onSelectMatch: (match: Match) => void
}

type SlotProps = {
    playerId: string | null
    label: string
    players: Profile[]
    score: number | null
    penalties: number | null
    winner?: boolean
    // Jogo decidido: quem não venceu fica apagado
    decided: boolean
}

// Uma linha do confronto: jogador à esquerda, placar dele à direita (como chaveamento de TV)
function PlayerSlot({ playerId, label, players, score, penalties, winner, decided }: SlotProps) {
    const player = playerId ? players.find(p => p.id === playerId) : null

    if (!player) {
        return (
            <div className="flex items-center gap-2.5 px-3 h-12">
                <span className="text-caption italic text-faint">{label}</span>
            </div>
        )
    }

    return (
        <div className={cx(
            'flex items-center gap-2.5 px-3 h-12 transition-colors',
            winner && 'bg-brand-subtle',
        )}>
            <Link to={`/player/${player.id}`} className="flex items-center gap-2.5 flex-1 min-w-0 group">
                <Avatar src={player.avatar_url} name={player.username ?? player.name} size="xs" />
                <div className="min-w-0 flex-1">
                    <p className={cx(
                        'truncate text-body group-hover:underline underline-offset-4',
                        winner ? 'text-primary font-bold' : decided ? 'text-muted' : 'text-primary font-medium',
                    )}>
                        {player.username ?? player.name}
                    </p>
                    {player.team_name && (
                        <p className="truncate text-caption text-muted">{player.team_name}</p>
                    )}
                </div>
            </Link>
            {winner && <Trophy size={14} className="text-brand flex-shrink-0" aria-label="Vencedor" />}
            {score !== null && (
                <span className="flex items-baseline gap-1 flex-shrink-0">
                    <span className={cx(
                        'font-display font-bold text-title tabular-nums w-6 text-right',
                        winner ? 'text-brand-text' : 'text-muted',
                    )}>
                        {score}
                    </span>
                    {penalties !== null && (
                        <span className="text-caption text-muted tabular-nums" title="Pênaltis">({penalties})</span>
                    )}
                </span>
            )}
        </div>
    )
}

type MatchCardProps = {
    match: Match | undefined
    index: number
    // Único jogo da fase (a final): sem "Jogo 1"
    single: boolean
    homeLabel: string
    awayLabel: string
    players: Profile[]
    isAdmin: boolean
    onSelectMatch: (match: Match) => void
}

function MatchCard({ match, index, single, homeLabel, awayLabel, players, isAdmin, onSelectMatch }: MatchCardProps) {
    const winner = match ? getWinner(match) : null
    const homeWon = !!winner && winner === match?.home_id
    const awayWon = !!winner && winner === match?.away_id
    const played = !!match?.played

    return (
        <div className={cx(
            'rounded-card overflow-hidden border bg-surface',
            winner ? 'border-subtle' : 'border-default',
        )}>
            <div className="flex items-center justify-between h-8 pl-3 pr-1 bg-fill border-b border-subtle">
                <span className="text-label uppercase text-muted">
                    {single ? (played ? 'Encerrado' : 'A jogar') : `Jogo ${index + 1}${played ? '' : ' · a jogar'}`}
                </span>
                {isAdmin && match && (
                    <button
                        type="button"
                        onClick={() => onSelectMatch(match)}
                        aria-label={played ? `Editar resultado do jogo ${index + 1}` : `Lançar resultado do jogo ${index + 1}`}
                        className="h-7 px-2 flex items-center gap-1 rounded-control text-caption font-semibold text-brand-text hover:bg-fill-strong transition-colors"
                    >
                        {played ? <Pencil size={12} /> : <Plus size={12} />}
                        {played ? 'Editar' : 'Placar'}
                    </button>
                )}
            </div>
            <PlayerSlot
                playerId={match?.home_id ?? null}
                label={homeLabel}
                players={players}
                score={played ? match?.home_score ?? null : null}
                penalties={played ? match?.home_penalties ?? null : null}
                winner={homeWon}
                decided={!!winner}
            />
            <div className="border-t border-subtle" />
            <PlayerSlot
                playerId={match?.away_id ?? null}
                label={awayLabel}
                players={players}
                score={played ? match?.away_score ?? null : null}
                penalties={played ? match?.away_penalties ?? null : null}
                winner={awayWon}
                decided={!!winner}
            />
        </div>
    )
}

const STAGE_ORDER = [
    { stage: 'round32', label: '16avos de Final' },
    { stage: 'round16', label: 'Oitavas de Final' },
    { stage: 'quarters', label: 'Quartas de Final' },
    { stage: 'semis', label: 'Semifinais' },
    { stage: 'final', label: 'Final' },
]

export default function KnockoutBracket({ matches, players, isAdmin, onSelectMatch }: Props) {
    const presentStages = STAGE_ORDER.filter(s => matches.some(m => m.stage === s.stage))

    return (
        <div className="flex flex-col gap-6 w-full">
            {presentStages.map(({ stage, label }) => {
                const isFinal = stage === 'final'
                const stageMatches = matches
                    .filter(m => m.stage === stage)
                    .sort((a, b) => (a.match_order ?? 0) - (b.match_order ?? 0))

                return (
                    <section key={stage} className="w-full">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="flex-1 h-px bg-fill-strong" />
                            <h3 className={cx(
                                'font-display font-bold uppercase tracking-wide flex items-center gap-1.5',
                                isFinal ? 'text-headline text-brand-text' : 'text-title text-secondary',
                            )}>
                                {isFinal && <Trophy size={18} className="text-brand" aria-hidden />}
                                {label}
                            </h3>
                            <div className="flex-1 h-px bg-fill-strong" />
                        </div>
                        {/* Celular: uma coluna (nomes inteiros); telas maiores: duas */}
                        <div className={isFinal ? 'max-w-sm mx-auto w-full' : 'grid grid-cols-1 sm:grid-cols-2 gap-3'}>
                            {stageMatches.map((match, i) => (
                                <MatchCard
                                    key={match.id}
                                    match={match}
                                    index={i}
                                    single={stageMatches.length === 1}
                                    homeLabel={`Classificado ${i * 2 + 1}`}
                                    awayLabel={`Classificado ${i * 2 + 2}`}
                                    players={players}
                                    isAdmin={isAdmin}
                                    onSelectMatch={onSelectMatch}
                                />
                            ))}
                        </div>
                    </section>
                )
            })}
        </div>
    )
}
