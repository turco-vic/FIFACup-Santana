import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import type { Tournament } from '../types'
import { Skeleton, SkeletonCard } from '../components/Skeleton'
import { Trophy, Swords, Handshake, Calendar, Plus, Hash } from 'lucide-react'

const FORMAT_LABEL: Record<string, string> = {
    groups_knockout: 'Grupos + Mata-mata',
    league: 'Liga',
    knockout: 'Mata-mata',
    league_final: 'Liga + Final',
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
    setup: { label: 'Em configuração', color: 'text-white/40' },
    active: { label: 'Em andamento', color: 'text-green-400' },
    finished: { label: 'Encerrado', color: 'text-white/30' },
}

export default function Tournaments() {
    const { profile, isSupreme } = useAuth()
    const navigate = useNavigate()
    const [tournaments, setTournaments] = useState<Tournament[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!profile) return
        fetchTournaments()
    }, [profile?.id, isSupreme])

    async function fetchTournaments() {
        if (isSupreme) {
            const { data } = await supabase
                .from('tournaments')
                .select('*')
                .order('created_at', { ascending: false })
            setTournaments(data ?? [])
        } else {
            const { data: tp } = await supabase
                .from('tournament_players')
                .select('tournament_id')
                .eq('player_id', profile!.id)

            const ids = (tp ?? []).map(t => t.tournament_id)

            if (ids.length === 0) {
                setTournaments([])
            } else {
                const { data } = await supabase
                    .from('tournaments')
                    .select('*')
                    .in('id', ids)
                    .order('created_at', { ascending: false })
                setTournaments(data ?? [])
            }
        }
        setLoading(false)
    }

    if (loading) {
        return (
            <div className="min-h-screen p-6">
                <div className="max-w-2xl mx-auto">
                    <Skeleton className="h-8 w-48 mb-6" />
                    <div className="flex flex-col gap-3">
                        {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                </div>
            </div>
        )
    }

    const active = tournaments.filter(t => t.status === 'active')
    const others = tournaments.filter(t => t.status !== 'active')

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-2xl mx-auto">

                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold" style={{ color: 'var(--color-gold)' }}>
                        {isSupreme ? 'Todos os campeonatos' : 'Meus campeonatos'}
                    </h1>
                    {!isSupreme && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => navigate('/tournaments/join')}
                                className="p-2 rounded-lg border border-white/20 text-white/40 hover:text-white hover:border-white/40 transition"
                                title="Entrar com código"
                            >
                                <Hash size={18} />
                            </button>
                            <button
                                onClick={() => navigate('/tournaments/new')}
                                className="p-2 rounded-lg border border-white/20 text-white/40 hover:text-white hover:border-white/40 transition"
                                title="Criar campeonato"
                            >
                                <Plus size={18} />
                            </button>
                        </div>
                    )}
                </div>

                {tournaments.length === 0 ? (
                    <div className="text-center py-16">
                        <Trophy size={48} className="mx-auto mb-4 text-white/10" />
                        <p className="text-white/30 text-sm">Você não está em nenhum campeonato.</p>
                        <p className="text-white/20 text-xs mt-1">Crie um ou entre com um código de convite.</p>
                        <div className="flex gap-3 justify-center mt-6">
                            <button
                                onClick={() => navigate('/tournaments/new')}
                                className="px-5 py-2.5 rounded-xl font-bold text-sm transition hover:opacity-90"
                                style={{ backgroundColor: 'var(--color-gold)', color: 'var(--color-green)' }}
                            >
                                Criar campeonato
                            </button>
                            <button
                                onClick={() => navigate('/tournaments/join')}
                                className="px-5 py-2.5 rounded-xl font-bold text-sm transition border border-white/20 text-white hover:bg-white/10"
                            >
                                Entrar com código
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {active.length > 0 && (
                            <div className="mb-6">
                                <h3 className="text-white/40 text-xs uppercase tracking-wider mb-3">Em andamento</h3>
                                <div className="flex flex-col gap-3">
                                    {active.map(t => (
                                        <TournamentCard key={t.id} tournament={t} onClick={() => navigate(`/tournament/${t.id}`)} />
                                    ))}
                                </div>
                            </div>
                        )}
                        {others.length > 0 && (
                            <div className="mb-6">
                                <h3 className="text-white/40 text-xs uppercase tracking-wider mb-3">Outros</h3>
                                <div className="flex flex-col gap-3">
                                    {others.map(t => (
                                        <TournamentCard key={t.id} tournament={t} onClick={() => navigate(`/tournament/${t.id}`)} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}

            </div>
        </div>
    )
}

function TournamentCard({ tournament: t, onClick }: { tournament: Tournament; onClick: () => void }) {
    const status = STATUS_LABEL[t.status] ?? { label: t.status, color: 'text-white/40' }

    return (
        <button
            onClick={onClick}
            className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition text-left w-full"
        >
            <div className="p-2.5 rounded-lg flex-shrink-0" style={{ backgroundColor: 'rgba(201,153,42,0.15)' }}>
                {t.mode === '1v1'
                    ? <Swords size={20} style={{ color: 'var(--color-gold)' }} />
                    : <Handshake size={20} style={{ color: 'var(--color-gold)' }} />
                }
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm truncate">{t.name}</p>
                <p className="text-white/40 text-xs truncate">
                    {t.mode} · {FORMAT_LABEL[t.format] ?? t.format}
                </p>
                {t.date && (
                    <p className="text-white/30 text-xs flex items-center gap-1 mt-0.5">
                        <Calendar size={10} />
                        {new Date(t.date).toLocaleDateString('pt-BR')}
                    </p>
                )}
            </div>
            <div className="flex-shrink-0 text-right">
                <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
                <p className="text-white/20 text-xs mt-0.5 font-mono">{t.invite_code}</p>
            </div>
        </button>
    )
}
