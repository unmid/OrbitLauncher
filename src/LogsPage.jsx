import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from './api.js'
import { AppIcon, IconRefresh, IconSearch } from './icons.jsx'

function parseLine(line, index) {
  try {
    const value = JSON.parse(line)
    if (value && value.message) return { ...value, id: `${value.timestamp}-${index}` }
  } catch {}
  return { id: `raw-${index}`, timestamp: Date.now(), level: 'info', source: 'history', message: line }
}

function parseHistory(raw) {
  return raw.split(/\r?\n/).filter(Boolean).map(parseLine)
}

function timeOf(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '--:--:--' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function LogsPage({ notify }) {
  const [entries, setEntries] = useState([])
  const [query, setQuery] = useState('')
  const [level, setLevel] = useState('all')
  const [loading, setLoading] = useState(true)
  const tailRef = useRef(null)

  const load = async () => {
    setLoading(true)
    try {
      const raw = await api.readLogs()
      setEntries(parseHistory(raw).slice(-900))
    } catch (e) {
      notify?.(`Couldn't read logs: ${String(e)}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let stop = null
    Promise.resolve(api.onLog((entry) => {
      setEntries((current) => [...current, { ...entry, id: `${entry.timestamp}-${Math.random()}` }].slice(-900))
    })).then((unsubscribe) => { stop = unsubscribe })
    return () => { stop?.() }
  }, [])

  useEffect(() => {
    tailRef.current?.scrollIntoView({ block: 'end' })
  }, [entries.length])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return entries.filter((entry) => {
      if (level !== 'all' && entry.level !== level) return false
      return !q || `${entry.source} ${entry.message}`.toLowerCase().includes(q)
    })
  }, [entries, level, query])

  return (
    <div className="page logs-page">
      <div className="content-head">
        <div>
          <h1 className="page-title">Log</h1>
          <p className="page-sub">A live terminal for launcher, Java, Minecraft and download diagnostics.</p>
        </div>
        <div className="head-actions">
          <button className="btn btn-secondary" onClick={load} disabled={loading}><IconRefresh size={16} /> Refresh</button>
        </div>
      </div>

      <section className="log-panel">
        <div className="log-toolbar">
          <div className="search-box log-search"><IconSearch size={15} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter log output…" /></div>
          <div className="segment">
            {['all', 'info', 'error'].map((item) => <button key={item} className={`segment-btn ${level === item ? 'active' : ''}`} onClick={() => setLevel(item)}>{item}</button>)}
          </div>
          <span className="log-count">{visible.length} lines</span>
        </div>
        <div className="terminal" role="log" aria-live="polite">
          {loading && <div className="terminal-empty"><span className="mini-spinner" /> Opening log…</div>}
          {!loading && visible.length === 0 && <div className="terminal-empty"><AppIcon name="process" size={24} /> No matching log entries.</div>}
          {visible.map((entry) => (
            <div key={entry.id} className={`terminal-line terminal-${entry.level}`}>
              <span className="terminal-time">{timeOf(entry.timestamp)}</span>
              <span className="terminal-source">[{entry.source}]</span>
              <span className="terminal-message">{entry.message}</span>
            </div>
          ))}
          <div ref={tailRef} />
        </div>
        <div className="log-footer"><span className="log-live-dot" /> Live · logs are stored locally in the OrbitLauncher data folder</div>
      </section>
    </div>
  )
}
