import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { translateAuthError } from '../lib/authErrors'
import AuthLayout from '../components/AuthLayout'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Alert from '../components/ui/Alert'
import PasswordToggle from '../components/ui/PasswordToggle'

export default function Login() {
    const { signIn, profile, loading } = useAuth()
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [resetEmail, setResetEmail] = useState('')
    const [resetSent, setResetSent] = useState(false)
    const [resetError, setResetError] = useState('')
    const [sendingReset, setSendingReset] = useState(false)
    const [showReset, setShowReset] = useState(false)

    useEffect(() => {
        if (loading || !profile) return
        if (profile.status === 'active') {
            navigate('/', { replace: true })
            return
        }
        // Sessão de conta pendente/bloqueada (ex.: link de reset de senha): encerra em vez de voltar para "/"
        setError(profile.status === 'pending'
            ? 'Sua conta ainda não foi aprovada. Aguarde o AdminSupremo.'
            : 'Sua conta foi bloqueada. Entre em contato com o administrador.')
        supabase.auth.signOut()
    }, [loading, profile, navigate])

    async function handleResetPassword() {
        if (!resetEmail.trim() || sendingReset) return
        setResetError('')
        setSendingReset(true)
        // O envio pode ser recusado (ex.: limite de e-mails por hora do Supabase): avisa em vez de
        // dizer "enviado" para alguém que vai ficar esperando um e-mail que não sai
        const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
            redirectTo: `${window.location.origin}/reset-password`,
        })
        setSendingReset(false)
        if (error) {
            setResetError(translateAuthError(error, 'Não foi possível enviar o email. Tente de novo.'))
            return
        }
        setResetSent(true)
    }

    async function handleLogin() {
        setError('')
        setSubmitting(true)
        const { error } = await signIn(email, password)
        if (error) {
            setError(translateAuthError(error, 'Não foi possível entrar. Tente de novo.'))
            setSubmitting(false)
            return
        }
        // O efeito acima já leva para "/" quando o perfil carrega, às vezes antes desta resposta.
        // Navegar de novo jogava de volta para a Home quem já tinha tocado em outra tela.
        if (window.location.pathname === '/login') navigate('/', { replace: true })
    }

    return (
        <AuthLayout
            title="FifaCup Santana"
            subtitle="Faça login para continuar"
            footer={<>
                Não tem conta?{' '}
                <Link to="/register" className="font-bold text-brand-text underline-offset-4 hover:underline">
                    Criar conta
                </Link>
            </>}
        >
            <Input
                label="Email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                inputMode="email"
                autoCapitalize="none"
            />

            <Input
                label="Senha"
                type={showPassword ? 'text' : 'password'}
                placeholder="Sua senha"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                autoComplete="current-password"
                trailing={<PasswordToggle visible={showPassword} onToggle={() => setShowPassword(!showPassword)} />}
            />

            {error && <Alert>{error}</Alert>}

            <Button fullWidth size="lg" onClick={handleLogin} loading={submitting}>
                {submitting ? 'Entrando...' : 'Entrar'}
            </Button>

            {!showReset ? (
                <button
                    type="button"
                    onClick={() => setShowReset(true)}
                    className="self-center py-1 text-body text-muted hover:text-primary underline-offset-4 hover:underline transition-colors"
                >
                    Esqueci minha senha
                </button>
            ) : (
                <div className="flex flex-col gap-3 border-t border-subtle pt-4">
                    <p className="text-body text-secondary">Digite seu email para redefinir a senha:</p>
                    <Input
                        aria-label="Email para redefinir a senha"
                        type="email"
                        placeholder="Email"
                        value={resetEmail}
                        onChange={e => setResetEmail(e.target.value)}
                        autoComplete="email"
                        inputMode="email"
                        autoCapitalize="none"
                    />
                    {resetError && <Alert>{resetError}</Alert>}
                    {resetSent ? (
                        <Alert tone="success">Email enviado! Verifique sua caixa de entrada.</Alert>
                    ) : (
                        <Button variant="secondary" fullWidth onClick={handleResetPassword} loading={sendingReset}>
                            Enviar link de redefinição
                        </Button>
                    )}
                </div>
            )}
        </AuthLayout>
    )
}
