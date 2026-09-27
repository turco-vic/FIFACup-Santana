import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/format'
import { FORMAT_LABEL, STATUS_LABEL } from '../lib/labels'
import { useAuth } from '../hooks/useAuth'
import type { Tournament } from '../types'
import { Skeleton, SkeletonCard } from '../components/Skeleton'
import { Trophy, Swords, Handshake, Calendar, Plus, Hash, ChevronRight } from 'lucide-react'
import Badge from '../components/ui/Badge'
import { Card, CardBody } from '../components/ui/Card'
import { buttonClasses, type BadgeTone } from '../components/ui/variants'
import { cx } from '../lib/cx'

const STATUS_TONE: Record<string, BadgeTone> = {
    setup: 'neutral',
    active: 'success',
    finished: 'neutral',
}

export default function Tournaments() {
    const { profile, isSupreme } = useAuth()
    const [tournaments, setTournaments] = useState<Tournament[]>([])
    const [loading, setLoading] = useState(true)

    const profileId = profile?.id

    useEffect(() => {
        if (!profileId) return
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
                    .eq('player_id', profileId)

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
        fetchTournaments()
    }, [profileId, isSupreme])

    if (loading) {
        return (
            <div className="px-4 pt-4 pb-6 sm:px-6">
                <div className="max-w-2xl mx-auto">
                    <Skeleton className="h-9 w-56 mb-6" />
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
        <div className="px-4 pt-4 pb-6 sm:px-6">
            <div className="max-w-2xl mx-auto flex flex-col gap-6">

                <header className="flex items-center justify-between gap-3">
                    <h1 className="font-display font-bold text-headline uppercase tracking-wide text-brand-text">
                        {isSupreme ? 'Todos os campeonatos' : 'Meus campeonatos'}
                    </h1>
                    {!isSupreme && (
                        <div className="flex gap-2 flex-shrink-0">
                            <Link
                                to="/tournaments/join"
                                aria-label="Entrar com código"
                                title="Entrar com código"
                                className={buttonClasses({ variant: 'secondary', size: 'icon' })}
                            >
                                <Hash size={18} />
                            </Link>
                            <Link
                                to="/tournaments/new"
                                aria-label="Criar campeonato"
                                title="Criar campeonato"
                                className={buttonClasses({ size: 'icon' })}
                            >
                                <Plus size={20} />
                            </Link>
                        </div>
                    )}
                </header>

                {tournaments.length === 0 ? (
                    <Card>
                        <CardBody className="flex flex-col items-center text-center gap-2 py-10">
                            <Trophy size={40} className="text-faint mb-2" aria-hidden />
                            <p className="text-body-lg text-secondary">Você não está em nenhum campeonato.</p>
                            <p className="text-body text-muted">Crie um ou entre com um código de convite.</p>
                            <div className="flex flex-wrap gap-3 justify-center mt-4">
                                <Link to="/tournaments/new" className={buttonClasses()}>Criar campeonato</Link>
                                <Link to="/tournaments/join" className={buttonClasses({ variant: 'secondary' })}>Entrar com código</Link>
                            </div>
                        </CardBody>
                    </Card>
                ) : (
                    <>
                        {active.length > 0 && (
                            <section className="flex flex-col gap-3">
                                <h2 className="text-label uppercase text-muted">Em andamento · {active.length}</h2>
                                {active.map(t => <TournamentCard key={t.id} tournament={t} />)}
                            </section>
                        )}
                        {others.length > 0 && (
                            <section className="flex flex-col gap-3">
                                <h2 className="text-label uppercase text-muted">Outros · {others.length}</h2>
                                {others.map(t => <TournamentCard key={t.id} tournament={t} />)}
                            </section>
                        )}
                    </>
                )}

            </div>
        </div>
    )
}

export function TournamentCard({ tournament: t }: { tournament: Tournament }) {
    const active = t.status === 'active'
    return (
        <Link
            to={`/tournament/${t.id}`}
            className={cx(
                'group flex items-center gap-3 p-4 rounded-card border transition-colors',
                active ? 'bg-surface border-accent hover:bg-surface-hover' : 'bg-surface border-subtle hover:bg-surface-hover',
            )}
        >
            <div className="w-11 h-11 rounded-control bg-brand-muted text-brand-text flex items-center justify-center flex-shrink-0">
                {t.mode === '1v1' ? <Swords size={22} aria-hidden /> : <Handshake size={22} aria-hidden />}
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-title uppercase tracking-wide text-primary truncate leading-tight">
                    {t.name}
                </p>
                <p className="text-caption text-muted truncate mt-0.5">
                    {t.mode} · {FORMAT_LABEL[t.format] ?? t.format}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                    <Badge tone={STATUS_TONE[t.status] ?? 'neutral'} dot={active}>
                        {STATUS_LABEL[t.status] ?? t.status}
                    </Badge>
                    {t.date && (
                        <span className="text-caption text-muted flex items-center gap-1">
                            <Calendar size={12} aria-hidden />
                            {formatDate(t.date)}
                        </span>
                    )}
                    <span className="text-caption text-faint font-mono tracking-wider">{t.invite_code}</span>
                </div>
            </div>
            <ChevronRight size={20} className="text-muted flex-shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
    )
}
