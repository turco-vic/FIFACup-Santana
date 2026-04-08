import { useState } from 'react'
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

async function generateNextRound(match: Match, homeScore: number, awayScore: number) {
    if (match.stage === 'quarters') {
        const { data: quarters } = await supabase
            .from('matches')
            .select('*')
            .eq('mode', '1v1')
            .eq('stage', 'quarters')
            .order('match_order')

        if (!quarters) return

        const updated = quarters.map(q =>
            q.id === match.id
                ? { ...q, home_score: homeScore, away_score: awayScore, played: true }
                : q
        )

        const allPlayed = updated.every(q => q.played)
        if (!allPlayed) return

        const winners = updated.map(q =>
            (q.home_score ?? 0) > (q.away_score ?? 0) ? q.home_id : q.away_id
        )

        await supabase.from('matches').delete().eq('mode', '1v1').eq('stage', 'semis')
        await supabase.from('matches').insert([
            { mode: '1v1', stage: 'semis', home_id: winners[0], away_id: winners[1], match_order: 0, played: false },
            { mode: '1v1', stage: 'semis', home_id: winners[2], away_id: winners[3], match_order: 1, played: false },
        ])
    }

    if (match.stage === 'semis') {
        const { data: semis } = await supabase
            .from('matches')
            .select('*')
            .eq('mode', '1v1')
            .eq('stage', 'semis')
            .order('match_order')

        if (!semis) return

        const updated = semis.map(s =>
            s.id === match.id
                ? { ...s, home_score: homeScore, away_score: awayScore, played: true }
                : s
        )

        const allPlayed = updated.every(s => s.played)
        if (!allPlayed) return

        const winners = updated.map(s =>
            (s.home_score ?? 0) > (s.away_score ?? 0) ? s.home_id : s.away_id
        )

        await supabase.from('matches').delete().eq('mode', '1v1').eq('stage', 'final')
        await supabase.from('matches').insert([
            { mode: '1v1', stage: 'final', home_id: winners[0], away_id: winners[1], match_order: 0, played: false },
        ])
    }
}

export default function ScoreModal({ match, homeName, awayName, onClose }: Props) {
    const { showToast } = useToast()
    const [homeScore, setHomeScore] = useState(match.home_score?.toString() ?? '')
    const [awayScore, setAwayScore] = useState(match.away_score?.toString() ?? '')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const isKnockout = ['quarters', 'semis', 'final'].includes(match.stage)

    async function handleSave() {
        const hs = parseInt(homeScore)
        const as_ = parseInt(awayScore)

        console.log('handleSave chamado', hs, as_)

        if (isNaN(hs) || isNaN(as_) || hs < 0 || as_ < 0) {
            setError('Placar inválido.')
            return
        }

        if (isKnockout && hs === as_) {
            setError('Empate não permitido no mata-mata. Use pênaltis para desempatar.')
            return
        }

        setSaving(true)

        const { error } = await supabase
            .from('matches')
            .update({ home_score: hs, away_score: as_, played: true })
            .eq('id', match.id)

        console.log('Supabase update result:', error)

        if (error) {
            setError('Erro ao salvar.')
            setSaving(false)
            return
        }

        if (['quarters', 'semis'].includes(match.stage)) {
            await generateNextRound(match, hs, as_)
        }

        console.log('Toast chamado!')
        showToast('Resultado salvo com sucesso!')
        onClose()
    }
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <div
                className="w-full max-w-sm rounded-2xl p-6 border border-white/10"
                style={{ backgroundColor: 'var(--color-green)' }}
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-white font-bold text-lg">Lançar Resultado</h2>
                    <button onClick={onClose} className="text-white/40 hover:text-white transition">
                        <X size={20} />
                    </button>
                </div>

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
    )
}
