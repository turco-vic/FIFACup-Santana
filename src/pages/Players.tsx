import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import type { Profile } from '../types'
import { Skeleton, SkeletonCard } from '../components/Skeleton'
import { ChevronRight } from 'lucide-react'
import Badge from '../components/ui/Badge'
import Avatar from '../components/ui/Avatar'
import type { BadgeTone } from '../components/ui/variants'

// Selo de situação (só o supreme vê): supreme / pendente / bloqueado / ativo
function statusBadge(player: Profile): { tone: BadgeTone; label: string } {
    if (player.role === 'supreme') return { tone: 'brand', label: 'Supreme' }
    if (player.status === 'pending') return { tone: 'warning', label: 'Pendente' }
    if (player.status === 'blocked') return { tone: 'danger', label: 'Bloqueado' }
    return { tone: 'success', label: 'Ativo' }
}

export default function Players() {
    const { isSupreme } = useAuth()
    const [players, setPlayers] = useState<Profile[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchPlayers() {
            let query = supabase
                .from('profiles')
                .select('*')
                .order('name')

            if (!isSupreme) {
                // Jogadores normais veem só ativos e não-supreme
                query = query.eq('status', 'active').neq('role', 'supreme')
            }

            const { data } = await query
            setPlayers(data ?? [])
            setLoading(false)
        }

        fetchPlayers()
    }, [isSupreme])

    if (loading) {
        return (
            <div className="px-4 pt-4 pb-6 sm:px-6">
                <div className="max-w-2xl mx-auto">
                    <Skeleton className="h-8 w-48 mb-6" />
                    <div className="flex flex-col gap-3">
                        {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="px-4 pt-4 pb-6 sm:px-6">
            <div className="max-w-2xl mx-auto flex flex-col gap-5">

                <header className="flex items-center justify-between gap-3">
                    <h1 className="font-display font-bold text-headline uppercase tracking-wide text-brand-text">
                        {isSupreme ? 'Todos os usuários' : 'Participantes'}
                    </h1>
                    <Badge size="md">{players.length} usuário{players.length !== 1 ? 's' : ''}</Badge>
                </header>

                <div className="flex flex-col gap-2">
                    {players.map(player => {
                        const status = statusBadge(player)
                        return (
                            <Link
                                key={player.id}
                                to={`/player/${player.id}`}
                                className="group flex items-center gap-3 p-3 pr-2 rounded-card bg-surface border border-subtle hover:bg-surface-hover transition-colors"
                            >
                                <Avatar src={player.avatar_url} name={player.name} size="lg" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-body-lg font-semibold text-primary truncate">{player.name ?? 'Sem nome'}</p>
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
                                        {player.username && <span className="text-caption text-muted">@{player.username}</span>}
                                        {isSupreme && <Badge tone={status.tone}>{status.label}</Badge>}
                                        {player.team_name && <Badge tone="brand">{player.team_name}</Badge>}
                                    </div>
                                </div>
                                <ChevronRight size={20} className="text-muted flex-shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden />
                            </Link>
                        )
                    })}
                </div>

            </div>
        </div>
    )
}
