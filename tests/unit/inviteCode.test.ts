// G) Código de convite (6 caracteres): formato, unicidade, colisão
import { describe, expect, it, vi } from 'vitest'
import {
    INVITE_CODE_CHARS, generateInviteCode, generateUniqueInviteCode, normalizeInviteCode,
} from '../../src/lib/inviteCode'
import { chiSquare, chiSquareCritical, mulberry32 } from './helpers'

const FORMAT = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/

describe('generateInviteCode — formato', () => {
    it('alfabeto de 32 caracteres sem ambíguos (I, O, 0, 1) e sem repetição', () => {
        expect(INVITE_CODE_CHARS).toHaveLength(32)
        expect(new Set(INVITE_CODE_CHARS).size).toBe(32)
        for (const c of 'IO01') expect(INVITE_CODE_CHARS).not.toContain(c)
    })

    it('50 mil códigos: sempre 6 caracteres do alfabeto, maiúsculos', () => {
        const rand = mulberry32(1)
        for (let i = 0; i < 50_000; i++) expect(generateInviteCode(rand)).toMatch(FORMAT)
    })

    it('extremos do gerador: 0 → "AAAAAA", 0.999999 → "999999" (nunca índice fora do alfabeto)', () => {
        expect(generateInviteCode(() => 0)).toBe('AAAAAA')
        expect(generateInviteCode(() => 0.9999999999)).toBe('999999')
    })

    it('com o Math.random real o formato também vale', () => {
        for (let i = 0; i < 5_000; i++) expect(generateInviteCode()).toMatch(FORMAT)
    })

    it('distribuição uniforme dos caracteres (qui-quadrado, 32 mil códigos)', () => {
        const rand = mulberry32(5)
        const counts = new Map([...INVITE_CODE_CHARS].map(c => [c, 0]))
        const N = 32_000
        for (let i = 0; i < N; i++) for (const c of generateInviteCode(rand)) counts.set(c, counts.get(c)! + 1)
        expect(chiSquare([...counts.values()], (N * 6) / 32)).toBeLessThan(chiSquareCritical(31))
    })

    it('colisão: 32^6 ≈ 1,07 bilhão de códigos; 20 mil códigos quase nunca repetem (esperado ~0,19)', () => {
        const rand = mulberry32(9)
        const seen = new Set<string>()
        let dup = 0
        for (let i = 0; i < 20_000; i++) {
            const c = generateInviteCode(rand)
            if (seen.has(c)) dup++
            seen.add(c)
        }
        expect(32 ** 6).toBe(1_073_741_824)
        expect(dup).toBeLessThanOrEqual(2)
    })
})

describe('generateUniqueInviteCode — tratamento de colisão', () => {
    it('código livre na 1ª tentativa: consulta o banco 1 vez', async () => {
        const exists = vi.fn(async () => false)
        const code = await generateUniqueInviteCode(exists)
        expect(code).toMatch(FORMAT)
        expect(exists).toHaveBeenCalledTimes(1)
        expect(exists).toHaveBeenCalledWith(code)
    })

    it('colide 3 vezes: devolve o 4º código, que foi o último consultado', async () => {
        const taken = new Set<string>()
        let calls = 0
        const exists = vi.fn(async (c: string) => { calls++; if (calls <= 3) { taken.add(c); return true } return false })
        const code = await generateUniqueInviteCode(exists, 5, mulberry32(3))
        expect(exists).toHaveBeenCalledTimes(4)
        expect(taken.has(code!)).toBe(false)
        expect(exists).toHaveBeenLastCalledWith(code)
    })

    it('sempre colide: desiste depois de maxAttempts e devolve null (antes inseria um código sem checar)', async () => {
        const exists = vi.fn(async () => true)
        expect(await generateUniqueInviteCode(exists, 5)).toBeNull()
        expect(exists).toHaveBeenCalledTimes(5)
    })

    it('todo código devolvido foi checado no banco', async () => {
        const checked: string[] = []
        const rand = mulberry32(77)
        for (let i = 0; i < 200; i++) {
            const code = await generateUniqueInviteCode(async c => { checked.push(c); return rand() < 0.5 }, 5, rand)
            if (code) expect(checked.at(-1)).toBe(code)
        }
    })
})

describe('normalizeInviteCode — código digitado ou colado', () => {
    it.each([
        ['abc123', 'ABC123'],
        [' ABC123 ', 'ABC123'],
        ['abc 123', 'ABC123'],
        ['ABC-123', 'ABC123'],
        ['  a b c 1 2 3  ', 'ABC123'],
        ['ABC1234', 'ABC123'],
        ['Código: XYZ789', 'CDIGOX'],
        ['', ''],
    ])('%j → %j', (input, expected) => {
        expect(normalizeInviteCode(input)).toBe(expected)
    })
})
