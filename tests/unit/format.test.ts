// F) Datas: a data do campeonato (coluna `date`, "YYYY-MM-DD") não pode voltar 1 dia
import { afterEach, describe, expect, it } from 'vitest'
import { formatDate } from '../../src/lib/format'

const ORIGINAL_TZ = process.env.TZ
afterEach(() => { process.env.TZ = ORIGINAL_TZ })

// Fusos do Brasil e extremos do mundo (−11h a +14h)
const ZONES = [
    'America/Sao_Paulo', 'America/Manaus', 'America/Rio_Branco', 'America/Noronha',
    'UTC', 'Europe/Lisbon', 'Asia/Tokyo', 'Pacific/Kiritimati', 'Pacific/Pago_Pago', 'America/Los_Angeles',
]

describe('formatDate — sem voltar um dia em nenhum fuso', () => {
    it.each(ZONES)('%s', tz => {
        process.env.TZ = tz
        expect(formatDate('2026-10-03')).toBe('03/10/2026')
        expect(formatDate('2026-01-01')).toBe('01/01/2026')
        expect(formatDate('2026-12-31')).toBe('31/12/2026')
        expect(formatDate('2028-02-29')).toBe('29/02/2028')
        // timestamp completo: só a parte da data conta
        expect(formatDate('2026-10-03T00:00:00+00:00')).toBe('03/10/2026')
        expect(formatDate('2026-10-03T23:59:59-03:00')).toBe('03/10/2026')
    })

    it('controle: o jeito antigo (new Date("YYYY-MM-DD")) mostra o dia anterior no Brasil', () => {
        process.env.TZ = 'America/Sao_Paulo'
        expect(new Date('2026-10-03').toLocaleDateString('pt-BR')).toBe('02/10/2026')
        expect(formatDate('2026-10-03')).toBe('03/10/2026')
    })

    it('dia em que o horário de verão começava à meia-noite (04/11/2018, a meia-noite não existiu em SP)', () => {
        process.env.TZ = 'America/Sao_Paulo'
        expect(formatDate('2018-11-04')).toBe('04/11/2018')
        expect(formatDate('2018-02-17')).toBe('17/02/2018')
    })

    it('todos os dias de 2026 e 2027, em SP e em UTC−11/+14, formatam a própria data', () => {
        for (const tz of ['America/Sao_Paulo', 'Pacific/Pago_Pago', 'Pacific/Kiritimati']) {
            process.env.TZ = tz
            for (let t = Date.UTC(2026, 0, 1); t < Date.UTC(2028, 0, 1); t += 86_400_000) {
                const iso = new Date(t).toISOString().slice(0, 10)
                const [y, m, d] = iso.split('-')
                expect(formatDate(iso)).toBe(`${d}/${m}/${y}`)
            }
        }
    })
})
