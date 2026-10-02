// FLUXO 1 — gargalo do início do evento: cadastro → pending → supreme aprova → login
import type { Page } from '@playwright/test'
import { PASSWORD, RUN, createUser, expect, login, loginAndWaitHome, newDevice, sql, test, testApi } from './support'
// @ts-expect-error módulo .mjs sem tipos
import { LOCAL_URL } from './local-stack/keys.mjs'

test.describe.configure({ mode: 'serial' })

const run = RUN.toLowerCase()
const SUPREME = `supreme+${run}@fifatest.local`
const botEmail = (n: number) => `bot+${run}-${String(n).padStart(2, '0')}@fifatest.local`
const botName = (n: number) => `ZZZTEST_Bot${String(n).padStart(2, '0')}`
const TOTAL = 20

async function register(page: Page, name: string, email: string, password = PASSWORD, confirm = password) {
    await page.goto('/register')
    await page.getByLabel('Nome completo').fill(name)
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Senha', { exact: true }).fill(password)
    await page.getByLabel('Confirmar senha').fill(confirm)
    await page.getByRole('button', { name: 'Criar conta' }).click()
}

// Linha da lista de pendentes do /admin
const pendingRow = (page: Page, name: string) =>
    page.locator('div.flex-wrap').filter({ has: page.getByText(name, { exact: true }) })

test.beforeAll(async () => {
    await createUser({ email: SUPREME, name: `${RUN} Supremo`, role: 'supreme', status: 'active' })
})

test('1a — 20 cadastros pela tela (5 ao mesmo tempo) viram pending com o nome', async ({ browser, cap }) => {
    for (let batch = 0; batch < TOTAL / 5; batch++) {
        await Promise.all(Array.from({ length: 5 }, async (_, i) => {
            const n = batch * 5 + i + 1
            const { context, page } = await newDevice(browser, cap)
            await register(page, botName(n), botEmail(n))
            await expect(page.getByRole('heading', { name: 'Conta criada!' })).toBeVisible()
            await expect(page.getByText('Seu cadastro foi enviado para aprovação.')).toBeVisible()
            // Depois do cadastro o app desloga: voltar ao login não entra direto
            await page.getByRole('button', { name: 'Voltar ao login' }).click()
            await expect(page).toHaveURL(/\/login$/)
            await context.close()
        }))
    }
    const rows = await sql<{ email: string; name: string; status: string; role: string }>(
        `select u.email, p.name, p.status, p.role from auth.users u join public.profiles p on p.id = u.id
         where u.email like $1 order by u.email`, [`bot+${run}-%`])
    expect(rows).toHaveLength(TOTAL)
    rows.forEach((r, i) => expect(r).toEqual({ email: botEmail(i + 1), name: botName(i + 1), status: 'pending', role: 'player' }))
})

test('1b — conta pendente tentando entrar: mensagem clara, fica no login, sem loop', async ({ page }) => {
    let tokenCalls = 0, navigations = 0
    page.on('request', r => { if (r.url().includes('/auth/v1/token')) tokenCalls++ })
    page.on('framenavigated', f => { if (f === page.mainFrame()) navigations++ })
    await login(page, botEmail(1))
    await expect(page.getByText('Sua conta ainda não foi aprovada. Aguarde o AdminSupremo.')).toBeVisible()
    const navAfter = navigations
    await page.waitForTimeout(4000)
    await expect(page).toHaveURL(/\/login$/)
    expect(tokenCalls).toBe(1)
    expect(navigations - navAfter).toBe(0)
    // E não ficou sessão: abrir uma tela protegida volta ao login
    await page.goto('/tournaments')
    await expect(page).toHaveURL(/\/login$/)
})

test('1c — supreme aprova os 20 no painel; a bolinha de pendentes some', async ({ page }) => {
    await loginAndWaitHome(page, SUPREME)
    // Bolinha de pendentes no menu (desktop: link "Supreme" com texto oculto)
    await expect(page.getByRole('link', { name: /Supreme.*cadastros aguardando aprovação/ })).toBeVisible()
    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: 'AdminSupremo' })).toBeVisible()
    for (let n = 1; n <= TOTAL; n++) {
        const row = pendingRow(page, botName(n))
        await expect(row).toBeVisible()
        await row.getByRole('button', { name: 'Aprovar' }).click()
        await expect(page.getByText(`${botName(n)} aprovado!`)).toBeVisible()
        await expect(row).toHaveCount(0)
    }
    await expect(page.getByText('Nenhuma conta pendente')).toBeVisible()
    const statuses = await sql<{ status: string }>(
        `select p.status from auth.users u join public.profiles p on p.id = u.id where u.email like $1`, [`bot+${run}-%`])
    expect(statuses.every(s => s.status === 'active')).toBe(true)
    await page.getByRole('link', { name: 'Home' }).first().click()
    await expect(page.getByRole('link', { name: /cadastros aguardando aprovação/ })).toHaveCount(0)
})

test('1d — os 20 aprovados entram (5 celulares ao mesmo tempo) e a sessão sobrevive ao recarregar', async ({ browser, cap }) => {
    for (let batch = 0; batch < TOTAL / 5; batch++) {
        await Promise.all(Array.from({ length: 5 }, async (_, i) => {
            const n = batch * 5 + i + 1
            const { context, page } = await newDevice(browser, cap)
            await loginAndWaitHome(page, botEmail(n))
            await expect(page.locator('main').getByText(botName(n))).toBeVisible()
            await page.reload()
            await expect(page.getByText('Olá,')).toBeVisible()
            await context.close()
        }))
    }
})

test('1e — conta BLOQUEADA tentando entrar: mensagem, sem loop', async ({ page }) => {
    const email = `blocked+${run}@fifatest.local`
    await createUser({ email, name: 'ZZZTEST_Bloqueado', status: 'blocked' })
    let tokenCalls = 0
    page.on('request', r => { if (r.url().includes('/auth/v1/token')) tokenCalls++ })
    await login(page, email)
    await expect(page.getByText('Sua conta foi bloqueada. Entre em contato com o administrador.')).toBeVisible()
    await page.waitForTimeout(4000)
    await expect(page).toHaveURL(/\/login$/)
    expect(tokenCalls).toBe(1)
})

test('1f — bloqueado com a sessão aberta: ao recarregar cai no login com o aviso, sem loop', async ({ page }) => {
    const email = `blocklater+${run}@fifatest.local`
    const id = await createUser({ email, name: 'ZZZTEST_BloqueadoDepois' })
    await loginAndWaitHome(page, email)
    await sql(`update public.profiles set status = 'blocked' where id = $1`, [id])
    let navigations = 0
    page.on('framenavigated', f => { if (f === page.mainFrame()) navigations++ })
    await page.goto('/tournaments')
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByText('Sua conta foi bloqueada. Entre em contato com o administrador.')).toBeVisible()
    const after = navigations
    await page.waitForTimeout(4000)
    expect(navigations - after).toBe(0)
    await expect(page).toHaveURL(/\/login$/)
})

test('1g — supreme com o painel aberto vê cadastros novos sem recarregar', async ({ page, browser, cap }) => {
    await loginAndWaitHome(page, SUPREME)
    await page.goto('/admin')
    await expect(page.getByText('Nenhuma conta pendente')).toBeVisible()
    const { context, page: other } = await newDevice(browser, cap)
    await register(other, 'ZZZTEST_ChegouAgora', `late+${run}@fifatest.local`)
    await expect(other.getByRole('heading', { name: 'Conta criada!' })).toBeVisible()
    await context.close()
    // No evento o supreme fica com o painel aberto aprovando quem chega
    await expect(pendingRow(page, 'ZZZTEST_ChegouAgora')).toBeVisible({ timeout: 25_000 })
})

test('1h — erros de cadastro e login em português', async ({ page }) => {
    await register(page, 'ZZZTEST_Dup', botEmail(1))
    await expect(page.getByText('Já existe uma conta com este email.')).toBeVisible()
    await register(page, 'ZZZTEST_Curta', `curta+${run}@fifatest.local`, '123', '123')
    await expect(page.getByText('Senha deve ter pelo menos 6 caracteres.')).toBeVisible()
    await register(page, 'ZZZTEST_Dif', `dif+${run}@fifatest.local`, 'abcdef', 'abcdeg')
    await expect(page.getByText('As senhas não coincidem.')).toBeVisible()
    await register(page, '   ', `vazio+${run}@fifatest.local`)
    await expect(page.getByText('Nome completo obrigatório.')).toBeVisible()
    await login(page, botEmail(2), 'senha-errada')
    await expect(page.getByText('Email ou senha incorretos.')).toBeVisible()
    // Email com maiúsculas e espaços (teclado do celular) entra igual
    await login(page, `  ${botEmail(2).toUpperCase()} `)
    await expect(page.getByText('Olá,')).toBeVisible()
})

test('1j — limite padrão do Supabase (30 cadastros+logins / 5 min por IP): a 31ª pessoa no mesmo Wi-Fi vê o aviso', async ({ page }) => {
    // Simula o limite no gateway local; no Supabase real ele vale por IP (todos no Wi-Fi do evento = 1 IP)
    await testApi('/config', { authRateLimitPer5Min: 30 })
    try {
        for (let i = 0; i < 30; i++) {
            const r = await fetch(`${LOCAL_URL}/auth/v1/token?grant_type=password`, {
                method: 'POST', headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ email: botEmail((i % TOTAL) + 1), password: PASSWORD }),
            })
            expect(r.status).toBe(200)
        }
        await login(page, botEmail(5))
        await expect(page.getByText('Muitas tentativas seguidas. Aguarde um pouco e tente de novo.')).toBeVisible()
        await expect(page).toHaveURL(/\/login$/)
    } finally {
        await testApi('/clear', {})
    }
})

test('1k — rede lenta: logo depois de entrar, tocar em outra tela não é desfeito (volta para a Home)', async ({ page }) => {
    // Atrasa só a 2ª consulta do login (status do perfil): a 1ª (perfil completo) já levou para "/"
    await page.route(/\/rest\/v1\/profiles\?select=status/, async route => {
        await new Promise(r => setTimeout(r, 1500))
        await route.continue()
    })
    await login(page, botEmail(6))
    await expect(page.getByText('Olá,')).toBeVisible()
    await page.getByRole('link', { name: /Criar campeonato/ }).click()
    await expect(page).toHaveURL(/\/tournaments\/new$/)
    await page.waitForTimeout(2500)
    await expect(page).toHaveURL(/\/tournaments\/new$/)
})

test('1i — sair desloga e as telas protegidas voltam ao login', async ({ page }) => {
    await loginAndWaitHome(page, botEmail(3))
    await page.goto('/profile')
    await page.getByRole('button', { name: /Sair/ }).first().click()
    await expect(page).toHaveURL(/\/login$/)
    for (const path of ['/', '/tournaments', '/profile', '/admin', '/tournaments/new']) {
        await page.goto(path)
        await expect(page).toHaveURL(/\/login$/)
    }
})
