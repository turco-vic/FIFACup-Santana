// FLUXO 6 — navegação: cabeçalho (desktop), BottomNav (celular), rodapé em todas as telas logadas
import type { Page } from '@playwright/test'
import { RUN, createUser, expect, loginAndWaitHome, test } from './support'
import { seedPlayers, seedTournament } from './seed'

test.describe.configure({ mode: 'serial' })

const run = RUN.toLowerCase()
const SUPREME = `navsup+${run}@fifatest.local`
let playerEmail = ''
let playerId = ''
let tid = ''

test.beforeAll(async () => {
    await createUser({ email: SUPREME, name: 'ZZZTEST_NavSupremo', role: 'supreme' })
    const players = await seedPlayers('Nav', 8)
    playerEmail = players[0].email
    playerId = players[0].id
    tid = (await seedTournament({
        tag: 'Nav', admin: players[0], players,
        groups: [0, 1, 2, 3].map(g => players.slice(g * 2, g * 2 + 2)), results: true,
    })).id
})

const PLAYER_PAGES = () => [
    '/', '/tournaments', '/profile', '/tournaments/new', '/tournaments/join',
    `/tournament/${tid}`, `/tournament/${tid}/manage`, `/player/${playerId}`, `/top-scorers?t=${tid}`, '/rota-que-nao-existe',
]

async function checkFooter(page: Page, path: string) {
    await page.goto(path)
    const footer = page.locator('footer')
    await expect(footer, `rodapé em ${path}`).toContainText('Desenvolvido por Turco')
    await expect(footer.getByRole('link', { name: /Instagram/ })).toHaveAttribute('href', /instagram\.com/)
    await expect(footer.getByRole('link', { name: /LinkedIn/ })).toHaveAttribute('href', /linkedin\.com/)
    await footer.scrollIntoViewIfNeeded()
    await expect(footer).toBeInViewport()
    // Sem rolagem horizontal (nada estourando a largura no celular)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow, `rolagem horizontal em ${path}`).toBeLessThanOrEqual(0)
}

test('6a — rodapé em todas as telas logadas do jogador, sem rolagem horizontal', async ({ page }) => {
    await loginAndWaitHome(page, playerEmail)
    for (const path of PLAYER_PAGES()) await checkFooter(page, path)
})

test('6b — rodapé nas telas do supreme', async ({ page }) => {
    await loginAndWaitHome(page, SUPREME)
    for (const path of ['/admin', '/players', `/tournament/${tid}`]) await checkFooter(page, path)
})

test('6c — desktop: navegação no cabeçalho, sem BottomNav; item ativo correto', async ({ page, isMobile }) => {
    test.skip(!!isMobile, 'desktop')
    await loginAndWaitHome(page, SUPREME)
    const header = page.getByRole('banner')
    const nav = header.getByRole('navigation', { name: 'Navegação principal' })
    await expect(nav).toBeVisible()
    for (const name of ['Home', 'Campeonatos', 'Usuários', 'Supreme', 'Perfil']) {
        await expect(nav.getByRole('link', { name: new RegExp(`^${name}`) })).toBeVisible()
    }
    // A BottomNav existe no DOM mas fica escondida (md:hidden)
    await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toHaveCount(1)
    const targets: [string, RegExp][] = [['Campeonatos', /\/tournaments$/], ['Usuários', /\/players$/], ['Supreme', /\/admin$/], ['Perfil', /\/profile$/], ['Home', /\/$/]]
    for (const [name, url] of targets) {
        await nav.getByRole('link', { name: new RegExp(`^${name}`) }).click()
        await expect(page).toHaveURL(url)
        await expect(nav.getByRole('link', { name: new RegExp(`^${name}`) })).toHaveAttribute('aria-current', 'page')
    }
    await page.goto(`/tournament/${tid}`)
    await expect(nav.getByRole('link', { name: /^Campeonatos/ })).toHaveAttribute('aria-current', 'page')
    // Jogador comum não vê Usuários/Supreme
    await page.goto('/profile')
    await page.getByRole('button', { name: /Sair/ }).first().click()
    await expect(page).toHaveURL(/\/login$/)
    await loginAndWaitHome(page, playerEmail)
    await expect(nav.getByRole('link')).toHaveCount(3)
})

test('6d — iPhone: BottomNav visível e funcional, cabeçalho só com logo/usuário, rodapé não fica atrás da pílula', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'iphone')
    await loginAndWaitHome(page, playerEmail)
    const bottom = page.getByRole('navigation', { name: 'Navegação principal' })
    await expect(bottom).toHaveCount(1) // a do cabeçalho fica display:none
    await expect(page.getByRole('banner').getByRole('link', { name: 'Campeonatos' })).toHaveCount(0)
    for (const [name, url] of [['Campeonatos', /\/tournaments$/], ['Perfil', /\/profile$/], ['Home', /\/$/]] as [string, RegExp][]) {
        await bottom.getByRole('link', { name }).tap()
        await expect(page).toHaveURL(url)
        await expect(bottom.getByRole('link', { name })).toHaveAttribute('aria-current', 'page')
    }
    // Áreas de toque de pelo menos 44px
    for (const link of await bottom.getByRole('link').all()) {
        const b = (await link.boundingBox())!
        expect(Math.min(b.width, b.height)).toBeGreaterThanOrEqual(44)
    }
    // Rodapé: rolando até o fim, ele fica inteiro acima da pílula
    for (const path of ['/', `/tournament/${tid}`, '/profile']) {
        await page.goto(path)
        await expect(page.locator('main .animate-pulse')).toHaveCount(0) // skeleton saiu
        // Rola até o fim até a altura parar de mudar (conteúdo carregando)
        let last = -1
        for (let i = 0; i < 20; i++) {
            const h = await page.evaluate(() => { window.scrollTo(0, document.documentElement.scrollHeight); return document.documentElement.scrollHeight })
            if (h === last) break
            last = h
            await page.waitForTimeout(250)
        }
        const footer = (await page.locator('footer').boundingBox())!
        const nav = (await bottom.boundingBox())!
        expect(footer.y + footer.height, `rodapé atrás da BottomNav em ${path}`).toBeLessThanOrEqual(nav.y + 1)
    }
})

test('6e — iPhone com notch (safe-area emulada): cabeçalho desce abaixo do notch e a pílula sobe acima da barra de gestos', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'iphone')
    const cdp = await page.context().newCDPSession(page)
    try {
        await cdp.send('Emulation.setSafeAreaInsetsOverride' as never, { insets: { top: 47, bottom: 34, left: 0, right: 0 } } as never)
    } catch (e) {
        test.skip(true, `Chromium sem Emulation.setSafeAreaInsetsOverride: ${(e as Error).message}`)
    }
    await loginAndWaitHome(page, playerEmail)
    const header = page.getByRole('banner')
    const pt = await header.evaluate(el => getComputedStyle(el).paddingTop)
    expect(pt).toBe('47px')
    const headerBox = (await header.boundingBox())!
    expect(headerBox.height).toBeGreaterThanOrEqual(64 + 47)
    const nav = (await page.getByRole('navigation', { name: 'Navegação principal' }).boundingBox())!
    const vh = page.viewportSize()!.height
    expect(Math.round(vh - (nav.y + nav.height))).toBe(24 + 34)
    // Conteúdo começa abaixo do cabeçalho (nada escondido atrás do notch)
    const firstHeading = (await page.locator('main h1').first().boundingBox())!
    expect(firstHeading.y).toBeGreaterThanOrEqual(headerBox.y + headerBox.height)
    // Telas de login também respeitam a área segura
    await page.goto('/profile')
    await page.getByRole('button', { name: /Sair/ }).first().tap()
    await expect(page).toHaveURL(/\/login$/)
    const logo = (await page.locator('img[src="/logo.png"]').first().boundingBox())!
    expect(logo.y).toBeGreaterThanOrEqual(47)
})
