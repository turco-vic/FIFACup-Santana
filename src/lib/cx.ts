// Junta classes ignorando valores falsos: cx('a', cond && 'b', undefined) → 'a b'
export function cx(...classes: (string | false | null | undefined)[]): string {
    return classes.filter(Boolean).join(' ')
}
