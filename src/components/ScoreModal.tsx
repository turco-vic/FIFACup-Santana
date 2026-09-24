import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Match } from '../types'
import { X } from 'lucide-react'
import { useToast } from '../contexts/ToastContext'
import { isKnockoutStage } from '../lib/matches'

type Props = {
    match: Match
    homeName: string
    awayName: string
    onClose: () => void
}

export default function ScoreModal({ match, homeName, awayName, onClose }: Props) {
    const { showToast } = useToast()
    const [homeScore, setHomeScore] = useState(match.home_score?.toString() ?? '')
    const [awayScore, setAwayScore] = useState(match.away_score?.toString() ?? '')
    const [homePens, setHomePens] = useState(match.home_penalties?.toString() ?? '')
    const [awayPens, setAwayPens] = useState(match.away_penalties?.toString() ?? '')
    const [saving, setSaving] = useState(false)
    const savingRef = useRef(false)
    const [error, setError] = useState('')

    const isKnockout = isKnockoutStage(match.stage)
    const isDraw = homeScore !== '' && awayScore !== '' && parseInt(homeScore) === parseInt(awayScore)
    const needsPenalties = isKnockout && isDraw

    async function handleSave() {
        if (savingRef.current) return
        const hs = parseInt(homeScore)
        const as_ = parseInt(awayScore)

        if (isNaN(hs) || isNaN(as_) || hs < 0 || as_ < 0) {
            setError('Placar inválido.')
            return
        }

        let hp: number | null = null
        let ap: number | null = null
        if (isKnockout && hs === as_) {
            hp = parseInt(homePens)
            ap = parseInt(awayPens)
            if (isNaN(hp) || isNaN(ap) || hp < 0 || ap < 0) {
                setError('Empate no mata-mata: informe o placar dos pênaltis.')
                return
            }
            if (hp === ap) {
                setError('Os pênaltis precisam ter um vencedor.')
                return
            }
        }

        savingRef.current = true
        setSaving(true)

        // Os gols do 1v1 são gravados pelo trigger sync_match_goals na mesma transação.
        // .select() revela quando o RLS bloqueia (update sem erro, mas 0 linhas).
        const { data, error: matchError } = await supabase
            .from('matches')
            .update({ home_score: hs, away_score: as_, home_penalties: hp, away_penalties: ap, played: true })
            .eq('id', match.id)
            .select('id')

        if (matchError || !data || data.length === 0) {
            setError(matchError ? 'Erro ao salvar.' : 'Sem permissão para lançar este resultado.')
            savingRef.current = false
            setSaving(false)
            return
        }

        // Título, texto e destinatários são definidos no servidor a partir da partida.
        // Falha no push não desfaz o resultado.
        const { error: pushError } = await supabase.functions.invoke('send-push-notification', {
            body: { match_id: match.id }
        })
        if (pushError) console.error('Erro ao enviar push:', pushError)

        showToast(pushError ? 'Resultado salvo (notificação não enviada).' : 'Resultado salvo e notificações enviadas!')
        onClose()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <div
                className="w-full max-w-sm rounded-2xl border border-white/10"
                style={{ backgroundColor: 'var(--color-green)' }}
            >
                <div className="flex items-center justify-between p-6 pb-4">
                    <h2 className="text-white font-bold text-lg">Lançar Resultado</h2>
                    <button onClick={onClose} className="text-white/40 hover:text-white transition">
                        <X size={20} />
                    </button>
                </div>

                <div className="px-6 pb-6">
                    <div className="flex flex-col gap-3 mb-6">
                        <div>
                            <p className="text-white/50 text-xs mb-1 truncate">{homeName}</p>
                            <input
                                type="number"
                                min="0"
                                value={homeScore}
                                onChange={e => setHomeScore(e.target.value)}
                                className="w-full text-center text-3xl font-bold bg-white/10 text-white rounded-xl py-3 border border-white/20 focus:outline-none focus:border-yellow-500"
                            />
                        </div>

                        <div className="text-center text-white/20 text-sm font-bold">×</div>

                        <div>
                            <p className="text-white/50 text-xs mb-1 truncate">{awayName}</p>
                            <input
                                type="number"
                                min="0"
                                value={awayScore}
                                onChange={e => setAwayScore(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSave()}
                                className="w-full text-center text-3xl font-bold bg-white/10 text-white rounded-xl py-3 border border-white/20 focus:outline-none focus:border-yellow-500"
                            />
                        </div>
                    </div>

                    {needsPenalties ? (
                        <div className="mb-4">
                            <p className="text-white/50 text-xs text-center mb-2">Empate — pênaltis</p>
                            <div className="flex items-center gap-3">
                                <input
                                    type="number"
                                    min="0"
                                    aria-label={`Pênaltis ${homeName}`}
                                    value={homePens}
                                    onChange={e => setHomePens(e.target.value)}
                                    className="w-full text-center text-xl font-bold bg-white/10 text-white rounded-xl py-2 border border-white/20 focus:outline-none focus:border-yellow-500"
                                />
                                <span className="text-white/20 text-sm font-bold">×</span>
                                <input
                                    type="number"
                                    min="0"
                                    aria-label={`Pênaltis ${awayName}`}
                                    value={awayPens}
                                    onChange={e => setAwayPens(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSave()}
                                    className="w-full text-center text-xl font-bold bg-white/10 text-white rounded-xl py-2 border border-white/20 focus:outline-none focus:border-yellow-500"
                                />
                            </div>
                        </div>
                    ) : isKnockout && (
                        <p className="text-white/30 text-xs text-center mb-4">
                            Mata-mata: em caso de empate, informe os pênaltis
                        </p>
                    )}

                    {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 rounded-xl text-white border border-white/20 hover:bg-white/10 transition font-medium"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex-1 py-3 rounded-xl font-bold transition"
                            style={{ backgroundColor: 'var(--color-gold)', color: 'var(--color-green)' }}
                        >
                            {saving ? 'Salvando...' : 'Salvar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
