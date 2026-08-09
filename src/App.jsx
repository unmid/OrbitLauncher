import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import { api, avatarUrl } from './api.js'
import Splash from './Splash.jsx'
import { IconMusic, IconBack, IconPlay, IconUser, AppIcon, SpaceIcon } from './icons.jsx'

// Each page lives in its own chunk; they're all prefetched right after the
// first paint, so switching pages later is instant and seamless.
const HomePage = lazy(() => import('./HomePage.jsx'))
const SpacesPage = lazy(() => import('./SpacesPage.jsx'))
const ServersPage = lazy(() => import('./ServersPage.jsx'))
const ProfilePage = lazy(() => import('./ProfilePage.jsx'))
const OptimizePage = lazy(() => import('./OptimizePage.jsx'))
const SettingsPage = lazy(() => import('./SettingsPage.jsx'))
const NewsPage = lazy(() => import('./NewsPage.jsx'))
const UpdatePage = lazy(() => import('./UpdatePage.jsx'))
const AccountPage = lazy(() => import('./AccountPage.jsx'))
const SpaceWizard = lazy(() => import('./SpaceWizard.jsx'))
const LogsPage = lazy(() => import('./LogsPage.jsx'))

const NAV_ICON = (name) => function NavIcon({ size = 21 }) {
  return <AppIcon name={name} size={size} />
}

const PAGES = [
  { id: 'home', label: 'Home', icon: NAV_ICON('home') },
  { id: 'spaces', label: 'Spaces', icon: NAV_ICON('grid') },
  { id: 'servers', label: 'Servers', icon: NAV_ICON('list') },
  { id: 'profile', label: 'Profile', icon: NAV_ICON('user') },
  { id: 'optimize', label: 'Optimize', icon: NAV_ICON('boost') },
  { id: 'news', label: 'News', icon: NAV_ICON('chat') },
  { id: 'settings', label: 'Settings', icon: NAV_ICON('tune') },
  { id: 'update', label: 'Update', icon: NAV_ICON('update-available') },
  { id: 'account', label: 'Account', icon: NAV_ICON('contacts') },
  { id: 'logs', label: 'Log', icon: NAV_ICON('process') },
]

const MUSIC_FILES = ['Soft Reset.mp3']
const BROWSER_SETTINGS = {
  ramGb: 4, showSnapshots: false, skipIntro: true, closeOnPlay: true,
  extraJvmArgs: '', activeAccountId: null, theme: 'dark', accent: '#f26a3c',
  music: false, animations: true, wallpapers: true, optimizeMode: 'off',
  optimizeAuto: false, optimizeRenderDistance: 10, selectedSpaceId: null,
}
const DESKTOP_RUNTIME = typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__ || window.__TAURI__)

/** Paper confetti burst — call on happy events (game started, space created). */
export function confetti() {
  if (document.documentElement.classList.contains('no-anim')) return
  const cols = ['#f26a3c', '#3ea1d9', '#eeb64d', '#ef8fa5', '#71b06c', '#8d7ae0']
  for (let i = 0; i < 28; i++) {
    const c = document.createElement('div')
    c.className = 'confetti-piece'
    c.style.left = 2 + Math.random() * 96 + 'vw'
    c.style.background = cols[i % cols.length]
    c.style.borderRadius = Math.random() > 0.5 ? '50%' : '3px'
    c.style.animationDuration = 1 + Math.random() * 0.9 + 's'
    c.style.transform = `rotate(${Math.random() * 360}deg)`
    document.body.appendChild(c)
    setTimeout(() => c.remove(), 2000)
  }
}

const PALE_ACCENTS = ['#f26a3c', '#3ea1d9', '#eeb64d', '#ef8fa5', '#71b06c', '#8d7ae0', '#e0503a', '#4fc4b5']

export default function App() {
  const [ready, setReady] = useState(false)
  const [showSplash, setShowSplash] = useState(false)
  const [settings, setSettings] = useState(null)
  const [spaces, setSpaces] = useState([])
  const [accounts, setAccounts] = useState([])
  const [page, setPage] = useState('home')
  const [prevPage, setPrevPage] = useState(null)
  const [progress, setProgress] = useState({})
  const [wizardState, setWizardState] = useState(null)
  const [toasts, setToasts] = useState([])
  const toastId = useRef(0)
  const musicRef = useRef(null)
  const speedRef = useRef({})

  const notify = useCallback((message, kind = 'ok') => {
    const id = ++toastId.current
    setToasts((t) => [...t, { id, message: String(message).slice(0, 220), kind }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200)
  }, [])

  const refreshSpaces = useCallback(async () => {
    try { setSpaces(await api.listSpaces()) } catch (e) { console.error(e) }
  }, [])

  const refreshAccounts = useCallback(async () => {
    try { setAccounts(await api.listAccounts()) } catch (e) { console.error(e) }
  }, [])

  const refreshSettings = useCallback(async () => {
    try { setSettings(await api.getSettings()) } catch (e) { console.error(e) }
  }, [])

  const navigate = useCallback((to) => {
    setPage((cur) => {
      if (cur !== to) setPrevPage(cur)
      return to
    })
  }, [])

  const goBack = useCallback(() => {
    setPage(prevPage || 'home')
    setPrevPage(null)
  }, [prevPage])

  // ---- initial load ------------------------------------------------------
  useEffect(() => {
    ;(async () => {
      try {
        const s = await api.getSettings()
        setSettings(s)
        setShowSplash(!s.skipIntro)
        await Promise.all([refreshSpaces(), refreshAccounts()])
      } catch (e) {
        // The Vite preview has no Tauri bridge. Keep it useful for visual QA
        // and web previews without changing the desktop default behaviour.
        setSettings(BROWSER_SETTINGS)
        setShowSplash(false)
        if (DESKTOP_RUNTIME) notify('Something went wrong starting up: ' + e, 'error')
      } finally {
        setReady(true)
      }
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Prefetch every page chunk as soon as the shell is ready. Each page still
  // lives in its own module, but navigation no longer flashes a loading view.
  useEffect(() => {
    if (!ready) return
    const warm = () => {
      import('./HomePage.jsx')
      import('./SpacesPage.jsx')
      import('./ServersPage.jsx')
      import('./ProfilePage.jsx')
      import('./OptimizePage.jsx')
      import('./SettingsPage.jsx')
      import('./NewsPage.jsx')
      import('./UpdatePage.jsx')
      import('./AccountPage.jsx')
      import('./SpaceWizard.jsx')
      import('./ModsBrowser.jsx')
      import('./LogsPage.jsx')
    }
    warm()
  }, [ready])

  // ---- theming -----------------------------------------------------------
  useEffect(() => {
    if (!settings) return
    const accent = settings.accent || '#f26a3c'
    if (!PALE_ACCENTS.includes(accent)) {
      // migrate v2 accents to the paper palette (closest by hue distance in hex)
      const migrated = migrateAccent(accent)
      document.documentElement.style.setProperty('--accent', migrated.hex)
      document.documentElement.style.setProperty('--accent-ink', migrated.ink)
    } else {
      document.documentElement.style.setProperty('--accent', accent)
      document.documentElement.style.setProperty('--accent-ink', accentInk(accent))
    }
    document.documentElement.classList.toggle('no-anim', settings.animations === false)
    document.body.classList.toggle('wallpapers-off', settings.wallpapers === false)
    document.body.dataset.theme = settings.theme === 'light' ? 'light' : 'dark'
  }, [settings?.accent, settings?.animations, settings?.wallpapers, settings?.theme, settings])

  // ---- music ---------------------------------------------------------------
  useEffect(() => {
    if (!settings) return
    if (settings.music === false || showSplash) {
      stopMusic()
      return
    }
    startMusic()
    return stopMusic
  }, [settings?.music, showSplash]) // eslint-disable-line react-hooks/exhaustive-deps

  function startMusic() {
    if (musicRef.current) return
    const file = MUSIC_FILES[Math.floor(Math.random() * MUSIC_FILES.length)]
    const audio = new Audio(`./musics/${encodeURIComponent(file)}`)
    audio.loop = true
    audio.volume = 0
    audio.play().catch(() => {})
    fade(audio, 0.35, 1200)
    musicRef.current = audio
  }
  function stopMusic() {
    const a = musicRef.current
    if (!a) return
    musicRef.current = null
    fade(a, 0, 600, () => { a.pause(); a.src = '' })
  }
  function duckMusic() {
    if (musicRef.current) fade(musicRef.current, 0, 500)
  }
  function unduckMusic() {
    if (musicRef.current && settings?.music !== false) fade(musicRef.current, 0.35, 1000)
  }
  function fade(a, target, ms, done) {
    const start = a.volume
    const t0 = performance.now()
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / ms)
      a.volume = Math.max(0, Math.min(1, start + (target - start) * k))
      if (k < 1) requestAnimationFrame(tick)
      else done?.()
    }
    requestAnimationFrame(tick)
  }
  const musicCtl = useRef({ duck: duckMusic, unduck: unduckMusic })
  musicCtl.current = { duck: duckMusic, unduck: unduckMusic }

  // ---- launch progress -----------------------------------------------------
  useEffect(() => {
    let unlisten = null
    Promise.resolve(api.onProgress((p) => {
      // live download metrics: bytes/sec + seconds remaining
      if (p.stage === 'files' && p.total > 0) {
        const now = performance.now()
        const last = speedRef.current[p.spaceId]
        if (last && now - last.t > 250) {
          const bps = Math.max(0, (p.done - last.done) / ((now - last.t) / 1000))
          p = { ...p, speedBps: bps, etaSec: bps > 0 ? (p.total - p.done) / bps : null }
        } else if (last?.speedBps != null) {
          p = { ...p, speedBps: last.speedBps, etaSec: last.etaSec }
        }
        speedRef.current[p.spaceId] = { t: now, done: p.done, speedBps: p.speedBps, etaSec: p.etaSec }
      }
      if (p.stage === 'log') return
      setProgress((prev) => {
        const next = { ...prev }
        if (p.stage === 'running') {
          // Keep a short success state so people see that Minecraft really started.
          next[p.spaceId] = p
          delete speedRef.current[p.spaceId]
          setTimeout(() => {
            setProgress((cur) => {
              if (cur[p.spaceId]?.stage !== 'running') return cur
              const copy = { ...cur }
              delete copy[p.spaceId]
              return copy
            })
          }, 1800)
          return next
        }
        next[p.spaceId] = p
        if (p.stage === 'error' || p.stage === 'stopped') {
          delete speedRef.current[p.spaceId]
          setTimeout(() => {
            setProgress((cur) => {
              if (cur[p.spaceId]?.stage === p.stage) {
                const copy = { ...cur }
                delete copy[p.spaceId]
                return copy
              }
              return cur
            })
          }, p.stage === 'error' ? 5000 : 1200)
        }
        return next
      })
      if (p.stage === 'error') notify(p.message, 'error')
      if (p.stage === 'running') {
        notify('Game started — good luck!', 'ok')
        confetti()
        musicCtl.current.duck()
        refreshSpaces()
        if (settings?.closeOnPlay !== false) {
          import('@tauri-apps/api/window').then(({ getCurrentWindow }) => getCurrentWindow().hide()).catch(() => {})
        }
      }
      if (p.stage === 'stopped') {
        musicCtl.current.unduck()
        refreshSpaces()
        import('@tauri-apps/api/window').then(({ getCurrentWindow }) => getCurrentWindow().show().then(() => getCurrentWindow().setFocus())).catch(() => {})
      }
    })).then((u) => { unlisten = u }).catch(() => {})
    return () => { if (unlisten) unlisten() }
  }, [notify, refreshSpaces, settings?.closeOnPlay])

  // validate the active microsoft account once
  useEffect(() => {
    const active = accounts.find((a) => a.id === settings?.activeAccountId)
    if (active && active.kind === 'microsoft') {
      api.validateAccount(active.id).then((st) => {
        if (!st.ok) notify('Sign-in check: ' + st.message, 'error')
      }).catch(() => {})
    }
  }, [accounts, settings?.activeAccountId, notify])

  const activeAccount = accounts.find((a) => a.id === settings?.activeAccountId) || accounts[0]
  const selectedSpace = spaces.find((s) => s.id === settings?.selectedSpaceId) || spaces[0] || null
  const play = async (space, server = null) => {
    if (!activeAccount) {
      setPage('account')
      notify('Add an account first — it takes 10 seconds!', 'error')
      return
    }
    setProgress((prev) => ({
      ...prev,
      [space.id]: { spaceId: space.id, stage: 'launching', message: 'Warming up…', done: 0, total: 0 },
    }))
    try {
      await api.launchSpace(space.id, server)
    } catch (e) {
      setProgress((prev) => {
        const copy = { ...prev }
        delete copy[space.id]
        return copy
      })
      notify(String(e), 'error')
    }
  }

  const saveSettings = async (s) => {
    setSettings(s)
    try { await api.saveSettings(s) } catch (e) { notify(String(e), 'error') }
  }

  const toggleTheme = () => {
    saveSettings({ ...settings, theme: settings.theme === 'light' ? 'dark' : 'light' })
  }
  const toggleMusic = () => {
    saveSettings({ ...settings, music: settings.music === false ? true : false })
  }

  const selectSpace = async (id) => {
    const s = { ...settings, selectedSpaceId: id }
    saveSettings(s)
  }

  if (!ready) return <div className="boot" />
  if (showSplash) return <Splash onDone={() => setShowSplash(false)} />

  const pageProps = {
    settings, spaces, accounts, activeAccount, progress,
    play, notify, refreshSpaces, refreshAccounts, refreshSettings,
    saveSettings, navigate, openWizard: setWizardState, selectSpace,
  }

  return (
    <div className="app">
      <aside className="sidenav">
        <div className="sidenav-brand" onClick={() => navigate('home')} title="Orbit Launcher (beta)">
          <span className="brand-badge"><img src="./icons/logo.png" width="26" height="26" alt="Orbit" draggable={false} /></span>
          <span className="brand-word">Orbit Launcher (beta)</span>
        </div>
        <nav className="sidenav-nav">
          {PAGES.map((pg) => (
            <button
              key={pg.id}
              className={`nav-item ${page === pg.id ? 'active' : ''}`}
              onClick={() => navigate(pg.id)}
              title={pg.label}
            >
              <pg.icon size={21} />
              <span>{pg.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidenav-foot">
          <div className="sidenav-quick-actions">
            <button className="sidenav-action" onClick={toggleTheme} title={settings.theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
              <AppIcon name="theme" size={20} />
              <span>{settings.theme === 'light' ? 'Dark mode' : 'Light mode'}</span>
            </button>
            <button className={`sidenav-action ${settings.music === false ? '' : 'selected'}`} onClick={toggleMusic} title="Background music">
              <IconMusic size={18} />
              <span>Music</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="main-col">
        <header className="topstrip" data-tauri-drag-region>
          {prevPage && page !== 'home' ? (
            <button className="btn btn-small btn-ghost back-btn" onClick={goBack}>
              <IconBack size={15} /> Back
            </button>
          ) : <span className="topstrip-drag-space" />}
          <span className="topstrip-spacer" />
          <button className="account-chip" onClick={() => navigate('account')} title="Switch account">
            {activeAccount ? (
              <>
                <img src={avatarUrl(activeAccount.username, 40)} alt="" draggable={false} />
                <span>{activeAccount.username}</span>
              </>
            ) : (
              <>
                <IconUser size={17} />
                <span>Add account</span>
              </>
            )}
          </button>
        </header>

        <main className="page-wrap">
          <Suspense fallback={<div className="page-loading"><span className="mini-spinner" /></div>}>
            {page === 'home' && <HomePage {...pageProps} selectedSpace={selectedSpace} />}
            {page === 'spaces' && <SpacesPage {...pageProps} />}
            {page === 'servers' && <ServersPage {...pageProps} />}
            {page === 'profile' && <ProfilePage {...pageProps} />}
            {page === 'optimize' && <OptimizePage {...pageProps} />}
            {page === 'settings' && <SettingsPage {...pageProps} />}
            {page === 'news' && <NewsPage {...pageProps} />}
            {page === 'update' && <UpdatePage {...pageProps} />}
            {page === 'account' && <AccountPage {...pageProps} />}
            {page === 'logs' && <LogsPage {...pageProps} />}
          </Suspense>
        </main>

        {page === 'home' && <BottomBar spaces={spaces} selected={selectedSpace} onSelect={selectSpace} onPlay={() => selectedSpace && play(selectedSpace)} progress={selectedSpace ? progress[selectedSpace.id] : null} />}
      </div>

      {wizardState && (
        <Suspense fallback={null}>
          <SpaceWizard
            existing={wizardState === 'new' ? null : wizardState}
            settings={settings}
            onClose={() => setWizardState(null)}
            onSaved={refreshSpaces}
            notify={notify}
          />
        </Suspense>
      )}

      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`}>{t.message}</div>
        ))}
      </div>
    </div>
  )
}

function accentInk(hex) {
  // dark ink on light colors, white on dark ones
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.62 ? '#2b2320' : '#ffffff'
}

function migrateAccent(old) {
  const table = {
    '#5ac8fa': '#3ea1d9', '#7d7aff': '#8d7ae0', '#ff6482': '#ef8fa5', '#30d158': '#71b06c',
    '#ffd60a': '#eeb64d', '#ff9f0a': '#f26a3c', '#bf5af2': '#8d7ae0', '#64d2ff': '#3ea1d9',
  }
  const hex = table[old] || '#f26a3c'
  return { hex, ink: accentInk(hex) }
}

function BottomBar({ spaces, selected, onSelect, onPlay, progress }) {
  const [open, setOpen] = useState(false)
  const busy = progress && ['loader', 'version', 'files', 'java', 'launching'].includes(progress.stage)
  const started = progress?.stage === 'running'
  const showProgress = busy || started
  const pct = progress && progress.total ? Math.min(100, Math.round((progress.done / progress.total) * 100)) : null

  return (
    <footer className="bottombar">
      <div className={`space-dropup ${open ? 'open' : ''}`}>
        {open && (
          <div className="space-dropup-list">
            {spaces.length === 0 && <div className="dropup-empty">No Spaces yet — create one first</div>}
            {spaces.map((s) => (
              <button key={s.id} className={`dropup-item ${selected?.id === s.id ? 'active' : ''}`} onClick={() => { onSelect(s.id); setOpen(false) }}>
                <span className="dropup-icon" style={{ background: s.color }}><SpaceIcon name={s.icon} size={18} /></span>
                <span className="dropup-name">{s.name}</span>
                <span className="dropup-meta">{s.mcVersion}</span>
              </button>
            ))}
          </div>
        )}
        <button className="dropup-current" onClick={() => setOpen((o) => !o)}>
          {selected ? (
            <>
              <span className="dropup-icon" style={{ background: selected.color }}><SpaceIcon name={selected.icon} size={20} /></span>
              <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
                <span className="dropup-name">{selected.name}</span>
                <span className="dropup-meta">{selected.mcVersion} · {selected.loader}</span>
              </span>
            </>
          ) : (
            <span className="dropup-meta">No Space selected</span>
          )}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={`dropup-arrow ${open ? 'up' : ''}`}><path d="m6 15 6-6 6 6" /></svg>
        </button>
      </div>

      <button className={`mega-play ${showProgress ? 'mega-play-busy' : ''} ${started ? 'mega-play-success' : ''}`} disabled={!selected || busy || started} onClick={onPlay}>
        {showProgress ? (
          <div className="mega-play-loading" role="status" aria-live="polite">
            <div className="mega-play-row">
              <span className="mega-play-stage">{stageText(progress)}</span>
              {pct != null && <span className="mega-play-pct">{pct}%</span>}
            </div>
            <div className="mega-play-bar">
              <div className="mega-play-bar-fill" style={started ? { width: '100%' } : (pct != null ? { width: pct + '%' } : undefined)} data-ind={started || pct != null ? '0' : '1'} />
            </div>
            <span className="mega-play-sub">{progressDetail(progress)}</span>
          </div>
        ) : (
          <>
            <IconPlay size={26} />
            <span>PLAY</span>
          </>
        )}
      </button>
    </footer>
  )
}

function fmtMb(bytes) {
  return (bytes / 1048576).toFixed(bytes > 104857600 ? 0 : 1)
}

function fmtEta(sec) {
  if (sec == null) return ''
  if (sec < 2) return 'almost done'
  if (sec < 90) return `~${Math.ceil(sec)}s left`
  return `~${Math.ceil(sec / 60)}min left`
}

export function progressDetail(p) {
  if (!p) return ''
  if (p.stage === 'running') return 'Minecraft is open and ready to play'
  if (p.stage === 'files' && p.total > 0) {
    let s = `${fmtMb(p.done)} / ${fmtMb(p.total)} MB`
    if (p.speedBps) s += `  ·  ${fmtMb(p.speedBps)} MB/s`
    if (p.etaSec != null && p.stage === 'files') s += `  ·  ${fmtEta(p.etaSec)}`
    return s
  }
  return p.message || ''
}

function stageText(p) {
  if (!p) return 'Preparing…'
  switch (p.stage) {
    case 'loader': return 'Setting up the game…'
    case 'java': return 'Getting Java ready…'
    case 'launching': return 'Launching Minecraft…'
    case 'version': return 'Reading version info…'
    case 'files': return 'Downloading game files'
    case 'running': return 'Minecraft started'
    default: return p.message || 'Working…'
  }
}
