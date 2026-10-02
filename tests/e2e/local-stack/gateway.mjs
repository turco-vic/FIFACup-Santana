// Gateway local no lugar do Supabase (porta 54321, mesmas rotas que o supabase-js usa):
//   /rest/v1/*       → PostgREST 14.5 (RLS, triggers e RPCs reais do Postgres local)
//   /auth/v1/*       → emulação do GoTrue: cadastro com autoconfirm (igual produção), login,
//                      refresh, /user, recuperação de senha (e-mails vão para /__test/outbox)
//   /functions/v1/send-push-notification → stub: mesma checagem de permissão da edge function
//   /storage/v1/*    → stub em memória (avatar)
//   /__test/*        → controle dos testes (caixa de saída, limites simulados, chamadas de push)
// Só para testes. Escuta em 127.0.0.1.
import http from 'node:http'
import { randomBytes, randomUUID } from 'node:crypto'
import { REST_PORT, LOCAL_URL, signJwt, verifyJwt } from './keys.mjs'

const API_VERSION = { 'x-supabase-api-version': '2024-01-01' }

export function createGateway({ pool, siteUrl, allowedRedirects = [], log = () => {} }) {
    const refreshTokens = new Map()   // token → { userId, sessionId, revoked }
    const sessions = new Map()        // sessionId → { userId, active }
    const recoveryTokens = new Map()  // token → { userId, expiresAt, used }
    const outbox = []
    const pushCalls = []
    const storage = new Map()
    const config = { failNextRecover: null, emailRateLimitPerHour: 0, authRateLimitPer5Min: 0 }
    const emailLog = []               // timestamps de e-mails enviados (limite por hora)
    const authLog = []                // timestamps de signup/login (limite por 5 min)

    const cors = (req) => ({
        'Access-Control-Allow-Origin': req.headers.origin ?? '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD',
        'Access-Control-Allow-Headers': req.headers['access-control-request-headers'] ??
            'authorization,x-client-info,apikey,content-type,prefer,range,accept-profile,content-profile,x-supabase-api-version,x-upsert',
        'Access-Control-Expose-Headers': 'Content-Range,Content-Location,X-Supabase-Api-Version,Preference-Applied,Location',
        'Access-Control-Max-Age': '600',
    })

    function send(req, res, status, body, headers = {}) {
        const payload = body === undefined ? '' : JSON.stringify(body)
        res.writeHead(status, { ...cors(req), 'Content-Type': 'application/json', ...headers })
        res.end(payload)
    }
    const authError = (req, res, status, code, message, extra = {}) =>
        send(req, res, status, { code, error_code: code, msg: message, message, ...extra }, API_VERSION)

    async function readBody(req) {
        const chunks = []
        for await (const c of req) chunks.push(c)
        return Buffer.concat(chunks)
    }
    async function readJson(req) {
        const raw = (await readBody(req)).toString()
        return raw ? JSON.parse(raw) : {}
    }

    function userJson(u) {
        return {
            id: u.id, aud: 'authenticated', role: 'authenticated', email: u.email,
            email_confirmed_at: u.email_confirmed_at, phone: '', confirmed_at: u.email_confirmed_at,
            last_sign_in_at: u.last_sign_in_at, app_metadata: u.raw_app_meta_data ?? {},
            user_metadata: u.raw_user_meta_data ?? {}, identities: [],
            created_at: u.created_at, updated_at: u.updated_at, is_anonymous: false,
        }
    }

    function issueSession(u, sessionId = randomUUID()) {
        const now = Math.floor(Date.now() / 1000)
        const exp = now + 3600
        const access_token = signJwt({
            aud: 'authenticated', exp, iat: now, iss: `${LOCAL_URL}/auth/v1`, sub: u.id, email: u.email, phone: '',
            app_metadata: u.raw_app_meta_data ?? {}, user_metadata: u.raw_user_meta_data ?? {},
            role: 'authenticated', aal: 'aal1', amr: [{ method: 'password', timestamp: now }],
            session_id: sessionId, is_anonymous: false,
        })
        const refresh_token = randomBytes(16).toString('hex')
        refreshTokens.set(refresh_token, { userId: u.id, sessionId, revoked: false })
        sessions.set(sessionId, { userId: u.id, active: true })
        return { access_token, token_type: 'bearer', expires_in: 3600, expires_at: exp, refresh_token, user: userJson(u) }
    }

    async function userById(id) {
        const { rows } = await pool.query('select * from auth.users where id = $1', [id])
        return rows[0] ?? null
    }

    // JWT do header → usuário, ou responde o erro e devolve null
    async function requireUser(req, res) {
        const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '')
        const claims = verifyJwt(token)
        if (!claims || claims.role !== 'authenticated') {
            authError(req, res, 401, 'bad_jwt', 'invalid JWT: unable to parse or verify signature')
            return null
        }
        const s = sessions.get(claims.session_id)
        if (!s || !s.active) {
            authError(req, res, 403, 'session_not_found', 'Session from session_id claim in JWT does not exist')
            return null
        }
        const u = await userById(claims.sub)
        if (!u) { authError(req, res, 403, 'user_not_found', 'User from sub claim in JWT does not exist'); return null }
        return { user: u, claims }
    }

    function overLimit(logArr, windowMs, limit) {
        if (!limit) return false
        const now = Date.now()
        while (logArr.length && logArr[0] < now - windowMs) logArr.shift()
        if (logArr.length >= limit) return true
        logArr.push(now)
        return false
    }

    function redirectFor(requested) {
        if (requested && allowedRedirects.some(prefix => requested.startsWith(prefix))) return requested
        return siteUrl
    }

    async function handleAuth(req, res, url) {
        const path = url.pathname.replace(/^\/auth\/v1/, '')
        if (req.method === 'GET' && path === '/settings') {
            return send(req, res, 200, {
                external: { email: true, phone: false, anonymous_users: false },
                disable_signup: false, mailer_autoconfirm: true, phone_autoconfirm: false,
            })
        }
        if (req.method === 'GET' && path === '/health') {
            return send(req, res, 200, { version: 'local-emulator', name: 'GoTrue' })
        }

        if (req.method === 'POST' && path === '/signup') {
            if (overLimit(authLog, 5 * 60_000, config.authRateLimitPer5Min)) {
                return authError(req, res, 429, 'over_request_rate_limit', 'Request rate limit reached')
            }
            const { email, password, data } = await readJson(req)
            const mail = String(email ?? '').trim().toLowerCase()
            if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) {
                return authError(req, res, 400, 'validation_failed', 'Unable to validate email address: invalid format')
            }
            if (String(password ?? '').length < 6) {
                return authError(req, res, 422, 'weak_password', 'Password should be at least 6 characters.', { weak_password: { reasons: ['length'] } })
            }
            const exists = await pool.query('select 1 from auth.users where email = $1', [mail])
            if (exists.rowCount > 0) return authError(req, res, 422, 'user_already_exists', 'User already registered')
            const { rows } = await pool.query(
                `insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
                 values ($1, $2, extensions.crypt($3, extensions.gen_salt('bf')), now(), $4) returning *`,
                [randomUUID(), mail, password, data ?? {}])
            log(`signup ${mail}`)
            return send(req, res, 200, issueSession(rows[0]), API_VERSION)
        }

        if (req.method === 'POST' && path === '/token') {
            const grant = url.searchParams.get('grant_type')
            const body = await readJson(req)
            if (grant === 'password') {
                if (overLimit(authLog, 5 * 60_000, config.authRateLimitPer5Min)) {
                    return authError(req, res, 429, 'over_request_rate_limit', 'Request rate limit reached')
                }
                const mail = String(body.email ?? '').trim().toLowerCase()
                const { rows } = await pool.query(
                    `update auth.users set last_sign_in_at = now()
                     where email = $1 and encrypted_password = extensions.crypt($2, encrypted_password) returning *`,
                    [mail, String(body.password ?? '')])
                if (!rows[0]) return authError(req, res, 400, 'invalid_credentials', 'Invalid login credentials')
                log(`login ${mail}`)
                return send(req, res, 200, issueSession(rows[0]), API_VERSION)
            }
            if (grant === 'refresh_token') {
                const rt = refreshTokens.get(body.refresh_token)
                if (!rt || rt.revoked || !sessions.get(rt.sessionId)?.active) {
                    return authError(req, res, 400, 'refresh_token_not_found', 'Invalid Refresh Token: Refresh Token Not Found')
                }
                rt.revoked = true
                const u = await userById(rt.userId)
                return send(req, res, 200, issueSession(u, rt.sessionId), API_VERSION)
            }
            return authError(req, res, 400, 'unsupported_grant_type', 'unsupported grant type')
        }

        if (path === '/user' && req.method === 'GET') {
            const ctx = await requireUser(req, res)
            if (ctx) send(req, res, 200, userJson(ctx.user), API_VERSION)
            return
        }

        if (path === '/user' && req.method === 'PUT') {
            const ctx = await requireUser(req, res)
            if (!ctx) return
            const body = await readJson(req)
            if (body.password !== undefined) {
                if (String(body.password).length < 6) {
                    return authError(req, res, 422, 'weak_password', 'Password should be at least 6 characters.', { weak_password: { reasons: ['length'] } })
                }
                const same = await pool.query(
                    'select 1 from auth.users where id = $1 and encrypted_password = extensions.crypt($2, encrypted_password)',
                    [ctx.user.id, body.password])
                if (same.rowCount > 0) {
                    return authError(req, res, 422, 'same_password', 'New password should be different from the old password.')
                }
                await pool.query(
                    `update auth.users set encrypted_password = extensions.crypt($2, extensions.gen_salt('bf')), updated_at = now()
                     where id = $1`, [ctx.user.id, body.password])
                log(`password changed ${ctx.user.email}`)
            }
            if (body.data) {
                await pool.query('update auth.users set raw_user_meta_data = raw_user_meta_data || $2 where id = $1', [ctx.user.id, body.data])
            }
            return send(req, res, 200, userJson(await userById(ctx.user.id)), API_VERSION)
        }

        if (req.method === 'POST' && path === '/logout') {
            const claims = verifyJwt((req.headers.authorization ?? '').replace(/^Bearer\s+/i, ''))
            if (claims) {
                const scope = url.searchParams.get('scope') ?? 'global'
                for (const [sid, s] of sessions) {
                    if (s.userId === claims.sub && (scope === 'global' || sid === claims.session_id)) s.active = false
                }
                for (const rt of refreshTokens.values()) if (rt.userId === claims.sub && scope === 'global') rt.revoked = true
            }
            res.writeHead(204, cors(req)); return res.end()
        }

        if (req.method === 'POST' && path === '/recover') {
            const { email } = await readJson(req)
            if (config.failNextRecover) {
                const code = config.failNextRecover
                config.failNextRecover = null
                return authError(req, res, 429, code, 'email rate limit exceeded')
            }
            if (overLimit(emailLog, 60 * 60_000, config.emailRateLimitPerHour)) {
                return authError(req, res, 429, 'over_email_send_rate_limit', 'email rate limit exceeded')
            }
            const mail = String(email ?? '').trim().toLowerCase()
            const { rows } = await pool.query('select * from auth.users where email = $1', [mail])
            if (rows[0]) {
                const token = randomBytes(20).toString('hex')
                recoveryTokens.set(token, { userId: rows[0].id, expiresAt: Date.now() + 3600_000, used: false })
                const redirectTo = url.searchParams.get('redirect_to') ?? ''
                const link = `${LOCAL_URL}/auth/v1/verify?token=${token}&type=recovery&redirect_to=${encodeURIComponent(redirectTo)}`
                outbox.push({ to: mail, type: 'recovery', link, at: new Date().toISOString() })
                log(`recover ${mail}`)
            }
            // O GoTrue responde 200 mesmo para e-mail inexistente (não revela quem tem conta)
            return send(req, res, 200, {}, API_VERSION)
        }

        if (req.method === 'GET' && path === '/verify') {
            const token = url.searchParams.get('token')
            const target = redirectFor(url.searchParams.get('redirect_to'))
            const rec = recoveryTokens.get(token)
            if (!rec || rec.used || rec.expiresAt < Date.now()) {
                res.writeHead(303, { Location: `${target}#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired` })
                return res.end()
            }
            rec.used = true
            const s = issueSession(await userById(rec.userId))
            const hash = new URLSearchParams({
                access_token: s.access_token, expires_at: String(s.expires_at), expires_in: '3600',
                refresh_token: s.refresh_token, token_type: 'bearer', type: 'recovery',
            })
            res.writeHead(303, { Location: `${target}#${hash}` })
            return res.end()
        }

        return authError(req, res, 404, 'not_found', `rota de auth não emulada: ${req.method} ${path}`)
    }

    // Mesmas regras da edge function send-push-notification (C8), sem enviar push de verdade
    async function handlePush(req, res) {
        const claims = verifyJwt((req.headers.authorization ?? '').replace(/^Bearer\s+/i, ''))
        if (!claims || claims.role !== 'authenticated') return send(req, res, 401, { error: 'Não autenticado' })
        const { match_id } = await readJson(req)
        if (typeof match_id !== 'string') return send(req, res, 400, { error: 'match_id obrigatório' })
        const { rows } = await pool.query('select id, tournament_id, played from public.matches where id = $1', [match_id])
        const m = rows[0]
        if (!m) return send(req, res, 404, { error: 'Partida não encontrada' })
        if (!m.played) return send(req, res, 400, { error: 'Partida sem resultado' })
        const client = await pool.connect()
        let canEdit = false
        try {
            await client.query('begin')
            await client.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify(claims)])
            await client.query('set local role authenticated')
            canEdit = (await client.query('select public.can_edit_tournament($1) as ok', [m.tournament_id])).rows[0].ok
            await client.query('rollback')
        } finally { client.release() }
        pushCalls.push({ match_id, by: claims.sub, allowed: canEdit, at: Date.now() })
        if (!canEdit) return send(req, res, 403, { error: 'Sem permissão' })
        return send(req, res, 200, { sent: 0 })
    }

    async function handleStorage(req, res, url) {
        const m = url.pathname.match(/^\/storage\/v1\/object\/(public\/)?([^/]+)\/(.+)$/)
        if (!m) return send(req, res, 404, { error: 'not found' })
        const key = `${m[2]}/${decodeURIComponent(m[3])}`
        if (req.method === 'GET') {
            const f = storage.get(key)
            if (!f) return send(req, res, 404, { error: 'not found' })
            res.writeHead(200, { ...cors(req), 'Content-Type': f.type })
            return res.end(f.data)
        }
        if (req.method === 'POST' || req.method === 'PUT') {
            storage.set(key, { data: await readBody(req), type: req.headers['content-type'] ?? 'application/octet-stream' })
            return send(req, res, 200, { Key: key, Id: randomUUID() })
        }
        return send(req, res, 405, { error: 'method' })
    }

    function proxyRest(req, res, url) {
        const headers = { ...req.headers }
        delete headers.host
        delete headers.origin // o CORS é do gateway; evita cabeçalho duplicado
        const upstream = http.request({
            host: '127.0.0.1', port: REST_PORT, method: req.method,
            path: url.pathname.replace(/^\/rest\/v1/, '') + url.search, headers,
        }, up => {
            const h = { ...up.headers }
            for (const k of Object.keys(h)) if (k.startsWith('access-control-')) delete h[k]
            res.writeHead(up.statusCode ?? 502, { ...h, ...cors(req) })
            up.pipe(res)
        })
        upstream.on('error', e => send(req, res, 502, { message: `PostgREST indisponível: ${e.message}` }))
        req.pipe(upstream)
    }

    async function handleTest(req, res, url) {
        const path = url.pathname.replace(/^\/__test/, '')
        if (path === '/outbox') return send(req, res, 200, outbox)
        if (path === '/push-calls') return send(req, res, 200, pushCalls)
        if (path === '/config' && req.method === 'POST') {
            Object.assign(config, await readJson(req))
            emailLog.length = 0; authLog.length = 0
            return send(req, res, 200, config)
        }
        if (path === '/clear' && req.method === 'POST') {
            outbox.length = 0; pushCalls.length = 0; emailLog.length = 0; authLog.length = 0
            Object.assign(config, { failNextRecover: null, emailRateLimitPerHour: 0, authRateLimitPer5Min: 0 })
            return send(req, res, 200, { ok: true })
        }
        return send(req, res, 404, { error: 'rota de teste desconhecida' })
    }

    const server = http.createServer(async (req, res) => {
        const url = new URL(req.url, LOCAL_URL)
        try {
            if (req.method === 'OPTIONS') { res.writeHead(204, cors(req)); return res.end() }
            if (url.pathname.startsWith('/rest/v1')) return proxyRest(req, res, url)
            if (url.pathname.startsWith('/auth/v1')) return await handleAuth(req, res, url)
            if (url.pathname === '/functions/v1/send-push-notification') return await handlePush(req, res)
            if (url.pathname.startsWith('/storage/v1')) return await handleStorage(req, res, url)
            if (url.pathname.startsWith('/__test')) return await handleTest(req, res, url)
            return send(req, res, 404, { message: 'no route' })
        } catch (e) {
            log(`ERRO ${req.method} ${url.pathname}: ${e.stack ?? e}`)
            if (!res.headersSent) send(req, res, 500, { message: String(e.message ?? e) })
        }
    })
    return { server, outbox, pushCalls, config }
}
