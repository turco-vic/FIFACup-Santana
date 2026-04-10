import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { Skeleton } from '../components/Skeleton'
import { usePushNotifications } from '../hooks/usePushNotifications'
import { Eye, EyeOff } from 'lucide-react'

export default function Profile() {
    const { profile, loading, signOut, isSupreme } = useAuth()
    const [name, setName] = useState('')
    const [username, setUsername] = useState('')
    const [teamName, setTeamName] = useState('')
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
    const [uploading, setUploading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [savingPassword, setSavingPassword] = useState(false)
    const [passwordMessage, setPasswordMessage] = useState('')
    const { isSubscribed, isLoading: loadingPush, subscribe, unsubscribe } = usePushNotifications()

    useEffect(() => {
        if (!profile) return
        setName(profile.name ?? '')
        setUsername(profile.username ?? '')
        setTeamName(profile.team_name ?? '')
        setAvatarUrl(profile.avatar_url)
    }, [profile])

    async function handleSaveProfile() {
        if (!profile) return
        setSaving(true)
        setMessage('')
        const { error } = await supabase
            .from('profiles')
            .update({ username: username.trim() || null, team_name: teamName.trim() || null })
            .eq('id', profile.id)
        setMessage(error ? 'Erro ao salvar.' : 'Perfil salvo com sucesso!')
        setSaving(false)
    }

    async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
        if (!profile || !e.target.files || e.target.files.length === 0) return
        const file = e.target.files[0]
        const ext = file.name.split('.').pop()
        const path = `${profile.id}.${ext}`
        setUploading(true)
        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(path, file, { upsert: true })
        if (uploadError) {
            setMessage('Erro ao fazer upload.')
            setUploading(false)
            return
        }
        const { data } = supabase.storage.from('avatars').getPublicUrl(path)
        const url = data.publicUrl
        await supabase.from('profiles').update({ avatar_url: url }).eq('id', profile.id)
        setAvatarUrl(url)
        setUploading(false)
        setMessage('Avatar atualizado!')
    }

    async function handleChangePassword() {
        if (!newPassword || newPassword.length < 6) {
            setPasswordMessage('A senha deve ter pelo menos 6 caracteres.')
            return
        }
        setSavingPassword(true)
        setPasswordMessage('')
        const { error } = await supabase.auth.updateUser({ password: newPassword })
        setPasswordMessage(error ? 'Erro ao atualizar senha.' : 'Senha atualizada com sucesso!')
        setNewPassword('')
        setSavingPassword(false)
    }

    if (loading) {
        return (
            <div className="min-h-screen p-6">
                <div className="max-w-md mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <Skeleton className="h-8 w-32" />
                        <Skeleton className="h-9 w-16" />
                    </div>
                    <div className="flex flex-col items-center mb-8">
                        <Skeleton className="w-24 h-24 rounded-full mb-3" />
                        <Skeleton className="h-5 w-32 mb-2" />
                        <Skeleton className="h-9 w-28" />
                    </div>
                    <div className="flex flex-col gap-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i}>
                                <Skeleton className="h-3 w-24 mb-1" />
                                <Skeleton className="h-12 w-full rounded-lg" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    if (!profile) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-white">Você precisa estar logado.</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-md mx-auto">

                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-2xl font-bold" style={{ color: 'var(--color-gold)' }}>
                        Meu Perfil
                    </h1>
                    <button
                        onClick={signOut}
                        className="px-4 py-2 rounded-lg text-white border border-white/30 hover:bg-white/10 transition text-sm"
                    >
                        Sair
                    </button>
                </div>

                {/* Avatar */}
                <div className="flex flex-col items-center mb-8">
                    <div
                        className="w-24 h-24 rounded-full overflow-hidden bg-white/10 border-2 mb-3"
                        style={{ borderColor: 'var(--color-gold)' }}
                    >
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-3xl text-white/30">?</div>
                        )}
                    </div>
                    <p className="text-white font-bold text-lg">{name || 'Sem nome'}</p>
                    {!isSupreme && username && <p className="text-white/50 text-sm">@{username}</p>}
                    <label className="cursor-pointer text-sm px-4 py-2 rounded-lg border border-white/30 text-white hover:bg-white/10 transition mt-3">
                        {uploading ? 'Enviando...' : 'Trocar foto'}
                        <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                    </label>
                </div>

                {/* Dados */}
                <div className="flex flex-col gap-4 mb-6">
                    <div>
                        <label className="text-white/60 text-sm mb-1 block">Nome completo</label>
                        <div className="w-full px-4 py-3 rounded-lg bg-white/5 text-white/50 border border-white/10">
                            {name || 'Não definido'}
                        </div>
                    </div>

                    {!isSupreme && (
                        <>
                            <div>
                                <label className="text-white/60 text-sm mb-1 block">Username</label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    placeholder="Seu apelido"
                                    autoComplete="off"
                                    className="w-full px-4 py-3 rounded-lg bg-white/10 text-white placeholder-white/40 border border-white/20 focus:outline-none focus:border-yellow-500"
                                />
                            </div>
                            <div>
                                <label className="text-white/60 text-sm mb-1 block">Time do FIFA</label>
                                <input
                                    type="text"
                                    value={teamName}
                                    onChange={e => setTeamName(e.target.value)}
                                    placeholder="Ex: Real Madrid"
                                    className="w-full px-4 py-3 rounded-lg bg-white/10 text-white placeholder-white/40 border border-white/20 focus:outline-none focus:border-yellow-500"
                                />
                            </div>
                        </>
                    )}

                    {message && (
                        <p className={`text-sm ${message.includes('Erro') ? 'text-red-400' : 'text-green-400'}`}>
                            {message}
                        </p>
                    )}

                    {!isSupreme && (
                        <button
                            onClick={handleSaveProfile}
                            disabled={saving}
                            className="w-full py-3 rounded-lg font-bold text-white transition"
                            style={{ backgroundColor: 'var(--color-gold)' }}
                        >
                            {saving ? 'Salvando...' : 'Salvar perfil'}
                        </button>
                    )}
                </div>

                {/* Notificações */}
                <div className="border-t border-white/10 pt-6 mb-6">
                    <h2 className="text-white font-bold mb-1">Notificações</h2>
                    <p className="text-white/50 text-sm mb-4">Receba alertas de resultados em tempo real.</p>
                    <button
                        onClick={isSubscribed ? unsubscribe : subscribe}
                        disabled={loadingPush}
                        className="w-full py-3 rounded-lg font-bold transition border"
                        style={isSubscribed
                            ? { borderColor: 'var(--color-gold)', color: 'var(--color-gold)', background: 'transparent' }
                            : { backgroundColor: 'var(--color-gold)', color: 'white', border: 'none' }
                        }
                    >
                        {loadingPush ? 'Aguarde...' : isSubscribed ? '🔔 Notificações ativadas — clique para desativar' : '🔕 Ativar notificações'}
                    </button>
                </div>

                {/* Trocar senha */}
                <div className="border-t border-white/10 pt-6">
                    <h2 className="text-white font-bold mb-4">Trocar senha</h2>
                    <div className="flex flex-col gap-4">
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                placeholder="Nova senha"
                                autoComplete="new-password"
                                className="w-full px-4 py-3 pr-12 rounded-lg bg-white/10 text-white placeholder-white/40 border border-white/20 focus:outline-none focus:border-yellow-500"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        {passwordMessage && (
                            <p className={`text-sm ${passwordMessage.includes('Erro') ? 'text-red-400' : 'text-green-400'}`}>
                                {passwordMessage}
                            </p>
                        )}
                        <button
                            onClick={handleChangePassword}
                            disabled={savingPassword}
                            className="w-full py-3 rounded-lg font-bold text-white transition border border-white/30 hover:bg-white/10"
                        >
                            {savingPassword ? 'Atualizando...' : 'Atualizar senha'}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    )
}
