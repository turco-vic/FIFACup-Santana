import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { usePWA } from '../hooks/usePWA'
import { ChevronRight, Download, Hash, Plus, Share, Shield, Trophy, User } from 'lucide-react'
import Button from '../components/ui/Button'
import { Card, CardBody } from '../components/ui/Card'
import { cx } from '../lib/cx'

export default function Home() {
  const { profile, isSupreme } = useAuth()
  const { installPrompt, isInstalled, install } = usePWA()

  const displayName = profile?.username ?? profile?.name?.split(' ')[0] ?? ''

  return (
    <HomeView
      displayName={profile ? displayName : null}
      isSupreme={isSupreme}
      isInstalled={isInstalled}
      canPromptInstall={!!installPrompt}
      onInstall={install}
    />
  )
}

// Só apresentação (sem hooks de login/PWA): usada pela Home e pela vitrine /design.
// displayName null = perfil ainda não carregado (sem saudação)
export function HomeView({ displayName, isSupreme, isInstalled, canPromptInstall, onInstall }: {
  displayName: string | null
  isSupreme: boolean
  isInstalled: boolean
  canPromptInstall: boolean
  onInstall: () => void
}) {
  return (
    <div className="px-5 pt-6 pb-8 sm:px-6">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">

        {/* Cabeçalho: marca + saudação */}
        <header className="flex items-center gap-4">
          <img src="/logo.png" alt="" className="w-16 h-16 object-contain flex-shrink-0 drop-shadow-lg" />
          <div className="min-w-0">
            <h1 className="font-display font-bold uppercase leading-none">
              <span className="block text-display text-brand-text">FifaCup</span>
              <span className="block text-headline text-primary">Santana</span>
            </h1>
            {displayName !== null && (
              <p className="mt-1.5 text-body text-muted flex items-center gap-1.5 truncate">
                {isSupreme && <Shield size={14} className="text-brand flex-shrink-0" aria-label="Supreme" />}
                Olá, <span className="text-primary font-semibold truncate">{displayName}</span>
              </p>
            )}
          </div>
        </header>

        {/* Atalhos */}
        {isSupreme ? (
          <Shortcut
            featured
            to="/admin"
            icon={<Shield size={24} />}
            title="Painel Supreme"
            description="Aprovar contas e gerenciar usuários"
          />
        ) : (
          <div className="flex flex-col gap-3">
            <Shortcut
              featured
              to="/tournaments"
              icon={<Trophy size={24} />}
              title="Meus campeonatos"
              description="Ver todos os campeonatos"
            />
            <div className="grid grid-cols-2 gap-3">
              <Shortcut
                compact
                to="/tournaments/new"
                icon={<Plus size={20} />}
                title="Criar campeonato"
                description="1v1 ou 2v2"
              />
              <Shortcut
                compact
                to="/tournaments/join"
                icon={<Hash size={20} />}
                title="Entrar com código"
                description="Tenho um convite"
              />
            </div>
            <Shortcut
              to="/profile"
              icon={<User size={20} />}
              title="Meu perfil"
              description="Editar informações"
            />
          </div>
        )}

        {/* Instalar como app (PWA) */}
        {!isInstalled && (
          <Card>
            <CardBody className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-control bg-brand-muted text-brand-text flex items-center justify-center flex-shrink-0">
                {canPromptInstall ? <Download size={20} /> : <Share size={20} />}
              </div>
              {canPromptInstall ? (
                <>
                  <p className="flex-1 text-body text-secondary">Instale o app no celular para abrir mais rápido.</p>
                  <Button size="sm" onClick={onInstall}>Instalar</Button>
                </>
              ) : (
                <p className="flex-1 text-body text-secondary">
                  Para instalar: toque em{' '}
                  <span className="text-primary font-semibold">Compartilhar</span> e depois em{' '}
                  <span className="text-primary font-semibold">Adicionar à Tela de Início</span>.
                </p>
              )}
            </CardBody>
          </Card>
        )}

      </div>
    </div>
  )
}

// Atalho da Home. featured: destaque dourado no topo; compact: bloco em grade (ícone em cima)
function Shortcut({ to, icon, title, description, featured = false, compact = false }: {
  to: string
  icon: ReactNode
  title: string
  description: string
  featured?: boolean
  compact?: boolean
}) {
  return (
    <Link
      to={to}
      className={cx(
        'group flex rounded-card border transition-colors',
        featured
          ? 'items-center gap-4 p-5 bg-brand-subtle border-accent shadow-brand hover:bg-brand-muted'
          : 'bg-surface border-subtle hover:bg-surface-hover',
        !featured && (compact ? 'flex-col gap-3 p-4' : 'items-center gap-3 p-4'),
      )}
    >
      <div className={cx(
        'rounded-control flex items-center justify-center flex-shrink-0',
        featured ? 'w-12 h-12 bg-brand text-on-brand' : 'w-10 h-10 bg-brand-muted text-brand-text',
      )}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cx(
          // Na grade (compact) o título quebra linha em vez de cortar ("Entrar com código")
          compact ? 'leading-snug' : 'truncate',
          featured
            ? 'font-display font-bold text-headline uppercase tracking-wide text-brand-text leading-tight'
            : 'font-semibold text-body-lg text-primary',
        )}>
          {title}
        </p>
        <p className={cx('text-caption text-muted', !compact && 'truncate')}>{description}</p>
      </div>
      {!compact && (
        <ChevronRight
          size={20}
          className="text-muted flex-shrink-0 transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      )}
    </Link>
  )
}
