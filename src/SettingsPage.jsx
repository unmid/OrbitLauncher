import { useEffect, useState } from 'react'
import { api, fmtBytes } from './api.js'
import { IconBrush, IconMusic, IconSparkle, IconLayers, IconGear, IconPlay, IconTrash, IconDisk, IconShield, IconX, IconSun, IconMoon } from './icons.jsx'

const ACCENTS = ['#f26a3c', '#3ea1d9', '#eeb64d', '#ef8fa5', '#71b06c', '#8d7ae0', '#e0503a', '#4fc4b5']

function ThemeSwitch({ settings, set }) {
  const theme = settings.theme === 'light' ? 'light' : 'dark'
  return (
    <div className="segment theme-segment">
      <button className={`segment-btn theme-btn ${theme === 'light' ? 'active' : ''}`} onClick={() => set({ theme: 'light' })}>
        <IconSun size={15} /> Light
      </button>
      <button className={`segment-btn theme-btn ${theme === 'dark' ? 'active' : ''}`} onClick={() => set({ theme: 'dark' })}>
        <IconMoon size={15} /> Dark
      </button>
    </div>
  )
}

function Toggle({ title, sub, value, onChange, icon: Icon }) {
  return (
    <div className="opt-toggle-row">
      <div className="toggle-left">
        {Icon && <Icon size={16} />}
        <div>
          <div className="toggle-title">{title}</div>
          {sub && <div className="toggle-sub">{sub}</div>}
        </div>
      </div>
      <button className={`switch ${value ? 'on' : ''}`} onClick={() => onChange(!value)} role="switch" aria-checked={!!value}>
        <span className="switch-knob" />
      </button>
    </div>
  )
}

export default function SettingsPage({ settings, saveSettings, notify }) {
  const [storageOpen, setStorageOpen] = useState(false)
  const [storage, setStorage] = useState(null)
  const [cleaning, setCleaning] = useState(false)
  const [dataDir, setDataDir] = useState('')

  const set = (patch) => saveSettings({ ...settings, ...patch })

  useEffect(() => {
    api.appDataDir().then(setDataDir).catch(() => {})
  }, [])

  const openStorage = async () => {
    setStorageOpen(true)
    setStorage(null)
    try {
      setStorage(await api.storageBreakdown())
    } catch (e) {
      notify(String(e), 'error')
    }
  }

  const cleanJunk = async () => {
    setCleaning(true)
    try {
      const freed = await api.cleanStorageJunk()
      notify(freed > 0 ? `Cleaned ${fmtBytes(freed)} of junk` : 'Nothing to clean')
      setStorage(await api.storageBreakdown())
    } catch (e) {
      notify(String(e), 'error')
    } finally {
      setCleaning(false)
    }
  }

  const totalBytes = storage?.reduce((a, b) => a + b.bytes, 0) || 0
  const junkBytes = storage?.filter((i) => i.junk).reduce((a, b) => a + b.bytes, 0) || 0

  return (
    <div className="page">
      <div className="content-head">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-sub">Make Orbit yours.</p>
        </div>
      </div>

      <section className="settings-card">
        <div className="settings-card-title"><IconBrush size={16} /> Look &amp; feel</div>
        <div className="field">
          <label className="field-label">Theme</label>
          <ThemeSwitch settings={settings} set={set} />
        </div>
        <div className="field">
          <label className="field-label">Accent color</label>
          <div className="color-row">
            {ACCENTS.map((c) => (
              <button key={c} className={`color-dot ${settings.accent === c ? 'selected' : ''}`} style={{ background: c }} onClick={() => set({ accent: c })} title={c} />
            ))}
          </div>
        </div>
        <Toggle title="Background music" sub="Soft tunes while you browse (stops in game)" value={settings.music !== false} onChange={(v) => set({ music: v })} icon={IconMusic} />
        <Toggle title="Animations" sub="Turn off for a plain, instant UI" value={settings.animations !== false} onChange={(v) => set({ animations: v })} icon={IconSparkle} />
        <Toggle title="Wallpapers" sub="Slow slideshow behind everything" value={settings.wallpapers !== false} onChange={(v) => set({ wallpapers: v })} icon={IconLayers} />
      </section>

      <section className="settings-card">
        <div className="settings-card-title"><IconGear size={16} /> Behavior</div>
        <Toggle title="Skip intro" sub="Go straight to the launcher on start" value={!!settings.skipIntro} onChange={(v) => set({ skipIntro: v })} icon={IconPlay} />
        <Toggle title="Hide launcher while playing" sub="Orbit minimizes when the game starts, comes back when you quit" value={settings.closeOnPlay !== false} onChange={(v) => set({ closeOnPlay: v })} icon={IconPlay} />
        <Toggle title="Show snapshots" sub="List experimental Minecraft versions in the Space wizard" value={!!settings.showSnapshots} onChange={(v) => set({ showSnapshots: v })} icon={IconSparkle} />
      </section>

      <section className="settings-card">
        <div className="settings-card-title"><IconDisk size={16} /> Storage</div>
        <div className="opt-toggle-row">
          <div>
            <div className="toggle-title">Game data</div>
            <div className="toggle-sub data-dir">{dataDir || '…'}</div>
          </div>
          <button className="btn btn-secondary" onClick={openStorage}><IconTrash size={15} /> Clear storage</button>
        </div>
        <div className="security-note">
          <IconShield size={14} />
          <span>Everything Orbit stores lives on your PC only. Cleaning never touches your worlds, mods, accounts or game files — only caches, temp downloads and logs.</span>
        </div>
      </section>

      {storageOpen && (
        <div className="confirm-pop" onClick={() => setStorageOpen(false)}>
          <div className="confirm-card sheet-card storage-card" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head">
              <div className="confirm-title">Storage</div>
              <button className="icon-btn" onClick={() => setStorageOpen(false)}><IconX size={17} /></button>
            </div>
            {!storage ? (
              <div className="loading-line"><span className="mini-spinner" /> Counting bytes…</div>
            ) : (
              <>
                <div className="storage-total">{fmtBytes(totalBytes)} total · {fmtBytes(junkBytes)} safe to clean</div>
                <div className="storage-list">
                  {storage.map((i) => (
                    <div key={i.id} className="storage-row">
                      <div className="storage-label">
                        <span className="storage-name">{i.label}</span>
                        {i.hint && <span className="storage-hint">{i.hint}</span>}
                      </div>
                      {i.junk && <span className="junk-badge">junk</span>}
                      <span className="storage-bytes">{fmtBytes(i.bytes)}</span>
                    </div>
                  ))}
                </div>
                <div className="confirm-actions">
                  <button className="btn" onClick={() => setStorageOpen(false)}>Close</button>
                  <button className="btn btn-primary" onClick={cleanJunk} disabled={cleaning || junkBytes === 0}>
                    {cleaning ? <span className="mini-spinner" /> : <IconTrash size={15} />} Clean junk ({fmtBytes(junkBytes)})
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
