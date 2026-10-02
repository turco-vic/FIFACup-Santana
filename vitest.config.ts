import { defineConfig } from 'vitest/config'

// Testes de lógica pura (src/lib). Ficam fora de src/ para não entrarem no `tsc -b` do build.
// Os testes E2E (Playwright) ficam em tests/e2e e rodam com `npm run test:e2e`.
export default defineConfig({
    test: {
        include: ['tests/unit/**/*.test.ts'],
        environment: 'node',
        // Datas: o evento é no Brasil. format.test.ts troca o fuso em tempo de execução.
        env: { TZ: 'America/Sao_Paulo' },
        coverage: {
            provider: 'v8',
            include: ['src/lib/**/*.ts'],
            exclude: ['src/lib/supabase.ts'],
        },
    },
})
