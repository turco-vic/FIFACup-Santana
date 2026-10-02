// Fixtures e helpers dos E2E. Todo dado criado aqui é de teste (prefixo ZZZTEST_, e-mails
// @fifatest.local) e vive só no Postgres local descartável do stack.
import { test as base, expect, type Browser, type BrowserContext, type BrowserContextOptions, type Page, type TestInfo } from '@playwright/test'
import pg from 'pg'
// @ts-expect-error módulo .mjs sem tipos
import { LOCAL_URL, PG_PORT } from './local-stack/keys.mjs'

export { expect }
export const RUN = `ZZZTEST_${Date.now()}`
export const PASSWORD = 'senha-teste-123'

export const pool = new pg.Pool({ host: '127.0.0.1', port: PG_PORT, user: 'postgres', database: 'fifacup', max: 5 })
pool.on('error', () => { /* Postgres parando no teardown */ })

export async function sql<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
    const r = await pool.query(text, params)
    return r.rows as T[]
}

// Conta criada direto no "auth.users" local (o trigger handle_new_user cria o perfil como pending)
export async function createUser(opts: {
    email: string; name: string; status?: 'pending' | 'active' | 'blocked'; role?: 'player' | 'supreme';
    username?: string; password?: string
}): Promise<string> {
    const [{ id }] = await sql<{ id: string }>(
        `insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
         values (gen_random_uuid(), lower($1), extensions.crypt($2, extensions.gen_salt('bf', 4)), now(), jsonb_build_object('name', $3::text))
         returning id`, [opts.email, opts.password ?? PASSWORD, opts.name])
    // Sem JWT (superusuário) o guard de role/status permite, como no SQL editor
    await sql(`update public.profiles set status = $2, role = $3, username = $4 where id = $1`,
        [id, opts.status ?? 'active', opts.role ?? 'player', opts.username ?? null])
    return id
}

export async function testApi(path: string, body?: unknown) {
    const r = await fetch(`${LOCAL_URL}/__test${path}`, body === undefined ? undefined : {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
    })
    return r.json()
}

export type Captured = { console: string[]; network: string[]; pageErrors: string[] }

// Ruído conhecido do ambiente local (não é bug do app):
//  - realtime: o gateway local não tem websocket; o supabase-js tenta e loga
const IGNORED_CONSOLE = [/realtime|websocket|WebSocket/i, /Download the React DevTools/i, /\[vite\]/i]

export function watchPage(page: Page, cap: Captured) {
    page.on('console', msg => {
        if (msg.type() !== 'error' && msg.type() !== 'warning') return
        const text = msg.text()
        if (IGNORED_CONSOLE.some(r => r.test(text))) return
        cap.console.push(`[${msg.type()}] ${text}`)
    })
    page.on('pageerror', err => cap.pageErrors.push(String(err.stack ?? err)))
    page.on('response', async res => {
        const url = res.url()
        if (!url.startsWith(LOCAL_URL) || res.status() < 400) return
        let body = ''
        try { body = (await res.text()).slice(0, 300) } catch { /* corpo indisponível */ }
        const req = res.request()
        cap.network.push(`${res.status()} ${req.method()} ${url.replace(LOCAL_URL, '')} payload=${(req.postData() ?? '').slice(0, 200)} resp=${body}`)
    })
}

// Segurança: qualquer requisição a produção é abortada e reprova o teste
const prodHits: string[] = []

export async function guardContext(context: BrowserContext, cap: Captured) {
    await context.route(/supabase\.co|vercel\.app/, route => {
        prodHits.push(route.request().url())
        return route.abort()
    })
    // Script do Vercel Analytics: responde vazio (abortar só gera ruído de console)
    await context.route(/vercel-scripts\.com|\/_vercel\//, route =>
        route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }))
    context.on('page', p => watchPage(p, cap))
}

// Outro "celular" (contexto isolado: sessão própria), com a mesma proteção
export async function newDevice(browser: Browser, cap: Captured, options: BrowserContextOptions = {}) {
    const context = await browser.newContext({ locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', ...options })
    await guardContext(context, cap)
    return { context, page: await context.newPage() }
}

type Fixtures = { cap: Captured; prodGuard: void }

export const test = base.extend<Fixtures>({
    cap: async ({}, use) => { await use({ console: [], network: [], pageErrors: [] }) },
    prodGuard: [async ({ context, cap }, use, testInfo: TestInfo) => {
        prodHits.length = 0
        await guardContext(context, cap)
        await use()
        if (cap.console.length || cap.network.length || cap.pageErrors.length) {
            await testInfo.attach('captura.txt', {
                body: [
                    '== console ==', ...cap.console,
                    '== page errors ==', ...cap.pageErrors,
                    '== rede (>=400) ==', ...cap.network,
                ].join('\n'), contentType: 'text/plain',
            })
        }
        expect(prodHits, 'nenhuma requisição pode ir para produção').toEqual([])
    }, { auto: true }],
})

export async function login(page: Page, email: string, password = PASSWORD) {
    await page.goto('/login')
    await page.getByLabel('Email', { exact: true }).fill(email)
    await page.getByLabel('Senha', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'Entrar' }).click()
}

export async function loginAndWaitHome(page: Page, email: string, password = PASSWORD) {
    await login(page, email, password)
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByText('Olá,')).toBeVisible()
}
