// Gerenciar com resultados já lançados: regerar grupos, resetar, remover jogador
import { expect, loginAndWaitHome, sql, test } from './support'
import { seedPlayers, seedTournament, type Seeded } from './seed'

test.describe.configure({ mode: 'serial' })

let players: Seeded[] = []
let tid = ''

test.beforeAll(async () => {
    players = await seedPlayers('M', 12)
    const groups = [0, 1, 2, 3].map(g => players.slice(g * 3, g * 3 + 3))
    tid = (await seedTournament({ tag: 'Manage', admin: players[0], players, groups, results: true })).id
})

const goalsOfTournament = () => sql(
    `select g.id from public.goals g join public.matches m on m.id = g.match_id where m.tournament_id = $1`, [tid])

test('M1 — regerar grupos com resultados: confirmação nativa; cancelar não apaga; aceitar recria tudo e limpa os gols', async ({ page }) => {
    expect((await goalsOfTournament()).length).toBeGreaterThan(0)
    await loginAndWaitHome(page, players[0].email)
    await page.goto(`/tournament/${tid}/manage`)
    await expect(page.getByText('Grupos atuais')).toBeVisible()
    await page.getByRole('button', { name: 'Sortear novos grupos' }).click()
    await expect(page.getByText('Confirmar substitui os grupos atuais e apaga as partidas já geradas.')).toBeVisible()

    let message = ''
    page.once('dialog', d => { message = d.message(); d.dismiss() })
    await page.getByRole('button', { name: 'Confirmar e gerar' }).click()
    await expect.poll(() => message).toContain('Já existem 12 partida(s) com resultado. Regerar APAGA todos os resultados.')
    expect(await sql(`select 1 from public.matches where tournament_id = $1 and played`, [tid])).toHaveLength(12)

    page.once('dialog', d => d.accept())
    await page.getByRole('button', { name: 'Confirmar e gerar' }).click()
    await expect(page).toHaveURL(new RegExp(`/tournament/${tid}$`))
    const ms = await sql<{ played: boolean }>(`select played from public.matches where tournament_id = $1`, [tid])
    expect(ms).toHaveLength(12)
    expect(ms.every(m => !m.played)).toBe(true)
    expect(await goalsOfTournament()).toEqual([])
    expect(await sql(`select 1 from public.groups where tournament_id = $1`, [tid])).toHaveLength(4)
})

test('M2 — remover jogador: com partidas é bloqueado; o admin não remove a si mesmo', async ({ page }) => {
    await loginAndWaitHome(page, players[0].email)
    await page.goto(`/tournament/${tid}/manage`)
    await page.getByRole('button', { name: `Remover ${players[5].name}` }).click()
    await expect(page.getByText('Jogador já tem partidas. Resete o campeonato antes de removê-lo.')).toBeVisible()
    await page.getByRole('button', { name: `Remover ${players[0].name}` }).click()
    await expect(page.getByText('Você não pode remover a si mesmo.')).toBeVisible()
})

test('M3 — resetar com resultados: apaga partidas, grupos e gols; jogadores ficam; status volta a "Em configuração"', async ({ page }) => {
    // Lança alguns resultados de novo para o reset ter gols a apagar
    await sql(`update public.matches set home_score = 3, away_score = 0, played = true where tournament_id = $1 and match_order = 0`, [tid])
    expect((await goalsOfTournament()).length).toBeGreaterThan(0)
    await loginAndWaitHome(page, players[0].email)
    await page.goto(`/tournament/${tid}/manage`)
    await page.getByRole('button', { name: 'Resetar Campeonato' }).click()
    const modal = page.getByRole('dialog', { name: 'Resetar campeonato?' })
    await modal.getByRole('button', { name: 'Confirmar' }).click()
    await expect(page.getByText('Campeonato resetado.')).toBeVisible()
    expect(await sql(`select 1 from public.matches where tournament_id = $1`, [tid])).toEqual([])
    expect(await sql(`select 1 from public.groups where tournament_id = $1`, [tid])).toEqual([])
    expect(await goalsOfTournament()).toEqual([])
    expect(await sql(`select 1 from public.tournament_players where tournament_id = $1`, [tid])).toHaveLength(12)
    const [{ status }] = await sql<{ status: string }>(`select status from public.tournaments where id = $1`, [tid])
    expect(status).toBe('setup')
})

test('M4 — depois do reset, remover jogador funciona (com confirmação)', async ({ page }) => {
    await loginAndWaitHome(page, players[0].email)
    await page.goto(`/tournament/${tid}/manage`)
    page.once('dialog', d => d.accept())
    await page.getByRole('button', { name: `Remover ${players[11].name}` }).click()
    await expect(page.getByText('Jogador removido.')).toBeVisible()
    expect(await sql(`select 1 from public.tournament_players where tournament_id = $1`, [tid])).toHaveLength(11)
    await expect(page.getByText('11 jogadores · 4 grupos, 2 primeiros → mata-mata')).toBeVisible()
})
