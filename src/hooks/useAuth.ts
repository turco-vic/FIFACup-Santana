import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types'

export function useAuth() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    setProfile(data)
    setLoading(false)
  }

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) return { error }

    // Bloquear login se conta ainda pendente
    if (data.user) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('status')
        .eq('id', data.user.id)
        .single()

      if (profileData?.status === 'pending') {
        await supabase.auth.signOut()
        return {
          error: {
            message: 'Sua conta ainda não foi aprovada. Aguarde o AdminSupremo.',
          },
        }
      }

      if (profileData?.status === 'blocked') {
        await supabase.auth.signOut()
        return {
          error: {
            message: 'Sua conta foi bloqueada. Entre em contato com o administrador.',
          },
        }
      }
    }

    return { error: null }
  }

  async function signUp(email: string, password: string, name: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    })

    if (!error) {
      await supabase.auth.signOut()
    }

    return { error }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  // Helpers de role/status
  const isSupreme = profile?.role === 'supreme'
  const isActive = profile?.status === 'active'
  const isPending = profile?.status === 'pending'

  return {
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    isSupreme,
    isActive,
    isPending,
  }
}
