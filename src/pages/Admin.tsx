import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../contexts/ToastContext'
import type { Profile, Match } from '../types'
import { Users, Trophy, Shuffle, LogOut, ChevronRight, Clock, CheckCircle, AlertTriangle } from 'lucide-react'

type DuoWithPlayers = {
    id: string
    player1: Profile
    player2: Profile
}

export default function Admin() {
    const { profile, signOut } = useAuth()
    const navigate = useNavigate()
    const { showToast } = useToast()
    const [players, setPlayers] = useState<Profile[]>([])
    const [matches, setMatches] = useState<Match[]>([])
    const [duos, setDuos] = useState<DuoWithPlayers[]>([])
    const [loading, setLoading] = useState(true)
    const [resetting, setResetting] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)

    useEffect(() => {
        fetchData()
    }, [])

    async function fetchData() {
        const { data: playersData } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'player')
            .order('name')

        const { data: matchesData } = await supabase
            .from('matches')
            .select('*')

        const { data: duosData } = await supabase
            .from('duos')
            .select(`
        id,
        player1:player1_id(id, name, username, avatar_url, team_name, role, created_at),
        player2:player2_id(id, name, username, avatar_url, team_name, role, created_at)
      `)

        setPlayers(playersData ?? [])
        setMatches(matchesData ?? [])
        setDuos((duosData as unknown as DuoWithPlayers[]) ?? [])
        setLoading(false)
    }

    async function handleSignOut() {
        await signOut()
        navigate('/login')
    }

    async function handleReset() {
        setResetting(true)

        await supabase.from('matches').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await supabase.from('group_members').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await supabase.from('groups').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await supabase.from('duos').delete().neq('id', '00000000-0000-0000-0000-000000000000')

        setShowConfirm(false)
        setResetting(false)
        showToast('Campeonato resetado com sucesso!')
        await fetchData()
    }

    if (!profile || profile.role !== 'admin') return null

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-white">Carregando...</p>
            </div>
        )
    }

    const totalMatches = matches.length
    const playedMatches = matches.filter(m => m.played).length
    const pendingMatches = totalMatches - playedMatches
    const matches1v1 = matches.filter(m => m.mode === '1v1')
    const matches2v2 = matches.filter(m => m.mode === '2v2')
    const played1v1 = matches1v1.filter(m => m.played).length
    const played2v2 = matches2v2.filter(m => m.played).length
    const groupsExist = matches.some(m => m.stage === 'groups')
    const duosExist = duos.length > 0
    const quartersExist = matches.some(m => m.stage === 'quarters')
    const pendingMatchesList = matches.filter(m => !m.played).slice(0, 5)

    function getPlayerName(id: string) {
        const p = players.find(p => p.id === id)
        return p?.username ?? p?.name ?? 'Desconhecido'
    }

    function getDuoName(id: string) {
        const duo = duos.find(d => d.id === id)
        if (!duo) return 'Desconhecido'
        const p1 = duo.player1?.username ?? duo.player1?.name ?? '?'
        const p2 = duo.player2?.username ?? duo.player2?.name ?? '?'
        return `${p1} & ${p2}`
    }

    function getMatchName(match: Match) {
        if (match.mode === '1v1') {
            return `${getPlayerName(match.home_id)} vs ${getPlayerName(match.away_id)}`
        }
        return `${getDuoName(match.home_id)} vs ${getDuoName(match.away_id)}`
    }

    function getStageName(stage: string) {
        const map: Record<string, string> = {
            groups: 'Grupos',
            quarters: 'Quartas',
            semis: 'Semifinal',
            final: 'Final',
            league: 'Liga',
        }
        return map[stage] ?? stage
    }

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-2xl mx-auto">

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-gold)' }}>
                            Painel Admin
                        </h1>
                        <p className="text-white/40 text-sm mt-0.5">FifaCup Santana</p>
                    </div>
                    <button
                        onClick={handleSignOut}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-white border border-white/20 hover:bg-white/10 transition text-sm"
                    >
                        <LogOut size={14} />
                        Sair
                    </button>
                </div>

                {/* Cards de resumo */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                        <div className="flex items-center gap-2 mb-2">
                            <Users size={16} style={{ color: 'var(--color-gold)' }} />
                            <p className="text-white/40 text-xs uppercase tracking-wider">Jogadores</p>
                        </div>
                        <p className="text-white text-2xl font-bold">{players.length}</p>
                        <p className="text-white/30 text-xs mt-1">cadastrados</p>
                    </div>

                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                        <div className="flex items-center gap-2 mb-2">
                            <Trophy size={16} style={{ color: 'var(--color-gold)' }} />
                            <p className="text-white/40 text-xs uppercase tracking-wider">Partidas</p>
                        </div>
                        <p className="text-white text-2xl font-bold">
                            {playedMatches}<span className="text-white/30 text-sm font-normal">/{totalMatches}</span>
                        </p>
                        <p className="text-white/30 text-xs mt-1">{pendingMatches} pendentes</p>
                    </div>

                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle size={16} style={{ color: 'var(--color-gold)' }} />
                            <p className="text-white/40 text-xs uppercase tracking-wider">1v1</p>
                        </div>
                        <p className="text-white text-2xl font-bold">
                            {played1v1}<span className="text-white/30 text-sm font-normal">/{matches1v1.length}</span>
                        </p>
                        <p className="text-white/30 text-xs mt-1">partidas jogadas</p>
                    </div>

                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle size={16} style={{ color: 'var(--color-gold)' }} />
                            <p className="text-white/40 text-xs uppercase tracking-wider">2v2</p>
                        </div>
                        <p className="text-white text-2xl font-bold">
                            {played2v2}<span className="text-white/30 text-sm font-normal">/{matches2v2.length}</span>
                        </p>
                        <p className="text-white/30 text-xs mt-1">partidas jogadas</p>
                    </div>
                </div>

                {/* Status do torneio */}
                <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden mb-6">
                    <div className="px-4 py-3 border-b border-white/10"
                        style={{ backgroundColor: 'rgba(201,153,42,0.1)' }}>
                        <h2 className="font-bold text-sm" style={{ color: 'var(--color-gold)' }}>
                            Status do Torneio
                        </h2>
                    </div>
                    <div className="px-4 py-3 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <span className="text-white/60 text-sm">Grupos 1v1 sorteados</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${groupsExist ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/30'}`}>
                                {groupsExist ? '✓ Sim' : '✗ Não'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-white/60 text-sm">Duplas 2v2 formadas</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${duosExist ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/30'}`}>
                                {duosExist ? '✓ Sim' : '✗ Não'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-white/60 text-sm">Mata-mata gerado</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${quartersExist ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/30'}`}>
                                {quartersExist ? '✓ Sim' : '✗ Não'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Atalhos */}
                <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden mb-6">
                    <div className="px-4 py-3 border-b border-white/10"
                        style={{ backgroundColor: 'rgba(201,153,42,0.1)' }}>
                        <h2 className="font-bold text-sm" style={{ color: 'var(--color-gold)' }}>
                            Atalhos
                        </h2>
                    </div>
                    <div className="flex flex-col">
                        {[
                            { label: 'Gerenciar Sorteio', sub: 'Grupos e duplas', icon: Shuffle, path: '/draw' },
                            { label: 'Tabela 1v1', sub: 'Grupos e mata-mata', icon: Trophy, path: '/1v1' },
                            { label: 'Tabela 2v2', sub: 'Pontos corridos e final', icon: Trophy, path: '/2v2' },
                            { label: 'Jogadores', sub: `${players.length} cadastrados`, icon: Users, path: '/players' },
                        ].map(({ label, sub, icon: Icon, path }) => (
                            <button
                                key={path}
                                onClick={() => navigate(path)}
                                className="flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition text-left"
                            >
                                <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(201,153,42,0.1)' }}>
                                    <Icon size={16} style={{ color: 'var(--color-gold)' }} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-white text-sm font-medium">{label}</p>
                                    <p className="text-white/30 text-xs">{sub}</p>
                                </div>
                                <ChevronRight size={16} className="text-white/20" />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Partidas pendentes */}
                {pendingMatchesList.length > 0 && (
                    <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden mb-6">
                        <div className="px-4 py-3 border-b border-white/10"
                            style={{ backgroundColor: 'rgba(201,153,42,0.1)' }}>
                            <h2 className="font-bold text-sm" style={{ color: 'var(--color-gold)' }}>
                                Próximas Partidas
                            </h2>
                        </div>
                        <div className="flex flex-col">
                            {pendingMatchesList.map(match => (
                                <div
                                    key={match.id}
                                    className="flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0"
                                >
                                    <Clock size={14} className="text-white/30 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white text-sm truncate">{getMatchName(match)}</p>
                                        <p className="text-white/30 text-xs">{match.mode} · {getStageName(match.stage)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Lista de jogadores */}
                <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden mb-6">
                    <div className="px-4 py-3 border-b border-white/10"
                        style={{ backgroundColor: 'rgba(201,153,42,0.1)' }}>
                        <h2 className="font-bold text-sm" style={{ color: 'var(--color-gold)' }}>
                            Jogadores
                        </h2>
                    </div>
                    <div className="flex flex-col">
                        {players.map(player => (
                            <div
                                key={player.id}
                                className="flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0"
                            >
                                <div
                                    className="w-8 h-8 rounded-full overflow-hidden bg-white/10 flex-shrink-0 flex items-center justify-center text-sm font-bold border"
                                    style={{ borderColor: 'var(--color-gold)' }}
                                >
                                    {player.avatar_url
                                        ? <img src={player.avatar_url} alt="" className="w-full h-full object-cover" />
                                        : <span className="text-white/40">{player.name?.charAt(0)}</span>
                                    }
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white text-sm font-medium truncate">{player.name}</p>
                                    <div className="flex items-center gap-2">
                                        {player.username && (
                                            <span className="text-white/40 text-xs">@{player.username}</span>
                                        )}
                                        {player.team_name && (
                                            <span className="text-xs px-1.5 py-0.5 rounded"
                                                style={{ backgroundColor: 'rgba(201,153,42,0.15)', color: 'var(--color-gold)' }}>
                                                {player.team_name}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Zona de Perigo */}
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(239,68,68,0.4)', backgroundColor: '#0a1f17' }}>
                    <div
                        className="px-4 py-3 border-b flex items-center gap-2"
                        style={{ backgroundColor: '#1a0a0a', borderColor: 'rgba(239,68,68,0.4)' }}
                    >
                        <AlertTriangle size={14} className="text-red-400" />
                        <h2 className="font-bold text-sm text-red-400">Zona de Perigo</h2>
                    </div>

                    <div className="px-4 py-5" style={{ backgroundColor: '#0a1f17' }}>
                        <p className="text-white/50 text-sm mb-5">
                            Apaga todos os grupos, duplas e partidas do campeonato atual. Os jogadores permanecem cadastrados para o próximo campeonato.
                        </p>

                        {!showConfirm ? (
                            <button
                                onClick={() => setShowConfirm(true)}
                                className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition"
                                style={{
                                    border: '1px solid rgba(239,68,68,0.5)',
                                    color: 'rgb(248,113,113)',
                                    backgroundColor: 'rgba(239,68,68,0.1)',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.2)')}
                                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)')}
                            >
                                <AlertTriangle size={15} />
                                Resetar Campeonato
                            </button>
                        ) : (
                            <div className="flex flex-col gap-4">
                                <div
                                    className="px-4 py-3 rounded-xl text-center"
                                    style={{ backgroundColor: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)' }}
                                >
                                    <p className="text-red-400 font-bold text-sm">⚠️ Atenção!</p>
                                    <p className="text-red-300/80 text-xs mt-1">
                                        Essa ação é irreversível. Todos os resultados e partidas serão perdidos.
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowConfirm(false)}
                                        className="flex-1 py-3 rounded-xl text-white border border-white/20 hover:bg-white/10 transition font-medium text-sm"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleReset}
                                        disabled={resetting}
                                        className="flex-1 py-3 rounded-xl font-bold text-white text-sm transition flex items-center justify-center gap-2"
                                        style={{ backgroundColor: 'rgb(220,38,38)' }}
                                        onMouseEnter={e => !resetting && (e.currentTarget.style.backgroundColor = 'rgb(185,28,28)')}
                                        onMouseLeave={e => !resetting && (e.currentTarget.style.backgroundColor = 'rgb(220,38,38)')}
                                    >
                                        {resetting ? 'Resetando...' : (
                                            <>
                                                <AlertTriangle size={14} />
                                                Confirmar Reset
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    )
}
