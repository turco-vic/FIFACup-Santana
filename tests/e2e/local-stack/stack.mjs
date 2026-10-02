// Sobe um "Supabase" local descartável, sem Docker:
//   1. cluster Postgres novo (initdb) em STACK_DIR, só em 127.0.0.1
//   2. shim do Supabase + schema da Fase 0 + as migrations de supabase/migrations (na ordem)
//   3. PostgREST 14.5 (mesma versão de produção)
//   4. gateway em 127.0.0.1:54321 (rest/auth/functions/storage)
// Uso: node tests/e2e/local-stack/stack.mjs          (fica rodando; Ctrl+C derruba tudo)
// Variáveis: PG_BIN, POSTGREST_BIN, STACK_DIR, GOALS_FK=cascade|noaction, EXCLUDE_MIGRATIONS, SITE_URL
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { ANON_KEY, GATEWAY_PORT, JWT_SECRET, LOCAL_URL, PG_PORT, REST_PORT, SERVICE_KEY } from './keys.mjs'
import { createGateway } from './gateway.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../..')
const PG_BIN = process.env.PG_BIN ?? 'C:\\Program Files\\PostgreSQL\\16\\bin'
const POSTGREST_BIN = process.env.POSTGREST_BIN
const STACK_DIR = process.env.STACK_DIR ?? join(tmpdir(), 'fifacup-local-stack')
const GOALS_FK = (process.env.GOALS_FK ?? 'cascade').toLowerCase() === 'noaction' ? 'no action' : 'cascade'
const SITE_URL = process.env.SITE_URL ?? 'http://127.0.0.1:5174'
const PGDATA = join(STACK_DIR, 'pgdata')
const exe = (name) => join(PG_BIN, process.platform === 'win32' ? `${name}.exe` : name)
const log = (msg) => console.log(`[stack] ${msg}`)

if (!POSTGREST_BIN || !existsSync(POSTGREST_BIN)) {
    console.error('Defina POSTGREST_BIN com o caminho do postgrest(.exe) v14.x')
    process.exit(1)
}

function run(cmd, args, opts = {}) {
    const r = spawnSync(cmd, args, { encoding: 'utf8', ...opts })
    if (r.status !== 0) {
        throw new Error(`${cmd} ${args.join(' ')} falhou (${r.status}):\n${r.stdout}\n${r.stderr}`)
    }
    return r.stdout
}

function stopPostgres() {
    if (existsSync(join(PGDATA, 'postmaster.pid'))) {
        spawnSync(exe('pg_ctl'), ['-D', PGDATA, 'stop', '-m', 'fast', '-w'], { stdio: 'ignore' })
    }
}

// ---- 1. Postgres novo -------------------------------------------------------
mkdirSync(STACK_DIR, { recursive: true })
stopPostgres()
rmSync(PGDATA, { recursive: true, force: true })
log(`initdb em ${PGDATA}`)
run(exe('initdb'), ['-D', PGDATA, '-U', 'postgres', '-A', 'trust', '-E', 'UTF8', '--no-locale'])
// stdio 'ignore': no Windows o postgres herda os pipes do pg_ctl e o spawnSync nunca voltaria
run(exe('pg_ctl'), ['-D', PGDATA, '-o', `-p ${PG_PORT} -c listen_addresses=127.0.0.1 -c max_connections=60`,
    '-l', join(STACK_DIR, 'postgres.log'), 'start', '-w'], { stdio: 'ignore' })
run(exe('psql'), ['-h', '127.0.0.1', '-p', String(PG_PORT), '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1',
    '-c', 'create database fifacup'])

// ---- 2. Schema --------------------------------------------------------------
// EXCLUDE_MIGRATIONS=prefixo1,prefixo2: simula o banco de produção antes de aplicar essas migrations
const excluded = (process.env.EXCLUDE_MIGRATIONS ?? '').split(',').map(s => s.trim()).filter(Boolean)
const migrations = readdirSync(join(ROOT, 'supabase/migrations'))
    .filter(f => f.endsWith('.sql') && !excluded.some(prefix => f.startsWith(prefix))).sort()
const files = [
    join(HERE, 'db/00_supabase_shim.sql'),
    join(HERE, 'db/01_schema_fase0.sql'),
    ...migrations.map(f => join(ROOT, 'supabase/migrations', f)),
]
log(`aplicando ${files.length} arquivos SQL (goals.match_id on delete ${GOALS_FK}); migrations: ${migrations.join(', ')}`)
run(exe('psql'), ['-h', '127.0.0.1', '-p', String(PG_PORT), '-U', 'postgres', '-d', 'fifacup', '-q',
    '-v', 'ON_ERROR_STOP=1', '-v', `goals_fk_action=${GOALS_FK}`, ...files.flatMap(f => ['-f', f])])

// ---- 3. PostgREST -----------------------------------------------------------
const confPath = join(STACK_DIR, 'postgrest.conf')
writeFileSync(confPath, [
    `db-uri = "postgres://authenticator:authenticator@127.0.0.1:${PG_PORT}/fifacup"`,
    'db-schemas = "public"',
    'db-anon-role = "anon"',
    `jwt-secret = "${JWT_SECRET}"`,
    'server-host = "127.0.0.1"',
    `server-port = ${REST_PORT}`,
    'db-pool = 20',
    'log-level = "warn"',
].join('\n'))
const rest = spawn(POSTGREST_BIN, [confPath], {
    env: { ...process.env, PATH: `${PG_BIN};${process.env.PATH}` },
    stdio: ['ignore', 'pipe', 'pipe'],
})
rest.stdout.on('data', d => process.stdout.write(`[postgrest] ${d}`))
rest.stderr.on('data', d => process.stdout.write(`[postgrest] ${d}`))
for (let i = 0; i < 100; i++) {
    try { if ((await fetch(`http://127.0.0.1:${REST_PORT}/`)).ok) break } catch { /* subindo */ }
    await new Promise(r => setTimeout(r, 200))
}

// ---- 4. Gateway -------------------------------------------------------------
const pool = new pg.Pool({ host: '127.0.0.1', port: PG_PORT, user: 'postgres', database: 'fifacup', max: 10 })
pool.on('error', () => { /* conexão ociosa caiu (Postgres parando no teardown) */ })
const { server } = createGateway({
    pool,
    siteUrl: SITE_URL,
    // Como em produção (Redirect URLs: <site>/**)
    allowedRedirects: [`${SITE_URL}/`],
    log: (m) => log(m),
})
await new Promise(r => server.listen(GATEWAY_PORT, '127.0.0.1', r))
writeFileSync(join(STACK_DIR, 'stack.json'), JSON.stringify({
    url: LOCAL_URL, anonKey: ANON_KEY, serviceKey: SERVICE_KEY, pgPort: PG_PORT, goalsFk: GOALS_FK,
}, null, 2))
log(`PRONTO em ${LOCAL_URL} (Postgres ${PG_PORT}, PostgREST ${REST_PORT})`)

let stopping = false
async function shutdown() {
    if (stopping) return
    stopping = true
    log('derrubando...')
    server.close()
    await pool.end().catch(() => {})
    rest.kill()
    stopPostgres()
    log('parado')
    process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
process.on('SIGBREAK', shutdown)
// No Windows o Playwright encerra com taskkill (sem sinal): o globalTeardown roda `pg_ctl stop`
setInterval(() => {}, 1 << 30)
