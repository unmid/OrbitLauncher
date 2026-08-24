import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api, fmtDownloads } from './api.js'
import Dropdown from './Dropdown.jsx'
import { IconSearch, IconPlus, IconCheck, IconX, IconDownload, IconCube, IconBrush, IconSparkle, IconRefresh } from './icons.jsx'

const KINDS = [
  { id: 'mod', label: 'Mods', icon: IconCube },
  { id: 'resourcepack', label: 'Resource Packs', icon: IconBrush },
  { id: 'shader', label: 'Shaders', icon: IconSparkle },
]
const SOURCES = [
  { id: 'modrinth', label: 'Modrinth' },
  { id: 'curseforge', label: 'CurseForge' },
]

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
}

function renderDescription(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  let html = raw
  if (!/<\/?[a-z][\s\S]*>/i.test(raw)) {
    html = escapeHtml(raw)
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/\n{2,}/g, '</p><p>')
      .replace(/\n/g, '<br>')
    html = `<p>${html}</p>`
  }
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const allowed = new Set(['A', 'P', 'BR', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'STRONG', 'EM', 'B', 'I', 'U', 'S', 'DEL', 'CODE', 'PRE', 'BLOCKQUOTE', 'UL', 'OL', 'LI', 'HR', 'IMG', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD'])
  doc.querySelectorAll('script, style, iframe, object, embed, form, input, button, video, audio, svg').forEach((node) => node.remove())
  doc.querySelectorAll('*').forEach((node) => {
    if (!allowed.has(node.tagName)) {
      node.replaceWith(...node.childNodes)
      return
    }
    for (const attr of [...node.attributes]) {
      const name = attr.name.toLowerCase()
      const keep = (node.tagName === 'A' && ['href', 'title'].includes(name)) || (node.tagName === 'IMG' && ['src', 'alt', 'title'].includes(name))
      if (!keep) node.removeAttribute(attr.name)
    }
    if (node.tagName === 'A' && node.getAttribute('href') && !/^https?:/i.test(node.getAttribute('href'))) node.removeAttribute('href')
    if (node.tagName === 'IMG' && node.getAttribute('src') && !/^https:\/\//i.test(node.getAttribute('src'))) node.remove()
  })
  return doc.body.innerHTML
}

function installedRecord(items, source, projectId) {
  const stored = `${source}:${projectId}`
  return items.find((item) => (item.projectId || item.project_id) === stored || (item.projectId || item.project_id) === projectId) || null
}

export default function ModsBrowser({ mcVersion, loader, spacesModList = [], onPick, onUnpick, directSpaceId = null, onDirectChange, notify }) {
  const [kind, setKind] = useState('mod')
  const [source, setSource] = useState('modrinth')
  const [query, setQuery] = useState('')
  const [versionFilter, setVersionFilter] = useState(mcVersion || '')
  const [showAllVersions, setShowAllVersions] = useState(false)
  const [sort, setSort] = useState('relevance')
  const [results, setResults] = useState([])
  const [total, setTotal] = useState(0)
  const [relaxed, setRelaxed] = useState(false)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [details, setDetails] = useState(null)
  const [detailsBusy, setDetailsBusy] = useState(false)
  const [directMods, setDirectMods] = useState(spacesModList)
  const debounce = useRef(null)
  const detailsRef = useRef(null)

  // Fresh state for every preview: reset scroll + selection helpers.
  useEffect(() => {
    if (!details) return
    detailsRef.current?.scrollTo({ top: 0 })
  }, [details])

  useEffect(() => { setDirectMods(spacesModList || []) }, [directSpaceId]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!directSpaceId) return
    let cancelled = false
    api.reconcileContent(directSpaceId)
      .then((space) => {
        if (!cancelled) setDirectMods(space.mods || [])
        onDirectChange?.()
      })
      .catch((e) => notify?.(`Couldn't check installed content: ${String(e)}`, 'error'))
    return () => { cancelled = true }
  }, [directSpaceId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setVersionFilter(mcVersion || '') }, [mcVersion])

  const modsBlocked = loader === 'vanilla' || loader === 'optifine'
  const blocked = kind === 'mod' ? modsBlocked : kind === 'shader' ? loader === 'vanilla' : false
  const searchVersion = showAllVersions ? '' : (versionFilter.trim() || mcVersion || '')
  const targetVersion = versionFilter.trim() || mcVersion || ''
  const activeMods = directSpaceId ? directMods : spacesModList
  const detailsMarkup = useMemo(() => renderDescription(details?.body || details?.description), [details])
  const detailsVersions = details?.gameVersions || details?.game_versions || []
  const detailsIcon = details?.iconUrl || details?.icon_url || ''
  const detailsUnsupported = detailsVersions.length > 0 && targetVersion && !detailsVersions.includes(targetVersion)

  const doSearch = useCallback(async (q, s, off, k = kind, src = source) => {
    if (blocked) return
    setLoading(true)
    try {
      const res = await api.searchContent({ source: src, kind: k, query: q, mcVersion: searchVersion, loader, sort: s, offset: off })
      let hits = res.hits || []
      let totalHits = res.total || 0
      // Snapshots and pre-releases are rarely tagged by authors, so a strict
      // version filter often finds nothing. Retry once with all versions and
      // keep the unsupported rows marked (install stays blocked for them).
      if (off === 0 && totalHits === 0 && searchVersion) {
        const retry = await api.searchContent({ source: src, kind: k, query: q, mcVersion: '', loader, sort: s, offset: 0 })
        hits = retry.hits || []
        totalHits = retry.total || 0
        setRelaxed(true)
      } else if (off === 0) {
        setRelaxed(false)
      }
      if (off === 0) setResults(hits)
      else setResults((current) => [...current, ...hits])
      setTotal(totalHits)
      setOffset(off)
    } catch (e) {
      notify?.(String(e), 'error')
    } finally {
      setLoading(false)
    }
  }, [blocked, kind, loader, notify, searchVersion, source])

  useEffect(() => {
    setResults([])
    setTotal(0)
    doSearch(query, sort, 0)
  }, [doSearch, sort, kind, source, versionFilter, showAllVersions]) // eslint-disable-line react-hooks/exhaustive-deps

  const onQueryChange = (event) => {
    const value = event.target.value
    setQuery(value)
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => doSearch(value, sort, 0), 350)
  }

  const toggle = async (hit) => {
    const supported = !targetVersion || !hit.gameVersions?.length || hit.gameVersions.includes(targetVersion)
    if (!supported) {
      notify?.(`No support: ${hit.title} does not support Minecraft ${targetVersion}`, 'error')
      return
    }
    const record = installedRecord(activeMods, source, hit.projectId)
    if (!directSpaceId) {
      if (record) onUnpick?.(hit.projectId)
      else onPick?.({ projectId: hit.projectId, title: hit.title, iconUrl: hit.iconUrl, kind, source })
      return
    }
    setBusyId(hit.projectId)
    try {
      const updated = record
        ? await api.removeContent(directSpaceId, record.projectId || record.project_id)
        : await api.installContent(directSpaceId, { source, kind, projectId: hit.projectId })
      setDirectMods(updated.mods || [])
      notify?.(`${record ? 'Removed' : 'Added'} ${hit.title}`)
      onDirectChange?.()
    } catch (e) {
      notify?.(String(e), 'error')
    } finally {
      setBusyId(null)
    }
  }

  const updateContent = async (hit) => {
    if (!directSpaceId) return
    setBusyId(hit.projectId)
    try {
      const updated = await api.installContent(directSpaceId, { source, kind, projectId: hit.projectId })
      setDirectMods(updated.mods || [])
      notify?.(`Updated ${hit.title}`)
      onDirectChange?.()
    } catch (e) {
      notify?.(String(e), 'error')
    } finally {
      setBusyId(null)
    }
  }

  const openDetails = async (hit) => {
    setDetails({ ...hit, body: hit.description || '' })
    setDetailsBusy(true)
    try {
      setDetails(await api.getContentDetails({ source, projectId: hit.projectId }))
    } catch (e) {
      notify?.(`Couldn't load the full description: ${String(e)}`, 'error')
    } finally {
      setDetailsBusy(false)
    }
  }

  return (
    <div className="mods-browser">
      <div className="content-tabs">
        {KINDS.map((entry) => <button key={entry.id} className={`content-tab ${kind === entry.id ? 'active' : ''}`} onClick={() => setKind(entry.id)}><entry.icon size={15} /> {entry.label}</button>)}
        <div className="segment">
          {SOURCES.map((entry) => <button key={entry.id} className={`segment-btn ${source === entry.id ? 'active' : ''}`} onClick={() => setSource(entry.id)}>{entry.label}</button>)}
        </div>
      </div>

      {blocked ? (
        <div className="mods-empty">
          <div className="mods-empty-icon"><IconCube size={34} /></div>
          <div>{kind === 'mod' ? 'This software choice cannot load mods.' : 'Shaders need a shader-capable Space.'}</div>
          <div className="mods-empty-sub">Pick Fabric, Quilt, Forge, NeoForge, or OptiFine as appropriate, then come back to add content.</div>
        </div>
      ) : (
        <>
          <div className="mods-toolbar">
            <div className="search-box"><IconSearch size={16} /><input value={query} onChange={onQueryChange} placeholder={`Search ${KINDS.find((entry) => entry.id === kind)?.label.toLowerCase()} on ${source === 'modrinth' ? 'Modrinth' : 'CurseForge'}...`} /></div>
            <label className="version-filter"><span>Version</span><input value={versionFilter} onChange={(event) => setVersionFilter(event.target.value)} placeholder="1.21.1" /></label>
            <label className="version-all-toggle"><input type="checkbox" checked={showAllVersions} onChange={(event) => setShowAllVersions(event.target.checked)} /> All versions</label>
            <Dropdown className="dd-inline" value={sort} onChange={setSort} options={[{ value: 'relevance', label: 'Best match' }, { value: 'downloads', label: 'Most popular' }, { value: 'newest', label: 'Newest' }]} />
          </div>

          {relaxed && results.length > 0 && (
            <div className="mods-note">Nothing is tagged for Minecraft {targetVersion} yet — showing all versions. Rows marked unsupported can't be installed.</div>
          )}
          <div className="mods-list">
            {results.map((hit) => {
              const record = installedRecord(activeMods, source, hit.projectId)
              const picked = !!record
              const supported = !targetVersion || !hit.gameVersions?.length || hit.gameVersions.includes(targetVersion)
              return <div key={hit.projectId} className={`mod-row ${picked ? 'mod-row-picked' : ''} ${!supported ? 'mod-row-unsupported' : ''}`}>
                {hit.iconUrl ? <img className="mod-icon" src={hit.iconUrl} alt="" loading="lazy" /> : <div className="mod-icon mod-icon-fallback"><IconCube size={18} /></div>}
                <div className="mod-info">
                  <button className="mod-title mod-title-button" onClick={() => openDetails(hit)} title="Show description">{hit.title}</button>
                  <div className="mod-desc">{hit.description}</div>
                  <div className="mod-meta">
                    <span><IconDownload size={12} /> {fmtDownloads(hit.downloads)}</span>
                    {hit.author && <span>- {hit.author}</span>}
                    {record?.versionNumber && <span className="installed-version">Installed {record.versionNumber}</span>}
                    {!supported && <span className="support-no">No support for {targetVersion}</span>}
                  </div>
                </div>
                <div className="mod-actions">
                  <button className={`mod-add-btn ${picked ? 'mod-add-btn-picked' : ''}`} disabled={busyId === hit.projectId || !supported} onClick={() => toggle(hit)} title={picked ? 'Remove from Space' : 'Add to Space'}>{busyId === hit.projectId ? <span className="mini-spinner" /> : picked ? <IconCheck size={16} /> : <IconPlus size={16} />}</button>
                  {directSpaceId && picked && <button className="mod-add-btn mod-update-btn" disabled={busyId === hit.projectId || !supported} onClick={() => updateContent(hit)} title="Install the newest compatible version"><IconRefresh size={15} /></button>}
                </div>
              </div>
            })}
            {loading && <div className="mods-loading"><span className="mini-spinner" /> Searching...</div>}
            {!loading && results.length === 0 && <div className="mods-empty"><div className="mods-empty-icon"><IconSearch size={30} /></div><div>Nothing found{query ? ` for "${query}"` : ''}</div><div className="mods-empty-sub">Try another name, or enable All versions to inspect compatibility.</div></div>}
          </div>
          {results.length > 0 && results.length < total && !loading && <button className="btn btn-ghost mods-more" onClick={() => doSearch(query, sort, offset + 24)}>Show more ({results.length} of {total})</button>}
        </>
      )}

      {details && <div className="modal-backdrop" onClick={() => setDetails(null)}>
        <div ref={detailsRef} className="content-details" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
          <div className="details-head">
            {detailsIcon
              ? <img src={detailsIcon} alt="" className="details-icon" />
              : <div className="details-icon details-icon-fallback"><IconCube size={26} /></div>}
            <div className="details-heading">
              <h2>{details.title}</h2>
              <div className="details-byline">
                {details.author && <span className="details-author">{details.author}</span>}
                <span className="details-source">{source === 'modrinth' ? 'Modrinth' : 'CurseForge'}</span>
              </div>
            </div>
            <button className="icon-btn" onClick={() => setDetails(null)} title="Close"><IconX size={18} /></button>
          </div>

          <div className="details-meta">
            <span className="details-pill"><IconDownload size={12} /> {fmtDownloads(details.downloads)} downloads</span>
            <span className={`details-support ${detailsUnsupported ? 'unsupported' : ''}`}>
              {detailsUnsupported
                ? `No support for Minecraft ${targetVersion}`
                : `Supports Minecraft ${targetVersion || 'the selected version'}`}
            </span>
          </div>

          {detailsBusy ? (
            <div className="details-loading"><span className="mini-spinner" /> Loading description…</div>
          ) : (
            <div className="details-body details-rendered" dangerouslySetInnerHTML={{ __html: detailsMarkup || '<p>No description provided.</p>' }} />
          )}

          <div className="details-foot">
            <button className="btn btn-ghost" onClick={() => setDetails(null)}>Close</button>
            {!blocked && (
              <button
                className={`btn btn-primary ${installedRecord(activeMods, source, details.projectId) ? 'btn-picked' : ''}`}
                disabled={busyId === details.projectId || detailsUnsupported}
                onClick={() => toggle({ ...details, gameVersions: detailsVersions, iconUrl: detailsIcon })}
              >
                {busyId === details.projectId
                  ? <span className="mini-spinner" />
                  : installedRecord(activeMods, source, details.projectId)
                    ? <><IconCheck size={16} /> Remove from Space</>
                    : <><IconPlus size={16} /> Add to Space</>}
              </button>
            )}
          </div>
        </div>
      </div>}
    </div>
  )
}