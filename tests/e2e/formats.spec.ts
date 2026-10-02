// Smoke dos outros formatos (liga 1v1 e 2v2 liga + final): os geradores foram refatorados
import type { Page } from '@playwright/test'
import { RUN, expect, loginAndWaitHome, sql, test } from './support'
import { seedPlayers, type Seeded } from './seed'

test.describe.configure({ mode: 'serial' })

async function createViaUi(page: Page, mode: '1v1' | '2v2', format: RegExp, name: string) {
    await page.goto('/tournaments/new')
    await page.getByRole('button', { name: new RegExp(`^${mode}`) }).click()
    await page.getByRole('button', { name: format }).first().click()
    await page.getByLabel('Nome *').fill(name)
    await page.getByRole('button', { name: 'Criar campeonato' }).click()
    await expect(page).toHaveURL(/\/tournament\/[0-9a-f-]{36}$/)
    return page.url().split('/').pop()!
}

async function enroll(tid: string, players: Seeded[]) {
    for (const p of players.slice(1)) {
        await sql(`insert into public.tournament_players (tournament_id, player_id) values ($1, $2)`, [tid, p.id])
    }
}

async function playAll(page: Page) {
    const buttons = page.getByRole('button', { name: 'Lançar resultado', exact: true })
    await expect(buttons.first()).toBeVisible()
    let i = 0
    while (await buttons.count() > 0) {
        await buttons.first().click()
        const dialog = page.getByRole('dialog', { name: 'Lançar resultado' })
        const inputs = dialog.locator('input[type=number]')
        await inputs.nth(0).fill(String((i * 7) % 5))
        await inputs.nth(1).fill(String((i * 3 + 1) % 4))
        await dialog.getByRole('button', { name: 'Salvar' }).click()
        await expect(dialog).toHaveCount(0)
        i++
    }
    return i
}

test('F1 — liga 1v1 (5 jogadores): gera 10 jogos, joga tudo, mostra campeão ou aviso de empate no topo', async ({ page }) => {
    const ps = await seedPlayers('Liga', 5)
    await loginAndWaitHome(page, ps[0].email)
    const tid = await createViaUi(page, '1v1', /^Liga/, `${RUN}_Liga`)
    await enroll(tid, ps)
    await page.goto(`/tournament/${tid}/manage`)
    await page.getByRole('button', { name: 'Gerar / Regerar Partidas' }).click()
    await expect(page).toHaveURL(new RegExp(`/tournament/${tid}$`))
    expect(await sql(`select 1 from public.matches where tournament_id = $1 and stage = 'league'`, [tid])).toHaveLength(10)
    expect(await playAll(page)).toBe(10)
    await expect(page.getByText('Campeão do campeonato').or(page.getByText(/Empate na liderança/))).toBeVisible()
})

test('F2 — 2v2 liga + final (8 jogadores): sorteia e confirma duplas, liga, "Gerar Final", campeão', async ({ page }) => {
    const ps = await seedPlayers('Duo', 8)
    await loginAndWaitHome(page, ps[0].email)
    const tid = await createViaUi(page, '2v2', /Liga \+ Final/, `${RUN}_Duplas`)
    await enroll(tid, ps)
    await page.goto(`/tournament/${tid}/manage`)
    await page.getByRole('button', { name: 'Sortear' }).click()
    await page.getByRole('button', { name: 'Confirmar Duplas' }).click()
    await expect(page.getByText('4 duplas salvas!')).toBeVisible()
    await page.getByRole('button', { name: 'Gerar / Regerar Partidas' }).click()
    await expect(page).toHaveURL(new RegExp(`/tournament/${tid}$`))
    expect(await sql(`select 1 from public.matches where tournament_id = $1 and stage = 'league' and mode = '2v2'`, [tid])).toHaveLength(6)
    expect(await playAll(page)).toBe(6)
    await page.getByRole('button', { name: 'Gerar Final' }).click()
    await expect(page.getByRole('button', { name: 'Lançar resultado', exact: true })).toHaveCount(1)
    const dialog = page.getByRole('dialog', { name: 'Lançar resultado' })
    await page.getByRole('button', { name: 'Lançar resultado', exact: true }).click()
    await dialog.locator('input[type=number]').nth(0).fill('2')
    await dialog.locator('input[type=number]').nth(1).fill('1')
    await dialog.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText('Campeão do campeonato')).toBeVisible()
    // 2v2 não grava gols por jogador (trigger só no 1v1)
    expect(await sql(`select 1 from public.goals g join public.matches m on m.id = g.match_id where m.tournament_id = $1`, [tid])).toEqual([])
})
