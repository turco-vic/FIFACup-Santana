import { chromium } from '@playwright/test'

// Servidor de dev recém-criado: na primeira carga o Vite otimiza dependências e recarrega a
// página sozinho, o que derrubava testes no meio de um clique. Carrega o app uma vez e espera
// assentar (todas as telas são importadas pelo App.tsx, então /login puxa tudo).
export default async function globalSetup() {
    const browser = await chromium.launch()
    const page = await browser.newPage()
    let loads = 0
    page.on('load', () => { loads++ })
    await page.goto('http://127.0.0.1:5174/login')
    let stable = 0
    for (let i = 0; i < 30 && stable < 4; i++) {
        const before = loads
        await page.waitForTimeout(500)
        stable = loads === before ? stable + 1 : 0
    }
    await browser.close()
}
