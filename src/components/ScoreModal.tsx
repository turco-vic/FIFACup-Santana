import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Match } from '../types'
import { X } from 'lucide-react'
import { useToast } from '../contexts/ToastContext'

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
    const [saving, setSaving] = useState(false)
    const savingRef = useRef(false)
    const [error, setError] = useState('')

    const isKnockout = ['round32', 'round16', 'quarters', 'semis', 'final', 'knockout'].includes(match.stage)
    const is1v1 = match.mode === '1v1'

    async function handleSave() {
        if (savingRef.current) return
        const hs = parseInt(homeScore)
        const as_ = parseInt(awayScore)

        if (isNaN(hs) || isNaN(as_) || hs < 0 || as_ < 0) {
            setError('Placar inválido.')
            return
        }

        if (isKnockout && hs === as_) {
            setError('Empate não permitido no mata-mata. Use pênaltis para desempatar.')
            return
        }

        savingRef.current = true
        setSaving(true)

        const { error: matchError } = await supabase
            .from('matches')
            .update({ home_score: hs, away_score: as_, played: true })
            .eq('id', match.id)

        if (matchError) {
            setError('Erro ao salvar.')
            savingRef.current = false
            setSaving(false)
            return
        }

        // Registra gols automaticamente para partidas 1v1
        if (is1v1) {
            await supabase.from('goals').delete().eq('match_id', match.id)

            const goalsToInsert = []
            if (hs > 0) goalsToInsert.push({ match_id: match.id, player_id: match.home_id, quantity: hs })
            if (as_ > 0) goalsToInsert.push({ match_id: match.id, player_id: match.away_id, quantity: as_ })

            if (goalsToInsert.length > 0) {
                await supabase.from('goals').insert(goalsToInsert)
            }
        }

        // --- DISPARO DA NOTIFICAÇÃO PUSH ---
        try {
            // Título, texto e link são montados no servidor a partir da partida
            await supabase.functions.invoke('send-push-notification', {
                body: { match_id: match.id }
            })
        } catch (pushErr) {
            console.error('Erro ao enviar push:', pushErr)
            // Não bloqueamos o fluxo se o push falhar
        }
        // -----------------------------------

        showToast('Resultado salvo e notificações enviadas!')
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

                    {isKnockout && (
                        <p className="text-white/30 text-xs text-center mb-4">
                            Empates não são permitidos no mata-mata
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
