import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/format'
import { FORMAT_LABEL } from '../lib/labels'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { ArrowLeft, Hash, Swords, Handshake, MapPin, Calendar, Search } from 'lucide-react'
import type { Tournament } from '../types'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Input from '../components/ui/Input'
import Alert from '../components/ui/Alert'
import { Card, CardBody } from '../components/ui/Card'
import { buttonClasses } from '../components/ui/variants'

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
            showToast('Erro ao entrar no campeonato.', 'error')
            setJoining(false)
            return
        }

        showToast(`Entrou em ${found.name}!`)
        navigate(`/tournament/${found.id}`)
    }

    return (
        <div className="px-4 pt-4 pb-6 sm:px-6">
            <div className="max-w-lg mx-auto flex flex-col gap-5">

                <header className="flex items-start gap-2">
                    <Link to="/" aria-label="Voltar para a Home" className={buttonClasses({ variant: 'ghost', size: 'icon', className: '-ml-2 flex-shrink-0' })}>
                        <ArrowLeft size={22} />
                    </Link>
                    <div className="pt-1">
                        <h1 className="font-display font-bold text-headline uppercase tracking-wide leading-tight">Entrar em campeonato</h1>
                        <p className="text-body text-muted">Digite o código de convite</p>
                    </div>
                </header>

                {/* Código */}
                <Card>
                    <CardBody className="flex flex-col gap-4">
                        <Input
                            label="Código do campeonato"
                            variant="code"
                            icon={<Hash size={18} />}
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
                            autoComplete="off"
                            autoCapitalize="characters"
                            spellCheck={false}
                        />

                        {error && <Alert>{error}</Alert>}

                        <Button fullWidth size="lg" icon={<Search size={18} />} onClick={handleSearch}
                            disabled={searching || code.trim().length !== 6}>
                            {searching ? 'Buscando...' : 'Buscar campeonato'}
                        </Button>
                    </CardBody>
                </Card>

                {/* Resultado */}
                {found && (
                    <Card tone={alreadyJoined ? 'default' : 'accent'}>
                        <div className="flex items-center gap-3 px-card py-3 bg-brand-subtle border-b border-subtle">
                            <div className="w-10 h-10 rounded-control bg-brand-muted text-brand-text flex items-center justify-center flex-shrink-0">
                                {found.mode === '1v1' ? <Swords size={20} aria-hidden /> : <Handshake size={20} aria-hidden />}
                            </div>
                            <h2 className="font-display font-bold text-title uppercase tracking-wide text-primary leading-tight">{found.name}</h2>
                        </div>

                        <CardBody className="flex flex-col gap-3">
                            <div className="flex flex-wrap gap-1.5">
                                <Badge tone="brand">{found.mode}</Badge>
                                <Badge>{FORMAT_LABEL[found.format] ?? found.format}</Badge>
                            </div>

                            {(found.location || found.date) && (
                                <div className="flex flex-wrap gap-x-5 gap-y-1 text-body text-secondary">
                                    {found.location && (
                                        <span className="flex items-center gap-1.5"><MapPin size={15} className="text-muted" aria-hidden />{found.location}</span>
                                    )}
                                    {found.date && (
                                        <span className="flex items-center gap-1.5"><Calendar size={15} className="text-muted" aria-hidden />{formatDate(found.date)}</span>
                                    )}
                                </div>
                            )}
                            {found.description && (
                                <p className="text-body text-muted">{found.description}</p>
                            )}

                            {alreadyJoined ? (
                                <div className="flex flex-col gap-3 mt-1">
                                    <Alert tone="success">Você já está nesse campeonato</Alert>
                                    <Button fullWidth size="lg" onClick={() => navigate(`/tournament/${found.id}`)}>
                                        Ver campeonato
                                    </Button>
                                </div>
                            ) : found.status === 'finished' ? (
                                <Alert tone="info" className="mt-1">
                                    Este campeonato já foi encerrado e não aceita novos jogadores.
                                </Alert>
                            ) : (
                                <Button fullWidth size="lg" className="mt-1" onClick={handleJoin} loading={joining}>
                                    {joining ? 'Entrando...' : 'Entrar no campeonato'}
                                </Button>
                            )}
                        </CardBody>
                    </Card>
                )}

            </div>
        </div>
    )
}
