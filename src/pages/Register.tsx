import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { translateAuthError } from '../lib/authErrors'
import { CheckCircle2 } from 'lucide-react'
import AuthLayout from '../components/AuthLayout'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Alert from '../components/ui/Alert'
import PasswordToggle from '../components/ui/PasswordToggle'

export default function Register() {
    const { signUp } = useAuth()
    const navigate = useNavigate()
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [done, setDone] = useState(false)

    async function handleRegister() {
        setError('')

        if (!name.trim()) {
            setError('Nome completo obrigatório.')
            return
        }
        if (!email.trim()) {
            setError('Email obrigatório.')
            return
        }
        if (password.length < 6) {
            setError('Senha deve ter pelo menos 6 caracteres.')
            return
        }
        if (password !== confirmPassword) {
            setError('As senhas não coincidem.')
            return
        }

        setSubmitting(true)
        const { error } = await signUp(email, password, name.trim())

        if (error) {
            setError(translateAuthError(error, 'Erro ao criar conta.'))
            setSubmitting(false)
            return
        }

        setDone(true)
    }

    if (done) {
        return (
            <AuthLayout title="Conta criada!">
                <div className="flex flex-col items-center text-center gap-4 py-2">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center bg-success-subtle border border-success-border">
                        <CheckCircle2 size={32} className="text-success" aria-hidden />
                    </div>
                    <p className="text-body text-secondary leading-relaxed">
                        Seu cadastro foi enviado para aprovação.{' '}
                        Aguarde o <span className="text-primary font-semibold">AdminSupremo</span> liberar seu acesso.
                    </p>
                </div>
                <Button fullWidth size="lg" onClick={() => navigate('/login')}>
                    Voltar ao login
                </Button>
            </AuthLayout>
        )
    }

    return (
        <AuthLayout
            title="Criar conta"
            subtitle="Sua conta será aprovada pelo AdminSupremo"
            footer={<>
                Já tem conta?{' '}
                <Link to="/login" className="font-bold text-brand-text underline-offset-4 hover:underline">
                    Fazer login
                </Link>
            </>}
        >
            <Input
                label="Nome completo"
                type="text"
                placeholder="Seu nome completo"
                value={name}
                onChange={e => setName(e.target.value)}
                autoComplete="name"
                autoCapitalize="words"
            />

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
                placeholder="Crie uma senha"
                hint="Mínimo de 6 caracteres."
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
                trailing={<PasswordToggle visible={showPassword} onToggle={() => setShowPassword(!showPassword)} />}
            />

            <Input
                label="Confirmar senha"
                type={showPassword ? 'text' : 'password'}
                placeholder="Repita a senha"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleRegister()}
                autoComplete="new-password"
            />

            {error && <Alert>{error}</Alert>}

            <Button fullWidth size="lg" onClick={handleRegister} loading={submitting}>
                {submitting ? 'Criando conta...' : 'Criar conta'}
            </Button>
        </AuthLayout>
    )
}
