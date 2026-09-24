import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../contexts/ToastContext'
import type { Profile } from '../types'
import {
    Users, LogOut, Pencil,
    CheckCircle, XCircle, Clock, Shield, ChevronDown, ChevronUp
} from 'lucide-react'
import { Skeleton } from '../components/Skeleton'
import EditPlayerModal from '../components/EditPlayerModal'

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

        if (error) { showToast('Erro ao aprovar.'); return }
        setAllProfiles(prev => prev.map(u => u.id === p.id ? { ...u, status: 'active' } : u))
        showToast(`${p.name ?? p.username ?? 'Usuário'} aprovado!`)
    }

    async function handleBlock(p: Profile) {
        const newStatus = p.status === 'blocked' ? 'active' : 'blocked'
        const { error } = await supabase
            .from('profiles')
            .update({ status: newStatus })
            .eq('id', p.id)

        if (error) { showToast('Erro ao atualizar.'); return }
        setAllProfiles(prev => prev.map(u => u.id === p.id ? { ...u, status: newStatus } : u))
        showToast(newStatus === 'blocked' ? 'Usuário bloqueado.' : 'Usuário desbloqueado.')
    }

    function handlePlayerSaved(updated: Profile) {
        setAllProfiles(prev => prev.map(p => p.id === updated.id ? updated : p))
    }

    if (!profile || profile.role !== 'supreme') return null

    if (loading) {
        return (
            <div className="min-h-screen p-6">
                <div className="max-w-2xl mx-auto flex flex-col gap-4">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-32" />
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10">
                            <Skeleton className="h-5 w-40 mb-3" />
                            <Skeleton className="h-12 w-full" />
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    const pending = allProfiles.filter(p => p.status === 'pending')
    const active = allProfiles.filter(p => p.status === 'active' && p.role !== 'supreme')
    const blocked = allProfiles.filter(p => p.status === 'blocked')

    const displayName = profile.username ?? profile.name?.split(' ')[0] ?? 'Supreme'

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-2xl mx-auto">

                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <div className="flex items-center gap-2">
                            <Shield size={18} style={{ color: 'var(--color-gold)' }} />
                            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-gold)' }}>
                                AdminSupremo
                            </h1>
                        </div>
                        <p className="text-white/40 text-sm mt-0.5">Olá, {displayName}</p>
                    </div>
                    <button
                        onClick={handleSignOut}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-white border border-white/20 hover:bg-white/10 transition text-sm"
                    >
                        <LogOut size={14} />
                        Sair
                    </button>
                </div>

                {/* Cards resumo */}
                <div className="grid grid-cols-3 gap-3 mb-6 mt-6">
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                        <p className="text-white text-2xl font-bold">{pending.length}</p>
                        <p className="text-white/40 text-xs mt-1">Pendentes</p>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                        <p className="text-white text-2xl font-bold">{active.length}</p>
                        <p className="text-white/40 text-xs mt-1">Ativos</p>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                        <p className="text-white text-2xl font-bold">{blocked.length}</p>
                        <p className="text-white/40 text-xs mt-1">Bloqueados</p>
                    </div>
                </div>

                {/* Contas pendentes */}
                <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden mb-4">
                    <button
                        onClick={() => setExpandedSection(expandedSection === 'pending' ? null : 'pending')}
                        className="w-full flex items-center justify-between px-4 py-3 border-b border-white/10"
                        style={{ backgroundColor: pending.length > 0 ? 'rgba(234,179,8,0.1)' : 'rgba(201,153,42,0.05)' }}
                    >
                        <div className="flex items-center gap-2">
                            <Clock size={14} className={pending.length > 0 ? 'text-yellow-400' : 'text-white/30'} />
                            <h2 className="font-bold text-sm" style={{ color: pending.length > 0 ? '#facc15' : 'rgba(255,255,255,0.4)' }}>
                                Aguardando aprovação
                            </h2>
                            {pending.length > 0 && (
                                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-yellow-400/20 text-yellow-400">
                                    {pending.length}
                                </span>
                            )}
                        </div>
                        {expandedSection === 'pending' ? <ChevronUp size={14} className="text-white/40" /> : <ChevronDown size={14} className="text-white/40" />}
                    </button>

                    {expandedSection === 'pending' && (
                        <div className="flex flex-col">
                            {pending.length === 0 ? (
                                <p className="text-white/30 text-sm text-center py-6">Nenhuma conta pendente</p>
                            ) : pending.map(p => (
                                <div key={p.id} className="flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0">
                                    <div className="w-8 h-8 rounded-full bg-white/10 flex-shrink-0 flex items-center justify-center border border-white/20">
                                        <span className="text-white/40 text-sm font-bold">{p.name?.charAt(0) ?? '?'}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white text-sm font-medium truncate">{p.name ?? 'Sem nome'}</p>
                                        <p className="text-white/30 text-xs truncate">{new Date(p.created_at).toLocaleDateString('pt-BR')}</p>
                                    </div>
                                    <div className="flex gap-2 flex-shrink-0">
                                        <button
                                            onClick={() => handleApprove(p)}
                                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition"
                                            style={{ backgroundColor: 'rgba(34,197,94,0.15)', color: 'rgb(74,222,128)' }}
                                        >
                                            <CheckCircle size={12} />
                                            Aprovar
                                        </button>
                                        <button
                                            onClick={() => handleBlock(p)}
                                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition"
                                            style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: 'rgb(248,113,113)' }}
                                        >
                                            <XCircle size={12} />
                                            Recusar
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Usuários ativos */}
                <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden mb-4">
                    <button
                        onClick={() => setExpandedSection(expandedSection === 'active' ? null : 'active')}
                        className="w-full flex items-center justify-between px-4 py-3 border-b border-white/10"
                        style={{ backgroundColor: 'rgba(201,153,42,0.05)' }}
                    >
                        <div className="flex items-center gap-2">
                            <Users size={14} style={{ color: 'var(--color-gold)' }} />
                            <h2 className="font-bold text-sm" style={{ color: 'var(--color-gold)' }}>
                                Usuários ativos
                            </h2>
                            <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                                style={{ backgroundColor: 'rgba(201,153,42,0.2)', color: 'var(--color-gold)' }}>
                                {active.length}
                            </span>
                        </div>
                        {expandedSection === 'active' ? <ChevronUp size={14} className="text-white/40" /> : <ChevronDown size={14} className="text-white/40" />}
                    </button>

                    {expandedSection === 'active' && (
                        <div className="flex flex-col">
                            {active.length === 0 ? (
                                <p className="text-white/30 text-sm text-center py-6">Nenhum usuário ativo</p>
                            ) : active.map(p => (
                                <div key={p.id} className="flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0">
                                    <div
                                        className="w-8 h-8 rounded-full overflow-hidden bg-white/10 flex-shrink-0 flex items-center justify-center border"
                                        style={{ borderColor: 'var(--color-gold)' }}
                                    >
                                        {p.avatar_url
                                            ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                                            : <span className="text-white/40 text-sm font-bold">{p.name?.charAt(0) ?? '?'}</span>
                                        }
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white text-sm font-medium truncate">{p.name ?? 'Sem nome'}</p>
                                        <div className="flex items-center gap-2">
                                            {p.username && <span className="text-white/40 text-xs">@{p.username}</span>}
                                            {p.team_name && (
                                                <span className="text-xs px-1.5 py-0.5 rounded"
                                                    style={{ backgroundColor: 'rgba(201,153,42,0.15)', color: 'var(--color-gold)' }}>
                                                    {p.team_name}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 flex-shrink-0">
                                        <button
                                            onClick={() => setEditingPlayer(p)}
                                            className="p-1.5 rounded border border-white/20 text-white/40 hover:text-white hover:border-white/40 transition"
                                        >
                                            <Pencil size={13} />
                                        </button>
                                        <button
                                            onClick={() => handleBlock(p)}
                                            className="p-1.5 rounded border border-red-500/30 text-red-400/60 hover:text-red-400 hover:border-red-500/60 transition"
                                        >
                                            <XCircle size={13} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Usuários bloqueados */}
                {blocked.length > 0 && (
                    <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden mb-6">
                        <div className="px-4 py-3 border-b border-white/10"
                            style={{ backgroundColor: 'rgba(239,68,68,0.05)' }}>
                            <div className="flex items-center gap-2">
                                <XCircle size={14} className="text-red-400/60" />
                                <h2 className="font-bold text-sm text-red-400/60">Bloqueados</h2>
                            </div>
                        </div>
                        <div className="flex flex-col">
                            {blocked.map(p => (
                                <div key={p.id} className="flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0">
                                    <div className="w-8 h-8 rounded-full bg-white/5 flex-shrink-0 flex items-center justify-center border border-red-500/20">
                                        <span className="text-red-400/40 text-sm font-bold">{p.name?.charAt(0) ?? '?'}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white/40 text-sm font-medium truncate">{p.name ?? 'Sem nome'}</p>
                                    </div>
                                    <button
                                        onClick={() => handleBlock(p)}
                                        className="text-xs px-3 py-1.5 rounded-lg font-bold transition"
                                        style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: 'rgb(74,222,128)' }}
                                    >
                                        Desbloquear
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
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
