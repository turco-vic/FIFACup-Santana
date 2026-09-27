import type { ReactNode } from 'react'
import { Card, CardBody } from './ui/Card'

type Props = {
    title: ReactNode
    subtitle?: ReactNode
    // Links abaixo do card (ex.: "Não tem conta? Criar conta")
    footer?: ReactNode
    // false: sem logo (estados de carregamento/erro)
    showLogo?: boolean
    children: ReactNode
}

// Moldura das telas de login, cadastro e nova senha. Pensada para o celular primeiro:
// altura dinâmica (dvh, não pula com a barra do navegador) e respiro nas áreas seguras.
export default function AuthLayout({ title, subtitle, footer, showLogo = true, children }: Props) {
    return (
        <div
            className="min-h-dvh flex flex-col items-center justify-center px-5 bg-[radial-gradient(ellipse_at_top,rgb(201_153_42/0.14),transparent_60%)]"
            style={{
                paddingTop: 'calc(2.5rem + env(safe-area-inset-top))',
                paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom))',
            }}
        >
            <div className="w-full max-w-sm flex flex-col gap-6">
                <header className="flex flex-col items-center text-center">
                    {showLogo && (
                        <img src="/logo.png" alt="" className="w-20 h-20 sm:w-24 sm:h-24 object-contain mb-4 drop-shadow-lg" />
                    )}
                    <h1 className="font-display font-bold text-display uppercase text-brand-text leading-none">
                        {title}
                    </h1>
                    {subtitle && <p className="text-body text-muted mt-2">{subtitle}</p>}
                </header>

                <Card className="shadow-lg">
                    <CardBody className="p-5 flex flex-col gap-4">{children}</CardBody>
                </Card>

                {footer && <div className="text-center text-body text-muted">{footer}</div>}
            </div>
        </div>
    )
}
