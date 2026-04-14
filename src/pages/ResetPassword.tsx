import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Eye, EyeOff } from 'lucide-react'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function init() {
      // Tenta pegar sessão existente primeiro
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setReady(true)
        setChecking(false)
        return
      }

      // Escuta evento de PASSWORD_RECOVERY ou SIGNED_IN via hash token
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
          if (session) {
            setReady(true)
            setChecking(false)
          }
        }
        if (event === 'SIGNED_OUT') {
          setReady(false)
          setChecking(false)
        }
      })

      // Timeout — se após 5s não tiver sessão, mostra erro
      setTimeout(() => {
        setChecking(false)
      }, 5000)

      return () => subscription.unsubscribe()
    }

    init()
  }, [])

  async function handleReset() {
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    setSaving(true)
    setError('')

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(`Erro: ${error.message}`)
      setSaving(false)
      return
    }

    navigate('/')
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-white/20 border-t-yellow-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white mb-2">Verificando link...</p>
        </div>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center flex flex-col items-center gap-4">
          <p className="text-white/60">Link inválido ou expirado.</p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-3 rounded-xl font-bold transition hover:opacity-90"
            style={{ backgroundColor: 'var(--color-gold)', color: 'var(--color-green)' }}
          >
            Voltar ao login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="flex flex-col items-center mb-10">
          <img src="/logo.png" alt="FifaCup Santana" className="w-20 h-20 object-contain mb-4" />
          <h1 className="text-2xl font-bold text-white">Nova senha</h1>
          <p className="text-white/40 text-sm mt-1">Digite sua nova senha abaixo</p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Nova senha"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleReset()}
              autoComplete="new-password"
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
            onClick={handleReset}
            disabled={saving}
            className="w-full py-3 rounded-lg font-bold transition hover:opacity-90"
            style={{ backgroundColor: 'var(--color-gold)', color: 'var(--color-green)' }}
          >
            {saving ? 'Salvando...' : 'Salvar nova senha'}
          </button>
        </div>

      </div>
    </div>
  )
}
