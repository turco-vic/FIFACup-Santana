import { defineConfig, devices } from '@playwright/test'
// @ts-expect-error módulo .mjs sem tipos (só constantes)
import { ANON_KEY, LOCAL_URL } from './tests/e2e/local-stack/keys.mjs'

// E2E contra o stack LOCAL (tests/e2e/local-stack): Postgres + PostgREST descartáveis e um
// gateway no lugar do Supabase. O app de dev é forçado para 127.0.0.1 — produção nunca é usada.
// Requer POSTGREST_BIN (binário do PostgREST 14.x) e PG_BIN (bin do PostgreSQL 16).
const APP_PORT = 5174
export const APP_URL = `http://127.0.0.1:${APP_PORT}`

export default defineConfig({
    testDir: 'tests/e2e',
    testMatch: '**/*.spec.ts',
    fullyParallel: false,
    workers: 1,
    retries: 0,
    timeout: 120_000,
    expect: { timeout: 10_000 },
    outputDir: 'test-results/e2e',
    reporter: [['list'], ['json', { outputFile: 'test-results/e2e-report.json' }]],
    globalSetup: './tests/e2e/global-setup.ts',
    globalTeardown: './tests/e2e/global-teardown.ts',
    use: {
        baseURL: APP_URL,
        locale: 'pt-BR',
        timezoneId: 'America/Sao_Paulo',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'off',
    },
    projects: [
        { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
        {
            name: 'iphone',
            // iPhone 13 (390×844, toque, DPR 3) no Chromium: o WebKit do Windows não é o Safari do iOS
            use: { ...devices['iPhone 13'], browserName: 'chromium', defaultBrowserType: 'chromium' },
            testMatch: ['**/navigation.spec.ts', '**/groups-manual.spec.ts', '**/mobile-*.spec.ts'],
        },
    ],
    webServer: [
        {
            command: 'node tests/e2e/local-stack/stack.mjs',
            url: `${LOCAL_URL}/auth/v1/health`,
            reuseExistingServer: true,
            timeout: 180_000,
            stdout: 'pipe',
            env: { SITE_URL: APP_URL },
        },
        {
            command: `npx vite --host 127.0.0.1 --port ${APP_PORT} --strictPort`,
            url: APP_URL,
            reuseExistingServer: true,
            timeout: 120_000,
            // Variáveis do processo têm prioridade sobre o .env (que aponta para produção)
            env: { VITE_SUPABASE_URL: LOCAL_URL, VITE_SUPABASE_ANON_KEY: ANON_KEY },
        },
    ],
})
