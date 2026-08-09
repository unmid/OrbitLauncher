import { useState } from 'react'
import { api, openFileDialog } from './api.js'
import SpaceCard from './SpaceCard.jsx'
import { IconPlus, IconGamepad, IconWarn, AppIcon } from './icons.jsx'

export default function SpacesPage({ spaces, progress, play, openWizard, refreshSpaces, notify }) {
  const [importWarn, setImportWarn] = useState(false)
  const [importing, setImporting] = useState(false)

  const startImport = () => setImportWarn(true)

  const doImport = async () => {
    setImportWarn(false)
    try {
      const path = await openFileDialog({
        title: 'Import a Space',
        filters: [{ name: 'Orbit Space', extensions: ['json'] }],
        multiple: false,
      })
      if (!path) return
      setImporting(true)
      const space = await api.importSpace(path)
      notify(`Space "${space.name}" imported`)
      refreshSpaces()
    } catch (e) {
      notify(String(e), 'error')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="page">
      <div className="content-head">
        <div>
          <h1 className="page-title">Spaces</h1>
          <p className="page-sub">Isolated Minecraft instances — mods, worlds and settings, one click to play.</p>
        </div>
        <div className="head-actions">
          <button className="btn btn-secondary" onClick={startImport} disabled={importing}>
            {importing ? <span className="mini-spinner" /> : <AppIcon name="import" size={18} />} Import
          </button>
          <button className="btn btn-primary" onClick={() => openWizard('new')}>
            <AppIcon name="add" size={18} /> New Space
          </button>
        </div>
      </div>

      <div className="space-grid">
        {spaces.map((space) => (
          <SpaceCard
            key={space.id}
            space={space}
            progress={progress[space.id]}
            onPlay={() => play(space)}
            onEdit={() => openWizard(space)}
            onChanged={refreshSpaces}
            onDeleted={refreshSpaces}
            notify={notify}
          />
        ))}
      </div>

      {spaces.length === 0 && (
        <div className="empty-hero">
          <IconGamepad size={40} />
          <h2>Welcome to Orbit</h2>
          <p>Make your first Space: choose a Minecraft version, attach mod loaders or OptiFine and grab content with one click.</p>
          <button className="btn btn-primary btn-big" onClick={() => openWizard('new')}>
            <IconPlus size={18} /> Create my first Space
          </button>
        </div>
      )}

      {importWarn && (
        <div className="confirm-pop" onClick={() => setImportWarn(false)}>
          <div className="confirm-card" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon warn"><IconWarn size={30} /></div>
            <div className="confirm-title">Import this Space?</div>
            <div className="confirm-text">
              Only import Space files from people you trust. The file describes a version and a list of content to download —
              everything else is blocked by the importer.
            </div>
            <div className="confirm-actions">
              <button className="btn" onClick={() => setImportWarn(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={doImport}>Choose file</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
