// Chaves do stack LOCAL de teste. Segredo fixo e público de propósito: só vale para
// o Postgres/PostgREST descartáveis que o stack sobe em 127.0.0.1. Nada aqui toca produção.
import { createHmac } from 'node:crypto'

export const JWT_SECRET = 'fifacup-local-test-secret-not-for-production-0123456789'
export const GATEWAY_PORT = Number(process.env.GATEWAY_PORT ?? 54321)
export const REST_PORT = Number(process.env.REST_PORT ?? 54331)
export const PG_PORT = Number(process.env.PG_PORT ?? 55432)
export const LOCAL_URL = `http://127.0.0.1:${GATEWAY_PORT}`

const b64url = (buf) => Buffer.from(buf).toString('base64url')

export function signJwt(payload, secret = JWT_SECRET) {
    const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    const body = b64url(JSON.stringify(payload))
    const sig = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url')
    return `${header}.${body}.${sig}`
}

export function verifyJwt(token, secret = JWT_SECRET) {
    const [h, b, s] = String(token ?? '').split('.')
    if (!h || !b || !s) return null
    const expected = createHmac('sha256', secret).update(`${h}.${b}`).digest('base64url')
    if (expected !== s) return null
    const payload = JSON.parse(Buffer.from(b, 'base64url').toString())
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
}

// Iguais em formato às chaves do Supabase (role anon / service_role, iss supabase)
const FAR = 2_000_000_000
export const ANON_KEY = signJwt({ iss: 'supabase', ref: 'local-test', role: 'anon', iat: 1_700_000_000, exp: FAR })
export const SERVICE_KEY = signJwt({ iss: 'supabase', ref: 'local-test', role: 'service_role', iat: 1_700_000_000, exp: FAR })
