//! Mojang's official Java runtimes - the launcher grabs the exact Java Mojang
//! picked for each Minecraft version. The component name comes straight from
//! Mojang's own version JSON, so when Mojang ships a newer runtime (Java 25+...)
//! new Minecraft versions automatically get it.
//!
//! Today: jre-legacy = Java 8 (MC <= 1.16.5), alpha = 16, beta/gamma = 17
//! (MC 1.17 - 1.20.4), delta = 21 (MC 1.20.5+).

use crate::download::{download_all, file_ok, DownloadTask};
use serde_json::Value;
use std::path::PathBuf;
use std::sync::Arc;

const RUNTIME_INDEX: &str =
    "https://piston-meta.mojang.com/v1/products/java-runtime/2ec0cc96c44e5a76b9c8b7c39df7210883d12871/all.json";

fn platform_key() -> &'static str {
    if cfg!(windows) && cfg!(target_arch = "x86_64") {
        "windows-x64"
    } else if cfg!(windows) {
        "windows-x86"
    } else if cfg!(target_os = "macos") && cfg!(target_arch = "aarch64") {
        "mac-os-arm64"
    } else if cfg!(target_os = "macos") {
        "mac-os"
    } else if cfg!(target_arch = "x86_64") {
        "linux"
    } else {
        "linux-i386"
    }
}

fn java_exe_name() -> &'static str {
    if cfg!(windows) {
        // Use java.exe so the launcher can validate the runtime and capture
        // useful diagnostics. The official runtime also ships javaw.exe; it
        // remains a last-resort executable for older caches.
        "java.exe"
    } else {
        "java"
    }
}

#[allow(dead_code)] // part of the runtime-layout API surface
pub fn runtime_java_path(root: &PathBuf, component: &str) -> PathBuf {
    root.join("runtimes")
        .join(component)
        .join("bin")
        .join(java_exe_name())
}

fn runtime_java_candidates(root: &PathBuf, component: &str) -> [PathBuf; 2] {
    let base = root.join("runtimes").join(component).join("bin");
    [base.join(java_exe_name()), base.join("javaw.exe")]
}

fn compatible_major(actual: u32, required: Option<u32>) -> bool {
    match required {
        // Old Minecraft versions are not reliably compatible with a newer
        // JVM, so Java 8 must stay Java 8.
        Some(8) => actual == 8,
        Some(need) => actual >= need,
        None => true,
    }
}

fn java_major(path: &PathBuf) -> Option<u32> {
    let output = std::process::Command::new(path).arg("-version").output().ok()?;
    if !output.status.success() {
        return None;
    }
    let text = format!("{}\n{}", String::from_utf8_lossy(&output.stderr), String::from_utf8_lossy(&output.stdout));
    let marker = text.split("version").nth(1)?;
    let raw = marker.trim().trim_matches(['"', '\'']);
    let first = raw.split(['.', '-']).next()?.parse::<u32>().ok()?;
    Some(if first == 1 { raw.split('.').nth(1)?.parse().ok()? } else { first })
}

fn usable_java(path: &PathBuf, required: Option<u32>) -> bool {
    path.exists() && java_major(path).map(|major| compatible_major(major, required)).unwrap_or(false)
}

fn find_runtime_java(root: &PathBuf, component: &str, required: Option<u32>) -> Option<PathBuf> {
    runtime_java_candidates(root, component)
        .into_iter()
        .find(|path| usable_java(path, required))
}

fn component_major(component: &str) -> Option<u32> {
    match component {
        "jre-legacy" => Some(8),
        "java-runtime-alpha" => Some(16),
        "java-runtime-beta" => Some(17),
        "java-runtime-gamma" | "java-runtime-gamma-snapshot" => Some(17),
        "java-runtime-delta" => Some(21),
        _ => None, // unknown/future component -> treat as "latest available"
    }
}

pub fn required_major(component: &str) -> Option<u32> {
    component_major(component)
}

pub async fn ensure_java(
    http: &reqwest::Client,
    root: &PathBuf,
    component: &str,
    progress: Arc<dyn Fn(u64, u64) + Send + Sync>,
) -> Result<PathBuf, String> {
    // 1. already on disk: exact component, or any local runtime new enough
    if let Some(path) = find_runtime_java(root, component, component_major(component)) {
        return Ok(path);
    }
    if let Some(req_major) = component_major(component) {
        if let Ok(any) = std::fs::read_dir(root.join("runtimes")) {
            for entry in any.flatten() {
                let name = entry.file_name().to_string_lossy().to_string();
                if let Some(m) = component_major(&name) {
                    if (req_major == 8 && m == 8) || (req_major != 8 && m >= req_major) {
                        if let Some(p) = find_runtime_java(root, &name, Some(req_major)) {
                            return Ok(p);
                        }
                    }
                }
            }
        }
    }

    // 2. fetch the runtime catalog
    let index: Value = http
        .get(RUNTIME_INDEX)
        .timeout(std::time::Duration::from_secs(30))
        .send()
        .await
        .map_err(|e| e.to_string())?
        .error_for_status()
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;

    let platform = index
        .get(platform_key())
        .and_then(|x| x.as_object())
        .cloned()
        .ok_or_else(|| "No Java runtime for this platform".to_string())?;

    // 3. build candidate list: exact component first, then newer-or-equal
    //    components (lowest first), then anything else; always-able components only.
    let available: Vec<String> = platform
        .iter()
        .filter(|(_, v)| v.as_array().map(|a| !a.is_empty()).unwrap_or(false))
        .map(|(k, _)| k.clone())
        .collect();
    if available.is_empty() {
        return Err("Mojang lists no Java runtimes for this PC".into());
    }

    let req_major = component_major(component);
    let mut candidates: Vec<String> = Vec::new();
    if available.iter().any(|c| c == component) {
        candidates.push(component.to_string());
    }
    let mut newer: Vec<&String> = available
        .iter()
        .filter(|c| {
            component_major(c)
                .zip(req_major)
                .map(|(have, need)| if need == 8 { have == 8 } else { have >= need })
                .unwrap_or(false)
                && !candidates.contains(*c)
        })
        .collect();
    newer.sort_by_key(|c| component_major(c).unwrap_or(999));
    candidates.extend(newer.into_iter().cloned());
    for c in &available {
        let compatible = match req_major {
            Some(8) => component_major(c) == Some(8),
            Some(need) => component_major(c).map(|have| have >= need).unwrap_or(false),
            None => true,
        };
        if compatible && !candidates.contains(c) {
            candidates.push(c.clone());
        }
    }

    let mut last_err = String::new();
    for comp in candidates {
        match download_component(http, root, &platform, &comp, progress.clone()).await {
            Ok(path) => return Ok(path),
            Err(e) => last_err = format!("{comp}: {e}"),
        }
    }
    if let Some(path) = system_java_for(req_major) {
        return Ok(path);
    }
    Err(format!("Couldn't get a compatible Java runtime ({last_err})"))
}

async fn download_component(
    http: &reqwest::Client,
    root: &PathBuf,
    platform: &serde_json::Map<String, Value>,
    component: &str,
    progress: Arc<dyn Fn(u64, u64) + Send + Sync>,
) -> Result<PathBuf, String> {
    let entry = platform
        .get(component)
        .and_then(|x| x.as_array())
        .and_then(|arr| arr.first())
        .cloned()
        .ok_or_else(|| "not in catalog".to_string())?;

    let manifest_url = entry
        .get("manifest")
        .and_then(|m| m.get("url"))
        .and_then(|x| x.as_str())
        .ok_or("Bad Java runtime manifest")?;

    let manifest: Value = http
        .get(manifest_url)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .error_for_status()
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;

    let dest_root = root.join("runtimes").join(component);
    let files = manifest
        .get("files")
        .and_then(|x| x.as_object())
        .ok_or("Bad Java runtime manifest")?;

    let mut tasks = Vec::new();
    for (rel, info) in files {
        let kind = info.get("type").and_then(|x| x.as_str()).unwrap_or("");
        match kind {
            "directory" => {
                let _ = std::fs::create_dir_all(dest_root.join(rel));
            }
            "file" => {
                if let Some(raw) = info.get("downloads").and_then(|d| d.get("raw")) {
                    let url = raw.get("url").and_then(|x| x.as_str()).unwrap_or("");
                    let sha1 = raw
                        .get("sha1")
                        .and_then(|x| x.as_str())
                        .map(|s| s.to_string());
                    let size = raw.get("size").and_then(|x| x.as_u64()).unwrap_or(0);
                    if !url.is_empty() {
                        let dest = dest_root.join(rel);
                        if !file_ok(&dest, &sha1) {
                            tasks.push(DownloadTask {
                                url: url.to_string(),
                                dest,
                                sha1,
                                size,
                            });
                        }
                    }
                }
            }
            // "link" entries (symlinks) barely exist on windows runtimes - skip
            _ => {}
        }
    }

    download_all(http.clone(), tasks, 24, progress).await?;

    let java = find_runtime_java(root, component, component_major(component));
    let Some(java) = java else {
        return Err("Java download finished but the executable is missing".into());
    };
    Ok(java)
}

/// Last-resort fallback: a system java on PATH.
#[allow(dead_code)]
pub fn system_java() -> Option<PathBuf> {
    system_java_for(None)
}

pub fn system_java_for(required: Option<u32>) -> Option<PathBuf> {
    let exe = if cfg!(windows) { "where" } else { "which" };
    let out = std::process::Command::new(exe)
        .arg("java")
        .output()
        .ok()?;
    if !out.status.success() {
        return None;
    }
    let s = String::from_utf8_lossy(&out.stdout);
    s.lines()
        .map(|l| PathBuf::from(l.trim()))
        .find(|path| usable_java(path, required))
}
