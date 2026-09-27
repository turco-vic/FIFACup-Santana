import { useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types'
import { Save } from 'lucide-react'
import { useToast } from '../hooks/useToast'
import Modal from './ui/Modal'
import Button from './ui/Button'
import Input from './ui/Input'
import Alert from './ui/Alert'

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
        <Modal
            open
            onClose={onClose}
            title="Editar jogador"
            description={player.name}
            footer={<>
                <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                <Button onClick={handleSave} loading={saving} icon={<Save size={16} />}>
                    {saving ? 'Salvando...' : 'Salvar'}
                </Button>
            </>}
        >
            <div className="flex flex-col gap-4">
                <Input
                    label="Nome completo"
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Nome do jogador"
                />
                <Input
                    label="Username"
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="username"
                    icon={<span className="text-body-lg">@</span>}
                    autoCapitalize="none"
                />
                <Input
                    label="Time favorito"
                    type="text"
                    value={teamName}
                    onChange={e => setTeamName(e.target.value)}
                    placeholder="Ex: Flamengo"
                />
                {error && <Alert>{error}</Alert>}
            </div>
        </Modal>
    )
}
