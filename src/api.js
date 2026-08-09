import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { open, save } from '@tauri-apps/plugin-dialog'

const loaderVersionCache = new Map()
const isTauriRuntime = () => typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__ || window.__TAURI__)
const SERVER_LIST_URL = 'https://raw.githubusercontent.com/unmid/OL-updater/main/olserverlist.json'
const PREVIEW_GAME_VERSIONS = ['1.21.8', '1.21.7', '1.21.6', '1.21.5', '1.21.4', '1.21.1', '1.20.6', '1.20.4', '1.20.1', '1.19.4', '1.18.2', '1.16.5', '1.12.2', '1.8.9'].map((id) => ({ id, kind: 'release', releaseTime: '' }))
const PREVIEW_SERVERS = [{ name: 'Orbit Community', ip: 'play.orbit.example', port: 25565, icon: '', motd: 'Preview server list', category: 'Community', sponsored: false, minVersion: '1.21' }]

export const api = {
  // settings
  getSettings: () => invoke('get_settings'),
  saveSettings: (settings) => isTauriRuntime() ? invoke('save_settings', { settings }) : Promise.resolve(settings),

  // versions / loaders
  listGameVersions: (showSnapshots = false) => isTauriRuntime()
    ? invoke('list_game_versions', { showSnapshots })
    : Promise.resolve(showSnapshots ? [...PREVIEW_GAME_VERSIONS, { id: '25w31a', kind: 'snapshot', releaseTime: '' }] : PREVIEW_GAME_VERSIONS),
  listLoaderVersions: async (loader, mcVersion) => {
    const key = `${loader}:${mcVersion}`
    if (loaderVersionCache.has(key)) return loaderVersionCache.get(key)
    if (!isTauriRuntime()) {
      const preview = loader === 'optifine'
        ? ['HD_U_I9', 'HD_U_I8', 'HD_U_I7', 'HD_U_I6', 'HD_U_G8', 'HD_U_G5']
        : loader === 'forge'
          ? ['52.0.28', '51.0.33', '50.2.0', '47.3.0', '40.2.17']
          : loader === 'neoforge'
            ? ['21.8.31', '21.7.25', '21.1.200', '20.6.139']
            : ['0.17.2', '0.16.14', '0.15.11', '0.14.25']
      loaderVersionCache.set(key, preview)
      return preview
    }
    const versions = await invoke('list_loader_versions', { loader, mcVersion })
    const list = Array.isArray(versions) ? versions : []
    loaderVersionCache.set(key, list)
    return list
  },
  listInstalledVersions: () => isTauriRuntime() ? invoke('list_installed_versions') : Promise.resolve([]),

  // spaces
  listSpaces: () => invoke('list_spaces'),
  createSpace: (space) => invoke('create_space', { space }),
  updateSpace: (space) => invoke('update_space', { space }),
  duplicateSpace: (spaceId) => invoke('duplicate_space', { spaceId }),
  deleteSpace: (spaceId, deleteFiles = true) => invoke('delete_space', { spaceId, deleteFiles }),
  openSpaceFolder: (spaceId) => invoke('open_space_folder', { spaceId }),
  exportSpace: (spaceId, path) => invoke('export_space', { spaceId, path }),
  importSpace: (path) => invoke('import_space', { path }),

  // content (mods / packs / shaders)
  searchContent: ({ source = 'modrinth', kind = 'mod', query = '', mcVersion = '', loader = '', sort = 'relevance', offset = 0 }) =>
    invoke('search_content', { source, kind, query, mcVersion, loader, sort, offset }),
  getContentDetails: ({ source = 'modrinth', projectId }) =>
    invoke('content_details', { source, projectId }),
  installContent: (spaceId, { source, kind, projectId }) =>
    invoke('install_content', { spaceId, source, kind, projectId }),
  removeContent: (spaceId, projectId) => invoke('remove_content', { spaceId, projectId }),
  reconcileContent: (spaceId) => invoke('reconcile_content', { spaceId }),

  // remote + servers
  getHomePages: () => invoke('get_home_pages'),
  getServerList: () => isTauriRuntime()
    ? invoke('get_server_list')
    : fetch(SERVER_LIST_URL)
        .then((r) => { if (!r.ok) throw new Error('server list unavailable'); return r.json() })
        .then((v) => (v && Array.isArray(v.servers) ? v.servers : PREVIEW_SERVERS))
        .catch(() => PREVIEW_SERVERS),
  pingServer: (host, port) => isTauriRuntime()
    ? invoke('ping_server', { host, port })
    : Promise.resolve({ online: true, playersOnline: 12, playersMax: 100, motd: 'Preview server list', icon: '', version: '1.21.8', pingMs: 42 }),

  // accounts
  listAccounts: () => invoke('list_accounts'),
  addOfflineAccount: (name) => invoke('add_offline_account', { name }),
  loginMicrosoft: () => invoke('login_microsoft'),
  removeAccount: (accountId) => invoke('remove_account', { accountId }),
  switchAccount: (accountId) => invoke('switch_account', { accountId }),
  validateAccount: (accountId) => invoke('validate_account', { accountId }),
  getAccountProfile: (accountId) => invoke('get_account_profile', { accountId }),
  setCape: (accountId, capeId) => invoke('set_cape', { accountId, capeId }),
  uploadSkin: (accountId, path, variant) => invoke('upload_skin', { accountId, path, variant }),

  // optimize / storage
  hardwareScan: () => invoke('hardware_scan'),
  recommendedRam: (totalGb) => invoke('recommended_ram', { totalGb }),
  storageBreakdown: () => invoke('storage_breakdown'),
  cleanStorageJunk: () => invoke('clean_storage_junk'),

  // news / update
  fetchNews: () => invoke('fetch_news'),
  fetchArticle: (url) => invoke('fetch_article', { url }),
  checkUpdate: () => invoke('check_update'),
  downloadUpdate: (url) => invoke('download_update', { url }),

  // misc
  fetchBytesB64: (url) => invoke('fetch_bytes_b64', { url }),
  launchSpace: (spaceId, server) =>
    invoke('launch_space', server ? { spaceId, serverIp: server.ip, serverPort: server.port } : { spaceId }),
  isRunning: (spaceId) => invoke('is_running', { spaceId }),
  appDataDir: () => invoke('app_data_dir'),
  openUrl: (url) => invoke('open_url', { url }),
  readLogs: () => isTauriRuntime() ? invoke('read_logs') : Promise.resolve(''),

  onProgress: (handler) => {
    if (!isTauriRuntime()) return Promise.resolve(() => {})
    try { return Promise.resolve(listen('space-progress', (e) => handler(e.payload))).catch(() => () => {}) } catch { return Promise.resolve(() => {}) }
  },
  onUpdateProgress: (handler) => {
    if (!isTauriRuntime()) return Promise.resolve(() => {})
    try { return Promise.resolve(listen('update-progress', (e) => handler(e.payload))).catch(() => () => {}) } catch { return Promise.resolve(() => {}) }
  },
  onLog: (handler) => {
    if (!isTauriRuntime()) return Promise.resolve(() => {})
    try { return Promise.resolve(listen('app-log', (e) => handler(e.payload))).catch(() => () => {}) } catch { return Promise.resolve(() => {}) }
  },
}

export { open as openFileDialog, save as saveFileDialog }

export function avatarUrl(username, size = 64) {
  return `https://mc-heads.net/avatar/${encodeURIComponent(username)}/${size}`
}

export function fmtDownloads(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return String(n || 0)
}

export function fmtBytes(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + ' GB'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + ' MB'
  if (n >= 1e3) return (n / 1e3).toFixed(0) + ' KB'
  return String(n || 0) + ' B'
}
