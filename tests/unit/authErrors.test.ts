// Mensagens de erro de login/cadastro/reset em português (fluxos 1 e 5)
import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { translateAuthError } from '../../src/lib/authErrors'
import { getWinner, isKnockoutStage, penaltiesLabel } from '../../src/lib/matches'
import { mkMatch, played } from './helpers'

const FALLBACK = 'Algo deu errado.'

describe('translateAuthError', () => {
    it.each([
        ['invalid_credentials', 400, 'Email ou senha incorretos.'],
        ['user_already_exists', 422, 'Já existe uma conta com este email.'],
        ['email_exists', 422, 'Já existe uma conta com este email.'],
        ['weak_password', 422, 'Senha fraca. Use pelo menos 6 caracteres.'],
        ['same_password', 422, 'A nova senha precisa ser diferente da atual.'],
        ['over_request_rate_limit', 429, 'Muitas tentativas seguidas. Aguarde um pouco e tente de novo.'],
        ['over_email_send_rate_limit', 429, 'Muitos emails enviados. Aguarde alguns minutos e tente de novo.'],
        ['signup_disabled', 422, 'Novos cadastros estão desativados no momento.'],
    ])('código %s', (code, status, expected) => {
        expect(translateAuthError(new AuthApiError('english message', status, code), FALLBACK)).toBe(expected)
    })

    it('servidor antigo sem código: reconhece pelo texto em inglês', () => {
        expect(translateAuthError(new AuthApiError('Invalid login credentials', 400, undefined), FALLBACK)).toBe('Email ou senha incorretos.')
        expect(translateAuthError(new AuthApiError('User already registered', 422, undefined), FALLBACK)).toBe('Já existe uma conta com este email.')
        expect(translateAuthError(new AuthApiError('Unable to validate email address: invalid format', 400, 'validation_failed'), FALLBACK)).toBe('Email inválido.')
    })

    it('sem internet (fetch falhou, status 0)', () => {
        expect(translateAuthError(new AuthRetryableFetchError('Failed to fetch', 0), FALLBACK)).toBe('Sem conexão. Verifique a internet e tente de novo.')
    })

    it('erro desconhecido do Supabase vira o fallback (nada em inglês na tela)', () => {
        expect(translateAuthError(new AuthApiError('Something weird', 500, 'unexpected_failure'), FALLBACK)).toBe(FALLBACK)
    })

    it('erro do próprio app (conta pendente) passa direto; nulo vira fallback', () => {
        expect(translateAuthError({ message: 'Sua conta ainda não foi aprovada. Aguarde o AdminSupremo.' }, FALLBACK))
            .toBe('Sua conta ainda não foi aprovada. Aguarde o AdminSupremo.')
        expect(translateAuthError(null, FALLBACK)).toBe(FALLBACK)
    })
})

describe('matches — mata-mata e pênaltis', () => {
    it('isKnockoutStage', () => {
        for (const s of ['round32', 'round16', 'quarters', 'semis', 'final', 'knockout'] as const) expect(isKnockoutStage(s)).toBe(true)
        expect(isKnockoutStage('groups')).toBe(false)
        expect(isKnockoutStage('league')).toBe(false)
    })
    it('penaltiesLabel só quando há pênaltis', () => {
        expect(penaltiesLabel(played('a', 'b', 1, 1, { home_penalties: 4, away_penalties: 3 }))).toBe('(4×3 pên.)')
        expect(penaltiesLabel(played('a', 'b', 2, 1))).toBe('')
    })
    it('getWinner: não jogado, vitória, empate sem pênaltis, pênaltis', () => {
        expect(getWinner(mkMatch({ home_id: 'a', away_id: 'b' }))).toBeNull()
        expect(getWinner(played('a', 'b', 0, 3))).toBe('b')
        expect(getWinner(played('a', 'b', 2, 2))).toBeNull()
        expect(getWinner(played('a', 'b', 2, 2, { home_penalties: 5, away_penalties: 4 }))).toBe('a')
        expect(getWinner(played('a', 'b', 2, 2, { home_penalties: 4, away_penalties: 4 }))).toBeNull()
    })
})
