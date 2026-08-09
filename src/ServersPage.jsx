import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from './api.js'
import { IconPlayers, IconSignal, IconServer, IconRefresh, IconCopy, IconCheck, IconBolt } from './icons.jsx'

const pingKey = (s) => `${s.ip}:${s.port || 25565}`
const serverAddress = (s) => s.ip + ((s.port && s.port !== 25565) ? `:${s.port}` : '')

export default function ServersPage({ notify }) {
  const [servers, setServers] = useState(null) // null = loading
  const [pings, setPings] = useState({})
  const [copied, setCopied] = useState(null) // pingKey of the row just copied

  const pingAll = useCallback((list) => {
    for (const s of list) {
      api.pingServer(s.ip, s.port || 25565)
        .then((r) => setPings((p) => ({ ...p, [pingKey(s)]: r })))
        .catch(() => setPings((p) => ({ ...p, [pingKey(s)]: { online: false, pingMs: 0, playersOnline: 0, playersMax: 0, motd: '', icon: '', version: '' } })))
    }
  }, [])

  const load = useCallback(async () => {
    setServers(null)
    setPings({})
    try {
      const list = await api.getServerList()
      setServers(list || [])
      if (list?.length) pingAll(list)
    } catch (e) {
      setServers([])
      notify(String(e), 'error')
    }
  }, [pingAll, notify])

  useEffect(() => { load() }, [load])

  // group by category, sponsored first inside each group
  const groups = useMemo(() => {
    if (!servers) return []
    const map = new Map()
    for (const s of servers) {
      const cat = s.category?.trim() || 'Servers'
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat).push(s)
    }
    return [...map.entries()].map(([category, items]) => ({
      category,
      items: items.slice().sort((a, b) => (b.sponsored ? 1 : 0) - (a.sponsored ? 1 : 0)),
    }))
  }, [servers])

  const copyAddress = async (s) => {
    const address = serverAddress(s)
    let ok = false
    try {
      await navigator.clipboard.writeText(address)
      ok = true
    } catch {
      // clipboard API can be unavailable; fall back to a manual selection box
      try {
        const ta = document.createElement('textarea')
        ta.value = address
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        ok = document.execCommand('copy')
        ta.remove()
      } catch { ok = false }
    }
    if (ok) {
      setCopied(pingKey(s))
      notify(`Copied "${address}" — paste it in Minecraft: Multiplayer → Add Server`)
      setTimeout(() => setCopied((c) => (c === pingKey(s) ? null : c)), 2200)
    } else {
      notify(`Couldn't copy automatically — the address is: ${address}`, 'error')
    }
  }

  return (
    <div className="page">
      <div className="content-head">
        <div>
          <h1 className="page-title">Servers</h1>
          <p className="page-sub">Hand-picked worlds to explore — copy an address and paste it in Minecraft.</p>
        </div>
        <div className="head-actions">
          <button className="btn btn-secondary" onClick={load} disabled={servers === null}>
            <IconRefresh size={16} /> Refresh
          </button>
        </div>
      </div>

      {servers === null && (
        <div className="server-list" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="server-row server-row-skeleton">
              <div className="server-icon skeleton" />
              <div className="server-main">
                <div className="skeleton skeleton-line" style={{ width: '34%' }} />
                <div className="skeleton skeleton-line" style={{ width: '64%' }} />
                <div className="skeleton skeleton-line" style={{ width: '22%' }} />
              </div>
              <div className="skeleton skeleton-btn" />
            </div>
          ))}
        </div>
      )}

      {servers !== null && servers.length === 0 && (
        <div className="mods-empty">
          <div className="mods-empty-icon"><IconServer size={34} /></div>
          <div>No servers right now</div>
          <div className="mods-empty-sub">The list lives online — check your connection and hit Refresh.</div>
        </div>
      )}

      {groups.map((g) => (
        <section key={g.category} className="server-group">
          <h2 className="server-group-title">{g.category}</h2>
          <div className="server-list">
            {g.items.map((s) => {
              const ping = pings[pingKey(s)]
              const icon = s.icon || ping?.icon || ''
              const motd = s.motd || ping?.motd || ''
              return (
                <div key={pingKey(s)} className={`server-row ${s.sponsored ? 'server-row-sponsored' : ''}`}>
                  <div className="server-icon">
                    {icon ? <img src={icon} alt="" draggable={false} /> : <IconServer size={26} />}
                  </div>
                  <div className="server-main">
                    <div className="server-name">
                      {s.name}
                      {s.sponsored && <span className="sponsored-badge"><IconBolt size={11} /> Sponsored</span>}
                    </div>
                    {motd && <div className="server-motd">{motd}</div>}
                    <div className="server-meta">
                      <span className="server-ip">{serverAddress(s)}</span>
                      {ping ? (
                        ping.online ? (
                          <>
                            <span className="server-players"><IconPlayers size={12} /> {ping.playersOnline}/{ping.playersMax}</span>
                            <span className={`server-ping ${ping.pingMs < 80 ? 'good' : ping.pingMs < 160 ? 'ok' : 'bad'}`}>
                              <IconSignal size={12} /> {ping.pingMs} ms
                            </span>
                            {ping.version && <span className="server-version">{ping.version}</span>}
                          </>
                        ) : (
                          <span className="server-ping off"><IconSignal size={12} /> offline</span>
                        )
                      ) : (
                        <span className="server-ping checking"><span className="mini-spinner" /> pinging…</span>
                      )}
                    </div>
                  </div>
                  <button
                    className={`btn ${copied === pingKey(s) ? 'btn-primary' : 'btn-secondary'} copy-btn`}
                    onClick={() => copyAddress(s)}
                    title="Copy the address — paste it in Minecraft: Multiplayer → Add Server"
                  >
                    {copied === pingKey(s) ? <><IconCheck size={15} /> Copied</> : <><IconCopy size={15} /> Copy</>}
                  </button>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
