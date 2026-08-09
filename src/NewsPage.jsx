import { useCallback, useEffect, useState } from 'react'
import { api } from './api.js'
import { IconNews, IconRefresh, IconExternal, IconX } from './icons.jsx'

function excerpt(text, words = 50) {
  const parts = (text || '').split(/\s+/).filter(Boolean)
  return parts.length > words ? parts.slice(0, words).join(' ') + '…' : text
}

function fmtDate(d) {
  const t = new Date(d)
  return Number.isNaN(t.getTime()) ? d : t.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function NewsPage({ notify }) {
  const [news, setNews] = useState(null)
  const [reading, setReading] = useState(null) // {item, body, loading}

  const load = useCallback(async () => {
    setNews(null)
    try {
      setNews(await api.fetchNews())
    } catch (e) {
      setNews([])
      notify(String(e), 'error')
    }
  }, [notify])

  useEffect(() => { load() }, [load])

  const openReader = async (item) => {
    setReading({ item, body: '', loading: true })
    try {
      const body = await api.fetchArticle(item.link)
      setReading({ item, body, loading: false })
    } catch (e) {
      setReading({ item, body: '', loading: false })
      notify(String(e), 'error')
    }
  }

  return (
    <div className="page">
      <div className="content-head">
        <div>
          <h1 className="page-title">News</h1>
          <p className="page-sub">What's new in Minecraft, straight from Mojang.</p>
        </div>
        <div className="head-actions">
          <button className="btn btn-secondary" onClick={load} disabled={news === null}>
            <IconRefresh size={16} /> Refresh
          </button>
        </div>
      </div>

      {news === null && (
        <div className="news-grid" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="news-card news-card-skeleton">
              <div className="news-img skeleton" />
              <div className="news-body">
                <div className="skeleton skeleton-line" style={{ width: '80%' }} />
                <div className="skeleton skeleton-line" style={{ width: '40%' }} />
                <div className="skeleton skeleton-line" style={{ width: '94%' }} />
                <div className="skeleton skeleton-line" style={{ width: '88%' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {news !== null && news.length === 0 && (
        <div className="mods-empty">
          <div className="mods-empty-icon"><IconNews size={34} /></div>
          <div>No news right now</div>
          <div className="mods-empty-sub">Check your connection and try again.</div>
        </div>
      )}

      <div className="news-grid">
        {(news || []).map((n) => (
          <button key={n.id} className="news-card" onClick={() => openReader(n)}>
            {n.image && <div className="news-img" style={{ backgroundImage: `url(${n.image})` }} />}
            <div className="news-body">
              <div className="news-title">{n.title}</div>
              <div className="news-meta">{n.category}{n.date ? ` · ${fmtDate(n.date)}` : ''}</div>
              {n.text && <div className="news-text">{excerpt(n.text)}</div>}
            </div>
          </button>
        ))}
      </div>

      {reading && (
        <div className="confirm-pop" onClick={() => setReading(null)}>
          <div className="confirm-card sheet-card reader-card" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head">
              <div className="confirm-title">{reading.item.title}</div>
              <button className="icon-btn" onClick={() => setReading(null)}><IconX size={17} /></button>
            </div>
            <div className="news-meta reader-meta">{reading.item.category}{reading.item.date ? ` · ${fmtDate(reading.item.date)}` : ''}</div>
            <div className="reader-body">
              {reading.loading ? (
                <div className="loading-line"><span className="mini-spinner" /> Opening the article…</div>
              ) : reading.body ? (
                reading.body.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)
              ) : (
                <p>Couldn't load the article text — open it in your browser instead.</p>
              )}
            </div>
            <div className="confirm-actions">
              <button className="btn" onClick={() => setReading(null)}>Close</button>
              <button className="btn btn-primary" onClick={() => api.openUrl(reading.item.link)}>
                <IconExternal size={15} /> Open in browser
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
