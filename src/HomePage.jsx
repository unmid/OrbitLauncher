import { useEffect, useRef, useState } from 'react'
import { api } from './api.js'
import { IconNews, IconShield, IconGlobe, AppIcon } from './icons.jsx'

const HOME_URL = 'https://unmid.github.io/OL-updater/ol.html'
const DISCORD_URL = 'https://discord.gg/Z7QfWSPJmJ'
const RELEASENOTES_URL = 'https://github.com/unmid/Orbit-Launcher/releases'
const WALLPAPERS = ['./wallpapers/w1.png', './wallpapers/w2.png', './wallpapers/w3.png', './wallpapers/w4.png']

/**
 * Home hero: embeds the published marketing page (https://unmid.github.io/OL-updater/ol.html)
 * as a live iframe. Offline -> calm wallpaper slideshow so the hero is never blank.
 *
 * Cache handling: GitHub Pages serves ol.html with HTTP caching, so the iframe src gets a
 * unique `?v=` timestamp on every mount (and when the window regains focus) — the webview
 * can never serve a stale copy of the page.
 *
 * The embedded page can drive the app through postMessage:
 *   { type: 'orbit-open', url }          -> open a URL in the system browser
 *   { type: 'orbit-update', url, version } -> run the real in-app updater for the installer
 */
export default function HomePage({ notify }) {
  const [online, setOnline] = useState(navigator.onLine)
  const [index, setIndex] = useState(0)
  const [homeSrc, setHomeSrc] = useState(() => `${HOME_URL}?v=${Date.now()}`)
  const [updating, setUpdating] = useState(null) // {version, done, total} | null
  const unlisten = useRef(null)
  const updatingRef = useRef(null)

  useEffect(() => {
    const up = () => { setOnline(true); setHomeSrc(`${HOME_URL}?v=${Date.now()}`) }
    const down = () => setOnline(false)
    const focus = () => setOnline(navigator.onLine)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    window.addEventListener('focus', focus)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
      window.removeEventListener('focus', focus)
    }
  }, [])

  // Re-bust the cache every 8 minutes while the page stays open, so an ol.html
  // edit on GitHub shows up on the Home tab without leaving it.
  useEffect(() => {
    const t = setInterval(() => setHomeSrc(`${HOME_URL}?v=${Date.now()}`), 8 * 60 * 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (online) return
    const t = setInterval(() => setIndex((i) => (i + 1) % WALLPAPERS.length), 7000)
    return () => clearInterval(t)
  }, [online])

  // messages sent by the embedded ol.html (update slide, external links)
  useEffect(() => {
    const onMsg = (e) => {
      const d = e.data
      if (!d || typeof d !== 'object' || !d.type) return
      if (d.type === 'orbit-open' && d.url) {
        api.openUrl(String(d.url)).catch(() => window.open(String(d.url), '_blank'))
      } else if (d.type === 'orbit-update' && d.url) {
        runUpdate(String(d.url), d.version || '')
      }
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!updating) return
    let mounted = true
    Promise.resolve(api.onUpdateProgress((p) => {
      if (!mounted) return
      setUpdating({ ...updatingRef.current, done: p.done || 0, total: p.total || 0 })
    })).then((u) => { unlisten.current = u }).catch(() => {})
    return () => { mounted = false; if (unlisten.current) unlisten.current() }
  }, [updating && !updating.done && !updating.total])

  const runUpdate = async (url, version) => {
    if (updatingRef.current) return
    const st = { version, done: 0, total: 0 }
    updatingRef.current = st
    setUpdating(st)
    try {
      await api.downloadUpdate(url)
      // the app exits by itself once the installer opens
    } catch (e) {
      updatingRef.current = null
      setUpdating(null)
      notify(String(e), 'error')
    }
  }

  const pct = updating?.total ? Math.min(100, Math.round((updating.done / updating.total) * 100)) : null

  return (
    <div className="page page-home">
      <section className="hero">
        <div className="hero-body">
          {online ? (
            <iframe
              className="hero-frame hero-frame-live"
              src={homeSrc}
              title="Orbit Launcher"
              allow="fullscreen"
            />
          ) : (
            WALLPAPERS.map((src, i) => (
              <div
                key={src}
                className={`hero-slide ${i === index ? 'on' : ''}`}
                style={{ backgroundImage: `url(${src})` }}
              />
            ))
          )}

          {updating && (
            <div className="hero-update-overlay">
              <div className="hero-update-card">
                <div className="hero-update-title">
                  <AppIcon name="download" size={16} active />
                  {updating.version ? `Downloading Orbit ${updating.version}…` : 'Downloading update…'}
                </div>
                <div className="mega-play-bar update-bar">
                  <div
                    className="mega-play-bar-fill"
                    style={pct != null ? { width: pct + '%' } : undefined}
                    data-ind={pct == null ? '1' : '0'}
                  />
                </div>
                <div className="hero-update-sub">
                  {pct != null ? `${pct}% — Orbit closes and the installer opens when done.` : 'Starting the download…'}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="home-quick">
        <button className="quick-link" onClick={() => api.openUrl(DISCORD_URL)} title="Community, support and sneak peeks">
          <img src="./icons/loader/discord.png" width="20" height="20" alt="" draggable={false} />
          <span>Discord</span>
        </button>
        <button className="quick-link" onClick={() => api.openUrl(RELEASENOTES_URL)} title="What's new in Orbit Launcher">
          <IconNews size={17} />
          <span>Changelog</span>
        </button>
        <button className="quick-link" onClick={() => api.openUrl('https://www.minecraft.net')} title="Official site, marketplace &amp; realms">
          <IconGlobe size={17} />
          <span>Minecraft.net</span>
        </button>
        <span className="home-privacy">
          <IconShield size={14} />
          Everything stays on this PC
        </span>
      </section>
    </div>
  )
}