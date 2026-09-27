import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { translateAuthError } from '../lib/authErrors'
import { Loader2 } from 'lucide-react'
import AuthLayout from '../components/AuthLayout'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Alert from '../components/ui/Alert'
import PasswordToggle from '../components/ui/PasswordToggle'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // A limpeza precisa sair do próprio efeito: retornada de dentro da função async,
    // ela nunca rodava e a escuta de login e o timer ficavam ativos depois de sair da tela
    let cancelled = false
    let subscription: { unsubscribe: () => void } | undefined
    let timer: ReturnType<typeof setTimeout> | undefined

    async function init() {
      // Tenta pegar sessão existente primeiro
      const { data: { session } } = await supabase.auth.getSession()
      if (cancelled) return
      if (session) {
        setReady(true)
        setChecking(false)
        return
      }

      // Escuta evento de PASSWORD_RECOVERY ou SIGNED_IN via hash token
      subscription = supabase.auth.onAuthStateChange((event, session) => {
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
      }).data.subscription

      // Timeout - se após 5s não tiver sessão, mostra erro
      timer = setTimeout(() => {
        setChecking(false)
      }, 5000)
    }

    init()
    return () => {
      cancelled = true
      subscription?.unsubscribe()
      clearTimeout(timer)
    }
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
      setError(translateAuthError(error, 'Não foi possível salvar a nova senha. Tente de novo.'))
      setSaving(false)
      return
    }

    navigate('/')
  }

  if (checking) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 px-5" role="status">
        <Loader2 size={32} className="animate-spin text-brand" aria-hidden />
        <p className="text-body-lg text-primary">Verificando link...</p>
      </div>
    )
  }

  if (!ready) {
    return (
      <AuthLayout title="Nova senha">
        <Alert tone="warning">Link inválido ou expirado.</Alert>
        <Button fullWidth size="lg" onClick={() => navigate('/login')}>
          Voltar ao login
        </Button>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Nova senha" subtitle="Digite sua nova senha abaixo">
      <Input
        label="Nova senha"
        type={showPassword ? 'text' : 'password'}
        placeholder="Nova senha"
        hint="Mínimo de 6 caracteres."
        value={password}
        onChange={e => setPassword(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleReset()}
        autoComplete="new-password"
        trailing={<PasswordToggle visible={showPassword} onToggle={() => setShowPassword(!showPassword)} />}
      />

      {error && <Alert>{error}</Alert>}

      <Button fullWidth size="lg" onClick={handleReset} loading={saving}>
        {saving ? 'Salvando...' : 'Salvar nova senha'}
      </Button>
    </AuthLayout>
  )
}
