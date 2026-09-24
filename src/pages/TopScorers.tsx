import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import type { Profile, Tournament } from '../types'
import { Trophy } from 'lucide-react'
import { Skeleton, SkeletonCard } from '../components/Skeleton'

type PlayerGoals = Profile & { total_goals: number }
type TournamentOption = Pick<Tournament, 'id' | 'name' | 'status'>

// Artilharia de um campeonato. Só o 1v1 grava gols por jogador.
export default function TopScorers() {
    const { profile, isSupreme } = useAuth()
    const [searchParams, setSearchParams] = useSearchParams()
    const [tournaments, setTournaments] = useState<TournamentOption[]>([])
    const [players, setPlayers] = useState<PlayerGoals[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingGoals, setLoadingGoals] = useState(false)

    // ?t=<id> escolhe o campeonato; sem ele, o primeiro em andamento (ou o mais recente)
    const selectedId = searchParams.get('t')
        ?? (tournaments.find(t => t.status === 'active') ?? tournaments[0])?.id
        ?? null

    useEffect(() => {
        if (!profile) return
        async function fetchTournaments() {
            let query = supabase
                .from('tournaments')
                .select('id, name, status')
                .eq('mode', '1v1')
                .order('created_at', { ascending: false })
            if (!isSupreme) {
                const { data: tp } = await supabase
                    .from('tournament_players').select('tournament_id').eq('player_id', profile!.id)
                const ids = (tp ?? []).map(t => t.tournament_id)
                if (ids.length === 0) { setLoading(false); return }
                query = query.in('id', ids)
            }
            const { data } = await query
            setTournaments(data ?? [])
            setLoading(false)
        }
        fetchTournaments()
    }, [profile?.id, isSupreme])

    useEffect(() => {
        if (!selectedId) { setPlayers([]); return }
        let cancelled = false
        async function fetchGoals(tid: string) {
            setLoadingGoals(true)
            const { data: matchesData } = await supabase
                .from('matches').select('id').eq('tournament_id', tid).eq('played', true)
            const matchIds = (matchesData ?? []).map(m => m.id)

            const { data: goalsData } = matchIds.length > 0
                ? await supabase.from('goals').select('player_id, quantity').in('match_id', matchIds)
                : { data: [] as { player_id: string; quantity: number }[] }

            const goalMap: Record<string, number> = {}
            ;(goalsData ?? []).forEach(g => {
                goalMap[g.player_id] = (goalMap[g.player_id] ?? 0) + g.quantity
            })
            const scorerIds = Object.keys(goalMap)

            const { data: playersData } = scorerIds.length > 0
                ? await supabase.from('profiles').select('*').in('id', scorerIds)
                : { data: [] as Profile[] }

            if (cancelled) return
            setPlayers((playersData ?? [])
                .map(p => ({ ...p, total_goals: goalMap[p.id] ?? 0 }))
                .sort((a, b) => b.total_goals - a.total_goals))
            setLoadingGoals(false)
        }
        fetchGoals(selectedId)
        return () => { cancelled = true }
    }, [selectedId])

    if (loading) {
        return (
            <div className="min-h-screen p-6">
                <div className="max-w-2xl mx-auto">
                    <Skeleton className="h-8 w-40 mb-6" />
                    <div className="flex flex-col gap-2">
                        {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-2xl mx-auto">

                <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-gold)' }}>
                    Artilheiros — 1v1
                </h1>

                {tournaments.length > 0 && (
                    <select
                        value={selectedId ?? ''}
                        onChange={e => setSearchParams({ t: e.target.value })}
                        aria-label="Campeonato"
                        className="w-full mb-6 px-4 py-3 rounded-xl bg-white/10 text-white border border-white/20 focus:outline-none focus:border-yellow-500 text-sm"
                    >
                        {tournaments.map(t => (
                            <option key={t.id} value={t.id} style={{ backgroundColor: '#081f16' }}>{t.name}</option>
                        ))}
                    </select>
                )}

                {tournaments.length === 0 ? (
                    <p className="text-white/40 text-center mt-12">
                        Você não está em nenhum campeonato 1v1.
                    </p>
                ) : loadingGoals ? (
                    <div className="flex flex-col gap-2">
                        {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                ) : players.length === 0 ? (
                    <p className="text-white/40 text-center mt-12">
                        Nenhum gol registrado neste campeonato.
                    </p>
                ) : (
                    <div className="flex flex-col gap-2">
                        {players.map((player, i) => (
                            <Link
                                key={player.id}
                                to={`/player/${player.id}`}
                                className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
                            >
                                <div className="w-8 text-center flex-shrink-0">
                                    {i === 0 ? (
                                        <Trophy size={20} style={{ color: 'var(--color-gold)' }} />
                                    ) : (
                                        <span className="text-white/40 font-bold text-sm">{i + 1}</span>
                                    )}
                                </div>

                                <div
                                    className="w-10 h-10 rounded-full overflow-hidden bg-white/10 flex-shrink-0 flex items-center justify-center font-bold border"
                                    style={{ borderColor: i === 0 ? 'var(--color-gold)' : 'transparent' }}
                                >
                                    {player.avatar_url
                                        ? <img src={player.avatar_url} alt="" className="w-full h-full object-cover" />
                                        : <span className="text-white/40">{player.name?.charAt(0)}</span>
                                    }
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-bold truncate">
                                        {player.username ?? player.name}
                                    </p>
                                    {player.team_name && (
                                        <p className="text-white/40 text-xs truncate">{player.team_name}</p>
                                    )}
                                </div>

                                <div className="flex-shrink-0 text-right">
                                    <p className="text-2xl font-bold" style={{ color: 'var(--color-gold)' }}>
                                        {player.total_goals}
                                    </p>
                                    <p className="text-white/30 text-xs">
                                        {player.total_goals === 1 ? 'gol' : 'gols'}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

            </div>
        </div>
    )
}
