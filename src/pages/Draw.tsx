import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { drawGroups, drawDuos, generateGroupMatches, generateLeagueMatches } from '../lib/draw'
import type { Profile, Duo } from '../types'

const GROUP_NAMES = ['Grupo A', 'Grupo B', 'Grupo C', 'Grupo D']

export default function Draw() {
  const { profile } = useAuth()
  const [tab, setTab] = useState<'1v1' | '2v2'>('1v1')
  const [players, setPlayers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  // 1v1
  const [groups, setGroups] = useState<Profile[][]>([])
  const [groupsSaved, setGroupsSaved] = useState(false)

  // 2v2
  const [duos, setDuos] = useState<[Profile, Profile][]>([])
  const [manualDuos, setManualDuos] = useState<[string, string][]>([])
  const [duoMode, setDuoMode] = useState<'random' | 'manual'>('random')
  const [duosSaved, setDuosSaved] = useState(false)

  useEffect(() => {
    async function fetchPlayers() {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'player')
        .order('name')
      setPlayers(data ?? [])
      setLoading(false)
    }
    fetchPlayers()
    checkExisting()
  }, [])

  async function checkExisting() {
    const { data: g } = await supabase.from('groups').select('id')
    if (g && g.length > 0) setGroupsSaved(true)
    const { data: d } = await supabase.from('duos').select('id')
    if (d && d.length > 0) setDuosSaved(true)
  }

  // ── 1v1 ──────────────────────────────────────────

  function handleDrawGroups() {
    setMessage('')
    setGroups(drawGroups(players, 4))
  }

  async function handleSaveGroups() {
    if (groups.length === 0) return
    setSaving(true)
    setMessage('')

    // Limpa dados anteriores
    await supabase.from('matches').delete().eq('mode', '1v1')
    await supabase.from('group_members').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('groups').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    for (let i = 0; i < groups.length; i++) {
      // Cria grupo
      const { data: group } = await supabase
        .from('groups')
        .insert({ name: GROUP_NAMES[i] })
        .select()
        .single()

      if (!group) continue

      // Adiciona membros
      await supabase.from('group_members').insert(
        groups[i].map(p => ({ group_id: group.id, player_id: p.id }))
      )

      // Gera partidas do grupo
      const matches = generateGroupMatches(i, groups[i])
      await supabase.from('matches').insert(
        matches.map((m, idx) => ({
          mode: '1v1',
          stage: 'groups',
          home_id: m.home_id,
          away_id: m.away_id,
          match_order: i * 10 + idx,
        }))
      )
    }

    setGroupsSaved(true)
    setMessage('Grupos salvos com sucesso!')
    setSaving(false)
  }

  // ── 2v2 ──────────────────────────────────────────

  function handleDrawDuos() {
    setMessage('')
    setDuos(drawDuos(players))
  }

  function handleManualDuoChange(index: number, position: 0 | 1, playerId: string) {
    const updated = [...manualDuos]
    if (!updated[index]) updated[index] = ['', '']
    updated[index][position] = playerId
    setManualDuos(updated)
  }

  function addManualDuo() {
    setManualDuos([...manualDuos, ['', '']])
  }

  function removeManualDuo(index: number) {
    setManualDuos(manualDuos.filter((_, i) => i !== index))
  }

  async function handleSaveDuos() {
    setSaving(true)
    setMessage('')

    // Limpa dados anteriores
    await supabase.from('matches').delete().eq('mode', '2v2')
    await supabase.from('duos').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    let savedDuos: Duo[] = []

    if (duoMode === 'random') {
      const { data } = await supabase
        .from('duos')
        .insert(duos.map(([p1, p2]) => ({ player1_id: p1.id, player2_id: p2.id })))
        .select()
      savedDuos = data ?? []
    } else {
      const valid = manualDuos.filter(([a, b]) => a && b && a !== b)
      const { data } = await supabase
        .from('duos')
        .insert(valid.map(([a, b]) => ({ player1_id: a, player2_id: b })))
        .select()
      savedDuos = data ?? []
    }

    // Gera partidas da liga
    const matches = generateLeagueMatches(savedDuos)
    await supabase.from('matches').insert(
      matches.map((m, idx) => ({
        mode: '2v2',
        stage: 'league',
        home_id: m.home_id,
        away_id: m.away_id,
        match_order: idx,
      }))
    )

    setDuosSaved(true)
    setMessage('Duplas salvas com sucesso!')
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white">Carregando...</p>
      </div>
    )
  }

  const isAdmin = profile?.role === 'admin'

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto">

        <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--color-gold)' }}>
          Sorteio
        </h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['1v1', '2v2'] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setMessage('') }}
              className="px-6 py-2 rounded-lg font-bold transition"
              style={tab === t
                ? { backgroundColor: 'var(--color-gold)', color: 'var(--color-green)' }
                : { backgroundColor: 'rgba(255,255,255,0.1)', color: 'white' }
              }
            >
              {t}
            </button>
          ))}
        </div>

        {/* ── 1v1 ── */}
        {tab === '1v1' && (
          <div>
            {groupsSaved && (
              <div className="mb-4 px-4 py-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm">
                ⚠️ Grupos já foram salvos. Sortear novamente irá apagar os resultados anteriores.
              </div>
            )}

            {isAdmin && (
              <button
                onClick={handleDrawGroups}
                className="w-full py-3 rounded-lg font-bold text-white mb-6 transition hover:opacity-90"
                style={{ backgroundColor: 'var(--color-gold)', color: 'var(--color-green)' }}
              >
                🎲 Sortear grupos
              </button>
            )}

            {groups.length > 0 && (
              <div className="flex flex-col gap-4 mb-6">
                {groups.map((group, i) => (
                  <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <h2 className="font-bold mb-3" style={{ color: 'var(--color-gold)' }}>
                      {GROUP_NAMES[i]}
                    </h2>
                    {group.map(player => (
                      <div key={player.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                        <div
                          className="w-8 h-8 rounded-full overflow-hidden bg-white/10 flex-shrink-0 flex items-center justify-center text-sm font-bold"
                          style={{ borderColor: 'var(--color-gold)' }}
                        >
                          {player.avatar_url
                            ? <img src={player.avatar_url} alt="" className="w-full h-full object-cover" />
                            : <span className="text-white/40">{player.name?.charAt(0)}</span>
                          }
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">{player.name}</p>
                          {player.team_name && (
                            <p className="text-white/40 text-xs">{player.team_name}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}

                {isAdmin && (
                  <button
                    onClick={handleSaveGroups}
                    disabled={saving}
                    className="w-full py-3 rounded-lg font-bold text-white border border-white/30 hover:bg-white/10 transition"
                  >
                    {saving ? 'Salvando...' : '✅ Confirmar e salvar grupos'}
                  </button>
                )}
              </div>
            )}

            {groups.length === 0 && !isAdmin && (
              <p className="text-white/40 text-center mt-12">O sorteio ainda não foi realizado.</p>
            )}
          </div>
        )}

        {/* ── 2v2 ── */}
        {tab === '2v2' && (
          <div>
            {duosSaved && (
              <div className="mb-4 px-4 py-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm">
                ⚠️ Duplas já foram salvas. Alterar irá apagar os resultados anteriores.
              </div>
            )}

            {isAdmin && (
              <>
                {/* Modo */}
                <div className="flex gap-2 mb-4">
                  {(['random', 'manual'] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => setDuoMode(m)}
                      className="px-4 py-2 rounded-lg text-sm font-medium transition"
                      style={duoMode === m
                        ? { backgroundColor: 'var(--color-gold)', color: 'var(--color-green)' }
                        : { backgroundColor: 'rgba(255,255,255,0.1)', color: 'white' }
                      }
                    >
                      {m === 'random' ? '🎲 Aleatório' : '✋ Manual'}
                    </button>
                  ))}
                </div>

                {duoMode === 'random' && (
                  <button
                    onClick={handleDrawDuos}
                    className="w-full py-3 rounded-lg font-bold mb-4 transition hover:opacity-90"
                    style={{ backgroundColor: 'var(--color-gold)', color: 'var(--color-green)' }}
                  >
                    🎲 Sortear duplas
                  </button>
                )}

                {duoMode === 'manual' && (
                  <div className="flex flex-col gap-3 mb-4">
                    {manualDuos.map((duo, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <select
                          value={duo[0]}
                          onChange={e => handleManualDuoChange(i, 0, e.target.value)}
                          className="flex-1 px-3 py-2 rounded-lg bg-white/10 text-white border border-white/20 text-sm"
                        >
                          <option value="">Jogador 1</option>
                          {players.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                        <span className="text-white/40">+</span>
                        <select
                          value={duo[1]}
                          onChange={e => handleManualDuoChange(i, 1, e.target.value)}
                          className="flex-1 px-3 py-2 rounded-lg bg-white/10 text-white border border-white/20 text-sm"
                        >
                          <option value="">Jogador 2</option>
                          {players.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => removeManualDuo(i)}
                          className="text-red-400 hover:text-red-300 px-2"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={addManualDuo}
                      className="text-sm text-white/50 hover:text-white transition py-2"
                    >
                      + Adicionar dupla
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Preview duplas aleatórias */}
            {duoMode === 'random' && duos.length > 0 && (
              <div className="flex flex-col gap-3 mb-4">
                {duos.map(([p1, p2], i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-white/30 text-sm w-5">{i + 1}</span>
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">{p1.name}</p>
                    </div>
                    <span style={{ color: 'var(--color-gold)' }} className="font-bold">+</span>
                    <div className="flex-1 text-right">
                      <p className="text-white text-sm font-medium">{p2.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {isAdmin && (duos.length > 0 || manualDuos.some(([a, b]) => a && b)) && (
              <button
                onClick={handleSaveDuos}
                disabled={saving}
                className="w-full py-3 rounded-lg font-bold text-white border border-white/30 hover:bg-white/10 transition"
              >
                {saving ? 'Salvando...' : '✅ Confirmar e salvar duplas'}
              </button>
            )}

            {!isAdmin && !duosSaved && (
              <p className="text-white/40 text-center mt-12">As duplas ainda não foram definidas.</p>
            )}
          </div>
        )}

        {message && (
          <p className={`mt-4 text-sm text-center ${message.includes('Erro') ? 'text-red-400' : 'text-green-400'}`}>
            {message}
          </p>
        )}

      </div>
    </div>
  )
}
