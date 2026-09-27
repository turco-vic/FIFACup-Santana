import { FaInstagram, FaLinkedin } from 'react-icons/fa'

const LINKS = [
    { href: 'https://instagram.com/turco.vic', label: 'Instagram', icon: FaInstagram },
    { href: 'https://www.linkedin.com/in/enzoturcovic/', label: 'LinkedIn', icon: FaLinkedin },
]

// Assinatura no fim de todas as telas logadas (AppShell). No mobile o <main> já reserva
// o espaço da BottomNav abaixo dele, então o rodapé nunca fica atrás da pílula.
export default function AppFooter() {
    return (
        <footer className="px-4 pt-6 pb-4 md:pb-6">
            <div className="max-w-xs mx-auto border-t border-subtle pt-4 flex flex-col items-center gap-1 text-center">
                <p className="text-caption text-muted">Desenvolvido por Turco</p>
                <div className="flex items-center gap-1">
                    {LINKS.map(({ href, label, icon: Icon }) => (
                        <a
                            key={label}
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`${label} do Turco (abre em nova aba)`}
                            className="w-10 h-10 rounded-full flex items-center justify-center text-muted hover:text-primary hover:bg-white/8 transition-colors"
                        >
                            <Icon size={18} aria-hidden />
                        </a>
                    ))}
                </div>
            </div>
        </footer>
    )
}
