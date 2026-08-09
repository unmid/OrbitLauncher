// Orbit Launcher (beta) - Rust core
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod accounts;
mod content;
mod download;
mod hardware;
mod jruntime;
mod launch;
mod loaders;
mod mojang;
mod news;
mod profile;
mod remote;
mod servers;
mod spaces;
mod storage;
mod store;
mod update;

use launch::ProgressSink;
use serde::Serialize;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, State};

struct AppState {
    root: PathBuf,
    http: reqwest::Client,
    settings: Mutex<store::Settings>,
    running: Arc<Mutex<HashMap<String, bool>>>,
}

impl AppState {
    fn spaces(&self) -> Vec<spaces::Space> {
        spaces::load_spaces(&self.root)
    }
    fn persist_spaces(&self, spaces: &[spaces::Space]) -> Result<(), String> {
        spaces::save_spaces(&self.root, spaces)
    }
}

// ---------------------------------------------------------------------------
// basic state

#[tauri::command]
fn get_settings(state: State<AppState>) -> store::Settings {
    state.settings.lock().unwrap().clone()
}

#[tauri::command]
fn save_settings(state: State<AppState>, settings: store::Settings) -> Result<(), String> {
    store::save_settings(&state.root, &settings)?;
    *state.settings.lock().unwrap() = settings;
    Ok(())
}

// ---------------------------------------------------------------------------
// versions + loaders

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct GameVersion {
    id: String,
    kind: String,
    release_time: String,
}

#[tauri::command]
async fn list_game_versions(
    state: State<'_, AppState>,
    show_snapshots: bool,
) -> Result<Vec<GameVersion>, String> {
    let manifest = mojang::fetch_manifest(&state.http).await?;
    Ok(manifest
        .into_iter()
        .filter(|v| v.kind == "release" || (show_snapshots && v.kind == "snapshot"))
        .map(|v| GameVersion {
            id: v.id,
            kind: v.kind,
            release_time: v.release_time,
        })
        .collect())
}

#[tauri::command]
async fn list_loader_versions(
    state: State<'_, AppState>,
    loader: String,
    mc_version: String,
) -> Result<Vec<String>, String> {
    match loader.as_str() {
        "fabric" => loaders::fabric_loader_versions(&state.http, &mc_version).await,
        "quilt" => loaders::quilt_loader_versions(&state.http, &mc_version).await,
        "forge" => loaders::forge_versions(&state.http, &mc_version).await,
        "neoforge" => loaders::neoforge_versions(&state.http, &mc_version).await,
        "optifine" => loaders::optifine_versions(&state.http, &mc_version).await,
        _ => Ok(vec![]),
    }
}

/// Versions already downloaded on this PC (versions/<id>/<id>.json exists).
#[tauri::command]
fn list_installed_versions(state: State<AppState>) -> Vec<String> {
    let dir = state.root.join("versions");
    let mut out: Vec<String> = std::fs::read_dir(&dir)
        .map(|rd| {
            rd.flatten()
                .filter(|e| e.path().is_dir())
                .filter(|e| {
                    let name = e.file_name().to_string_lossy().to_string();
                    e.path().join(format!("{name}.json")).exists()
                })
                .map(|e| e.file_name().to_string_lossy().to_string())
                .collect()
        })
        .unwrap_or_default();
    out.sort();
    out
}

// ---------------------------------------------------------------------------
// spaces CRUD

#[tauri::command]
fn list_spaces(state: State<AppState>) -> Vec<spaces::Space> {
    state.spaces()
}

#[tauri::command]
fn create_space(state: State<AppState>, mut space: spaces::Space) -> Result<spaces::Space, String> {
    if space.name.trim().is_empty() {
        return Err("Give your Space a name".into());
    }
    if !loaders::LOADER_KINDS.contains(&space.loader.as_str()) {
        return Err("Unknown software type".into());
    }
    if space.id.is_empty() {
        space.id = uuid::Uuid::new_v4().to_string();
    }
    if space.created_at == 0 {
        space.created_at = spaces::now_secs();
    }
    let mut all = state.spaces();
    all.push(space.clone());
    state.persist_spaces(&all)?;
    let _ = std::fs::create_dir_all(spaces::space_dir(&state.root, &space.id));
    Ok(space)
}

#[tauri::command]
fn update_space(state: State<AppState>, space: spaces::Space) -> Result<spaces::Space, String> {
    let mut all = state.spaces();
    let idx = all.iter().position(|s| s.id == space.id).ok_or("Space not found")?;
    let old = &all[idx];
    let mut next = space;
    if old.mc_version != next.mc_version
        || old.loader != next.loader
        || old.loader_version != next.loader_version
    {
        next.installed_version_id = None;
    } else {
        next.installed_version_id = old.installed_version_id.clone();
    }
    next.created_at = old.created_at;
    next.last_played = old.last_played;
    all[idx] = next.clone();
    state.persist_spaces(&all)?;
    Ok(next)
}

#[tauri::command]
fn duplicate_space(state: State<AppState>, space_id: String) -> Result<spaces::Space, String> {
    spaces::duplicate_space(&state.root, &space_id)
}

#[tauri::command]
fn delete_space(state: State<AppState>, space_id: String, delete_files: bool) -> Result<(), String> {
    let mut all = state.spaces();
    all.retain(|s| s.id != space_id);
    state.persist_spaces(&all)?;
    if delete_files {
        let _ = std::fs::remove_dir_all(spaces::space_dir(&state.root, &space_id));
    }
    Ok(())
}

#[tauri::command]
fn open_space_folder(state: State<AppState>, space_id: String) -> Result<(), String> {
    let dir = spaces::space_dir(&state.root, &space_id);
    let _ = std::fs::create_dir_all(&dir);
    open::that(&dir).map_err(|e| e.to_string())
}

// ---------------------------------------------------------------------------
// space export / import (safe shareable JSON)

#[tauri::command]
fn export_space(state: State<AppState>, space_id: String, path: String) -> Result<(), String> {
    let all = state.spaces();
    let space = all.iter().find(|s| s.id == space_id).ok_or("Space not found")?;
    let export = spaces::export_space_json(space);
    let data = serde_json::to_string_pretty(&export).map_err(|e| e.to_string())?;
    std::fs::write(&path, data).map_err(|e| e.to_string())
}

/// Validate + create a new (empty) Space from an exported file, then
/// re-download its mods/resourcepacks/shaders in the background (best effort).
#[tauri::command]
fn import_space(state: State<AppState>, path: String) -> Result<spaces::Space, String> {
    let raw = std::fs::read_to_string(&path).map_err(|e| format!("Can't read the file: {e}"))?;
    let export = spaces::validate_import(&raw)?;
    let mc = export.mc_version.clone();
    let loader = export.loader.clone();
    let space = spaces::Space {
        id: uuid::Uuid::new_v4().to_string(),
        name: export.name.trim().to_string(),
        icon: if export.icon.is_empty() { "rocket".into() } else { export.icon },
        color: if export.color.is_empty() { "#5ac8fa".into() } else { format!("#{}", export.color.trim_start_matches('#')) },
        mc_version: export.mc_version,
        loader: export.loader,
        loader_version: export.loader_version,
        installed_version_id: None,
        mods: vec![],
        created_at: spaces::now_secs(),
        last_played: None,
        ram_gb: export.ram_gb,
    };
    let mut all = state.spaces();
    all.push(space.clone());
    state.persist_spaces(&all)?;
    let _ = std::fs::create_dir_all(spaces::space_dir(&state.root, &space.id));

    if !export.mods.is_empty() {
        let http = state.http.clone();
        let root = state.root.clone();
        let sid = space.id.clone();
        let mods = export.mods.clone();
        tauri::async_runtime::spawn(async move {
            for m in mods {
                let source = if m.source.is_empty() { "modrinth".to_string() } else { m.source };
                let kind = if m.kind.is_empty() { "mod".to_string() } else { m.kind };
                if let Ok(installed) = content::install_content(&http, &root, &sid, &source, &kind, &m.project_id, &mc, &loader).await {
                    let mut all = spaces::load_spaces(&root);
                    if let Some(s) = all.iter_mut().find(|s| s.id == sid) {
                        s.mods.retain(|x| x.project_id != installed.project_id);
                        s.mods.push(installed);
                        let _ = spaces::save_spaces(&root, &all);
                    }
                }
            }
        });
    }
    Ok(space)
}

// ---------------------------------------------------------------------------
// content (mods / resource packs / shaders ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Modrinth + CurseForge)

#[tauri::command]
async fn search_content(
    state: State<'_, AppState>,
    source: String,
    kind: String,
    query: String,
    mc_version: String,
    loader: String,
    sort: String,
    offset: u32,
) -> Result<serde_json::Value, String> {
    let (hits, total) = content::search_content(
        &state.http,
        &source,
        &kind,
        &query,
        &mc_version,
        &loader,
        if sort.is_empty() { "relevance" } else { &sort },
        offset,
    )
    .await?;
    Ok(serde_json::json!({ "hits": hits, "total": total }))
}

#[tauri::command]
async fn content_details(
    state: State<'_, AppState>,
    source: String,
    project_id: String,
) -> Result<content::ContentDetails, String> {
    content::content_details(&state.http, &source, &project_id).await
}

#[tauri::command]
async fn install_content(
    state: State<'_, AppState>,
    space_id: String,
    source: String,
    kind: String,
    project_id: String,
) -> Result<spaces::Space, String> {
    let mut all = state.spaces();
    let space = all
        .iter_mut()
        .find(|s| s.id == space_id)
        .ok_or("Space not found")?;
    let stored_id = format!("{source}:{project_id}");
    let previous: Vec<spaces::SpaceMod> = space.mods.iter()
        .filter(|m| m.project_id == stored_id || (!m.project_id.contains(':') && m.project_id == project_id))
        .cloned()
        .collect();
    let installed = content::install_content(
        &state.http,
        &state.root,
        &space_id,
        &source,
        &kind,
        &project_id,
        &space.mc_version.clone(),
        &space.loader.clone(),
    )
    .await?;
    // An update can change filename. Remove the superseded file so both builds
    // cannot load together and destabilize Minecraft.
    for old in &previous {
        if old.file_name != installed.file_name || old.kind != installed.kind {
            let _ = content::remove_content_file(&state.root, &space_id, &old.kind, &old.file_name);
        }
    }
    space.mods.retain(|m| m.project_id != installed.project_id && !(!m.project_id.contains(':') && m.project_id == project_id));
    space.mods.push(installed);
    let space = space.clone();
    state.persist_spaces(&all)?;
    Ok(space)
}

#[tauri::command]
fn reconcile_content(
    state: State<AppState>,
    space_id: String,
) -> Result<spaces::Space, String> {
    let mut all = state.spaces();
    let space = all.iter_mut().find(|s| s.id == space_id).ok_or("Space not found")?;
    let original_len = space.mods.len();
    space.mods.retain(|m| content::content_file_exists(&state.root, &space_id, &m.kind, &m.file_name));
    let space = space.clone();
    if space.mods.len() != original_len {
        state.persist_spaces(&all)?;
    }
    Ok(space)
}

#[tauri::command]
fn remove_content(
    state: State<AppState>,
    space_id: String,
    project_id: String,
) -> Result<spaces::Space, String> {
    // Stored ids carry a "source:" prefix; callers may pass either form.
    let bare = project_id.rsplit(':').next().unwrap_or(&project_id);
    let matches = |stored: &str| stored == project_id || stored.rsplit(':').next() == Some(bare);
    let mut all = state.spaces();
    let space = all
        .iter_mut()
        .find(|s| s.id == space_id)
        .ok_or("Space not found")?;
    if let Some(m) = space.mods.iter().find(|m| matches(&m.project_id)) {
        let (file, kind) = (m.file_name.clone(), m.kind.clone());
        let _ = content::remove_content_file(&state.root, &space_id, &kind, &file);
    }
    space.mods.retain(|m| !matches(&m.project_id));
    let space = space.clone();
    state.persist_spaces(&all)?;
    Ok(space)
}

// ---------------------------------------------------------------------------
// remote home page + server list

#[tauri::command]
async fn get_home_pages(state: State<'_, AppState>) -> Result<Vec<String>, String> {
    Ok(remote::fetch_home_pages(&state.http, &state.root).await)
}

#[tauri::command]
async fn get_server_list(state: State<'_, AppState>) -> Result<Vec<servers::RemoteServer>, String> {
    Ok(match remote::fetch_updater_file(&state.http, &state.root, "olserverlist.json").await {
        Some(raw) => servers::parse_server_list(&raw),
        None => vec![],
    })
}

#[tauri::command]
async fn ping_server(host: String, port: Option<u16>) -> Result<servers::PingResult, String> {
    tokio::task::spawn_blocking(move || servers::ping_server(&host, port.unwrap_or(25565), 3500))
        .await
        .map_err(|e| e.to_string())?
}

// ---------------------------------------------------------------------------
// accounts

#[tauri::command]
fn list_accounts(state: State<AppState>) -> Vec<accounts::Account> {
    accounts::load_accounts(&state.root)
}

#[tauri::command]
fn add_offline_account(state: State<AppState>, name: String) -> Result<accounts::Account, String> {
    let acc = accounts::create_offline_account(&state.root, &name)?;
    let mut settings = state.settings.lock().unwrap();
    settings.active_account_id = Some(acc.id.clone());
    let _ = store::save_settings(&state.root, &settings);
    Ok(acc)
}

#[tauri::command]
async fn login_microsoft(state: State<'_, AppState>) -> Result<accounts::Account, String> {
    let acc = accounts::ms_login(&state.http).await?;
    let mut all = accounts::load_accounts(&state.root);
    all.push(acc.clone());
    accounts::save_accounts(&state.root, &all)?;
    let mut settings = state.settings.lock().unwrap();
    settings.active_account_id = Some(acc.id.clone());
    let _ = store::save_settings(&state.root, &settings);
    Ok(acc)
}

#[tauri::command]
fn remove_account(state: State<AppState>, account_id: String) -> Result<(), String> {
    let mut all = accounts::load_accounts(&state.root);
    all.retain(|a| a.id != account_id);
    accounts::save_accounts(&state.root, &all)?;
    accounts::delete_refresh_token(&account_id);
    let mut settings = state.settings.lock().unwrap();
    if settings.active_account_id.as_deref() == Some(&account_id) {
        settings.active_account_id = all.first().map(|a| a.id.clone());
        let _ = store::save_settings(&state.root, &settings);
    }
    Ok(())
}

#[tauri::command]
fn switch_account(state: State<AppState>, account_id: String) -> Result<store::Settings, String> {
    let all = accounts::load_accounts(&state.root);
    if !all.iter().any(|a| a.id == account_id) {
        return Err("Account not found".into());
    }
    let mut settings = state.settings.lock().unwrap();
    settings.active_account_id = Some(account_id);
    store::save_settings(&state.root, &settings)?;
    Ok(settings.clone())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AccountStatus {
    ok: bool,
    needs_sign_in: bool,
    message: String,
}

#[tauri::command]
async fn validate_account(state: State<'_, AppState>, account_id: String) -> Result<AccountStatus, String> {
    let all = accounts::load_accounts(&state.root);
    let Some(acc) = all.iter().find(|a| a.id == account_id) else {
        return Ok(AccountStatus { ok: false, needs_sign_in: true, message: "Account not found".into() });
    };
    if acc.kind == "offline" {
        return Ok(AccountStatus { ok: true, needs_sign_in: false, message: String::new() });
    }
    match accounts::ms_refresh(&state.http, acc).await {
        Ok(updated) => {
            let mut all = accounts::load_accounts(&state.root);
            if let Some(slot) = all.iter_mut().find(|a| a.id == updated.id) {
                *slot = updated.clone();
                let _ = accounts::save_accounts(&state.root, &all);
            }
            Ok(AccountStatus { ok: true, needs_sign_in: false, message: String::new() })
        }
        Err(e) => Ok(AccountStatus { ok: false, needs_sign_in: true, message: e }),
    }
}

// ---------------------------------------------------------------------------
// profile (skins + capes)

/// Refresh the Microsoft account and return a usable Minecraft token.
async fn fresh_mc_token(state: &State<'_, AppState>, account_id: &str) -> Result<(accounts::Account, String), String> {
    let all = accounts::load_accounts(&state.root);
    let acc = all
        .iter()
        .find(|a| a.id == account_id)
        .cloned()
        .ok_or("Account not found")?;
    if acc.kind != "microsoft" {
        return Err("Skins and capes need a Microsoft account".into());
    }
    let updated = accounts::ms_refresh(&state.http, &acc).await?;
    {
        let mut all = accounts::load_accounts(&state.root);
        if let Some(slot) = all.iter_mut().find(|a| a.id == updated.id) {
            *slot = updated.clone();
            let _ = accounts::save_accounts(&state.root, &all);
        }
    }
    let token = updated
        .access_token
        .clone()
        .ok_or("This account has no Minecraft token ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â sign in again")?;
    Ok((updated, token))
}

#[tauri::command]
async fn get_account_profile(
    state: State<'_, AppState>,
    account_id: String,
) -> Result<profile::ProfileInfo, String> {
    let (_acc, token) = fresh_mc_token(&state, &account_id).await?;
    profile::profile(&state.http, &token).await
}

#[tauri::command]
async fn set_cape(
    state: State<'_, AppState>,
    account_id: String,
    cape_id: Option<String>,
) -> Result<(), String> {
    let (_acc, token) = fresh_mc_token(&state, &account_id).await?;
    profile::set_cape(&state.http, &token, cape_id.as_deref()).await
}

#[tauri::command]
async fn upload_skin(
    state: State<'_, AppState>,
    account_id: String,
    path: String,
    variant: String,
) -> Result<(), String> {
    let (_acc, token) = fresh_mc_token(&state, &account_id).await?;
    profile::upload_skin(&state.http, &token, std::path::Path::new(&path), &variant).await
}

// ---------------------------------------------------------------------------
// hardware / optimize

#[tauri::command]
async fn hardware_scan() -> hardware::HardwareInfo {
    tokio::task::spawn_blocking(hardware::scan)
        .await
        .unwrap_or_else(|_| hardware::HardwareInfo {
            cpu_name: "Unknown CPU".into(),
            cpu_cores: 4,
            ram_total_gb: 8.0,
            gpu_name: "Unknown GPU".into(),
        })
}

#[tauri::command]
fn recommended_ram(total_gb: f64) -> u32 {
    hardware::recommended_ram(total_gb)
}

// ---------------------------------------------------------------------------
// storage

#[tauri::command]
async fn storage_breakdown(state: State<'_, AppState>) -> Result<Vec<storage::StorageItem>, String> {
    let root = state.root.clone();
    Ok(tokio::task::spawn_blocking(move || storage::breakdown(&root))
        .await
        .unwrap_or_default())
}

#[tauri::command]
async fn clean_storage_junk(state: State<'_, AppState>) -> Result<u64, String> {
    let root = state.root.clone();
    Ok(tokio::task::spawn_blocking(move || storage::clean_junk(&root))
        .await
        .unwrap_or(0))
}

// ---------------------------------------------------------------------------
// news

#[tauri::command]
async fn fetch_news(state: State<'_, AppState>) -> Result<Vec<news::NewsItem>, String> {
    news::fetch_news(&state.http).await
}

#[tauri::command]
async fn fetch_article(state: State<'_, AppState>, url: String) -> Result<String, String> {
    news::fetch_article_text(&state.http, &url).await
}

// ---------------------------------------------------------------------------
// updates

#[tauri::command]
async fn check_update(state: State<'_, AppState>) -> Result<update::UpdateInfo, String> {
    update::check(&state.http, env!("CARGO_PKG_VERSION")).await
}

#[tauri::command]
async fn download_update(app: AppHandle, state: State<'_, AppState>, url: String) -> Result<(), String> {
    let app2 = app.clone();
    let path = update::download_installer(&state.http, &state.root, &url, move |done, total| {
        let _ = app2.emit(
            "update-progress",
            serde_json::json!({ "done": done, "total": total }),
        );
    })
    .await?;
    update::run_installer(&path)?;
    app.exit(0);
    Ok(())
}

// ---------------------------------------------------------------------------
// misc net helpers

#[tauri::command]
async fn fetch_bytes_b64(state: State<'_, AppState>, url: String) -> Result<String, String> {
    remote::fetch_bytes_b64(&state.http, &url).await
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct LogPayload {
    timestamp: u64,
    level: String,
    source: String,
    message: String,
}

fn record_log(app: &AppHandle, root: &PathBuf, level: &str, source: &str, message: &str) {
    let clean = message.replace('\r', "").trim().to_string();
    if clean.is_empty() {
        return;
    }
    let payload = LogPayload {
        timestamp: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis() as u64)
            .unwrap_or_default(),
        level: level.to_string(),
        source: source.to_string(),
        message: clean,
    };
    if let Ok(line) = serde_json::to_string(&payload) {
        let path = root.join("logs").join("orbit.log");
        if let Some(parent) = path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        use std::io::Write;
        if let Ok(mut file) = std::fs::OpenOptions::new().create(true).append(true).open(path) {
            let _ = writeln!(file, "{line}");
        }
    }
    let _ = app.emit("app-log", payload);
}

#[tauri::command]
fn read_logs(state: State<AppState>) -> Result<String, String> {
    let path = state.root.join("logs").join("orbit.log");
    let raw = std::fs::read(&path).unwrap_or_default();
    let start = raw.len().saturating_sub(512 * 1024);
    Ok(String::from_utf8_lossy(&raw[start..]).to_string())
}

// ---------------------------------------------------------------------------
// launching

#[tauri::command]
async fn launch_space(
    app: AppHandle,
    state: State<'_, AppState>,
    space_id: String,
    server_ip: Option<String>,
    server_port: Option<u16>,
) -> Result<(), String> {
    {
        let running = state.running.lock().unwrap();
        if running.get(&space_id).copied().unwrap_or(false) {
            return Err("This Space is already running".into());
        }
    }

    // account first
    let settings = state.settings.lock().unwrap().clone();
    let accounts_list = accounts::load_accounts(&state.root);
    let account = settings
        .active_account_id
        .as_deref()
        .and_then(|id| accounts_list.iter().find(|a| a.id == id))
        .cloned()
        .or_else(|| accounts_list.first().cloned())
        .ok_or("Add an account first ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â it takes 10 seconds!")?;

    let account = if account.kind == "microsoft" {
        accounts::ms_refresh(&state.http, &account)
            .await
            .map_err(|e| format!("Microsoft sign-in problem: {e}"))?
    } else {
        account
    };

    let all_spaces = state.spaces();
    let idx = all_spaces
        .iter()
        .position(|s| s.id == space_id)
        .ok_or("Space not found")?;
    let mut space = all_spaces[idx].clone();

    let server = server_ip
        .filter(|ip| !ip.trim().is_empty())
        .map(|ip| (ip, server_port.unwrap_or(25565)));

    let root = state.root.clone();
    let http = state.http.clone();
    let app2 = app.clone();
    let sid = space_id.clone();
    let running = state.running.clone();
    let log_root = root.clone();

    {
        running.lock().unwrap().insert(space_id.clone(), true);
    }

    tauri::async_runtime::spawn(async move {
        // Safety net: no matter how this task ends (error, panic...), the Space
        // must be unlocked and the UI must receive a terminal progress event.
        let mut guard = LaunchGuard {
            running: running.clone(),
            sid: sid.clone(),
            app: app2.clone(),
            root: log_root.clone(),
            armed: true,
        };
        let sid2 = sid.clone();
        let app3 = app2.clone();
        let log_root2 = log_root.clone();
        let emit = Arc::new(move |stage: &str, message: &str, done: u64, total: u64| {
            record_log(&app3, &log_root2, if stage == "error" { "error" } else { "info" }, stage, message);
            let _ = app3.emit(
                "space-progress",
                ProgressPayload {
                    space_id: sid2.clone(),
                    stage: stage.to_string(),
                    message: message.to_string(),
                    done,
                    total,
                },
            );
        });
        let sink = ProgressSink::new(emit);
        let running2 = running.clone();
        let sid_exit = sid.clone();
        let app_exit = app2.clone();
        let log_root_exit = log_root.clone();
        let on_exit: Arc<launch::ExitFn> = Arc::new(move |code| {
            running2.lock().unwrap().insert(sid_exit.clone(), false);
            let message = format!("Minecraft process closed with exit code: {code:?}");
            record_log(&app_exit, &log_root_exit, "info", "minecraft", &message);
            let _ = app_exit.emit(
                "space-progress",
                ProgressPayload {
                    space_id: sid_exit.clone(),
                    stage: "stopped".into(),
                    message,
                    done: 0,
                    total: 0,
                },
            );
        });
        let result = launch::prepare_and_launch(
            http,
            root.clone(),
            &mut space,
            &settings,
            &account,
            sink,
            on_exit,
            true,
            server,
        )
        .await;

        match result {
            Ok(outcome) => {
                guard.armed = false; // normal path: on_exit reports "stopped" later
                space.last_played = Some(spaces::now_secs());
                space.installed_version_id = Some(outcome.version_id.clone());
                let mut all = spaces::load_spaces(&root);
                if let Some(pos) = all.iter().position(|s| s.id == space.id) {
                    all[pos] = space.clone();
                    let _ = spaces::save_spaces(&root, &all);
                }
                let _ = app2.emit(
                    "space-progress",
                    ProgressPayload {
                        space_id: sid.clone(),
                        stage: "running".into(),
                        message: "Playing".into(),
                        done: 0,
                        total: 0,
                    },
                );
            }
            Err(e) => {
                running.lock().unwrap().insert(sid.clone(), false);
                guard.armed = false;
                record_log(&app2, &log_root, "error", "launch", &e);
                let _ = app2.emit(
                    "space-progress",
                    ProgressPayload {
                        space_id: sid.clone(),
                        stage: "error".into(),
                        message: e,
                        done: 0,
                        total: 0,
                    },
                );
            }
        }
        drop(guard);
    });

    Ok(())
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ProgressPayload {
    space_id: String,
    stage: String,
    message: String,
    done: u64,
    total: u64,
}

/// If the launch task dies unexpectedly (e.g. a panic), unlock the Space and
/// tell the UI instead of leaving it stuck on "Loading" forever.
struct LaunchGuard {
    running: Arc<Mutex<HashMap<String, bool>>>,
    sid: String,
    app: AppHandle,
    root: PathBuf,
    armed: bool,
}

impl Drop for LaunchGuard {
    fn drop(&mut self) {
        if !self.armed {
            return;
        }
        {
            let mut map = self.running.lock().unwrap_or_else(|e| e.into_inner());
            map.insert(self.sid.clone(), false);
        }
        let _ = self.app.emit(
            "space-progress",
            ProgressPayload {
                space_id: self.sid.clone(),
                stage: "error".into(),
                message: "Something crashed inside the launcher ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â please try again".into(),
                done: 0,
                total: 0,
            },
        );
        record_log(&self.app, &self.root, "error", "launcher", "Something crashed inside the launcher ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â please try again");
    }
}

#[tauri::command]
fn is_running(state: State<AppState>, space_id: String) -> bool {
    state
        .running
        .lock()
        .unwrap()
        .get(&space_id)
        .copied()
        .unwrap_or(false)
}

#[tauri::command]
fn app_data_dir(state: State<AppState>) -> String {
    state.root.to_string_lossy().to_string()
}

#[tauri::command]
fn open_url(url: String) -> Result<(), String> {
    if url.starts_with("http://") || url.starts_with("https://") {
        open::that(&url).map_err(|e| e.to_string())
    } else {
        Err("Bad link".into())
    }
}

// ---------------------------------------------------------------------------

fn main() {
    let root = store::data_root();
    let _ = store::ensure_dirs(&root);
    let settings = store::load_settings(&root);

    // Hidden self-test: `orbit-launcher --selftest <mcVersion> [loader] [--run]`
    let argv: Vec<String> = std::env::args().collect();
    if let Some(pos) = argv.iter().position(|a| a == "--selftest") {
        let mc = argv.get(pos + 1).cloned().unwrap_or_else(|| "1.21.1".into());
        let loader = argv.get(pos + 2).cloned().unwrap_or_else(|| "vanilla".into());
        let run = argv.iter().any(|a| a == "--run");
        let code = selftest(root.clone(), settings.clone(), mc, loader, run);
        std::process::exit(code);
    }

    let http = reqwest::Client::builder()
        .user_agent(concat!("OrbitLauncher/", env!("CARGO_PKG_VERSION")))
        .pool_max_idle_per_host(64)
        .connect_timeout(std::time::Duration::from_secs(20))
        .build()
        .expect("http client");

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState {
            root: root.clone(),
            http,
            settings: Mutex::new(settings),
            running: Arc::new(Mutex::new(HashMap::new())),
        })
        .invoke_handler(tauri::generate_handler![
            get_settings,
            save_settings,
            list_game_versions,
            list_loader_versions,
            list_installed_versions,
            list_spaces,
            create_space,
            update_space,
            duplicate_space,
            delete_space,
            open_space_folder,
            export_space,
            import_space,
            search_content,
            content_details,
            install_content,
            reconcile_content,
            remove_content,
            get_home_pages,
            get_server_list,
            ping_server,
            list_accounts,
            add_offline_account,
            login_microsoft,
            remove_account,
            switch_account,
            validate_account,
            get_account_profile,
            set_cape,
            upload_skin,
            hardware_scan,
            recommended_ram,
            storage_breakdown,
            clean_storage_junk,
            fetch_news,
            fetch_article,
            check_update,
            download_update,
            fetch_bytes_b64,
            launch_space,
            is_running,
            app_data_dir,
            open_url,
            read_logs,
        ])
        .setup(move |app| {
            #[cfg(desktop)]
            {
                let _window = app.get_webview_window("main");
            }
            record_log(app.handle(), &root, "info", "system", "Orbit Launcher (beta) started");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Orbit Launcher");
}

// ---------------------------------------------------------------------------
// Self test: drives the REAL launch pipeline from the command line.

fn selftest(root: PathBuf, settings: store::Settings, mc: String, loader: String, run: bool) -> i32 {
    println!("=== Orbit Launcher self-test ===");
    println!("root: {}", root.display());
    println!("version: {mc} | loader: {loader} | run: {run}");

    let http = reqwest::Client::builder()
        .user_agent(concat!("OrbitLauncher/", env!("CARGO_PKG_VERSION")))
        .pool_max_idle_per_host(64)
        .build()
        .expect("http client");

    let rt = tokio::runtime::Runtime::new().unwrap();
    rt.block_on(async move {
        let account = accounts::Account {
            id: "selftest".into(),
            username: "SelfTester".into(),
            uuid: accounts::offline_uuid("SelfTester"),
            kind: "offline".into(),
            access_token: None,
            xuid: None,
        };
        let mut space = spaces::Space {
            id: "selftest-space".into(),
            name: "SelfTest".into(),
            icon: "rocket".into(),
            color: "#5ac8fa".into(),
            mc_version: mc,
            loader,
            loader_version: None,
            installed_version_id: None,
            mods: vec![],
            created_at: spaces::now_secs(),
            last_played: None,
            ram_gb: Some(2),
        };

        let emit = Arc::new(|stage: &str, message: &str, done: u64, total: u64| {
            if total > 0 {
                let pct = (done * 100) / total.max(1);
                print!("\r[{stage}] {message} {pct}% ({done}/{total})          ");
                use std::io::Write;
                let _ = std::io::stdout().flush();
            } else {
                print!("\r[{stage}] {message}                    ");
                use std::io::Write;
                let _ = std::io::stdout().flush();
            }
        });
        let sink = ProgressSink::new(emit);
        let on_exit: Arc<launch::ExitFn> = Arc::new(|code| {
            println!("\n[exit] game process closed with code: {code:?}");
        });

        match launch::prepare_and_launch(
            http,
            root,
            &mut space,
            &settings,
            &account,
            sink,
            on_exit,
            run,
            None,
        )
        .await
        {
            Ok(outcome) => {
                println!("\n[ok] resolved version: {}", outcome.version_id);
                0
            }
            Err(e) => {
                eprintln!("\n[FAIL] {e}");
                1
            }
        }
    })
}
