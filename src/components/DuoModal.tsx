import { X } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Match } from '../types'

type Player = {
    id: string
    name: string | null
    username: string | null
    avatar_url: string | null
    team_name: string | null
}

type Duo = {
    id: string
    duo_name: string | null
    duo_team: string | null
    player1: Player
    player2: Player
}

type Props = {
    duo: Duo
    matches: Match[]
    onClose: () => void
}

function PlayerCard({ player, onClose }: { player: Player; onClose: () => void }) {
    return (
        <Link
            to={`/player/${player.id}`}
            onClick={onClose}
            className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
        >
            <div
                className="w-10 h-10 rounded-full overflow-hidden bg-white/10 flex-shrink-0 flex items-center justify-center font-bold border"
                style={{ borderColor: 'var(--color-gold)' }}
            >
                {player.avatar_url
                    ? <img src={player.avatar_url} alt="" className="w-full h-full object-cover" />
                    : <span className="text-white/40 text-sm">{player.name?.charAt(0)}</span>
                }
            </div>
            <div className="min-w-0">
                <p className="text-white font-medium text-sm truncate">
                    {player.username ?? player.name}
                </p>
            </div>
        </Link>
    )
}

export default function DuoModal({ duo, matches, onClose }: Props) {
    const duoMatches = matches.filter(
        m => (m.home_id === duo.id || m.away_id === duo.id) && m.played
    )

    const stats = {
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goals_for: 0,
        goals_against: 0,
        points: 0,
    }

    duoMatches.forEach(m => {
        const isHome = m.home_id === duo.id
        const myScore = isHome ? (m.home_score ?? 0) : (m.away_score ?? 0)
        const oppScore = isHome ? (m.away_score ?? 0) : (m.home_score ?? 0)

        stats.played++
        stats.goals_for += myScore
        stats.goals_against += oppScore

        if (myScore > oppScore) { stats.wins++; stats.points += 3 }
        else if (myScore === oppScore) { stats.draws++; stats.points++ }
        else stats.losses++
    })

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <div
                className="w-full max-w-sm rounded-2xl border border-white/10 overflow-hidden"
                style={{ backgroundColor: 'var(--color-green)' }}
            >
                <div
                    className="flex items-center justify-between px-5 py-4 border-b border-white/10"
                    style={{ backgroundColor: 'rgba(201,153,42,0.1)' }}
                >
                    <div>
                        <h2 className="text-white font-bold">
                            {duo.duo_name ?? `${duo.player1.username ?? duo.player1.name} & ${duo.player2.username ?? duo.player2.name}`}
                        </h2>
                        {duo.duo_team && (
                            <p className="text-xs mt-0.5" style={{ color: 'var(--color-gold)' }}>
                                ⚽ {duo.duo_team}
                            </p>
                        )}
                    </div>
                    <button onClick={onClose} className="text-white/40 hover:text-white transition">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-5 flex flex-col gap-5">
                    <div>
                        <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Jogadores</p>
                        <div className="flex flex-col gap-2">
                            <PlayerCard player={duo.player1} onClose={onClose} />
                            <PlayerCard player={duo.player2} onClose={onClose} />
                        </div>
                    </div>

                    {stats.played > 0 ? (
                        <div>
                            <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Estatísticas 2v2</p>
                            <div className="grid grid-cols-3 gap-2 mb-2">
                                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                                    <p className="text-xl font-bold text-green-400">{stats.wins}</p>
                                    <p className="text-white/40 text-xs mt-1">V</p>
                                </div>
                                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                                    <p className="text-xl font-bold text-white/60">{stats.draws}</p>
                                    <p className="text-white/40 text-xs mt-1">E</p>
                                </div>
                                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                                    <p className="text-xl font-bold text-red-400">{stats.losses}</p>
                                    <p className="text-white/40 text-xs mt-1">D</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                                    <p className="text-xl font-bold" style={{ color: 'var(--color-gold)' }}>{stats.points}</p>
                                    <p className="text-white/40 text-xs mt-1">Pts</p>
                                </div>
                                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                                    <p className="text-xl font-bold text-white">{stats.goals_for}</p>
                                    <p className="text-white/40 text-xs mt-1">GM</p>
                                </div>
                                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                                    <p className="text-xl font-bold text-white">{stats.goals_against}</p>
                                    <p className="text-white/40 text-xs mt-1">GS</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-white/30 text-center text-sm">Nenhuma partida jogada ainda.</p>
                    )}
                </div>
            </div>
        </div>
    )
}
