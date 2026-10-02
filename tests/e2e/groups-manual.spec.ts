// FLUXO 4 — montagem manual dos grupos: toque (iPhone) e arrastar (desktop)
import type { Page } from '@playwright/test'
import { expect, loginAndWaitHome, sql, test } from './support'
import { seedPlayers, seedTournament, type Seeded } from './seed'

test.describe.configure({ mode: 'serial' })

const zone = (page: Page, title: string) =>
    page.locator('div.rounded-card.border-2').filter({ has: page.getByText(title, { exact: true }) })
const chip = (page: Page, name: string) => page.getByRole('button', { name, exact: true })

async function setup(tag: string) {
    const players = await seedPlayers(tag, 8)
    const { id } = await seedTournament({ tag, admin: players[0], players })
    return { players, tid: id }
}

async function openManual(page: Page, admin: Seeded, tid: string) {
    await loginAndWaitHome(page, admin.email)
    await page.goto(`/tournament/${tid}/manage`)
    await page.getByRole('button', { name: 'Montar à mão' }).click()
    await expect(zone(page, 'Sem grupo')).toBeVisible()
    await expect(page.getByText('Falta colocar 8 jogadores em um grupo.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Confirmar e gerar' })).toBeDisabled()
}

async function savedGroups(tid: string) {
    const rows = await sql<{ name: string; players: string[] }>(
        `select g.name, array_agg(p.name order by p.name) as players from public.groups g
         join public.group_members gm on gm.group_id = g.id join public.profiles p on p.id = gm.player_id
         where g.tournament_id = $1 group by g.name order by g.name`, [tid])
    return rows.map(r => r.players)
}

test('4a — toque: escolher jogador → barra "Movendo" → tocar no grupo; cancelar; validações; grava o que foi montado', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'fluxo de toque roda no projeto iphone')
    const { players, tid } = await setup('Tap')
    await openManual(page, players[0], tid)
    const names = players.map(p => p.name)

    // Toca no jogador e cancela pela barra
    await chip(page, names[0]).tap()
    const bar = page.getByRole('status').filter({ hasText: 'Movendo' })
    await expect(bar).toContainText(names[0])
    await expect(bar).toContainText('Toque no grupo de destino')
    // A barra fica acima da BottomNav (não escondida atrás dela)
    const barBox = (await bar.boundingBox())!
    const navBox = (await page.getByRole('navigation', { name: 'Navegação principal' }).last().boundingBox())!
    expect(barBox.y + barBox.height).toBeLessThanOrEqual(navBox.y + 1)
    await bar.getByRole('button', { name: 'Cancelar' }).tap()
    await expect(bar).toHaveCount(0)

    // Tocar duas vezes no mesmo jogador desmarca
    await chip(page, names[0]).tap()
    await chip(page, names[0]).tap()
    await expect(bar).toHaveCount(0)

    // 3 no A, 1 no B → bloqueia; depois 2 em cada
    const plan: [number, string][] = [[0, 'Grupo A'], [1, 'Grupo A'], [2, 'Grupo A'], [3, 'Grupo B']]
    for (const [i, g] of plan) {
        await chip(page, names[i]).tap()
        await zone(page, g).getByText('Mover para cá').tap()
        await expect(zone(page, g).getByRole('button', { name: names[i], exact: true })).toBeVisible()
    }
    for (const [i, g] of [[4, 'Grupo C'], [5, 'Grupo C'], [6, 'Grupo D'], [7, 'Grupo D']] as [number, string][]) {
        await chip(page, names[i]).tap()
        await zone(page, g).tap()
    }
    await expect(zone(page, 'Sem grupo')).toHaveCount(0)
    await expect(page.getByText('Cada grupo precisa de pelo menos 2 jogadores.')).toBeVisible()
    // Move de um grupo para outro tocando no jogador e depois no grupo
    await chip(page, names[2]).tap()
    await zone(page, 'Grupo B').getByText('Mover para cá').tap()
    await expect(page.getByText('Cada grupo precisa de pelo menos 2 jogadores.')).toHaveCount(0)
    expect(await sql(`select 1 from public.groups where tournament_id = $1`, [tid])).toEqual([]) // nada gravado ainda

    await page.getByRole('button', { name: 'Confirmar e gerar' }).tap()
    await expect(page).toHaveURL(new RegExp(`/tournament/${tid}$`))
    expect(await savedGroups(tid)).toEqual([
        [names[0], names[1]], [names[2], names[3]], [names[4], names[5]], [names[6], names[7]],
    ])
    expect(await sql(`select 1 from public.matches where tournament_id = $1`, [tid])).toHaveLength(4)
})

// O dragTo do Playwright não rola a página no meio do arrasto (no Chrome de verdade, segurar perto
// da borda rola sozinho). Janela alta para origem e destino caberem na tela.
test.describe('arrastar', () => {
test.use({ viewport: { width: 1280, height: 2200 } })
test('4b — arrastar (computador): solta o jogador no grupo', async ({ page, isMobile }) => {
    test.skip(!!isMobile, 'arrastar roda no projeto desktop')
    const { players, tid } = await setup('Drag')
    await openManual(page, players[0], tid)
    const names = players.map(p => p.name)
    const targets = ['Grupo A', 'Grupo A', 'Grupo B', 'Grupo B', 'Grupo C', 'Grupo C', 'Grupo D', 'Grupo D']
    for (const [i, g] of targets.entries()) {
        await chip(page, names[i]).dragTo(zone(page, g))
        await expect(zone(page, g).getByRole('button', { name: names[i], exact: true })).toBeVisible()
    }
    // Arrastar entre grupos: troca 2 de lugar (A tem 1, D tem 3 → bloqueia), depois desfaz pelo toque
    await chip(page, names[0]).dragTo(zone(page, 'Grupo D'))
    await expect(page.getByText('Cada grupo precisa de pelo menos 2 jogadores.')).toBeVisible()
    await chip(page, names[7]).click()
    await zone(page, 'Grupo A').getByText('Mover para cá').click()
    await page.getByRole('button', { name: 'Confirmar e gerar' }).click()
    await expect(page).toHaveURL(new RegExp(`/tournament/${tid}$`))
    expect(await savedGroups(tid)).toEqual([
        [names[1], names[7]], [names[2], names[3]], [names[4], names[5]], [names[0], names[6]],
    ])
})
})

test('4c — sorteio no celular: prévia, sortear de novo, ajustar à mão e confirmar', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'roda no projeto iphone')
    const { players, tid } = await setup('Mix')
    await loginAndWaitHome(page, players[0].email)
    await page.goto(`/tournament/${tid}/manage`)
    await page.getByRole('button', { name: 'Sortear grupos' }).tap()
    for (const g of ['Grupo A', 'Grupo B', 'Grupo C', 'Grupo D']) await expect(zone(page, g).getByText('2', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Sortear de novo' }).tap()
    // Troca: pega quem está no A e põe no B (B fica com 3, A com 1 → bloqueia)
    const first = zone(page, 'Grupo A').getByRole('button').first()
    const who = (await first.textContent())!.trim()
    await first.tap()
    await zone(page, 'Grupo B').getByText('Mover para cá').tap()
    await expect(page.getByText('Cada grupo precisa de pelo menos 2 jogadores.')).toBeVisible()
    await chip(page, who).tap()
    await zone(page, 'Grupo A').getByText('Mover para cá').tap()
    await page.getByRole('button', { name: 'Confirmar e gerar' }).tap()
    await expect(page).toHaveURL(new RegExp(`/tournament/${tid}$`))
    expect((await savedGroups(tid)).map(g => g.length)).toEqual([2, 2, 2, 2])
})
