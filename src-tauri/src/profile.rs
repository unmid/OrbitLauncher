//! Mojang profile: skins + capes for Microsoft accounts.
//! Uses the official Player Services API with the account's Minecraft token.

use serde::Serialize;
use serde_json::{json, Value};

pub const SERVICES: &str = "https://api.minecraftservices.com";

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SkinInfo {
    pub id: String,
    pub state: String,
    pub variant: String,
    pub active: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CapeInfo {
    pub id: String,
    pub state: String,
    pub alias: String,
    pub active: bool,
    pub url: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileInfo {
    pub name: String,
    pub skins: Vec<SkinInfo>,
    pub capes: Vec<CapeInfo>,
    /// data: URL of the active skin texture (for the 3D preview)
    pub active_skin_data: String,
    pub active_cape_url: String,
}

async fn get_profile(http: &reqwest::Client, token: &str) -> Result<Value, String> {
    let v: Value = http
        .get(format!("{SERVICES}/minecraft/profile"))
        .bearer_auth(token)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .error_for_status()
        .map_err(|e| format!("Couldn't load the profile ({e})"))?
        .json()
        .await
        .map_err(|e| e.to_string())?;
    Ok(v)
}

pub async fn profile(http: &reqwest::Client, token: &str) -> Result<ProfileInfo, String> {
    let v = get_profile(http, token).await?;
    let name = v
        .get("name")
        .and_then(|x| x.as_str())
        .unwrap_or("")
        .to_string();

    let skins: Vec<SkinInfo> = v
        .get("skins")
        .and_then(|x| x.as_array())
        .cloned()
        .unwrap_or_default()
        .iter()
        .map(|s| SkinInfo {
            id: s.get("id").and_then(|x| x.as_str()).unwrap_or("").to_string(),
            state: s.get("state").and_then(|x| x.as_str()).unwrap_or("").to_string(),
            variant: s
                .get("variant")
                .and_then(|x| x.as_str())
                .unwrap_or("classic")
                .to_string(),
            active: s.get("state").and_then(|x| x.as_str()) == Some("ACTIVE"),
        })
        .collect();

    // Mojang answers with plain http:// texture links — always upgrade to
    // https (webview CSP only allows https + data: images).
    let https = |u: Option<&str>| u.unwrap_or("").replace("http://", "https://");

    let capes: Vec<CapeInfo> = v
        .get("capes")
        .and_then(|x| x.as_array())
        .cloned()
        .unwrap_or_default()
        .iter()
        .map(|c| CapeInfo {
            id: c.get("id").and_then(|x| x.as_str()).unwrap_or("").to_string(),
            state: c.get("state").and_then(|x| x.as_str()).unwrap_or("").to_string(),
            alias: c.get("alias").and_then(|x| x.as_str()).unwrap_or("Cape").to_string(),
            active: c.get("state").and_then(|x| x.as_str()) == Some("ACTIVE"),
            url: https(c.get("url").and_then(|x| x.as_str())),
        })
        .collect();

    // fetch the active skin texture as data: URL for the 3D preview
    let active_skin_url = v
        .get("skins")
        .and_then(|x| x.as_array())
        .and_then(|a| {
            a.iter()
                .find(|s| s.get("state").and_then(|x| x.as_str()) == Some("ACTIVE"))
                .or_else(|| a.first())
        })
        .and_then(|s| s.get("url"))
        .and_then(|x| x.as_str())
        .map(|s| s.to_string());
    let active_cape_url = https(
        v.get("capes")
            .and_then(|x| x.as_array())
            .and_then(|a| {
                a.iter()
                    .find(|c| c.get("state").and_then(|x| x.as_str()) == Some("ACTIVE"))
                    .or_else(|| a.first())
            })
            .and_then(|c| c.get("url"))
            .and_then(|x| x.as_str()),
    );

    let active_skin_data = match active_skin_url {
        Some(u) => crate::remote::fetch_bytes_b64(http, &u)
            .await
            .map(|b| format!("data:image/png;base64,{b}"))
            .unwrap_or_default(),
        None => String::new(),
    };

    Ok(ProfileInfo {
        name,
        skins,
        capes,
        active_skin_data,
        active_cape_url,
    })
}

async fn set_cape_once(http: &reqwest::Client, token: &str, cape_id: Option<&str>) -> Result<(), String> {
    match cape_id {
        Some(id) => {
            http.put(format!("{SERVICES}/minecraft/profile/capes/active"))
                .bearer_auth(token)
                .json(&json!({ "capeId": id }))
                .send()
                .await
                .map_err(|e| e.to_string())?
                .error_for_status()
                .map_err(|e| format!("Couldn't equip the cape ({e})"))?;
        }
        None => {
            http.delete(format!("{SERVICES}/minecraft/profile/capes/active"))
                .bearer_auth(token)
                .send()
                .await
                .map_err(|e| e.to_string())?
                .error_for_status()
                .map_err(|e| format!("Couldn't remove the cape ({e})"))?;
        }
    }
    Ok(())
}

/// Active cape, or none. `cape_id` None removes the cape.
/// Mojang's cape endpoint is notoriously flaky (often 502): retry a few times
/// with backoff, then tell the user the honest reason + the official fallback.
pub async fn set_cape(http: &reqwest::Client, token: &str, cape_id: Option<&str>) -> Result<(), String> {
    let mut last = String::new();
    for attempt in 0..3 {
        match set_cape_once(http, token, cape_id).await {
            Ok(()) => return Ok(()),
            Err(e) => {
                last = e.clone();
                let transient = ["502", "503", "500", "429", "timed out", "timeout", "connect", "reset"]
                    .iter()
                    .any(|s| e.contains(s));
                if !transient {
                    return Err(e);
                }
                if attempt < 2 {
                    tokio::time::sleep(std::time::Duration::from_millis(450 * (attempt as u64 + 1))).await;
                }
            }
        }
    }
    Err(format!(
        "Mojang's cape service is having problems right now. Try again in a bit — or change the cape on minecraft.net (Profile → Skin). ({last})"
    ))
}

/// Upload a new skin (PNG file on disk). `variant` = "classic" | "slim".
pub async fn upload_skin(
    http: &reqwest::Client,
    token: &str,
    path: &std::path::Path,
    variant: &str,
) -> Result<(), String> {
    let bytes = std::fs::read(path).map_err(|e| format!("Can't read the skin file: {e}"))?;
    if bytes.len() > 1 << 20 || !bytes.starts_with(&[0x89, b'P', b'N', b'G']) {
        return Err("The skin must be a PNG image".into());
    }
    let part = reqwest::multipart::Part::bytes(bytes)
        .file_name("skin.png")
        .mime_str("image/png")
        .map_err(|e| e.to_string())?;
    let form = reqwest::multipart::Form::new()
        .text(
            "variant",
            if variant == "slim" { "slim" } else { "classic" }.to_string(),
        )
        .part("file", part);
    http.post(format!("{SERVICES}/minecraft/profile/skins"))
        .bearer_auth(token)
        .multipart(form)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .error_for_status()
        .map_err(|e| format!("Couldn't upload the skin ({e})"))?;
    Ok(())
}
