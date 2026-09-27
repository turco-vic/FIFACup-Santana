import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// src/lib/supabase.ts lança erro se faltarem estas variáveis. No build o Vite as troca por
// constantes: sem elas, o `throw` vira incondicional e o minificador descarta o app inteiro
// (o bundle "encolhe" para ~230 kB e o site abre direto no erro). Melhor falhar o build.
const REQUIRED_ENV = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']

export default defineConfig(({ command, mode }) => {
  if (command === 'build') {
    const env = loadEnv(mode, process.cwd(), 'VITE_')
    const missing = REQUIRED_ENV.filter(key => !env[key])
    if (missing.length > 0) {
      throw new Error(`Build sem ${missing.join(', ')}. Configure no .env (local) ou nas variáveis de ambiente do deploy.`)
    }
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
  }
})
