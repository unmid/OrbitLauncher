import { useCallback, useEffect, useRef, useState } from 'react'
import { api, fmtBytes } from './api.js'
import { IconUpdate, IconCheck, IconExternal, AppIcon } from './icons.jsx'

export default function UpdatePage({ notify }) {
  const [info, setInfo] = useState(null)
  const [checking, setChecking] = useState(true)
  const [downloading, setDownloading] = useState(null) // {done,total} | null
  const unlisten = useRef(null)

  const check = useCallback(async () => {
    setChecking(true)
    try {
      setInfo(await api.checkUpdate())
    } catch (e) {
      setInfo({ error: String(e) })
    } finally {
      setChecking(false)
    }
  }, [])

  useEffect(() => {
    check()
    api.onUpdateProgress((p) => setDownloading({ done: p.done || 0, total: p.total || 0 }))
      .then((u) => { unlisten.current = u })
    return () => { if (unlisten.current) unlisten.current() }
  }, [check])

  const runUpdate = async () => {
    if (!info?.assetUrl) return
    setDownloading({ done: 0, total: 0 })
    try {
      await api.downloadUpdate(info.assetUrl)
      // the app exits on its own once the installer opens
    } catch (e) {
      setDownloading(null)
      notify(String(e), 'error')
    }
  }

  const pct = downloading?.total ? Math.min(100, Math.round((downloading.done / downloading.total) * 100)) : null

  return (
    <div className="page">
      <div className="content-head">
        <div>
          <h1 className="page-title">Update</h1>
          <p className="page-sub">Keep Orbit fresh — updates come from the official GitHub releases.</p>
        </div>
        <div className="head-actions">
          <button className="btn btn-secondary" onClick={check} disabled={checking || !!downloading}>
            <IconUpdate size={16} /> Check again
          </button>
        </div>
      </div>

      <section className="settings-card update-card">
        {checking ? (
          <div className="loading-line"><span className="mini-spinner" /> Checking GitHub releases…</div>
        ) : info?.error ? (
          <>
            <div className="update-title">Couldn't check for updates</div>
            <div className="toggle-sub">{info.error}</div>
            <div className="confirm-actions update-actions">
              <button className="btn btn-primary" onClick={check}>Try again</button>
              <button className="btn btn-secondary" onClick={() => api.openUrl('https://github.com/unmid/Orbit-Launcher/releases')}>
                <IconExternal size={15} /> Releases page
              </button>
            </div>
          </>
        ) : info?.available ? (
          <>
            <div className="update-version-row">
              <div className="version-pill current">v{info.current}</div>
              <span className="update-arrow">→</span>
              <div className="version-pill latest">v{info.latest}</div>
            </div>
            {info.notes && <div className="update-notes">{info.notes.slice(0, 600)}</div>}
            {downloading ? (
              <div className="update-progress-wrap">
                <div className="mega-play-bar update-bar">
                  <div className="mega-play-bar-fill" style={pct != null ? { width: pct + '%' } : undefined} data-ind={pct == null ? '1' : '0'} />
                </div>
                <div className="update-progress-text">
                  {pct != null
                    ? `Downloading update — ${fmtBytes(downloading.done)} / ${fmtBytes(downloading.total)} (${pct}%)`
                    : 'Downloading update…'}
                </div>
                <div className="toggle-sub">Orbit closes and the installer opens by itself when the download finishes.</div>
              </div>
            ) : info.assetUrl ? (
              <div className="confirm-actions update-actions">
                <button className="btn btn-primary btn-big" onClick={runUpdate}>
                  <AppIcon name="download" size={18} active={!!downloading} /> Update to v{info.latest}
                </button>
              </div>
            ) : (
              <div className="confirm-actions update-actions">
                <button className="btn btn-primary" onClick={() => api.openUrl(info.url)}>
                  <IconExternal size={15} /> Download v{info.latest} from GitHub
                </button>
              </div>
            )}
          </>
        ) : info ? (
          <div className="update-good">
            <span className="update-good-icon"><IconCheck size={26} /></span>
            <div>
              <div className="update-title">You're on the latest version — v{info.current}</div>
              <div className="toggle-sub">We'll tell you here the moment a new release drops on GitHub.</div>
            </div>
          </div>
        ) : null}
      </section>

      <section className="settings-card">
        <div className="settings-card-title">
          <img src="./icons/logo.png" width="22" height="22" alt="" draggable={false} style={{ borderRadius: 5 }} /> About Orbit Launcher
        </div>
        <div className="toggle-sub">Orbit Launcher (beta) · built for fast, one-click modded Minecraft.</div>
        <div className="confirm-actions update-actions">
          <button className="btn btn-secondary" onClick={() => api.openUrl('https://github.com/unmid/Orbit-Launcher')}>
            <IconExternal size={15} /> Source code
          </button>
          <button className="btn btn-secondary" onClick={() => api.openUrl('https://discord.gg/Z7QfWSPJmJ')}>
            <IconExternal size={15} /> Discord
          </button>
        </div>
      </section>
    </div>
  )
}
