import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import type { Profile, Tournament } from '../types'
import { Trophy } from 'lucide-react'
import { Skeleton, SkeletonCard } from '../components/Skeleton'
import Avatar from '../components/ui/Avatar'
import Select from '../components/ui/Select'
import { Card, CardBody } from '../components/ui/Card'
import { cx } from '../lib/cx'

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

    const profileId = profile?.id

    useEffect(() => {
        if (!profileId) return
        async function fetchTournaments() {
            let query = supabase
                .from('tournaments')
                .select('id, name, status')
                .eq('mode', '1v1')
                .order('created_at', { ascending: false })
            if (!isSupreme) {
                const { data: tp } = await supabase
                    .from('tournament_players').select('tournament_id').eq('player_id', profileId)
                const ids = (tp ?? []).map(t => t.tournament_id)
                if (ids.length === 0) { setLoading(false); return }
                query = query.in('id', ids)
            }
            const { data } = await query
            setTournaments(data ?? [])
            setLoading(false)
        }
        fetchTournaments()
    }, [profileId, isSupreme])

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
            <div className="px-4 pt-4 pb-6 sm:px-6">
                <div className="max-w-2xl mx-auto">
                    <Skeleton className="h-8 w-48 mb-4" />
                    <Skeleton className="h-11 w-full mb-6 rounded-card" />
                    <div className="flex flex-col gap-2">
                        {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="px-4 pt-4 pb-6 sm:px-6">
            <div className="max-w-2xl mx-auto flex flex-col gap-5">

                <h1 className="font-display font-bold text-headline uppercase tracking-wide text-brand-text">
                    Artilheiros | 1v1
                </h1>

                {tournaments.length > 0 && (
                    <Select
                        label="Campeonato"
                        value={selectedId ?? ''}
                        onChange={e => setSearchParams({ t: e.target.value })}
                    >
                        {tournaments.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </Select>
                )}

                {tournaments.length === 0 ? (
                    <Card>
                        <CardBody className="flex flex-col items-center text-center gap-2 py-10">
                            <Trophy size={36} className="text-faint" aria-hidden />
                            <p className="text-body text-muted">Você não está em nenhum campeonato 1v1.</p>
                        </CardBody>
                    </Card>
                ) : loadingGoals ? (
                    <div className="flex flex-col gap-2">
                        {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                ) : players.length === 0 ? (
                    <Card>
                        <CardBody className="flex flex-col items-center text-center gap-2 py-10">
                            <Trophy size={36} className="text-faint" aria-hidden />
                            <p className="text-body text-muted">Nenhum gol registrado neste campeonato.</p>
                        </CardBody>
                    </Card>
                ) : (
                    <div className="flex flex-col gap-2">
                        {players.map((player, i) => (
                            <Link
                                key={player.id}
                                to={`/player/${player.id}`}
                                className={cx(
                                    'flex items-center gap-3 p-3 pr-4 rounded-card border transition-colors',
                                    i === 0
                                        ? 'bg-brand-subtle border-accent shadow-brand hover:bg-brand-muted'
                                        : 'bg-surface border-subtle hover:bg-surface-hover',
                                )}
                            >
                                <div className="w-8 flex justify-center flex-shrink-0">
                                    {i === 0 ? (
                                        <Trophy size={22} className="text-brand" aria-label="1º lugar" />
                                    ) : (
                                        <span className="font-display font-bold text-title tabular-nums text-muted">{i + 1}</span>
                                    )}
                                </div>

                                <Avatar src={player.avatar_url} name={player.username ?? player.name} size="md" />

                                <div className="flex-1 min-w-0">
                                    <p className={cx('truncate', i === 0 ? 'font-display font-bold text-title uppercase tracking-wide text-brand-text' : 'text-body-lg font-semibold text-primary')}>
                                        {player.username ?? player.name}
                                    </p>
                                    {player.team_name && (
                                        <p className="text-caption text-muted truncate">{player.team_name}</p>
                                    )}
                                </div>

                                <div className="flex-shrink-0 text-right">
                                    <p className={cx('font-display font-bold text-display tabular-nums leading-none', i === 0 ? 'text-brand-text' : 'text-primary')}>
                                        {player.total_goals}
                                    </p>
                                    <p className="text-caption text-muted">
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
