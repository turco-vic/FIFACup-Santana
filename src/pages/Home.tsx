import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { usePWA } from '../hooks/usePWA'
import { Trophy, User, Download, Shield, Plus, Hash } from 'lucide-react'

export default function Home() {
  const { profile, isSupreme } = useAuth()
  const navigate = useNavigate()
  const { installPrompt, isInstalled, install } = usePWA()

  const displayName = isSupreme
    ? `AdminSupremo Turco`
    : profile?.username ?? profile?.name?.split(' ')[0] ?? ''

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <h1 className="text-4xl font-bold mb-1" style={{ color: 'var(--color-gold)' }}>
            FifaCup
          </h1>
          <h2 className="text-2xl font-bold text-white mb-2">Santana</h2>
          {profile && (
            <p className="text-white/40 text-sm flex items-center gap-1.5">
              {isSupreme && <Shield size={12} style={{ color: 'var(--color-gold)' }} />}
              Olá, {displayName}
            </p>
          )}
        </div>

        {/* Botão instalar PWA */}
        {!isInstalled && (
          <div className="mb-6">
            {installPrompt ? (
              <button
                onClick={install}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-white/20 text-white hover:bg-white/10 transition text-sm font-medium"
              >
                <Download size={16} style={{ color: 'var(--color-gold)' }} />
                Instalar app no celular
              </button>
            ) : (
              <div className="px-4 py-3 rounded-xl border border-white/10 bg-white/5">
                <p className="text-white/60 text-xs text-center">
                  📱 Para instalar: toque em{' '}
                  <span className="text-white font-medium">Compartilhar</span> →{' '}
                  <span className="text-white font-medium">Adicionar à Tela de Início</span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Atalhos */}
        <div className="grid grid-cols-2 gap-3">
          {isSupreme ? (
            <button
              onClick={() => navigate('/admin')}
              className="flex items-center gap-3 p-4 rounded-xl border hover:bg-white/10 transition col-span-2"
              style={{ backgroundColor: 'rgba(201,153,42,0.08)', borderColor: 'rgba(201,153,42,0.3)' }}
            >
              <div className="p-2 rounded-lg flex-shrink-0" style={{ backgroundColor: 'rgba(201,153,42,0.2)' }}>
                <Shield size={20} style={{ color: 'var(--color-gold)' }} />
              </div>
              <div className="min-w-0 text-left">
                <p className="font-bold text-sm" style={{ color: 'var(--color-gold)' }}>Painel Supreme</p>
                <p className="text-white/40 text-xs">Aprovar contas e gerenciar usuários</p>
              </div>
            </button>
          ) : (
            <>
              <Link
                to="/profile"
                className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
              >
                <div className="p-2 rounded-lg flex-shrink-0" style={{ backgroundColor: 'rgba(201,153,42,0.2)' }}>
                  <User size={20} style={{ color: 'var(--color-gold)' }} />
                </div>
                <div className="min-w-0">
                  <p className="text-white font-bold text-sm truncate">Meu perfil</p>
                  <p className="text-white/40 text-xs truncate">Editar informações</p>
                </div>
              </Link>

              <button
                onClick={() => navigate('/tournaments/new')}
                className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
              >
                <div className="p-2 rounded-lg flex-shrink-0" style={{ backgroundColor: 'rgba(201,153,42,0.2)' }}>
                  <Plus size={20} style={{ color: 'var(--color-gold)' }} />
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-white font-bold text-sm truncate">Criar campeonato</p>
                  <p className="text-white/40 text-xs truncate">1v1 ou 2v2</p>
                </div>
              </button>

              <button
                onClick={() => navigate('/tournaments/join')}
                className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition col-span-2"
              >
                <div className="p-2 rounded-lg flex-shrink-0" style={{ backgroundColor: 'rgba(201,153,42,0.2)' }}>
                  <Hash size={20} style={{ color: 'var(--color-gold)' }} />
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-white font-bold text-sm truncate">Entrar com código</p>
                  <p className="text-white/40 text-xs truncate">Tenho um convite</p>
                </div>
              </button>

              <button
                onClick={() => navigate('/tournaments')}
                className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition col-span-2"
              >
                <div className="p-2 rounded-lg flex-shrink-0" style={{ backgroundColor: 'rgba(201,153,42,0.2)' }}>
                  <Trophy size={20} style={{ color: 'var(--color-gold)' }} />
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-white font-bold text-sm truncate">Meus campeonatos</p>
                  <p className="text-white/40 text-xs truncate">Ver todos os campeonatos</p>
                </div>
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  )
}