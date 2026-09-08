import { useEffect, useMemo, useState } from 'react'
import { api, openFileDialog } from './api.js'
import {
  IconRocket, IconPlay, IconGlobe, IconShield, IconClock, IconBolt, IconLayers,
  AppIcon, SpaceIcon, LOADER_META, LoaderMark, IconNews, IconDiscord,
} from './icons.jsx'
import { progressDetail, stageText } from './App.jsx'

const DISCORD_URL = 'https://discord.gg/Z7QfWSPJmJ'
const RELEASENOTES_URL = 'https://github.com/unmid/Orbit-Launcher/releases'
const WALLPAPERS = ['./wallpapers/w1.png', './wallpapers/w2.png', './wallpapers/w3.png', './wallpapers/w4.png']
const WALLPAPER_INTERVAL = 32000
const BUSY_STAGES = ['loader', 'version', 'files', 'java', 'launching']

function greeting() {
  const h = new Date().getHours()
  if (h < 5) return 'Up late?'
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

/* Slow-crossfading wallpaper slideshow. Off entirely when the user disables
   wallpapers — the page then sits on the plain app background. */
function HomeBackground({ enabled }) {
  const [index, setIndex] = useState(0)
  useEffect(() => {
    if (!enabled) return
    const t = setInterval(() => setIndex((i) => (i + 1) % WALLPAPERS.length), WALLPAPER_INTERVAL)
    return () => clearInterval(t)
  }, [enabled])
  if (!enabled) return null
  return (
    <div className="home-bg" aria-hidden="true">
      {WALLPAPERS.map((src, i) => (
        <div key={src} className={`home-bg-img ${i === index ? 'show' : ''}`} style={{ backgroundImage: `url(${src})` }} />
      ))}
      <div className="home-bg-scrim" />
    </div>
  )
}

export default function HomePage({ settings, spaces, selectedSpace, activeAccount, selectSpace, play, progress, openWizard, refreshSpaces, notify, navigate }) {
  const [update, setUpdate] = useState(null)
  const [packBusy, setPackBusy] = useState(false)

  // One quiet update probe; failures are invisible here on purpose.
  useEffect(() => {
    let alive = true
    api.checkUpdate()
      .then((info) => { if (alive && info?.available) setUpdate(info) })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  const importModpack = async () => {
    try {
      const path = await openFileDialog({
        title: 'Install a modpack',
        filters: [{ name: 'Modpack', extensions: ['mrpack', 'zip'] }],
        multiple: false,
      })
      if (!path) return
      setPackBusy(true)
      const space = await api.importModpackFile(path)
      notify(`"${space.name}" (Minecraft ${space.mcVersion}) is being set up — watch its card fill up`)
      refreshSpaces()
    } catch (e) {
      notify(String(e), 'error')
    } finally {
      setPackBusy(false)
    }
  }

  const recent = useMemo(() => spaces
    .slice()
    .sort((a, b) => (b.lastPlayed || b.createdAt || 0) - (a.lastPlayed || a.createdAt || 0))
    .slice(0, 4), [spaces])

  const heroProgress = selectedSpace ? progress[selectedSpace.id] : null
  const busy = heroProgress && BUSY_STAGES.includes(heroProgress.stage)
  const started = heroProgress?.stage === 'running'
  const pct = heroProgress && heroProgress.total ? Math.min(100, Math.round((heroProgress.done / heroProgress.total) * 100)) : null

  const loaderMeta = selectedSpace ? (LOADER_META[selectedSpace.loader] || LOADER_META.vanilla) : null
  const HeroMark = selectedSpace ? (LoaderMark[selectedSpace.loader] || LoaderMark.vanilla) : null
  const counts = useMemo(() => {
    const c = { mod: 0, resourcepack: 0, shader: 0 }
    for (const m of selectedSpace?.mods || []) c[m.kind] = (c[m.kind] || 0) + 1
    return c
  }, [selectedSpace])

  return (
    <div className="page-full">
      <HomeBackground enabled={settings?.wallpapers !== false} />
      <div className="page-inner home-content">
        <div className="home-greet">
          <div className="home-greet-kicker">{greeting()}{activeAccount ? `, ${activeAccount.username}` : ''}</div>
          <h1 className="home-greet-title">Ready when you are.</h1>
          <p className="home-greet-sub">
            {spaces.length === 0
              ? 'A Space keeps one Minecraft version, its loader and its mods together — neatly isolated from everything else.'
              : `${spaces.length} Space${spaces.length > 1 ? 's' : ''} on this PC · everything is stored locally and stays yours.`}
          </p>
        </div>

        <div className="home-grid">
          <section className="home-hero">
            <div className="hero-card" style={{ '--space-color': selectedSpace?.color || 'var(--accent)' }}>
              <div className="hero-card-glow" />
              {selectedSpace ? (
                <>
                  <div className="hero-space-row">
                    <span className="hero-space-icon"><SpaceIcon name={selectedSpace.icon} size={38} /></span>
                    <div style={{ minWidth: 0 }}>
                      <div className="hero-space-name">{selectedSpace.name}</div>
                      <div className="hero-space-meta">
                        <span className="tag tag-loader"><HeroMark size={12} /> {loaderMeta.label}{selectedSpace.loaderVersion ? ` ${selectedSpace.loaderVersion}` : ''}</span>
                        <span className="tag">{selectedSpace.mcVersion}</span>
                        {counts.mod > 0 && <span className="tag">{counts.mod} mod{counts.mod > 1 ? 's' : ''}</span>}
                        {counts.resourcepack > 0 && <span className="tag">{counts.resourcepack} pack{counts.resourcepack > 1 ? 's' : ''}</span>}
                        {counts.shader > 0 && <span className="tag">{counts.shader} shader{counts.shader > 1 ? 's' : ''}</span>}
                      </div>
                    </div>
                    {spaces.length > 1 && (
                      <button className="btn btn-secondary btn-small hero-space-switch" onClick={() => navigate('library')}>
                        <IconLayers size={14} /> Switch
                      </button>
                    )}
                  </div>

                  <button
                    className={`hero-play ${started ? 'hero-play-success' : ''}`}
                    disabled={busy || started}
                    onClick={() => play(selectedSpace)}
                  >
                    {busy || started ? (
                      <div className="hero-progress" role="status" aria-live="polite">
                        <div className="hero-progress-row">
                          <span>{stageText(heroProgress)}</span>
                          {pct != null && <span className="hero-progress-pct">{pct}%</span>}
                        </div>
                        <div className="hero-progress-bar">
                          <div className="hero-progress-fill" style={started ? { width: '100%' } : (pct != null ? { width: pct + '%' } : undefined)} data-ind={started || pct != null ? '0' : '1'} />
                        </div>
                        <div className="hero-progress-sub">{progressDetail(heroProgress)}</div>
                      </div>
                    ) : (
                      <><IconPlay size={22} /><span>PLAY</span></>
                    )}
                  </button>
                </>
              ) : (
                <div className="hero-empty">
                  <div className="hero-empty-icon"><IconRocket size={34} /></div>
                  <h2>Set up your first Space</h2>
                  <p>Pick a Minecraft version, choose a loader if you want mods, and press Play. It takes about a minute.</p>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button className="btn btn-primary btn-big" onClick={() => openWizard('new')}>
                      <IconRocket size={17} /> New Space
                    </button>
                    <button className="btn btn-secondary btn-big" onClick={importModpack} disabled={packBusy}>
                      {packBusy ? <span className="mini-spinner" /> : <AppIcon name="download" size={17} />} From modpack…
                    </button>
                  </div>
                </div>
              )}
            </div>

            {update && (
              <div className="update-banner" role="status">
                <AppIcon name="update-available" size={18} />
                <span>Orbit v{update.latest} is out — you're on v{update.current}</span>
                <button className="btn btn-primary btn-small" onClick={() => navigate('settings:updates')}>
                  Review update
                </button>
              </div>
            )}
          </section>

          <div className="home-side">
            {recent.length > 0 && (
              <section>
                <h2 className="home-section-title">
                  <IconClock size={15} /> Jump back in
                  {spaces.length > 4 && (
                    <button className="home-section-link" onClick={() => navigate('library')}>All Spaces →</button>
                  )}
                </h2>
                <div className="recent-list">
                  {recent.map((space) => {
                    const tileBusy = progress[space.id] && BUSY_STAGES.includes(progress[space.id].stage)
                    const Mark = LoaderMark[space.loader] || LoaderMark.vanilla
                    return (
                      <div
                        key={space.id}
                        className={`recent-tile ${selectedSpace?.id === space.id ? 'active' : ''}`}
                        onClick={() => selectSpace(space.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter') selectSpace(space.id) }}
                      >
                        <span className="recent-icon" style={{ background: space.color }}><SpaceIcon name={space.icon} size={24} /></span>
                        <span style={{ minWidth: 0 }}>
                          <span className="recent-tile-name">{space.name}</span>
                          <span className="recent-tile-meta" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <Mark size={11} /> {space.mcVersion} · {LOADER_META[space.loader]?.label || space.loader}
                          </span>
                        </span>
                        <button
                          className="recent-play"
                          disabled={tileBusy}
                          title={`Play ${space.name}`}
                          onClick={(e) => { e.stopPropagation(); selectSpace(space.id); play(space) }}
                        >
                          <IconPlay size={14} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            <section>
              <h2 className="home-section-title"><IconBolt size={15} /> Quick actions</h2>
              <div className="quick-grid">
                <button className="quick-tile" onClick={() => openWizard('new')}>
                  <span className="quick-tile-ic"><IconRocket size={16} /></span>
                  New Space
                </button>
                <button className="quick-tile" onClick={importModpack} disabled={packBusy}>
                  <span className="quick-tile-ic"><AppIcon name="download" size={16} active={packBusy} /></span>
                  Install modpack
                </button>
                <button className="quick-tile" onClick={() => navigate('servers')}>
                  <span className="quick-tile-ic"><IconGlobe size={15} /></span>
                  Browse servers
                </button>
                <button className="quick-tile" onClick={() => navigate('settings')}>
                  <span className="quick-tile-ic"><AppIcon name="tune" size={16} /></span>
                  Customize Orbit
                </button>
              </div>
            </section>

            <section>
              <h2 className="home-section-title"><IconGlobe size={15} /> Around Orbit</h2>
              <div className="quick-grid">
                <button className="quick-tile" onClick={() => api.openUrl(DISCORD_URL)} title="Community, support and sneak peeks">
                  <span className="quick-tile-ic"><IconDiscord size={15} /></span>
                  Discord
                </button>
                <button className="quick-tile" onClick={() => api.openUrl(RELEASENOTES_URL)} title="What's new in Orbit Launcher">
                  <span className="quick-tile-ic"><IconNews size={15} /></span>
                  Changelog
                </button>
              </div>
              <div style={{ marginTop: 12 }}>
                <span className="home-privacy">
                  <IconShield size={13} />
                  Everything stays on this PC — no tracking, no accounts with us.
                </span>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
