import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { Eye, EyeOff } from 'lucide-react'

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
    const [showReset, setShowReset] = useState(false)

    useEffect(() => {
        if (!loading && profile) {
            navigate('/', { replace: true })
        }
    }, [loading, profile])

    async function handleResetPassword() {
        if (!resetEmail) return
        await supabase.auth.resetPasswordForEmail(resetEmail, {
            redirectTo: `${window.location.origin}/reset-password`,
        })
        setResetSent(true)
    }

    async function handleLogin() {
        setError('')
        setSubmitting(true)
        const { error } = await signIn(email, password)
        if (error) {
            setError(error.message ?? 'Email ou senha incorretos.')
            setSubmitting(false)
            return
        }
        navigate('/', { replace: true })
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="w-full max-w-sm">

                <div className="flex flex-col items-center mb-10">
                    <img src="/logo.png" alt="Logo" className="w-24 h-24 object-contain mb-4" />
                    <h1 className="text-3xl font-bold" style={{ color: 'var(--color-gold)' }}>
                        FifaCup Santana
                    </h1>
                    <p className="text-white/40 text-sm mt-1">Faça login para continuar</p>
                </div>

                <div className="flex flex-col gap-4">
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg bg-white/10 text-white placeholder-white/40 border border-white/20 focus:outline-none focus:border-yellow-500"
                    />

                    <div className="relative">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Senha"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleLogin()}
                            className="w-full px-4 py-3 rounded-lg bg-white/10 text-white placeholder-white/40 border border-white/20 focus:outline-none focus:border-yellow-500 pr-12"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition"
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    {error && (
                        <p className="text-red-400 text-sm text-center leading-snug">{error}</p>
                    )}

                    <button
                        onClick={handleLogin}
                        disabled={submitting}
                        className="w-full py-3 rounded-lg font-bold transition hover:opacity-90"
                        style={{ backgroundColor: 'var(--color-gold)', color: 'var(--color-green)' }}
                    >
                        {submitting ? 'Entrando...' : 'Entrar'}
                    </button>

                    {/* Link para cadastro */}
                    <p className="text-white/40 text-xs text-center">
                        Não tem conta?{' '}
                        <Link
                            to="/register"
                            className="font-bold hover:text-white transition"
                            style={{ color: 'var(--color-gold)' }}
                        >
                            Criar conta
                        </Link>
                    </p>

                    {!showReset ? (
                        <button
                            type="button"
                            onClick={() => setShowReset(true)}
                            className="text-white/40 hover:text-white text-xs text-center transition"
                        >
                            Esqueci minha senha
                        </button>
                    ) : (
                        <div className="flex flex-col gap-3 border-t border-white/10 pt-4">
                            <p className="text-white/60 text-xs">Digite seu email para redefinir a senha:</p>
                            <input
                                type="email"
                                placeholder="Email"
                                value={resetEmail}
                                onChange={e => setResetEmail(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg bg-white/10 text-white placeholder-white/40 border border-white/20 focus:outline-none focus:border-yellow-500"
                            />
                            {resetSent ? (
                                <p className="text-green-400 text-sm text-center">Email enviado! Verifique sua caixa de entrada.</p>
                            ) : (
                                <button
                                    onClick={handleResetPassword}
                                    className="w-full py-3 rounded-lg font-bold text-white border border-white/30 hover:bg-white/10 transition"
                                >
                                    Enviar link de redefinição
                                </button>
                            )}
                        </div>
                    )}
                </div>

            </div>
        </div>
    )
}
