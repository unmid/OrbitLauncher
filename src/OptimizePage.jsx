import { useEffect, useState } from 'react'
import { api } from './api.js'
import { IconBolt, IconCpu, IconGpu, IconRam, IconCheck, IconSparkle, IconDisk, AppIcon } from './icons.jsx'

const PRESETS = [
  {
    id: 'balanced',
    name: 'Balanced',
    icon: IconSparkle,
    desc: 'Smooth play with good graphics. Sane JVM flags, moderate render distance.',
    tags: ['Stable', 'Pretty', 'Everyday'],
  },
  {
    id: 'performance',
    name: 'Performance',
    icon: (props) => <AppIcon name="boost" {...props} />,
    desc: 'Max FPS. Aggressive GC tuning, lower render distance, fast graphics in options.txt.',
    tags: ['FPS first', 'Low-end friend', 'Competitive'],
  },
]

export default function OptimizePage({ settings, saveSettings, notify }) {
  const [hw, setHw] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [recommended, setRecommended] = useState(null)
  const [advanced, setAdvanced] = useState(false)

  const scan = async () => {
    setScanning(true)
    try {
      const info = await api.hardwareScan()
      setHw(info)
      const rec = await api.recommendedRam(info.ramTotalGb)
      setRecommended(rec)
    } catch (e) {
      notify(String(e), 'error')
    } finally {
      setScanning(false)
    }
  }

  useEffect(() => { scan() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const mode = settings.optimizeMode || 'off'

  const setMode = (m) => {
    saveSettings({ ...settings, optimizeMode: m })
    notify(m === 'off' ? 'Optimization off' : `${m === 'balanced' ? 'Balanced' : 'Performance'} preset saved`)
  }

  const ramGb = settings.ramGb || 4
  const renderDist = settings.optimizeRenderDistance || 10

  return (
    <div className="page">
      <div className="content-head">
        <div>
          <h1 className="page-title">Optimize</h1>
          <p className="page-sub">Tune Minecraft for your PC — one click, applied on every launch.</p>
        </div>
      </div>

      <section className="settings-card">
        <div className="optimize-scan-row">
          <div>
            <div className="settings-card-title"><IconCpu size={16} /> Your hardware</div>
            {hw ? (
              <div className="hw-grid">
                <div className="hw-item"><IconCpu size={16} /><div><div className="hw-label">CPU</div><div className="hw-value">{hw.cpuName} · {hw.cpuCores} cores</div></div></div>
                <div className="hw-item"><IconRam size={16} /><div><div className="hw-label">RAM</div><div className="hw-value">{Number(hw.ramTotalGb).toFixed(0)} GB · recommended {recommended ?? '…'} GB for Minecraft</div></div></div>
                <div className="hw-item"><IconGpu size={16} /><div><div className="hw-label">GPU</div><div className="hw-value">{hw.gpuName}</div></div></div>
              </div>
            ) : (
              <div className="loading-line">{scanning ? <><span className="mini-spinner" /> Scanning your PC…</> : 'Scan failed — try again.'}</div>
            )}
          </div>
          <button className="btn btn-primary optimize-btn" onClick={scan} disabled={scanning}>
            {scanning ? <span className="mini-spinner" /> : <IconBolt size={17} />} {hw ? 'Scan again' : 'Optimize'}
          </button>
        </div>
      </section>

      <div className="preset-grid">
        {PRESETS.map((p) => (
          <button key={p.id} className={`preset-card ${mode === p.id ? 'selected' : ''}`} onClick={() => setMode(mode === p.id ? 'off' : p.id)}>
            <p.icon size={24} />
            <span className="preset-name">{p.name}</span>
            <span className="preset-desc">{p.desc}</span>
            <span className="preset-tags">{p.tags.map((t) => <span key={t} className="tag">{t}</span>)}</span>
            {mode === p.id && <span className="preset-check"><IconCheck size={14} /> Active</span>}
          </button>
        ))}
      </div>

      <section className="settings-card">
        <div className="opt-toggle-row">
          <div>
            <div className="toggle-title">Apply automatically</div>
            <div className="toggle-sub">Re-apply the preset to every Space right before launch.</div>
          </div>
          <button
            className={`switch ${settings.optimizeAuto ? 'on' : ''}`}
            onClick={() => saveSettings({ ...settings, optimizeAuto: !settings.optimizeAuto })}
            role="switch" aria-checked={!!settings.optimizeAuto}
          ><span className="switch-knob" /></button>
        </div>
        <div className="preset-note">
          {mode === 'off'
            ? 'No preset selected — pick Balanced or Performance above.'
            : settings.optimizeAuto
              ? `The ${mode} preset will be applied to options.txt and JVM flags on every launch.`
              : `The ${mode} preset is saved and used on launch (auto re-apply is off).`}
        </div>
      </section>

      <section className="settings-card">
        <button className="adv-toggle" onClick={() => setAdvanced((a) => !a)}>
          <IconDisk size={16} /> Advanced {advanced ? '▴' : '▾'}
        </button>
        {advanced && (
          <div className="adv-body">
            <div className="field">
              <label className="field-label">Memory for Minecraft — {ramGb} GB {recommended ? <span className="field-hint">(recommended for your PC: {recommended} GB)</span> : null}</label>
              <input
                type="range" min="2" max="16" step="1" value={ramGb}
                className="ram-slider"
                onChange={(e) => saveSettings({ ...settings, ramGb: Number(e.target.value) })}
              />
              <div className="ram-marks"><span>2 GB</span><span>16 GB</span></div>
            </div>
            <div className="field">
              <label className="field-label">Render distance — {renderDist} chunks</label>
              <input
                type="range" min="2" max="16" step="1" value={renderDist}
                className="ram-slider"
                onChange={(e) => saveSettings({ ...settings, optimizeRenderDistance: Number(e.target.value) })}
              />
              <div className="ram-marks"><span>2</span><span>16</span></div>
            </div>
            <div className="field">
              <label className="field-label">Extra JVM arguments</label>
              <input
                className="input"
                value={settings.extraJvmArgs || ''}
                placeholder="e.g. -XX:+UseG1GC -Dsun.rmi.dgc.server.gcInterval=2147483646"
                onChange={(e) => saveSettings({ ...settings, extraJvmArgs: e.target.value })}
                spellCheck={false}
              />
              <div className="field-hint">Only touch this if you know what you're doing — bad flags can break the game.</div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
