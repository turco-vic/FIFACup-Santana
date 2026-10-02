// Admin no celular (iPhone) e concorrência entre dois aparelhos
import { RUN, createUser, expect, loginAndWaitHome, newDevice, sql, test } from './support'
import { seedPlayers, seedTournament } from './seed'

test.describe.configure({ mode: 'serial' })

test('MA1 — iPhone: lançar placar em folha que sobe de baixo, teclado numérico, botão Salvar alcançável, tela não pula', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'iphone')
    const ps = await seedPlayers('Mob', 20)
    const groups = [0, 1, 2, 3].map(g => ps.slice(g * 5, g * 5 + 5))
    const { id } = await seedTournament({ tag: 'Mob', admin: ps[0], players: ps, groups })
    await loginAndWaitHome(page, ps[0].email)
    await page.goto(`/tournament/${id}`)
    const buttons = page.getByRole('button', { name: 'Lançar resultado', exact: true })
    await expect(buttons).toHaveCount(40)
    const target = buttons.nth(35)
    await target.scrollIntoViewIfNeeded()
    const before = await page.evaluate(() => window.scrollY)
    await target.tap()
    const dialog = page.getByRole('dialog', { name: 'Lançar resultado' })
    const vp = page.viewportSize()!
    // Espera a animação de subida da folha terminar e confere que ela cabe inteira na tela
    await expect.poll(async () => { const b = (await dialog.boundingBox())!; return b.y + b.height }).toBeLessThanOrEqual(vp.height + 1)
    expect((await dialog.boundingBox())!.y).toBeGreaterThanOrEqual(0)
    const inputs = dialog.locator('input[type=number]')
    await expect(inputs.nth(0)).toHaveAttribute('inputmode', 'numeric')
    await inputs.nth(0).fill('3')
    await inputs.nth(1).fill('2')
    const save = dialog.getByRole('button', { name: 'Salvar' })
    const sb = (await save.boundingBox())!
    // O que está no centro do botão Salvar é o próprio botão (nada por cima: BottomNav, toast)
    const hit = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest('button')?.textContent, [sb.x + sb.width / 2, sb.y + sb.height / 2])
    expect(hit).toContain('Salvar')
    await save.tap()
    await expect(dialog).toHaveCount(0)
    await page.waitForTimeout(600)
    expect(Math.abs((await page.evaluate(() => window.scrollY)) - before)).toBeLessThan(80)
    await expect(buttons).toHaveCount(39)
})

test('MA2 — iPhone: campeonato de 40 jogadores (8 grupos) abre rápido, sem estourar a largura, e oferece "Gerar Oitavas"', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'iphone')
    const ps = await seedPlayers('Big', 40)
    const groups = Array.from({ length: 8 }, (_, g) => ps.slice(g * 5, g * 5 + 5))
    const { id } = await seedTournament({ tag: 'Big', admin: ps[0], players: ps, groups, results: true })
    // Resultados variados para a tabela não ficar toda empatada
    await sql(`update public.matches set home_score = (match_order % 4), away_score = ((match_order + 1) % 3) where tournament_id = $1`, [id])
    await loginAndWaitHome(page, ps[0].email)
    const t0 = Date.now()
    await page.goto(`/tournament/${id}`)
    await expect(page.getByRole('heading', { name: 'Grupo H', exact: true })).toBeVisible()
    const elapsed = Date.now() - t0
    expect(elapsed).toBeLessThan(5000)
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)
    await page.getByRole('button', { name: 'Gerar Oitavas de Final' }).tap()
    await expect(page.getByRole('heading', { name: 'Oitavas de Final' })).toBeVisible()
    expect(await sql(`select 1 from public.matches where tournament_id = $1 and stage = 'round16'`, [id])).toHaveLength(8)
    test.info().annotations.push({ type: 'tempo', description: `dashboard 40 jogadores: ${elapsed} ms` })
})

test('MA3 — dois aparelhos apertam "Gerar Quartas" juntos: duplica? o "Recalcular" limpa?', async ({ page, browser, cap, isMobile }) => {
    test.skip(!!isMobile, 'desktop')
    const ps = await seedPlayers('Dup', 8)
    const groups = [0, 1, 2, 3].map(g => ps.slice(g * 2, g * 2 + 2))
    const { id } = await seedTournament({ tag: 'Dup', admin: ps[0], players: ps, groups, results: true })
    const supEmail = `dupsup+${RUN.toLowerCase()}@fifatest.local`
    await createUser({ email: supEmail, name: 'ZZZTEST_DupSup', role: 'supreme' })
    const other = await newDevice(browser, cap)
    await loginAndWaitHome(page, ps[0].email)
    await loginAndWaitHome(other.page, supEmail)
    await page.goto(`/tournament/${id}`)
    await other.page.goto(`/tournament/${id}`)
    const b1 = page.getByRole('button', { name: 'Gerar Quartas de Final' })
    const b2 = other.page.getByRole('button', { name: 'Gerar Quartas de Final' })
    await expect(b1).toBeVisible()
    await expect(b2).toBeVisible()
    await Promise.all([b1.click(), b2.click()])
    await page.waitForTimeout(1500)
    const qf = await sql(`select 1 from public.matches where tournament_id = $1 and stage = 'quarters'`, [id])
    test.info().annotations.push({ type: 'quartas no banco após 2 cliques simultâneos', description: String(qf.length) })
    if (qf.length > 4) {
        // Recuperação pela tela: Recalcular apaga as cópias (com confirmação)
        await page.reload()
        await page.getByRole('button', { name: 'Recalcular confrontos' }).click()
        await page.getByRole('dialog', { name: 'Atualizar confrontos' }).getByRole('button', { name: 'Confirmar' }).click()
        await expect.poll(async () => (await sql(`select 1 from public.matches where tournament_id = $1 and stage = 'quarters'`, [id])).length).toBe(4)
    }
    await other.context.close()
})
