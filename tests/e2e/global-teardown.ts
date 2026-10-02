import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// No Windows o Playwright mata o stack com taskkill (sem sinal), e o Postgres iniciado pelo
// pg_ctl continuaria rodando. Para aqui. (Com reuseExistingServer o stack é de quem o subiu.)
export default function globalTeardown() {
    if (process.env.KEEP_STACK) return
    const pgBin = process.env.PG_BIN ?? 'C:\\Program Files\\PostgreSQL\\16\\bin'
    const pgdata = join(process.env.STACK_DIR ?? join(tmpdir(), 'fifacup-local-stack'), 'pgdata')
    if (existsSync(join(pgdata, 'postmaster.pid'))) {
        spawnSync(join(pgBin, 'pg_ctl.exe'), ['-D', pgdata, 'stop', '-m', 'fast', '-w'], { stdio: 'ignore' })
    }
}
