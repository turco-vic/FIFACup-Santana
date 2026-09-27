import { isAuthError } from '@supabase/supabase-js'

// Mensagens do Supabase Auth em português. O Supabase devolve texto em inglês
// ("Invalid login credentials"); o `code` identifica o erro sem depender do texto.
const BY_CODE: Record<string, string> = {
    invalid_credentials: 'Email ou senha incorretos.',
    email_not_confirmed: 'Confirme seu email antes de entrar. Veja sua caixa de entrada.',
    user_already_exists: 'Já existe uma conta com este email.',
    email_exists: 'Já existe uma conta com este email.',
    email_address_invalid: 'Email inválido.',
    weak_password: 'Senha fraca. Use pelo menos 6 caracteres.',
    same_password: 'A nova senha precisa ser diferente da atual.',
    signup_disabled: 'Novos cadastros estão desativados no momento.',
    user_banned: 'Sua conta foi bloqueada. Entre em contato com o administrador.',
    over_request_rate_limit: 'Muitas tentativas seguidas. Aguarde um pouco e tente de novo.',
    over_email_send_rate_limit: 'Muitos emails enviados. Aguarde alguns minutos e tente de novo.',
    session_not_found: 'Sua sessão expirou. Peça um novo link de redefinição.',
    session_expired: 'Sua sessão expirou. Peça um novo link de redefinição.',
    request_timeout: 'A conexão demorou demais. Tente de novo.',
}

// Respaldo para erros sem `code` (versões antigas do servidor): pelo texto em inglês
const BY_MESSAGE: [RegExp, string][] = [
    [/invalid login credentials/i, BY_CODE.invalid_credentials],
    [/email not confirmed/i, BY_CODE.email_not_confirmed],
    [/already (registered|exists)/i, BY_CODE.user_already_exists],
    [/password should be at least|weak password/i, BY_CODE.weak_password],
    [/should be different from the old password/i, BY_CODE.same_password],
    [/invalid format|invalid email/i, BY_CODE.email_address_invalid],
    [/rate limit/i, BY_CODE.over_request_rate_limit],
    [/failed to fetch|network|fetch failed/i, 'Sem conexão. Verifique a internet e tente de novo.'],
]

// Erros do próprio app (ex.: conta pendente, vinda do useAuth) já estão em português e passam direto.
// `fallback` cobre erros do Supabase que não estão mapeados, em vez de mostrar inglês.
export function translateAuthError(error: unknown, fallback: string): string {
    if (!isAuthError(error)) {
        const message = (error as { message?: string } | null)?.message
        return message || fallback
    }
    if (error.code && BY_CODE[error.code]) return BY_CODE[error.code]
    const match = BY_MESSAGE.find(([pattern]) => pattern.test(error.message))
    if (match) return match[1]
    // Sem resposta do servidor (status 0): problema de conexão
    if (error.status === 0) return 'Sem conexão. Verifique a internet e tente de novo.'
    return fallback
}
