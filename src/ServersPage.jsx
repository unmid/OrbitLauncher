import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from './api.js'
import { IconPlayers, IconSignal, IconServer, IconRefresh, IconCopy, IconCheck, IconBolt } from './icons.jsx'

const pingKey = (s) => `${s.ip}:${s.port || 25565}`
const serverAddress = (s) => s.ip + ((s.port && s.port !== 25565) ? `:${s.port}` : '')
const SERVERS_CACHE_KEY = 'orbit.servers.v1'
// The Orbit news page doubles as a live, animated backdrop for this screen.
// Offline or unreachable? The wallpaper slides in instead, so it's never blank.
const BACKDROP_URL = 'https://unmid.github.io/OL-updater/ol.html'

function readCache() {
  try {
    const raw = JSON.parse(localStorage.getItem(SERVERS_CACHE_KEY) || '[]')
    return Array.isArray(raw) ? raw : []
  } catch { return [] }
}

function ServersBackdrop({ enabled }) {
  const [failed, setFailed] = useState(false)
  if (!enabled || failed) {
    return (
      <div className="servers-bg" aria-hidden="true">
        <div className="servers-bg-fallback" style={{ backgroundImage: 'url(./wallpapers/w2.png)' }} />
        <div className="servers-bg-scrim" />
      </div>
    )
  }
  return (
    <div className="servers-bg" aria-hidden="true">
      <iframe src={BACKDROP_URL} title="" tabIndex={-1} onError={() => setFailed(true)} />
      <div className="servers-bg-scrim" />
    </div>
  )
}

export default function ServersPage({ notify }) {
  const [servers, setServers] = useState(null) // null = loading
  const [pings, setPings] = useState({})
  const [offline, setOffline] = useState(false)
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
    let list = null
    try {
      list = await api.getServerList()
    } catch { list = null }
    const cached = readCache()
    if (!navigator.onLine) {
      // Offline: show the last saved copy so the page stays useful offline.
      setOffline(true)
      setServers(cached)
      return
    }
    setOffline(false)
    setServers(list || [])
    if (list?.length) {
      pingAll(list)
      try { localStorage.setItem(SERVERS_CACHE_KEY, JSON.stringify(list)) } catch {}
    } else if (cached.length) {
      // The fetch failed silently (Tauri returns [] on network errors) —
      // fall back to the saved list instead of an empty page.
      setServers(cached)
      setOffline(true)
    }
  }, [pingAll])

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
    <div className="page-full">
      <ServersBackdrop enabled={navigator.onLine} />
      <div className="page-inner servers-content">
        <div className="content-head">
          <div>
            <h1 className="page-title">Servers</h1>
            <p className="page-sub">Hand-picked worlds to explore — copy an address and paste it into Minecraft.</p>
          </div>
          <div className="head-actions">
            <button className="btn btn-secondary" onClick={load} disabled={servers === null}>
              <IconRefresh size={15} /> Refresh
            </button>
          </div>
        </div>

        {servers === null && (
          <div className="server-list" aria-busy="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="server-row">
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

        {servers !== null && offline && servers.length > 0 && (
          <div className="offline-note">
            <IconSignal size={14} />
            You're offline — showing your saved servers. Copying addresses still works; live pings are paused.
          </div>
        )}

        {servers !== null && servers.length === 0 && (
          <div className="mods-empty">
            <div className="mods-empty-icon"><IconServer size={32} /></div>
            <div>{offline ? "You're offline and there's no saved server list yet" : 'No servers right now'}</div>
            <div className="mods-empty-sub">{offline ? 'Connect to the internet once — the list is then saved on this PC for offline use.' : 'The list lives online — check your connection and hit Refresh.'}</div>
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
                        {offline ? (
                          <span className="server-ping off"><IconSignal size={12} /> offline</span>
                        ) : ping ? (
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
                      {copied === pingKey(s) ? <><IconCheck size={14} /> Copied</> : <><IconCopy size={14} /> Copy</>}
                    </button>
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
