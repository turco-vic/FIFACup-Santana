import { useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types'
import { X, Save } from 'lucide-react'
import { useToast } from '../contexts/ToastContext'

type Props = {
    player: Profile
    onClose: () => void
    onSaved: (updated: Profile) => void
}

export default function EditPlayerModal({ player, onClose, onSaved }: Props) {
    const { showToast } = useToast()
    const [name, setName] = useState(player.name ?? '')
    const [username, setUsername] = useState(player.username ?? '')
    const [teamName, setTeamName] = useState(player.team_name ?? '')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    async function handleSave() {
        if (!name.trim()) {
            setError('Nome obrigatório.')
            return
        }

        setSaving(true)
        setError('')

        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                name: name.trim(),
                username: username.trim() || null,
                team_name: teamName.trim() || null,
            })
            .eq('id', player.id)

        if (updateError) {
            setError('Erro ao salvar.')
            setSaving(false)
            return
        }

        const updated: Profile = {
            ...player,
            name: name.trim(),
            username: username.trim() || null,
            team_name: teamName.trim() || null,
        }

        showToast('Jogador atualizado!')
        onSaved(updated)
        onClose()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <div
                className="w-full max-w-sm rounded-2xl border border-white/10"
                style={{ backgroundColor: 'var(--color-green)' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 pb-4">
                    <div>
                        <h2 className="text-white font-bold text-lg">Editar Jogador</h2>
                        <p className="text-white/30 text-xs mt-0.5">{player.name}</p>
                    </div>
                    <button onClick={onClose} className="text-white/40 hover:text-white transition">
                        <X size={20} />
                    </button>
                </div>

                {/* Campos */}
                <div className="px-6 pb-6 flex flex-col gap-4">

                    <div>
                        <label className="text-white/50 text-xs mb-1 block">Nome completo</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Nome do jogador"
                            className="w-full bg-white/10 text-white rounded-xl px-4 py-3 border border-white/20 focus:outline-none focus:border-yellow-500 text-sm"
                        />
                    </div>

                    <div>
                        <label className="text-white/50 text-xs mb-1 block">Username</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-sm">@</span>
                            <input
                                type="text"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                placeholder="username"
                                className="w-full bg-white/10 text-white rounded-xl pl-8 pr-4 py-3 border border-white/20 focus:outline-none focus:border-yellow-500 text-sm"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-white/50 text-xs mb-1 block">Time favorito</label>
                        <input
                            type="text"
                            value={teamName}
                            onChange={e => setTeamName(e.target.value)}
                            placeholder="Ex: Flamengo"
                            className="w-full bg-white/10 text-white rounded-xl px-4 py-3 border border-white/20 focus:outline-none focus:border-yellow-500 text-sm"
                        />
                    </div>

                    {error && <p className="text-red-400 text-sm text-center">{error}</p>}

                    <div className="flex gap-3 mt-1">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 rounded-xl text-white border border-white/20 hover:bg-white/10 transition font-medium text-sm"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex-1 py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 text-sm"
                            style={{ backgroundColor: 'var(--color-gold)', color: 'var(--color-green)' }}
                        >
                            <Save size={14} />
                            {saving ? 'Salvando...' : 'Salvar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
