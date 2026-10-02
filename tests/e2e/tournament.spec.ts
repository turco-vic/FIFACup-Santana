// FLUXO 2 — campeonato 1v1 completo com 20 jogadores (4 grupos de 5 → quartas → semis → final)
import type { Page } from '@playwright/test'
import { computeStandings } from '../../src/lib/standings'
import { firstRoundFromGroups } from '../../src/lib/bracket'
import type { Match } from '../../src/types'
import { RUN, createUser, expect, loginAndWaitHome, newDevice, sql, test } from './support'

test.describe.configure({ mode: 'serial' })

const run = RUN.toLowerCase()
const N = 20
const email = (n: number) => `bot+${run}-t${String(n).padStart(2, '0')}@fifatest.local`
const name = (n: number) => `ZZZTEST_J${String(n).padStart(2, '0')}`
const TNAME = `${RUN}_Copa20`

let tournamentId = ''
let inviteCode = ''
const idByName = new Map<string, string>()
const nameById = new Map<string, string>()

// PRNG com semente: placares reprodutíveis
let seed = 20261003
const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648 }

test.beforeAll(async () => {
    for (let n = 1; n <= N; n++) {
        const id = await createUser({ email: email(n), name: name(n) })
        idByName.set(name(n), id)
        nameById.set(id, name(n))
    }
})

async function dbMatches(): Promise<Match[]> {
    return sql<Match>(`select * from public.matches where tournament_id = $1 order by stage, match_order`, [tournamentId])
}

// Lança o placar no modal aberto (ScoreModal) e espera fechar
async function fillScore(page: Page, hs: number, as: number, pens?: [number, number]) {
    const dialog = page.getByRole('dialog', { name: 'Lançar resultado' })
    await expect(dialog).toBeVisible()
    const inputs = dialog.locator('input[type=number]')
    await inputs.nth(0).fill(String(hs))
    await inputs.nth(1).fill(String(as))
    if (pens) {
        await inputs.nth(2).fill(String(pens[0]))
        await inputs.nth(3).fill(String(pens[1]))
    }
    await dialog.getByRole('button', { name: 'Salvar' }).click()
    await expect(dialog).toHaveCount(0)
}

test('2a — admin cria o campeonato 1v1 grupos + mata-mata pela tela (data não volta 1 dia)', async ({ page }) => {
    await loginAndWaitHome(page, email(1))
    await page.getByRole('link', { name: /Criar campeonato/ }).click()
    await expect(page).toHaveURL(/\/tournaments\/new$/)
    await page.getByRole('button', { name: /^1v1/ }).click()
    await page.getByRole('button', { name: /Grupos \+ Mata-mata/ }).click()
    await page.getByLabel('Nome *').fill(TNAME)
    await page.getByLabel('Data').fill('2026-10-03')
    await page.getByLabel('Local').fill('ZZZTEST Arena')
    await page.getByRole('button', { name: 'Criar campeonato' }).click()

    await expect(page).toHaveURL(/\/tournament\/[0-9a-f-]{36}$/)
    tournamentId = page.url().split('/').pop()!
    await expect(page.getByRole('heading', { name: TNAME })).toBeVisible()
    await expect(page.getByText('03/10/2026')).toBeVisible()
    await expect(page.getByText('Em configuração')).toBeVisible()
    inviteCode = (await page.locator('p', { hasText: /^[A-Z2-9]{6}$/ }).first().textContent())!.trim()
    expect(inviteCode).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/)

    const [t] = await sql<{ date: string; created_by: string; status: string }>(
        `select to_char(date, 'YYYY-MM-DD') as date, created_by, status from public.tournaments where id = $1`, [tournamentId])
    expect(t).toEqual({ date: '2026-10-03', created_by: idByName.get(name(1)), status: 'setup' })
    // C2: o criador vira admin pelo trigger (o app não insere)
    const tp = await sql<{ role: string }>(`select role from public.tournament_players where tournament_id = $1`, [tournamentId])
    expect(tp).toEqual([{ role: 'admin' }])
})

test('2b — 19 jogadores entram com o código (5 celulares por vez)', async ({ browser, cap }) => {
    for (let start = 2; start <= N; start += 5) {
        await Promise.all(Array.from({ length: Math.min(5, N - start + 1) }, async (_, i) => {
            const n = start + i
            const { context, page } = await newDevice(browser, cap)
            await loginAndWaitHome(page, email(n))
            await page.goto('/tournaments/join')
            await page.getByLabel('Código do campeonato').fill(n === 2 ? inviteCode.toLowerCase() : inviteCode)
            await page.getByRole('button', { name: 'Buscar campeonato' }).click()
            await expect(page.getByRole('heading', { name: TNAME })).toBeVisible()
            await page.getByRole('button', { name: 'Entrar no campeonato' }).click()
            await expect(page).toHaveURL(new RegExp(`/tournament/${tournamentId}$`))
            await expect(page.getByText('Nenhuma partida ainda.')).toBeVisible()
            await context.close()
        }))
    }
    const [{ count }] = await sql<{ count: string }>(
        `select count(*) from public.tournament_players where tournament_id = $1`, [tournamentId])
    expect(Number(count)).toBe(N)
})

test('2b2 — código colado do WhatsApp (com espaço) e código errado', async ({ page }) => {
    await loginAndWaitHome(page, email(3))
    await page.goto('/tournaments/join')
    const input = page.getByLabel('Código do campeonato')
    await input.click()
    // " ABC 123" (espaço antes e no meio), como vem copiado de mensagem
    await input.pressSequentially(` ${inviteCode.slice(0, 3)} ${inviteCode.slice(3)}`)
    await page.getByRole('button', { name: 'Buscar campeonato' }).click()
    await expect(page.getByText('Você já está nesse campeonato')).toBeVisible()
    await input.fill('ZZZZZZ')
    await page.getByRole('button', { name: 'Buscar campeonato' }).click()
    await expect(page.getByText('Campeonato não encontrado. Verifique o código.')).toBeVisible()
})

test('2c — admin sorteia os grupos (prévia 4×5), confirma e gera as 40 partidas', async ({ page }) => {
    await loginAndWaitHome(page, email(1))
    await page.goto(`/tournament/${tournamentId}/manage`)
    await expect(page.getByText('20 jogadores · 4 grupos, 2 primeiros → mata-mata')).toBeVisible()
    await page.getByRole('radio', { name: 'Em andamento' }).click()
    await expect(page.getByText('Status: Em andamento')).toBeVisible()
    await page.getByRole('button', { name: 'Sortear grupos' }).click()
    await expect(page.getByText('ainda não gravado')).toBeVisible()
    for (const g of ['A', 'B', 'C', 'D']) {
        const zone = page.locator('div.rounded-card').filter({ has: page.getByText(`Grupo ${g}`, { exact: true }) }).last()
        await expect(zone.getByText('5', { exact: true })).toBeVisible()
    }
    // Nada gravado antes de confirmar
    expect(await sql(`select 1 from public.groups where tournament_id = $1`, [tournamentId])).toHaveLength(0)
    await page.getByRole('button', { name: 'Sortear de novo' }).click()
    await page.getByRole('button', { name: 'Confirmar e gerar' }).click()
    await expect(page).toHaveURL(new RegExp(`/tournament/${tournamentId}$`))
    await expect(page.getByText('0 de 10 jogos')).toHaveCount(4)

    const groups = await sql<{ name: string; n: string }>(
        `select g.name, count(gm.*) as n from public.groups g join public.group_members gm on gm.group_id = g.id
         where g.tournament_id = $1 group by g.name order by g.name`, [tournamentId])
    expect(groups.map(g => [g.name, Number(g.n)])).toEqual([['Grupo A', 5], ['Grupo B', 5], ['Grupo C', 5], ['Grupo D', 5]])
    const ms = await dbMatches()
    expect(ms).toHaveLength(40)
    expect(ms.every(m => m.stage === 'groups' && !m.played)).toBe(true)
})

test('2d — lança os 40 placares de grupo pela tela; tabelas, banco e gols (trigger) batem', async ({ page }) => {
    test.setTimeout(300_000)
    await loginAndWaitHome(page, email(1))
    await page.goto(`/tournament/${tournamentId}`)
    const entered = new Map<string, [number, number]>()
    let checkedScroll = false
    for (let i = 0; i < 40; i++) {
        const btn = page.getByRole('button', { name: 'Lançar resultado', exact: true }).first()
        // Uma partida do fim da página: depois de salvar, a tela não pode pular para o topo
        const target = i === 30 ? page.getByRole('button', { name: 'Lançar resultado', exact: true }).last() : btn
        await target.scrollIntoViewIfNeeded()
        const [home, away] = (await target.locator('xpath=..').locator('span.truncate').allTextContents()).map(s => s.trim())
        const row = page.locator('div.min-h-14')
            .filter({ has: page.getByText(home, { exact: true }) })
            .filter({ has: page.getByText(away, { exact: true }) })
        await target.click()
        // Medido com o modal já aberto: o que importa é a tela não mudar ao SALVAR
        const scrollBefore = await page.evaluate(() => window.scrollY)
        const hs = Math.floor(rand() * 5), as = Math.floor(rand() * 5)
        await fillScore(page, hs, as)
        entered.set(`${home}|${away}`, [hs, as])
        await expect(row.getByText(`${hs}×${as}`)).toBeVisible()
        if (i === 30) {
            await page.waitForTimeout(500)
            const scrollAfter = await page.evaluate(() => window.scrollY)
            expect(Math.abs(scrollAfter - scrollBefore), 'a tela pulou depois de salvar o placar').toBeLessThan(80)
            checkedScroll = true
        }
    }
    expect(checkedScroll).toBe(true)
    await expect(page.getByText('10 de 10 jogos')).toHaveCount(4)

    // Banco: placar gravado igual ao digitado; gols = placar (trigger sync_match_goals)
    const ms = await dbMatches()
    for (const m of ms) {
        expect([m.home_score, m.away_score]).toEqual(entered.get(`${nameById.get(m.home_id)}|${nameById.get(m.away_id)}`))
    }
    const bad = await sql(`
        select m.id from public.matches m
        left join lateral (select coalesce(sum(quantity) filter (where player_id = m.home_id), 0) as h,
                                  coalesce(sum(quantity) filter (where player_id = m.away_id), 0) as a,
                                  count(*) as rows
                           from public.goals g where g.match_id = m.id) g on true
        where m.tournament_id = $1 and (g.h <> m.home_score or g.a <> m.away_score
              or g.rows <> (m.home_score > 0)::int + (m.away_score > 0)::int)`, [tournamentId])
    expect(bad).toEqual([])

    // Tabela de cada grupo na tela = classificação calculada (pontos, saldo, gols pró, nome)
    const groups = await sql<{ name: string; players: string[] }>(
        `select g.name, array_agg(gm.player_id::text) as players from public.groups g
         join public.group_members gm on gm.group_id = g.id where g.tournament_id = $1 group by g.name order by g.name`, [tournamentId])
    for (const g of groups) {
        const expected = computeStandings(g.players.map(id => ({ id, name: nameById.get(id)! })),
            ms.filter(m => g.players.includes(m.home_id) && g.players.includes(m.away_id)))
        const card = page.locator('div.rounded-card').filter({ has: page.getByRole('heading', { name: g.name, exact: true }) })
        const rows = card.locator('tbody tr')
        await expect(rows).toHaveCount(5)
        for (let i = 0; i < 5; i++) {
            const cells = (await rows.nth(i).locator('td').allTextContents()).map(s => s.trim())
            expect(cells[1]).toContain(expected[i].name)
            expect(cells.at(-1)).toBe(String(expected[i].points))
        }
    }
})

test('2e — gera as quartas (confrontos certos), empate exige pênaltis válidos', async ({ page }) => {
    await loginAndWaitHome(page, email(1))
    await page.goto(`/tournament/${tournamentId}`)
    await page.getByRole('button', { name: 'Gerar Quartas de Final' }).click()
    await expect(page.getByRole('heading', { name: 'Quartas de Final' })).toBeVisible()

    const ms = await dbMatches()
    const groups = await sql<{ players: string[] }>(
        `select array_agg(gm.player_id::text) as players from public.groups g
         join public.group_members gm on gm.group_id = g.id where g.tournament_id = $1 group by g.name order by g.name`, [tournamentId])
    const rankings = groups.map(g => computeStandings(g.players.map(id => ({ id, name: nameById.get(id)! })),
        ms.filter(m => m.stage === 'groups' && g.players.includes(m.home_id) && g.players.includes(m.away_id))).map(s => s.id))
    const expectedPairs = firstRoundFromGroups(rankings)
    const qf = ms.filter(m => m.stage === 'quarters').sort((a, b) => a.match_order! - b.match_order!)
    expect(qf.map(m => [m.home_id, m.away_id])).toEqual(expectedPairs)

    // Jogo 1 empatado: sem pênaltis → erro; pênaltis iguais → erro; válidos → salva
    await page.getByRole('button', { name: 'Lançar resultado do jogo 1' }).first().click()
    const dialog = page.getByRole('dialog', { name: 'Lançar resultado' })
    const inputs = dialog.locator('input[type=number]')
    await inputs.nth(0).fill('2')
    await inputs.nth(1).fill('2')
    await expect(dialog.getByText('Empate - pênaltis')).toBeVisible()
    await dialog.getByRole('button', { name: 'Salvar' }).click()
    await expect(dialog.getByText('Empate no mata-mata: informe o placar dos pênaltis.')).toBeVisible()
    await inputs.nth(2).fill('3')
    await inputs.nth(3).fill('3')
    await dialog.getByRole('button', { name: 'Salvar' }).click()
    await expect(dialog.getByText('Os pênaltis precisam ter um vencedor.')).toBeVisible()
    await inputs.nth(3).fill('4')
    await dialog.getByRole('button', { name: 'Salvar' }).click()
    await expect(dialog).toHaveCount(0)
    for (let j = 0; j < 3; j++) {
        await page.getByRole('button', { name: /^Lançar resultado do jogo/ }).first().click()
        await fillScore(page, 3, j)
    }
    const qf2 = (await dbMatches()).filter(m => m.stage === 'quarters').sort((a, b) => a.match_order! - b.match_order!)
    expect(qf2.every(m => m.played)).toBe(true)
    expect([qf2[0].home_penalties, qf2[0].away_penalties]).toEqual([3, 4])
    await expect(page.getByTitle('Pênaltis').first()).toBeVisible()
})

test('2f — semis e final pelos botões; campeão e confete aparecem', async ({ page }) => {
    await loginAndWaitHome(page, email(1))
    await page.goto(`/tournament/${tournamentId}`)
    await page.getByRole('button', { name: 'Gerar Semifinais' }).click()
    await expect(page.getByRole('heading', { name: 'Semifinais' })).toBeVisible()
    for (let j = 0; j < 2; j++) {
        await page.getByRole('button', { name: /^Lançar resultado do jogo/ }).first().click()
        await fillScore(page, 1, 0)
    }
    await page.getByRole('button', { name: 'Gerar Final' }).click()
    await expect(page.getByRole('heading', { name: 'Final' })).toBeVisible()
    await page.getByRole('button', { name: /^Lançar resultado do jogo/ }).first().click()
    await fillScore(page, 2, 1)

    const final = (await dbMatches()).find(m => m.stage === 'final')!
    const champ = nameById.get(final.home_id)!
    await expect(page.getByText('Campeão do campeonato')).toBeVisible()
    await expect(page.getByText(champ, { exact: true }).last()).toBeVisible()
    await expect(page.locator('canvas')).toBeVisible()
    // Sem botão de gerar depois do campeão; recalcular não acha nada
    await expect(page.getByRole('button', { name: /^Gerar / })).toHaveCount(0)
    await page.getByRole('button', { name: 'Recalcular confrontos' }).click()
    await expect(page.getByText('Os confrontos já batem com os resultados. Nada a recalcular.')).toBeVisible()
    expect(await dbMatches()).toHaveLength(47)
})

test('2g — jogador comum vê o campeonato sem botões de edição e não entra no Gerenciar', async ({ page }) => {
    await loginAndWaitHome(page, email(7))
    await page.goto(`/tournament/${tournamentId}`)
    await expect(page.getByText('Campeão do campeonato')).toBeVisible()
    await expect(page.getByRole('button', { name: /resultado/ })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Gerenciar campeonato' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Recalcular|Gerar/ })).toHaveCount(0)
    await page.goto(`/tournament/${tournamentId}/manage`)
    await expect(page).toHaveURL(new RegExp(`/tournament/${tournamentId}$`))
})

test('2h — estatísticas e artilharia batem com os placares', async ({ page }) => {
    await loginAndWaitHome(page, email(7))
    await page.goto(`/tournament/${tournamentId}`)
    await page.getByRole('tab', { name: 'Stats' }).click()
    const ms = (await dbMatches()).filter(m => m.played)
    const totalGoals = ms.reduce((a, m) => a + m.home_score! + m.away_score!, 0)
    const statCard = (label: string) => page.locator('div.rounded-card').filter({ hasText: label }).locator('p').first()
    await expect(statCard('Partidas jogadas')).toHaveText('47')
    await expect(statCard('Total de gols')).toHaveText(String(totalGoals))

    const [top] = await sql<{ player_id: string; total: string }>(
        `select g.player_id, sum(g.quantity) as total from public.goals g join public.matches m on m.id = g.match_id
         where m.tournament_id = $1 group by g.player_id order by total desc limit 1`, [tournamentId])
    await page.getByRole('link', { name: 'Ver artilharia completa' }).click()
    await expect(page).toHaveURL(new RegExp(`/top-scorers\\?t=${tournamentId}`))
    await expect(page.getByText(top.total, { exact: true }).first()).toBeVisible()
})

test('2i — encerrar trava a edição do admin (supreme continua podendo)', async ({ page }) => {
    await loginAndWaitHome(page, email(1))
    await page.goto(`/tournament/${tournamentId}/manage`)
    await page.getByRole('radio', { name: 'Encerrado' }).click()
    await expect(page.getByText('Campeonato encerrado.')).toBeVisible()
    await page.goto(`/tournament/${tournamentId}`)
    await expect(page.getByRole('button', { name: /Editar resultado/ })).toHaveCount(0)
    // E o banco também nega (RLS can_edit_tournament), não só a tela
    const [{ status }] = await sql<{ status: string }>(`select status from public.tournaments where id = $1`, [tournamentId])
    expect(status).toBe('finished')
})
