//! Remote config/content from the private OL-updater GitHub repo.
//! The token is baked in at build time from secrets.env (never committed).

use std::path::PathBuf;

pub const UPDATER_TOKEN: &str = match option_env!("ORBIT_UPDATER_TOKEN") {
    Some(t) => t,
    None => "",
};
pub const CF_KEY: &str = match option_env!("ORBIT_CF_KEY") {
    Some(t) => t,
    None => "",
};

pub const REPO_BASE: &str = "https://api.github.com/repos/unmid/OL-updater/contents";
pub const RELEASES_REPO: &str = "unmid/Orbit-Launcher";

fn cache_path(root: &PathBuf, name: &str) -> PathBuf {
    root.join("cache").join("remote").join(name)
}

/// Fetch a file from the updater repo (Contents API). Falls back to the last
/// cached copy when the network/token fails. Returns None only if nothing was
/// ever cached.
pub async fn fetch_updater_file(
    http: &reqwest::Client,
    root: &PathBuf,
    file: &str,
) -> Option<String> {
    let cache = cache_path(root, &file.replace('/', "_"));

    let result: Result<String, String> = async {
        if UPDATER_TOKEN.is_empty() {
            return Err("no updater token".into());
        }
        let url = format!("{REPO_BASE}/{file}");
        let bytes = http
            .get(&url)
            .header("Authorization", format!("Bearer {UPDATER_TOKEN}"))
            .header("Accept", "application/vnd.github.raw+json")
            .header("X-GitHub-Api-Version", "2022-11-28")
            .send()
            .await
            .map_err(|e| e.to_string())?
            .error_for_status()
            .map_err(|e| e.to_string())?
            .bytes()
            .await
            .map_err(|e| e.to_string())?;
        Ok(String::from_utf8_lossy(&bytes).to_string())
    }
    .await;

    match result {
        Ok(text) => {
            if let Some(parent) = cache.parent() {
                let _ = std::fs::create_dir_all(parent);
            }
            let _ = std::fs::write(&cache, &text);
            Some(text)
        }
        Err(_) => std::fs::read_to_string(&cache).ok(),
    }
}

/// Home hero pages: looks for ol/manifest.json ("pages": ["1.html", ...]) and
/// downloads every page in parallel (each one cached on disk like any updater
/// file, so the launcher still shows them offline later). Falls back to the
/// legacy single ol.html, then to an empty list (UI shows wallpapers).
pub async fn fetch_home_pages(http: &reqwest::Client, root: &PathBuf) -> Vec<String> {
    if let Some(manifest) = fetch_updater_file(http, root, "ol/manifest.json").await {
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(&manifest) {
            if let Some(arr) = v.get("pages").and_then(|x| x.as_array()) {
                let names: Vec<String> = arr
                    .iter()
                    .filter_map(|p| p.as_str())
                    .take(8)
                    .map(|p| p.trim().trim_matches(|c| c == '/' || c == '\\').to_string())
                    .filter(|p| !p.is_empty() && !p.contains("..") && !p.contains(|c| c == '/' || c == '\\'))
                    .collect();
                if !names.is_empty() {
                    let mut set = tokio::task::JoinSet::new();
                    for (i, n) in names.into_iter().enumerate() {
                        let http = http.clone();
                        let root = root.clone();
                        set.spawn(async move { (i, fetch_updater_file(&http, &root, &format!("ol/{n}")).await) });
                    }
                    let mut pages: Vec<(usize, String)> = Vec::new();
                    while let Some(r) = set.join_next().await {
                        if let Ok((i, Some(html))) = r {
                            if html.trim().len() > 20 {
                                pages.push((i, html));
                            }
                        }
                    }
                    if !pages.is_empty() {
                        pages.sort_by_key(|(i, _)| *i); // manifest order, not completion order
                        return pages.into_iter().map(|(_, h)| h).collect();
                    }
                }
            }
        }
    }
    // legacy single-file home page
    if let Some(h) = fetch_updater_file(http, root, "ol.html").await {
        if h.trim().len() > 20 {
            return vec![h];
        }
    }
    vec![]
}

/// Download any URL to bytes (for textures/icons through the backend,
/// avoiding CORS issues in the webview).
pub async fn fetch_bytes_b64(http: &reqwest::Client, url: &str) -> Result<String, String> {
    if !(url.starts_with("https://") || url.starts_with("http://")) {
        return Err("Bad link".into());
    }
    let bytes = http
        .get(url)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .error_for_status()
        .map_err(|e| e.to_string())?
        .bytes()
        .await
        .map_err(|e| e.to_string())?;
    Ok(base64_encode(&bytes))
}

const B64: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

pub fn base64_encode(data: &[u8]) -> String {
    let mut out = String::with_capacity((data.len() + 2) / 3 * 4);
    for chunk in data.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = *chunk.get(1).unwrap_or(&0) as u32;
        let b2 = *chunk.get(2).unwrap_or(&0) as u32;
        let n = (b0 << 16) | (b1 << 8) | b2;
        out.push(B64[(n >> 18) as usize & 63] as char);
        out.push(B64[(n >> 12) as usize & 63] as char);
        out.push(if chunk.len() > 1 { B64[(n >> 6) as usize & 63] as char } else { '=' });
        out.push(if chunk.len() > 2 { B64[n as usize & 63] as char } else { '=' });
    }
    out
}
