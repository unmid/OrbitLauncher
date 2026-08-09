import { useState } from 'react'
import { api, avatarUrl } from './api.js'
import { IconMicrosoft, IconUser, IconPlus, IconCheck, IconX, IconKey, IconWarn, AppIcon } from './icons.jsx'

export default function AccountPage({ accounts, settings, activeAccount, refreshAccounts, refreshSettings, notify }) {
  const [msBusy, setMsBusy] = useState(false)
  const [offlineOpen, setOfflineOpen] = useState(false)
  const [offlineName, setOfflineName] = useState('')
  const [offlineBusy, setOfflineBusy] = useState(false)
  const [removing, setRemoving] = useState(null)

  const switchTo = async (id) => {
    if (id === settings?.activeAccountId) return
    try {
      await api.switchAccount(id) // backend returns the updated settings
      await Promise.all([refreshAccounts(), refreshSettings()])
      notify('Account switched')
    } catch (e) {
      notify(String(e), 'error')
    }
  }

  const loginMs = async () => {
    setMsBusy(true)
    try {
      const acc = await api.loginMicrosoft()
      await Promise.all([refreshAccounts(), refreshSettings()])
      notify(`Welcome, ${acc.username}`)
    } catch (e) {
      notify(String(e), 'error')
    } finally {
      setMsBusy(false)
    }
  }

  const addOffline = async () => {
    const name = offlineName.trim()
    if (!/^\w{3,16}$/.test(name)) {
      notify('3–16 characters: letters, numbers, underscore', 'error')
      return
    }
    setOfflineBusy(true)
    try {
      const acc = await api.addOfflineAccount(name)
      await Promise.all([refreshAccounts(), refreshSettings()])
      setOfflineOpen(false)
      setOfflineName('')
      notify(`Offline account "${acc.username}" added`)
    } catch (e) {
      notify(String(e), 'error')
    } finally {
      setOfflineBusy(false)
    }
  }

  const remove = async () => {
    const acc = removing
    setRemoving(null)
    try {
      await api.removeAccount(acc.id)
      await Promise.all([refreshAccounts(), refreshSettings()])
      notify(`Removed ${acc.username}`)
    } catch (e) {
      notify(String(e), 'error')
    }
  }

  return (
    <div className="page">
      <div className="content-head">
        <div>
          <h1 className="page-title">Account</h1>
          <p className="page-sub">Who's playing? Switch any time.</p>
        </div>
      </div>

      <div className="acct-list">
        {accounts.map((a) => {
          const active = a.id === settings?.activeAccountId || (!settings?.activeAccountId && a.id === activeAccount?.id)
          return (
            <div key={a.id} className={`acct-row ${active ? 'active' : ''}`}>
              <img className="acct-avatar" src={avatarUrl(a.username, 56)} alt="" draggable={false} />
              <div className="acct-info">
                <div className="acct-name">{a.username}</div>
                <span className={`acct-badge ${a.kind === 'microsoft' ? 'ms' : 'offline'}`}>
                  {a.kind === 'microsoft' ? <><IconMicrosoft size={11} /> Microsoft</> : <><IconUser size={11} /> Offline</>}
                </span>
              </div>
              <div className="acct-actions">
                {active ? (
                  <span className="active-badge"><IconCheck size={12} /> In use</span>
                ) : (
                  <button className="btn btn-primary btn-small" onClick={() => switchTo(a.id)}>Use</button>
                )}
                <button className="btn btn-danger btn-small" onClick={() => setRemoving(a)} title="Remove account">
                  <AppIcon name="trash" size={15} />
                </button>
              </div>
            </div>
          )
        })}
        {accounts.length === 0 && (
          <div className="mods-empty">
            <div className="mods-empty-icon"><IconKey size={34} /></div>
            <div>No accounts yet</div>
            <div className="mods-empty-sub">Sign in with Microsoft (skins, capes, Realms) or play offline.</div>
          </div>
        )}
      </div>

      <div className="add-acct-row">
        <button className="btn btn-ms" onClick={loginMs} disabled={msBusy}>
          {msBusy ? <span className="mini-spinner" /> : <IconMicrosoft size={16} />}
          {msBusy ? 'Complete sign-in in the window…' : 'Sign in with Microsoft'}
        </button>
        <button className="btn btn-secondary" onClick={() => setOfflineOpen(true)} disabled={msBusy}>
          <IconPlus size={16} /> Play offline
        </button>
      </div>

      {offlineOpen && (
        <div className="confirm-pop" onClick={() => setOfflineOpen(false)}>
          <div className="confirm-card" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head">
              <div className="confirm-title">Offline account</div>
              <button className="icon-btn" onClick={() => setOfflineOpen(false)}><IconX size={17} /></button>
            </div>
            <div className="confirm-text">Play without a Microsoft sign-in. No skins, capes or Realms — just a name.</div>
            <div className="field">
              <input
                className="input"
                value={offlineName}
                onChange={(e) => setOfflineName(e.target.value)}
                placeholder="Username, e.g. Steve_2024"
                maxLength={16}
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') addOffline() }}
              />
            </div>
            <div className="confirm-actions">
              <button className="btn" onClick={() => setOfflineOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={addOffline} disabled={offlineBusy || offlineName.trim().length < 3}>
                {offlineBusy ? <span className="mini-spinner" /> : <IconPlus size={15} />} Add account
              </button>
            </div>
          </div>
        </div>
      )}

      {removing && (
        <div className="confirm-pop" onClick={() => setRemoving(null)}>
          <div className="confirm-card" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon warn"><IconWarn size={28} /></div>
            <div className="confirm-title">Remove {removing.username}?</div>
            <div className="confirm-text">
              {removing.kind === 'microsoft'
                ? 'The sign-in token is wiped from this PC. You can sign in again any time.'
                : 'The offline account is deleted. Worlds inside Spaces stay untouched.'}
            </div>
            <div className="confirm-actions">
              <button className="btn" onClick={() => setRemoving(null)}>Keep it</button>
              <button className="btn btn-danger" onClick={remove}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
