// FLUXO 3 — corrigir placar de grupo DEPOIS de gerar as fases seguintes e recalcular pela tela
import type { Page } from '@playwright/test'
import { RUN, createUser, expect, loginAndWaitHome, sql, test } from './support'

test.describe.configure({ mode: 'serial' })

const run = RUN.toLowerCase()
const G = ['A', 'B', 'C', 'D']
const label = (g: string, i: number) => `ZZZTEST_${g}${i}`
const mail = (g: string, i: number) => `bot+${run}-r${g.toLowerCase()}${i}@fifatest.local`
const ids = new Map<string, string>()
let tid = ''

async function matchId(stage: string, home: string, away: string) {
    const [m] = await sql<{ id: string }>(
        `select id from public.matches where tournament_id = $1 and stage = $2 and home_id = $3 and away_id = $4`,
        [tid, stage, ids.get(home), ids.get(away)])
    return m?.id
}

async function insertMatch(stage: string, order: number, home: string, away: string, hs?: number, as?: number) {
    await sql(`insert into public.matches (tournament_id, mode, stage, match_order, home_id, away_id, home_score, away_score, played)
               values ($1, '1v1', $2, $3, $4, $5, $6, $7, $8)`,
        [tid, stage, order, ids.get(home), ids.get(away), hs ?? null, as ?? null, hs !== undefined])
}

// 4 grupos de 5; em cada grupo o de número menor vence por 2×0 (X1 12 pts, X2 9, X3 6...).
// Quartas A1×B2, B1×A2 (A2 vence), C1×D2, D1×C2; semis A1×C1 (A1), A2×D1 (A2); final A1×A2 → A2 campeão.
test.beforeAll(async () => {
    const admin = await createUser({ email: mail('A', 1), name: label('A', 1) })
    ids.set(label('A', 1), admin)
    for (const g of G) for (let i = 1; i <= 5; i++) {
        if (g === 'A' && i === 1) continue
        ids.set(label(g, i), await createUser({ email: mail(g, i), name: label(g, i) }))
    }
    const [t] = await sql<{ id: string }>(
        `insert into public.tournaments (name, mode, format, invite_code, created_by, status)
         values ($1, '1v1', 'groups_knockout', $2, $3, 'active') returning id`,
        [`${RUN}_Recalc`, `R${String(Date.now()).slice(-5)}`.replace(/[01]/g, '7'), admin])
    tid = t.id
    for (const [nm, id] of ids) {
        if (id !== admin) await sql(`insert into public.tournament_players (tournament_id, player_id) values ($1, $2)`, [tid, id])
        void nm
    }
    for (const g of G) {
        const [grp] = await sql<{ id: string }>(`insert into public.groups (tournament_id, name) values ($1, $2) returning id`, [tid, `Grupo ${g}`])
        for (let i = 1; i <= 5; i++) {
            await sql(`insert into public.group_members (group_id, player_id) values ($1, $2)`, [grp.id, ids.get(label(g, i))])
        }
        let order = 0
        for (let i = 1; i <= 5; i++) for (let j = i + 1; j <= 5; j++) {
            await insertMatch('groups', order++, label(g, i), label(g, j), 2, 0)
        }
    }
    await insertMatch('quarters', 0, 'ZZZTEST_A1', 'ZZZTEST_B2', 1, 0)
    await insertMatch('quarters', 1, 'ZZZTEST_B1', 'ZZZTEST_A2', 0, 1)
    await insertMatch('quarters', 2, 'ZZZTEST_C1', 'ZZZTEST_D2', 1, 0)
    await insertMatch('quarters', 3, 'ZZZTEST_D1', 'ZZZTEST_C2', 1, 0)
    await insertMatch('semis', 0, 'ZZZTEST_A1', 'ZZZTEST_C1', 1, 0)
    await insertMatch('semis', 1, 'ZZZTEST_A2', 'ZZZTEST_D1', 1, 0)
    await insertMatch('final', 0, 'ZZZTEST_A1', 'ZZZTEST_A2', 0, 1)
})

const groupCard = (page: Page, g: string) =>
    page.locator('div.rounded-card').filter({ has: page.getByRole('heading', { name: `Grupo ${g}`, exact: true }) })
const matchRow = (page: Page, a: string, b: string) => page.locator('div.min-h-14')
    .filter({ has: page.getByText(a, { exact: true }) }).filter({ has: page.getByText(b, { exact: true }) })

async function saveScore(page: Page, hs: number, as: number) {
    const dialog = page.getByRole('dialog', { name: 'Lançar resultado' })
    const inputs = dialog.locator('input[type=number]')
    await inputs.nth(0).fill(String(hs))
    await inputs.nth(1).fill(String(as))
    await dialog.getByRole('button', { name: 'Salvar' }).click()
    await expect(dialog).toHaveCount(0)
}

const STALE = 'Um placar foi corrigido e o chaveamento não bate mais com os resultados.'

test('3a — estado inicial: A2 campeão, sem aviso de chaveamento desatualizado', async ({ page }) => {
    await loginAndWaitHome(page, mail('A', 1))
    await page.goto(`/tournament/${tid}`)
    await expect(page.getByText('Campeão do campeonato')).toBeVisible()
    await expect(page.locator('div.rounded-card', { hasText: 'Campeão do campeonato' }).getByText('ZZZTEST_A2')).toBeVisible()
    await expect(page.getByText(STALE)).toHaveCount(0)
})

test('3b — corrigir placar sem mudar a classificação: nada a recalcular', async ({ page }) => {
    await loginAndWaitHome(page, mail('A', 1))
    await page.goto(`/tournament/${tid}`)
    await groupCard(page, 'B').locator(matchRow(page, 'ZZZTEST_B1', 'ZZZTEST_B5')).getByRole('button', { name: 'Editar resultado' }).click()
    await saveScore(page, 4, 0)
    await expect(page.getByText(STALE)).toHaveCount(0)
    await page.getByRole('button', { name: 'Recalcular confrontos' }).click()
    await expect(page.getByText('Os confrontos já batem com os resultados. Nada a recalcular.')).toBeVisible()
})

test('3c — corrigir placar que troca o 2º do grupo A: aviso aparece; modal lista o que sai e entra; cancelar não muda nada', async ({ page }) => {
    await loginAndWaitHome(page, mail('A', 1))
    await page.goto(`/tournament/${tid}`)
    await groupCard(page, 'A').locator(matchRow(page, 'ZZZTEST_A2', 'ZZZTEST_A3')).getByRole('button', { name: 'Editar resultado' }).click()
    await saveScore(page, 0, 5)
    // A tabela do grupo A agora tem A3 em 2º
    const rows = groupCard(page, 'A').locator('tbody tr')
    await expect(rows.nth(1)).toContainText('ZZZTEST_A3')
    await expect(page.getByText(STALE)).toBeVisible()

    const before = await sql(`select id from public.matches where tournament_id = $1 and stage <> 'groups' order by id`, [tid])
    await page.getByRole('button', { name: 'Recalcular confrontos' }).click()
    const modal = page.getByRole('dialog', { name: 'Atualizar confrontos' })
    await expect(modal).toBeVisible()
    await expect(modal.getByText('3 resultados serão apagados. Os confrontos que não mudaram continuam com o placar.')).toBeVisible()
    const sai = await modal.locator('div.border-b', { hasText: '×' }).allTextContents()
    expect(sai.some(t => t.includes('Quartas') && t.includes('ZZZTEST_B1 × ZZZTEST_A2') && t.includes('0×1'))).toBe(true)
    expect(sai.some(t => t.includes('Semifinal') && t.includes('ZZZTEST_A2 × ZZZTEST_D1'))).toBe(true)
    expect(sai.some(t => t.includes('Final') && t.includes('ZZZTEST_A1 × ZZZTEST_A2'))).toBe(true)
    await expect(modal.getByText('ZZZTEST_B1 × ZZZTEST_A3')).toBeVisible() // Entra
    await modal.getByRole('button', { name: 'Cancelar' }).click()
    await expect(modal).toHaveCount(0)
    expect(await sql(`select id from public.matches where tournament_id = $1 and stage <> 'groups' order by id`, [tid])).toEqual(before)
})

test('3d — confirmar: cascata até a final, o resto fica com o placar, gols somem junto', async ({ page }) => {
    const keptIds = await Promise.all([
        matchId('quarters', 'ZZZTEST_A1', 'ZZZTEST_B2'), matchId('quarters', 'ZZZTEST_C1', 'ZZZTEST_D2'),
        matchId('quarters', 'ZZZTEST_D1', 'ZZZTEST_C2'), matchId('semis', 'ZZZTEST_A1', 'ZZZTEST_C1'),
    ])
    const goneIds = await Promise.all([
        matchId('quarters', 'ZZZTEST_B1', 'ZZZTEST_A2'), matchId('semis', 'ZZZTEST_A2', 'ZZZTEST_D1'),
        matchId('final', 'ZZZTEST_A1', 'ZZZTEST_A2'),
    ])
    await loginAndWaitHome(page, mail('A', 1))
    await page.goto(`/tournament/${tid}`)
    await page.getByRole('button', { name: 'Recalcular confrontos' }).click()
    await page.getByRole('dialog', { name: 'Atualizar confrontos' }).getByRole('button', { name: 'Confirmar' }).click()
    await expect(page.getByText(STALE)).toHaveCount(0)
    await expect(page.getByText('Campeão do campeonato')).toHaveCount(0)

    const ko = await sql<{ id: string; stage: string; match_order: number; home_id: string; away_id: string; played: boolean }>(
        `select id, stage, match_order, home_id, away_id, played from public.matches
         where tournament_id = $1 and stage <> 'groups' order by stage, match_order`, [tid])
    expect(ko.filter(m => keptIds.includes(m.id))).toHaveLength(4)
    expect(ko.filter(m => goneIds.includes(m.id))).toHaveLength(0)
    const novo = ko.find(m => m.stage === 'quarters' && m.match_order === 1)!
    expect([novo.home_id, novo.away_id, novo.played]).toEqual([ids.get('ZZZTEST_B1'), ids.get('ZZZTEST_A3'), false])
    expect(ko.filter(m => m.stage === 'final')).toHaveLength(0)
    // Gols das partidas apagadas não ficam órfãos (artilharia)
    expect(await sql(`select 1 from public.goals where match_id = any($1::uuid[])`, [goneIds])).toEqual([])
    // Recalcular de novo: nada
    await page.getByRole('button', { name: 'Recalcular confrontos' }).click()
    await expect(page.getByText('Os confrontos já batem com os resultados. Nada a recalcular.')).toBeVisible()
})

test('3e — segue o campeonato: a quarta nova, "Gerar Semifinais" (não "Gerar Final"), final e novo campeão', async ({ page }) => {
    await loginAndWaitHome(page, mail('A', 1))
    await page.goto(`/tournament/${tid}`)
    await expect(page.getByRole('button', { name: /^Gerar / })).toHaveCount(0) // quarta nova sem resultado
    await page.getByRole('button', { name: 'Lançar resultado do jogo 2' }).click()
    await saveScore(page, 2, 0) // B1 vence A3
    await expect(page.getByRole('button', { name: 'Gerar Semifinais' })).toBeVisible()
    await page.getByRole('button', { name: 'Gerar Semifinais' }).click()
    await expect(page.getByRole('button', { name: 'Lançar resultado do jogo 2' })).toBeVisible()
    expect(await matchId('semis', 'ZZZTEST_B1', 'ZZZTEST_D1')).toBeTruthy()
    await page.getByRole('button', { name: 'Lançar resultado do jogo 2' }).click()
    await saveScore(page, 3, 1)
    await page.getByRole('button', { name: 'Gerar Final' }).click()
    await page.getByRole('button', { name: 'Lançar resultado do jogo 1' }).click()
    await saveScore(page, 0, 2) // B1 campeão
    await expect(page.locator('div.rounded-card', { hasText: 'Campeão do campeonato' }).getByText('ZZZTEST_B1')).toBeVisible()
})

test('3f — corrigir uma QUARTA que troca o vencedor com semis jogadas: recalcula semi e final', async ({ page }) => {
    await loginAndWaitHome(page, mail('A', 1))
    await page.goto(`/tournament/${tid}`)
    // Quarta C1×D2 (jogo 3): D2 passa a vencer
    await page.getByRole('button', { name: 'Editar resultado do jogo 3' }).first().click()
    await saveScore(page, 0, 2)
    await expect(page.getByText(STALE)).toBeVisible()
    await page.getByRole('button', { name: 'Recalcular confrontos' }).click()
    const modal = page.getByRole('dialog', { name: 'Atualizar confrontos' })
    await expect(modal.getByText('2 resultados serão apagados.')).toBeVisible()
    await expect(modal.getByText('ZZZTEST_A1 × ZZZTEST_D2')).toBeVisible()
    await modal.getByRole('button', { name: 'Confirmar' }).click()
    await expect(page.getByText(STALE)).toHaveCount(0)
    expect(await matchId('semis', 'ZZZTEST_A1', 'ZZZTEST_D2')).toBeTruthy()
    expect(await matchId('semis', 'ZZZTEST_A1', 'ZZZTEST_C1')).toBeUndefined()
    expect(await sql(`select 1 from public.matches where tournament_id = $1 and stage = 'final'`, [tid])).toHaveLength(0)
})
