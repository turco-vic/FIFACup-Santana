import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/format'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../contexts/ToastContext'
import { ArrowLeft, Hash, Swords, Handshake } from 'lucide-react'
import type { Tournament } from '../types'

const FORMAT_LABEL: Record<string, string> = {
    groups_knockout: 'Grupos + Mata-mata',
    league: 'Liga',
    knockout: 'Mata-mata',
    league_final: 'Liga + Final',
}

export default function JoinTournament() {
    const { profile } = useAuth()
    const navigate = useNavigate()
    const { showToast } = useToast()

    const [code, setCode] = useState('')
    const [searching, setSearching] = useState(false)
    const [found, setFound] = useState<Tournament | null>(null)
    const [alreadyJoined, setAlreadyJoined] = useState(false)
    const [joining, setJoining] = useState(false)
    const [error, setError] = useState('')

    async function handleSearch() {
        const clean = code.trim().toUpperCase()
        if (clean.length !== 6) {
            setError('Código deve ter 6 caracteres.')
            return
        }

        setSearching(true)
        setError('')
        setFound(null)

        const { data: tournament } = await supabase
            .from('tournaments')
            .select('*')
            .eq('invite_code', clean)
            .single()

        if (!tournament) {
            setError('Campeonato não encontrado. Verifique o código.')
            setSearching(false)
            return
        }

        // Verificar se já está no campeonato
        const { data: existing } = await supabase
            .from('tournament_players')
            .select('id')
            .eq('tournament_id', tournament.id)
            .eq('player_id', profile!.id)
            .single()

        setFound(tournament)
        setAlreadyJoined(!!existing)
        setSearching(false)
    }

    async function handleJoin() {
        if (!found || !profile) return
        setJoining(true)

        const { error } = await supabase
            .from('tournament_players')
            .insert({
                tournament_id: found.id,
                player_id: profile.id,
                role: 'player',
            })

        if (error) {
            showToast('Erro ao entrar no campeonato.')
            setJoining(false)
            return
        }

        showToast(`Entrou em ${found.name}!`)
        navigate(`/tournament/${found.id}`)
    }

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-lg mx-auto">

                {/* Header */}
                <div className="flex items-center gap-3 mb-8">
                    <button
                        onClick={() => navigate('/')}
                        className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-white">Entrar em Campeonato</h1>
                        <p className="text-white/30 text-xs mt-0.5">Digite o código de convite</p>
                    </div>
                </div>

                {/* Input de código */}
                <div className="flex flex-col gap-4 mb-6">
                    <div>
                        <label className="text-white/50 text-xs mb-2 block">Código do campeonato</label>
                        <div className="relative">
                            <Hash size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                            <input
                                type="text"
                                value={code}
                                onChange={e => {
                                    setCode(e.target.value.toUpperCase())
                                    setFound(null)
                                    setError('')
                                }}
                                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                placeholder="Ex: ABC123"
                                maxLength={6}
                                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 text-white placeholder-white/30 border border-white/20 focus:outline-none focus:border-yellow-500 text-lg font-mono tracking-widest uppercase"
                            />
                        </div>
                    </div>

                    {error && <p className="text-red-400 text-sm text-center">{error}</p>}

                    <button
                        onClick={handleSearch}
                        disabled={searching || code.trim().length !== 6}
                        className="w-full py-3 rounded-xl font-bold transition hover:opacity-90 disabled:opacity-40"
                        style={{ backgroundColor: 'var(--color-gold)', color: 'var(--color-green)' }}
                    >
                        {searching ? 'Buscando...' : 'Buscar campeonato'}
                    </button>
                </div>

                {/* Resultado */}
                {found && (
                    <div
                        className="rounded-xl border overflow-hidden"
                        style={{ borderColor: alreadyJoined ? 'rgba(255,255,255,0.1)' : 'var(--color-gold)' }}
                    >
                        <div
                            className="px-4 py-3 border-b"
                            style={{
                                backgroundColor: alreadyJoined ? 'rgba(255,255,255,0.03)' : 'rgba(201,153,42,0.1)',
                                borderColor: alreadyJoined ? 'rgba(255,255,255,0.1)' : 'rgba(201,153,42,0.3)',
                            }}
                        >
                            <div className="flex items-center gap-2">
                                {found.mode === '1v1'
                                    ? <Swords size={16} style={{ color: 'var(--color-gold)' }} />
                                    : <Handshake size={16} style={{ color: 'var(--color-gold)' }} />
                                }
                                <h2 className="font-bold text-white">{found.name}</h2>
                            </div>
                        </div>

                        <div className="px-4 py-4 flex flex-col gap-2">
                            <div className="flex gap-3">
                                <span className="text-xs px-2 py-1 rounded font-bold"
                                    style={{ backgroundColor: 'rgba(201,153,42,0.2)', color: 'var(--color-gold)' }}>
                                    {found.mode}
                                </span>
                                <span className="text-xs px-2 py-1 rounded font-bold text-white/60 bg-white/10">
                                    {FORMAT_LABEL[found.format] ?? found.format}
                                </span>
                            </div>

                            {found.location && (
                                <p className="text-white/40 text-xs">📍 {found.location}</p>
                            )}
                            {found.date && (
                                <p className="text-white/40 text-xs">📅 {formatDate(found.date)}</p>
                            )}
                            {found.description && (
                                <p className="text-white/50 text-sm mt-1">{found.description}</p>
                            )}

                            {alreadyJoined ? (
                                <div className="mt-3 flex flex-col gap-2">
                                    <p className="text-green-400 text-sm text-center">✓ Você já está nesse campeonato</p>
                                    <button
                                        onClick={() => navigate(`/tournament/${found.id}`)}
                                        className="w-full py-3 rounded-xl font-bold transition hover:opacity-90"
                                        style={{ backgroundColor: 'var(--color-gold)', color: 'var(--color-green)' }}
                                    >
                                        Ver campeonato
                                    </button>
                                </div>
                            ) : found.status === 'finished' ? (
                                <p className="mt-3 text-white/40 text-sm text-center">
                                    Este campeonato já foi encerrado e não aceita novos jogadores.
                                </p>
                            ) : (
                                <button
                                    onClick={handleJoin}
                                    disabled={joining}
                                    className="w-full py-3 rounded-xl font-bold transition hover:opacity-90 mt-3"
                                    style={{ backgroundColor: 'var(--color-gold)', color: 'var(--color-green)' }}
                                >
                                    {joining ? 'Entrando...' : 'Entrar no campeonato'}
                                </button>
                            )}
                        </div>
                    </div>
                )}

            </div>
        </div>
    )
}