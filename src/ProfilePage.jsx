import { useCallback, useEffect, useRef, useState } from 'react'
import * as skinview3d from 'skinview3d'
import { api, openFileDialog, avatarUrl } from './api.js'
import { IconUser, IconCape, IconRefresh, IconMicrosoft, AppIcon } from './icons.jsx'

/**
 * Renders the cape FRONT side only, cropped straight from the real texture
 * (the 10x16 "outside" face at x1..11, y0..16 in the 64x32 cape layout —
 * works for any texture resolution). The back side and the elytra half of
 * the atlas are never shown, so every card looks like one clean cape front.
 */
function CapePreview({ url }) {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas || !url) return
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const sx = img.naturalWidth / 64
      const sy = img.naturalHeight / 32
      const S = 8
      canvas.width = 10 * S
      canvas.height = 16 * S
      const ctx = canvas.getContext('2d')
      ctx.imageSmoothingEnabled = false
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 1 * sx, 0, 10 * sx, 16 * sy, 0, 0, 10 * S, 16 * S)
    }
    img.src = url
    return () => { img.onload = null }
  }, [url])
  return (
    <span className="cape-preview-frame">
      <canvas ref={ref} className="cape-canvas" alt="" />
    </span>
  )
}

export default function ProfilePage({ activeAccount, navigate, notify }) {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const viewerRef = useRef(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [variant, setVariant] = useState('classic')

  const isMs = activeAccount?.kind === 'microsoft'

  // --- 3D viewer -------------------------------------------------------------
  useEffect(() => {
    if (!isMs || !canvasRef.current || !wrapRef.current) return
    const wrap = wrapRef.current
    const w = Math.min(300, wrap.clientWidth - 24) || 276
    const viewer = new skinview3d.SkinViewer({
      canvas: canvasRef.current,
      width: w,
      height: Math.round(w * 1.4),
      preserveDrawingBuffer: true,
    })
    // The FXAA pass smears alpha edges into dark outlines on the light UI
    // (shows up as a "black line" around the model). Pixel-crisp is what we
    // want for Minecraft anyway.
    if (viewer.fxaaPass) viewer.fxaaPass.enabled = false
    viewer.renderer.setClearColor(0x000000, 0)
    viewer.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    viewer.fov = 38
    viewer.zoom = 0.72 // frame the full model head-to-toe, cape included
    viewer.autoRotate = true
    viewer.autoRotateSpeed = 0.45
    viewer.controls.enableZoom = false
    viewer.controls.enablePan = false
    const walk = new skinview3d.WalkingAnimation()
    walk.speed = 0.55
    viewer.animation = walk
    viewerRef.current = viewer

    const ro = new ResizeObserver(() => {
      const nw = Math.min(300, wrap.clientWidth - 24)
      if (nw > 120) {
        viewer.width = nw
        viewer.height = Math.round(nw * 1.4)
      }
    })
    ro.observe(wrap)

    return () => {
      ro.disconnect()
      viewerRef.current = null
      viewer.dispose()
    }
  }, [isMs])

  const applyProfileToViewer = useCallback((p) => {
    const viewer = viewerRef.current
    if (!viewer || !p) return
    if (p.activeSkinData) {
      // 'auto-detect' picks slim/classic correctly ('auto' is silently
      // treated as classic and makes slim skins show double arm layers)
      viewer.loadSkin(p.activeSkinData, { model: 'auto-detect' })
    }
    if (p.activeCapeUrl) viewer.loadCape(p.activeCapeUrl)
    else viewer.loadCape(null)
  }, [])

  const loadProfile = useCallback(async () => {
    if (!isMs) return
    setLoading(true)
    try {
      const p = await api.getAccountProfile(activeAccount.id)
      setProfile(p)
      applyProfileToViewer(p)
    } catch (e) {
      notify(String(e), 'error')
    } finally {
      setLoading(false)
    }
  }, [activeAccount?.id, isMs, notify]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadProfile() }, [loadProfile])

  const upload = async () => {
    const path = await openFileDialog({
      title: 'Pick a skin (PNG)',
      filters: [{ name: 'Skin', extensions: ['png'] }],
      multiple: false,
    })
    if (!path) return
    setBusy(true)
    try {
      await api.uploadSkin(activeAccount.id, path, variant)
      notify('Skin updated — looking sharp')
      await loadProfile()
    } catch (e) {
      notify(String(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  const pickCape = async (capeId) => {
    setBusy(true)
    try {
      await api.setCape(activeAccount.id, capeId)
      notify(capeId ? 'Cape equipped' : 'Cape removed')
      await loadProfile()
    } catch (e) {
      const msg = String(e)
      if (/502|503|500/.test(msg)) {
        // A gateway error can arrive after Mojang has already applied the
        // change. Re-read the profile before showing a failure.
        try {
          const latest = await api.getAccountProfile(activeAccount.id)
          const applied = capeId
            ? latest.capes?.some((c) => c.id === capeId && c.active)
            : !latest.activeCapeUrl
          if (applied) {
            setProfile(latest)
            applyProfileToViewer(latest)
            notify(capeId ? 'Cape equipped' : 'Cape removed')
            return
          }
        } catch { /* keep the service error below */ }
      }
      // Mojang's cape API often answers 5xx these days — offer the site path
      if (/502|503|500/.test(msg)) {
        notify('Mojang’s cape service is down right now (you can also switch capes on minecraft.net → Profile)', 'error')
      } else {
        notify(msg, 'error')
      }
    } finally {
      setBusy(false)
    }
  }

  // --- guards ----------------------------------------------------------------
  if (!activeAccount) {
    return (
      <div className="page">
        <div className="content-head"><h1 className="page-title">Profile</h1></div>
        <div className="mods-empty">
          <div className="mods-empty-icon"><IconUser size={34} /></div>
          <div>No account yet</div>
          <div className="mods-empty-sub">Add an account first to see your skin and capes.</div>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => navigate('account')}>Go to Account</button>
        </div>
      </div>
    )
  }
  if (!isMs) {
    return (
      <div className="page">
        <div className="content-head"><h1 className="page-title">Profile</h1></div>
        <div className="mods-empty">
          <div className="mods-empty-icon"><IconUser size={34} /></div>
          <div>Skins and capes need a Microsoft account</div>
          <div className="mods-empty-sub">Offline accounts play without a custom skin — sign in with Microsoft to customize your look.</div>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => navigate('account')}>
            <IconMicrosoft size={15} /> Sign in with Microsoft
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="content-head">
        <div>
          <h1 className="page-title">Profile</h1>
          <p className="page-sub">{profile?.name || activeAccount.username} — skin, capes, your look in game.</p>
        </div>
        <div className="head-actions">
          <button className="btn btn-secondary" onClick={loadProfile} disabled={loading}>
            {loading ? <span className="mini-spinner" /> : <IconRefresh size={16} />} Refresh
          </button>
        </div>
      </div>

      <div className="profile-grid">
        <div className="profile-left">
          <div className="tb pink">
            <IconUser size={15} /> Skin Viewer
          </div>
          <div className="skin-viewer-wrap" ref={wrapRef}>
            <canvas ref={canvasRef} className="skin-canvas" />
            {loading && <div className="skin-viewer-loading"><span className="mini-spinner" /></div>}
          </div>
          <div className="skin-hint">Drag to spin · live skin preview</div>
        </div>

        <div className="profile-right">
          <section className="profile-section">
            <div className="tb yellow" style={{ margin: '-14px -14px 0', borderRadius: '11.5px 11.5px 0 0' }}>
              <IconUser size={15} /> Skins
            </div>
            <div className="profile-section-head">
              <div className="upload-row" style={{ marginLeft: 0, width: '100%' }}>
                <div className="segment">
                  <button className={`segment-btn ${variant === 'classic' ? 'active' : ''}`} onClick={() => setVariant('classic')}>Classic</button>
                  <button className={`segment-btn ${variant === 'slim' ? 'active' : ''}`} onClick={() => setVariant('slim')}>Slim</button>
                </div>
                <button className="btn btn-primary btn-small" onClick={upload} disabled={busy}>
                  <AppIcon name="upload" size={16} active={busy} /> Upload skin
                </button>
              </div>
            </div>
            {profile ? (
              <div className="skin-list">
                {profile.skins.map((s) => (
                  <div key={s.id} className={`skin-row ${s.active ? 'active' : ''}`}>
                    <img src={avatarUrl(profile.name, 40)} alt="" draggable={false} />
                    <div className="skin-row-info">
                      <div className="skin-row-name">{s.variant === 'slim' ? 'Slim skin' : 'Classic skin'}</div>
                      <div className="skin-row-sub">{s.active ? 'Equipped right now' : 'Stored on your profile'}</div>
                    </div>
                    {s.active && <span className="active-badge">Active</span>}
                  </div>
                ))}
                {profile.skins.length === 0 && <div className="dropup-empty">No skins on this profile yet — upload one above.</div>}
              </div>
            ) : (
              <div className="loading-line">{loading ? <><span className="mini-spinner" /> Loading profile…</> : 'Could not load the profile.'}</div>
            )}
          </section>

          <section className="profile-section">
            <div className="tb blue" style={{ margin: '-14px -14px 0', borderRadius: '11.5px 11.5px 0 0' }}>
              <IconCape size={15} /> Capes
            </div>
            {profile && profile.capes.length > 0 ? (
              <div className="cape-grid">
                <button className={`cape-card ${!profile.activeCapeUrl ? 'active' : ''}`} disabled={busy} onClick={() => pickCape(null)}>
                  <div className="cape-img cape-none"><IconCape size={22} /></div>
                  <span>No cape</span>
                </button>
                {profile.capes.map((c) => (
                  <button key={c.id} className={`cape-card ${c.active ? 'active' : ''}`} disabled={busy} onClick={() => pickCape(c.id)} title={c.alias}>
                    <div className="cape-img"><CapePreview url={c.url} /></div>
                    <span>{c.alias}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="dropup-empty">{profile ? 'No capes on this account — capes come from events and Mojang promotions.' : '…'}</div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
