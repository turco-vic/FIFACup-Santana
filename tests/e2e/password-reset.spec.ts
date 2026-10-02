// FLUXO 5 — reset de senha ponta a ponta (e-mails vão para a caixa de saída do gateway local)
import type { Page } from '@playwright/test'
import { PASSWORD, RUN, createUser, expect, login, loginAndWaitHome, test, testApi } from './support'

test.describe.configure({ mode: 'serial' })

const run = RUN.toLowerCase()
const EMAIL = `reset+${run}@fifatest.local`
const NEW_PASSWORD = 'nova-senha-456'

async function requestReset(page: Page, email: string) {
    await page.goto('/login')
    await page.getByRole('button', { name: 'Esqueci minha senha' }).click()
    await page.getByLabel('Email para redefinir a senha').fill(email)
    await page.getByRole('button', { name: 'Enviar link de redefinição' }).click()
}

async function lastLink(email: string, page?: Page): Promise<string> {
    if (page) await expect(page.getByText('Email enviado! Verifique sua caixa de entrada.')).toBeVisible()
    const box = (await testApi('/outbox')) as { to: string; link: string }[]
    const mine = box.filter(m => m.to === email)
    expect(mine.length).toBeGreaterThan(0)
    return mine.at(-1)!.link
}

test.beforeAll(async () => {
    await testApi('/clear', {})
    await createUser({ email: EMAIL, name: 'ZZZTEST_Reset' })
})

test('5a — pede o link, abre, define a nova senha e entra; a senha antiga para de funcionar', async ({ page }) => {
    await requestReset(page, EMAIL)
    await expect(page.getByText('Email enviado! Verifique sua caixa de entrada.')).toBeVisible()
    const link = await lastLink(EMAIL)
    expect(link).toContain('redirect_to=' + encodeURIComponent('http://127.0.0.1:5174/reset-password'))

    await page.goto(link)
    await expect(page).toHaveURL(/\/reset-password/)
    await expect(page.getByRole('heading', { name: 'Nova senha' })).toBeVisible()
    await page.getByLabel('Nova senha').fill('123')
    await page.getByRole('button', { name: 'Salvar nova senha' }).click()
    await expect(page.getByText('A senha deve ter pelo menos 6 caracteres.')).toBeVisible()
    await page.getByLabel('Nova senha').fill(NEW_PASSWORD)
    await page.getByRole('button', { name: 'Salvar nova senha' }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByText('Olá,')).toBeVisible()

    // Sai e testa as duas senhas
    await page.goto('/profile')
    await page.getByRole('button', { name: /Sair/ }).first().click()
    await expect(page).toHaveURL(/\/login$/)
    await login(page, EMAIL, PASSWORD)
    await expect(page.getByText('Email ou senha incorretos.')).toBeVisible()
    await loginAndWaitHome(page, EMAIL, NEW_PASSWORD)
})

test('5b — link já usado: "Link inválido ou expirado." e volta ao login', async ({ page }) => {
    await requestReset(page, EMAIL)
    const link = await lastLink(EMAIL, page)
    await page.goto(link)
    await expect(page.getByRole('heading', { name: 'Nova senha' })).toBeVisible()
    // Mesmo link de novo, em outro "celular" sem sessão
    await page.context().clearCookies()
    await page.evaluate(() => localStorage.clear())
    await page.goto(link)
    await expect(page.getByText('Link inválido ou expirado.')).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: 'Voltar ao login' }).click()
    await expect(page).toHaveURL(/\/login$/)
})

test('5c — envio do e-mail falha (limite do SMTP): a tela avisa em vez de dizer "Email enviado!"', async ({ page }) => {
    await testApi('/config', { failNextRecover: 'over_email_send_rate_limit' })
    await requestReset(page, EMAIL)
    await expect(page.getByText('Muitos emails enviados. Aguarde alguns minutos e tente de novo.')).toBeVisible()
    await expect(page.getByText('Email enviado! Verifique sua caixa de entrada.')).toHaveCount(0)
})

test('5d — link que cai na raiz do site (Redirect URL fora da lista): ainda assim abre a tela de nova senha', async ({ page }) => {
    await requestReset(page, EMAIL)
    const link = (await lastLink(EMAIL, page)).replace(/redirect_to=[^&]*/, 'redirect_to=')
    await page.goto(link)
    await expect(page).toHaveURL(/\/reset-password/, { timeout: 15_000 })
    await expect(page.getByRole('heading', { name: 'Nova senha' })).toBeVisible()
    await page.getByLabel('Nova senha').fill('mais-uma-senha-789')
    await page.getByRole('button', { name: 'Salvar nova senha' }).click()
    await expect(page.getByText('Olá,')).toBeVisible()
})

test('5e — conta PENDENTE redefinindo a senha: salva e cai no login com o aviso, sem loop', async ({ page }) => {
    const email = `resetpending+${run}@fifatest.local`
    await createUser({ email, name: 'ZZZTEST_ResetPendente', status: 'pending' })
    await requestReset(page, email)
    await page.goto(await lastLink(email, page))
    await expect(page.getByRole('heading', { name: 'Nova senha' })).toBeVisible()
    await page.getByLabel('Nova senha').fill(NEW_PASSWORD)
    await page.getByRole('button', { name: 'Salvar nova senha' }).click()
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByText('Sua conta ainda não foi aprovada. Aguarde o AdminSupremo.')).toBeVisible()
    let navigations = 0
    page.on('framenavigated', f => { if (f === page.mainFrame()) navigations++ })
    await page.waitForTimeout(3000)
    expect(navigations).toBe(0)
})

test('5f — e-mail inexistente: mesma resposta (não revela quem tem conta) e nada é enviado', async ({ page }) => {
    const before = ((await testApi('/outbox')) as unknown[]).length
    await requestReset(page, `ninguem+${run}@fifatest.local`)
    await expect(page.getByText('Email enviado! Verifique sua caixa de entrada.')).toBeVisible()
    expect(((await testApi('/outbox')) as unknown[]).length).toBe(before)
})
