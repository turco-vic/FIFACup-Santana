// Código de convite: 6 caracteres sem os ambíguos (I/1, O/0) para ditar e digitar sem erro
export const INVITE_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const INVITE_CODE_LENGTH = 6

export function generateInviteCode(random: () => number = Math.random): string {
    return Array.from({ length: INVITE_CODE_LENGTH },
        () => INVITE_CODE_CHARS[Math.floor(random() * INVITE_CODE_CHARS.length)]).join('')
}

// Sorteia até achar um código livre. `exists` consulta o banco.
// Depois de `maxAttempts` colisões devolve null (o índice único do banco é a garantia final).
export async function generateUniqueInviteCode(
    exists: (code: string) => Promise<boolean>,
    maxAttempts = 5,
    random: () => number = Math.random,
): Promise<string | null> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const code = generateInviteCode(random)
        if (!(await exists(code))) return code
    }
    return null
}

// O que a pessoa digitou ou colou (ex.: " abc 123" do WhatsApp) → "ABC123"
export function normalizeInviteCode(input: string): string {
    return input.replace(/[^0-9a-z]/gi, '').toUpperCase().slice(0, INVITE_CODE_LENGTH)
}
