import { useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../hooks/useToast'
import type { Profile } from '../types'
import {
    Users, LogOut, Pencil,
    CheckCircle, XCircle, Clock, Shield, ChevronDown, ChevronUp
} from 'lucide-react'
import { Skeleton } from '../components/Skeleton'
import EditPlayerModal from '../components/EditPlayerModal'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Avatar from '../components/ui/Avatar'
import { Card, CardBody } from '../components/ui/Card'
import { cx } from '../lib/cx'

export default function Supreme() {
    const { profile, signOut } = useAuth()
    const navigate = useNavigate()
    const { showToast } = useToast()

    const [allProfiles, setAllProfiles] = useState<Profile[]>([])
    const [loading, setLoading] = useState(true)
    const [editingPlayer, setEditingPlayer] = useState<Profile | null>(null)
    const [expandedSection, setExpandedSection] = useState<'pending' | 'active' | null>('pending')

    useEffect(() => {
        fetchProfiles()
    }, [])

    async function fetchProfiles() {
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false })

        setAllProfiles(data ?? [])
        setLoading(false)
    }

    async function handleSignOut() {
        await signOut()
        navigate('/login')
    }

    async function handleApprove(p: Profile) {
        const { error } = await supabase
            .from('profiles')
            .update({ status: 'active' })
            .eq('id', p.id)

        if (error) { showToast('Erro ao aprovar.', 'error'); return }
        setAllProfiles(prev => prev.map(u => u.id === p.id ? { ...u, status: 'active' } : u))
        showToast(`${p.name ?? p.username ?? 'Usuário'} aprovado!`)
    }

    async function handleBlock(p: Profile) {
        const newStatus = p.status === 'blocked' ? 'active' : 'blocked'
        const { error } = await supabase
            .from('profiles')
            .update({ status: newStatus })
            .eq('id', p.id)

        if (error) { showToast('Erro ao atualizar.', 'error'); return }
        setAllProfiles(prev => prev.map(u => u.id === p.id ? { ...u, status: newStatus } : u))
        showToast(newStatus === 'blocked' ? 'Usuário bloqueado.' : 'Usuário desbloqueado.')
    }

    function handlePlayerSaved(updated: Profile) {
        setAllProfiles(prev => prev.map(p => p.id === updated.id ? updated : p))
    }

    if (!profile || profile.role !== 'supreme') return null

    if (loading) {
        return (
            <div className="px-4 pt-4 pb-6 sm:px-6">
                <div className="max-w-2xl mx-auto flex flex-col gap-4">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-32" />
                    <div className="grid grid-cols-3 gap-3">
                        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-card" />)}
                    </div>
                    {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-card" />)}
                </div>
            </div>
        )
    }

    const pending = allProfiles.filter(p => p.status === 'pending')
    const active = allProfiles.filter(p => p.status === 'active' && p.role !== 'supreme')
    const blocked = allProfiles.filter(p => p.status === 'blocked')

    const displayName = profile.username ?? profile.name?.split(' ')[0] ?? 'Supreme'

    return (
        <div className="px-4 pt-4 pb-6 sm:px-6">
            <div className="max-w-2xl mx-auto flex flex-col gap-5">

                <header className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h1 className="flex items-center gap-2 font-display font-bold text-headline uppercase tracking-wide text-brand-text">
                            <Shield size={22} className="text-brand" aria-hidden />
                            AdminSupremo
                        </h1>
                        <p className="text-body text-muted mt-0.5">Olá, {displayName}</p>
                    </div>
                    <Button variant="secondary" size="sm" icon={<LogOut size={15} />} onClick={handleSignOut}>Sair</Button>
                </header>

                {/* Resumo */}
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: 'Pendentes', value: pending.length, color: pending.length > 0 ? 'text-warning' : 'text-primary' },
                        { label: 'Ativos', value: active.length, color: 'text-primary' },
                        { label: 'Bloqueados', value: blocked.length, color: blocked.length > 0 ? 'text-danger' : 'text-primary' },
                    ].map(({ label, value, color }) => (
                        <Card key={label}>
                            <CardBody className="px-2 py-4 text-center">
                                <p className={cx('font-display font-bold text-display tabular-nums leading-none', color)}>{value}</p>
                                <p className="text-caption text-muted mt-1.5">{label}</p>
                            </CardBody>
                        </Card>
                    ))}
                </div>

                {/* Contas pendentes */}
                <Card className={pending.length > 0 ? 'border-warning-border' : undefined}>
                    <SectionToggle
                        open={expandedSection === 'pending'}
                        onToggle={() => setExpandedSection(expandedSection === 'pending' ? null : 'pending')}
                        icon={<Clock size={18} className={pending.length > 0 ? 'text-warning' : 'text-muted'} />}
                        title="Aguardando aprovação"
                        highlight={pending.length > 0}
                        badge={pending.length > 0 && <Badge tone="warning">{pending.length}</Badge>}
                    />
                    {expandedSection === 'pending' && (
                        <div>
                            {pending.length === 0 ? (
                                <p className="text-body text-muted text-center py-6">Nenhuma conta pendente</p>
                            ) : pending.map(p => (
                                <div key={p.id} className="flex flex-wrap items-center gap-3 px-card py-3 border-b border-subtle last:border-0">
                                    <Avatar name={p.name} size="md" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-body font-semibold text-primary truncate">{p.name ?? 'Sem nome'}</p>
                                        <p className="text-caption text-muted truncate">{new Date(p.created_at).toLocaleDateString('pt-BR')}</p>
                                    </div>
                                    <div className="flex gap-2 flex-shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => handleApprove(p)}
                                            className="h-10 px-3 flex items-center gap-1.5 rounded-control border border-success-border bg-success-subtle text-success text-body font-semibold hover:brightness-110 transition"
                                        >
                                            <CheckCircle size={16} aria-hidden />
                                            Aprovar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleBlock(p)}
                                            className="h-10 px-3 flex items-center gap-1.5 rounded-control border border-danger-border bg-danger-subtle text-danger text-body font-semibold hover:brightness-110 transition"
                                        >
                                            <XCircle size={16} aria-hidden />
                                            Recusar
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                {/* Usuários ativos */}
                <Card>
                    <SectionToggle
                        open={expandedSection === 'active'}
                        onToggle={() => setExpandedSection(expandedSection === 'active' ? null : 'active')}
                        icon={<Users size={18} className="text-brand" />}
                        title="Usuários ativos"
                        badge={<Badge tone="brand">{active.length}</Badge>}
                    />
                    {expandedSection === 'active' && (
                        <div>
                            {active.length === 0 ? (
                                <p className="text-body text-muted text-center py-6">Nenhum usuário ativo</p>
                            ) : active.map(p => (
                                <div key={p.id} className="flex items-center gap-3 px-card py-3 min-h-16 border-b border-subtle last:border-0">
                                    <Avatar src={p.avatar_url} name={p.name} size="md" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-body font-semibold text-primary truncate">{p.name ?? 'Sem nome'}</p>
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
                                            {p.username && <span className="text-caption text-muted">@{p.username}</span>}
                                            {p.team_name && <Badge tone="brand">{p.team_name}</Badge>}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 flex-shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => setEditingPlayer(p)}
                                            aria-label={`Editar ${p.name ?? 'usuário'}`}
                                            className="h-10 w-10 flex items-center justify-center rounded-control border border-default text-secondary hover:text-primary hover:bg-fill-strong transition-colors"
                                        >
                                            <Pencil size={16} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleBlock(p)}
                                            aria-label={`Bloquear ${p.name ?? 'usuário'}`}
                                            className="h-10 w-10 flex items-center justify-center rounded-control border border-danger-border text-danger hover:bg-danger-subtle transition-colors"
                                        >
                                            <XCircle size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                {/* Usuários bloqueados */}
                {blocked.length > 0 && (
                    <Card className="border-danger-border">
                        <div className="flex items-center gap-2 px-card py-3 bg-danger-subtle border-b border-danger-border">
                            <XCircle size={18} className="text-danger" aria-hidden />
                            <h2 className="font-display font-bold text-title uppercase tracking-wide text-danger">Bloqueados</h2>
                            <Badge tone="danger">{blocked.length}</Badge>
                        </div>
                        <div>
                            {blocked.map(p => (
                                <div key={p.id} className="flex items-center gap-3 px-card py-3 border-b border-subtle last:border-0">
                                    <Avatar name={p.name} size="md" className="opacity-60" />
                                    <p className="flex-1 min-w-0 text-body text-muted truncate">{p.name ?? 'Sem nome'}</p>
                                    <button
                                        type="button"
                                        onClick={() => handleBlock(p)}
                                        className="h-10 px-3 rounded-control border border-success-border bg-success-subtle text-success text-body font-semibold hover:brightness-110 transition flex-shrink-0"
                                    >
                                        Desbloquear
                                    </button>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}

            </div>

            {editingPlayer && (
                <EditPlayerModal
                    player={editingPlayer}
                    onClose={() => setEditingPlayer(null)}
                    onSaved={handlePlayerSaved}
                />
            )}
        </div>
    )
}

// Cabeçalho de seção que abre e fecha (lista de pendentes / ativos)
function SectionToggle({ open, onToggle, icon, title, badge, highlight = false }: {
    open: boolean
    onToggle: () => void
    icon: ReactNode
    title: string
    badge?: ReactNode
    highlight?: boolean
}) {
    return (
        <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            className={cx(
                'w-full flex items-center justify-between gap-3 px-card min-h-14 text-left transition-colors hover:bg-surface-hover',
                open && 'border-b border-subtle',
                highlight ? 'bg-warning-subtle' : 'bg-brand-subtle',
            )}
        >
            <span className="flex items-center gap-2 min-w-0">
                {icon}
                <span className={cx(
                    'font-display font-bold text-title uppercase tracking-wide truncate',
                    highlight ? 'text-warning' : 'text-brand-text',
                )}>
                    {title}
                </span>
                {badge}
            </span>
            {open ? <ChevronUp size={18} className="text-muted flex-shrink-0" /> : <ChevronDown size={18} className="text-muted flex-shrink-0" />}
        </button>
    )
}
