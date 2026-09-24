// Colunas `date` vêm como "YYYY-MM-DD". new Date("YYYY-MM-DD") interpreta como meia-noite UTC,
// e no Brasil (UTC-3) isso vira o dia anterior. Aqui a data é montada no fuso local.
export function formatDate(value: string): string {
    const [y, m, d] = value.slice(0, 10).split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('pt-BR')
}
