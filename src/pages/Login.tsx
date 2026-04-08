import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Eye, EyeOff } from 'lucide-react'

export default function Login() {
    const { signIn, profile, loading } = useAuth()
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    if (!loading && profile) {
        navigate('/', { replace: true })
    }

    async function handleLogin() {
        setError('')
        setSubmitting(true)
        const { error } = await signIn(email, password)
        if (error) {
            setError('Email ou senha incorretos.')
            setSubmitting(false)
            return
        }
        navigate('/', { replace: true })
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="w-full max-w-sm">

                <div className="flex flex-col items-center mb-10">
                    <img src="/logo.png" alt="Logo" className="w-200 h-100 mb-4" />
                    <h1 className="text-3xl font-bold" style={{ color: 'var(--color-gold)' }}>
                        FIFACup Santana
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

                    {error && <p className="text-red-400 text-sm">{error}</p>}

                    <button
                        onClick={handleLogin}
                        disabled={submitting}
                        className="w-full py-3 rounded-lg font-bold text-white transition hover:opacity-90"
                        style={{ backgroundColor: 'var(--color-gold)', color: 'var(--color-green)' }}
                    >
                        {submitting ? 'Entrando...' : 'Entrar'}
                    </button>
                </div>

            </div>
        </div>
    )
}
