//! Official Minecraft news (the same feed the vanilla launcher uses)
//! + a lightweight "reader mode" for minecraft.net articles.

use serde::Serialize;
use serde_json::Value;

pub const NEWS_URL: &str = "https://launchercontent.mojang.com/news.json";
pub const NEWS_IMG_BASE: &str = "https://launchercontent.mojang.com";

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NewsItem {
    pub id: String,
    pub title: String,
    pub category: String,
    pub author: String,
    pub date: String,
    pub text: String,
    pub image: String,
    pub link: String,
}

pub async fn fetch_news(http: &reqwest::Client) -> Result<Vec<NewsItem>, String> {
    let v: Value = http
        .get(NEWS_URL)
        .send()
        .await
        .map_err(|e| format!("Can't reach Minecraft news: {e}"))?
        .error_for_status()
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;

    let mut out = Vec::new();
    if let Some(entries) = v.get("entries").and_then(|x| x.as_array()) {
        for e in entries.iter().take(40) {
            let image = e
                .get("newsPageImage")
                .or_else(|| e.get("playPageImage"))
                .and_then(|i| i.get("url"))
                .and_then(|x| x.as_str())
                .map(|u| {
                    if u.starts_with("http") {
                        u.to_string()
                    } else {
                        format!("{NEWS_IMG_BASE}{u}")
                    }
                })
                .unwrap_or_default();
            out.push(NewsItem {
                id: e.get("id").and_then(|x| x.as_str()).unwrap_or("").to_string(),
                title: e.get("title").and_then(|x| x.as_str()).unwrap_or("").to_string(),
                category: e
                    .get("category")
                    .and_then(|x| x.as_str())
                    .unwrap_or("Minecraft")
                    .to_string(),
                author: e
                    .get("author")
                    .and_then(|x| x.as_str())
                    .unwrap_or("Mojang Studios")
                    .to_string(),
                date: e.get("date").and_then(|x| x.as_str()).unwrap_or("").to_string(),
                text: e
                    .get("text")
                    .and_then(|x| x.as_str())
                    .unwrap_or("")
                    .trim()
                    .to_string(),
                image,
                link: e
                    .get("readMoreLink")
                    .and_then(|x| x.as_str())
                    .unwrap_or("")
                    .to_string(),
            });
        }
    }
    Ok(out)
}

/// Very small HTML -> readable text extraction for minecraft.net articles.
pub async fn fetch_article_text(http: &reqwest::Client, url: &str) -> Result<String, String> {
    if !url.starts_with("https://www.minecraft.net/") && !url.starts_with("https://minecraft.net/") {
        return Err("Only minecraft.net articles can be opened in the app".into());
    }
    let html = http
        .get(url)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .error_for_status()
        .map_err(|e| e.to_string())?
        .text()
        .await
        .map_err(|e| e.to_string())?;

    Ok(html_to_text(&html))
}

fn html_to_text(html: &str) -> String {
    let mut s = html.to_string();
    // keep only the main article body if we can find it
    if let Some(start) = s.find("<article") {
        let end = s[start..].find("</article>").map(|e| start + e + 11);
        s = match end {
            Some(e) => s[start..e].to_string(),
            None => s[start..].to_string(),
        };
    }
    // drop scripts/styles/noscript/svg
    for tag in ["script", "style", "noscript", "svg", "iframe", "video", "form", "nav", "footer", "header"] {
        loop {
            let Some(start) = s.find(&format!("<{tag}")) else { break };
            let Some(rel_end) = s[start..].find(&format!("</{tag}>")) else { break };
            s.replace_range(start..start + rel_end + tag.len() + 3, " ");
        }
    }
    // block-level tags → newlines
    for tag in ["p", "br", "h1", "h2", "h3", "h4", "li", "ul", "ol", "div", "section", "blockquote", "figure", "figcaption"] {
        s = s.replace(&format!("</{tag}>"), "\n");
    }
    // strip every remaining tag
    let mut out = String::with_capacity(s.len());
    let mut in_tag = false;
    for c in s.chars() {
        match c {
            '<' => in_tag = true,
            '>' => in_tag = false,
            _ if !in_tag => out.push(c),
            _ => {}
        }
    }
    let out = decode_entities(&out);
    // collapse whitespace
    let mut cleaned = String::new();
    let mut blank = false;
    for line in out.lines() {
        let t = line.trim();
        if t.is_empty() {
            if !blank && !cleaned.is_empty() {
                cleaned.push('\n');
            }
            blank = true;
        } else {
            if !cleaned.is_empty() {
                cleaned.push('\n');
            }
            cleaned.push_str(t);
            blank = false;
        }
    }
    let cleaned = cleaned.trim().to_string();
    if cleaned.len() < 80 {
        "The full article could not be shown here. Use “Open in browser” to read it.".into()
    } else {
        cleaned.chars().take(24_000).collect()
    }
}

fn decode_entities(s: &str) -> String {
    s.replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&apos;", "'")
        .replace("&nbsp;", " ")
        .replace("&hellip;", "…")
        .replace("&mdash;", "—")
        .replace("&ndash;", "–")
}
