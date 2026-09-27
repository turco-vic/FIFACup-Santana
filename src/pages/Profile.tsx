import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { Skeleton } from '../components/Skeleton'
import { usePushNotifications } from '../hooks/usePushNotifications'
import { Bell, BellOff, Camera, KeyRound, LogOut } from 'lucide-react'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Alert from '../components/ui/Alert'
import Avatar from '../components/ui/Avatar'
import PasswordToggle from '../components/ui/PasswordToggle'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { buttonClasses } from '../components/ui/variants'

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
            <div className="px-4 pt-4 pb-6 sm:px-6">
                <div className="max-w-md mx-auto flex flex-col gap-5">
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-8 w-40" />
                        <Skeleton className="h-9 w-20" />
                    </div>
                    <div className="flex flex-col items-center gap-3">
                        <Skeleton className="w-24 h-24 rounded-full" />
                        <Skeleton className="h-6 w-36" />
                        <Skeleton className="h-9 w-32" />
                    </div>
                    <Skeleton className="h-48 w-full rounded-card" />
                </div>
            </div>
        )
    }

    if (!profile) {
        return (
            <div className="px-4 pt-10 text-center">
                <p className="text-body-lg text-secondary">Você precisa estar logado.</p>
            </div>
        )
    }

    return (
        <div className="px-4 pt-4 pb-6 sm:px-6">
            <div className="max-w-md mx-auto flex flex-col gap-5">

                <header className="flex items-center justify-between gap-3">
                    <h1 className="font-display font-bold text-headline uppercase tracking-wide text-brand-text">Meu perfil</h1>
                    <Button variant="secondary" size="sm" icon={<LogOut size={15} />} onClick={signOut}>Sair</Button>
                </header>

                {/* Foto e nome */}
                <div className="flex flex-col items-center text-center gap-1">
                    <Avatar src={avatarUrl} name={name} size="xl" className="mb-2 shadow-lg" />
                    <p className="font-display font-bold text-headline uppercase tracking-wide">{name || 'Sem nome'}</p>
                    {!isSupreme && username && <p className="text-body text-muted">@{username}</p>}
                    <label className={buttonClasses({ variant: 'secondary', size: 'sm', className: 'mt-3 cursor-pointer' })}>
                        <Camera size={15} aria-hidden />
                        {uploading ? 'Enviando...' : 'Trocar foto'}
                        <input type="file" accept="image/*" className="sr-only" onChange={handleAvatarUpload} />
                    </label>
                </div>

                {/* Dados */}
                <Card>
                    <CardHeader title="Dados" />
                    <CardBody className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                            <span className="text-caption font-semibold text-secondary">Nome completo</span>
                            <div className="h-11 px-3.5 flex items-center rounded-card bg-fill border border-subtle text-body-lg sm:text-body text-muted">
                                {name || 'Não definido'}
                            </div>
                        </div>

                        {!isSupreme && (
                            <>
                                <Input
                                    label="Username"
                                    type="text"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    placeholder="Seu apelido"
                                    autoComplete="off"
                                    autoCapitalize="none"
                                    icon={<span className="text-body-lg">@</span>}
                                />
                                <Input
                                    label="Time do FIFA"
                                    type="text"
                                    value={teamName}
                                    onChange={e => setTeamName(e.target.value)}
                                    placeholder="Ex: Real Madrid"
                                />
                            </>
                        )}

                        {message && (
                            <Alert tone={message.includes('Erro') ? 'danger' : 'success'}>{message}</Alert>
                        )}

                        {!isSupreme && (
                            <Button fullWidth onClick={handleSaveProfile} loading={saving}>
                                {saving ? 'Salvando...' : 'Salvar perfil'}
                            </Button>
                        )}
                    </CardBody>
                </Card>

                {/* Notificações */}
                <Card>
                    <CardHeader title="Notificações" />
                    <CardBody className="flex flex-col gap-3">
                        <p className="text-body text-secondary">Receba alertas de resultados em tempo real.</p>
                        <Button
                            fullWidth
                            variant={isSubscribed ? 'secondary' : 'primary'}
                            icon={isSubscribed ? <Bell size={16} className="text-success" /> : <BellOff size={16} />}
                            onClick={isSubscribed ? unsubscribe : subscribe}
                            disabled={loadingPush}
                            className="whitespace-normal text-center min-h-11 h-auto py-2"
                        >
                            {loadingPush ? 'Aguarde...' : isSubscribed ? 'Notificações ativadas - clique para desativar' : 'Ativar notificações'}
                        </Button>
                    </CardBody>
                </Card>

                {/* Trocar senha */}
                <Card>
                    <CardHeader title="Trocar senha" />
                    <CardBody className="flex flex-col gap-4">
                        <Input
                            aria-label="Nova senha"
                            type={showPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            placeholder="Nova senha"
                            autoComplete="new-password"
                            hint="Mínimo de 6 caracteres."
                            trailing={<PasswordToggle visible={showPassword} onToggle={() => setShowPassword(!showPassword)} />}
                        />
                        {passwordMessage && (
                            <Alert tone={passwordMessage.includes('Erro') ? 'danger' : 'success'}>{passwordMessage}</Alert>
                        )}
                        <Button variant="secondary" fullWidth icon={<KeyRound size={16} />} onClick={handleChangePassword} loading={savingPassword}>
                            {savingPassword ? 'Atualizando...' : 'Atualizar senha'}
                        </Button>
                    </CardBody>
                </Card>

            </div>
        </div>
    )
}
