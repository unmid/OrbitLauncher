//! Server list: remote JSON (from the OL-updater repo) + Minecraft
//! Server List Ping (SLP 1.7+) for live player counts and latency.

use serde::{Deserialize, Serialize};
use std::io::{Read, Write};
use std::time::{Duration, Instant};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteServer {
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub ip: String,
    #[serde(default)]
    pub port: Option<u16>,
    #[serde(default)]
    pub icon: String,
    #[serde(default)]
    pub motd: String,
    #[serde(default)]
    pub category: String,
    #[serde(default)]
    pub sponsored: bool,
    #[serde(default)]
    pub min_version: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PingResult {
    pub online: bool,
    pub players_online: u64,
    pub players_max: u64,
    pub motd: String,
    pub icon: String,
    pub version: String,
    pub ping_ms: u64,
}

// ---------------------------------------------------------------------------
// SLP wire format

fn write_varint(out: &mut Vec<u8>, v: i64) {
    // unsigned LEB128 (two's-complement safe for negatives)
    let mut v = v as u64;
    loop {
        let mut b = (v & 0x7F) as u8;
        v >>= 7;
        if v != 0 {
            b |= 0x80;
        }
        out.push(b);
        if v == 0 {
            break;
        }
    }
}

fn read_varint(stream: &mut impl Read) -> std::io::Result<i64> {
    let mut result: i64 = 0;
    let mut shift = 0;
    loop {
        let mut b = [0u8; 1];
        stream.read_exact(&mut b)?;
        result |= ((b[0] & 0x7F) as i64) << shift;
        if b[0] & 0x80 == 0 {
            break;
        }
        shift += 7;
        if shift > 63 {
            return Err(std::io::Error::new(std::io::ErrorKind::InvalidData, "varint too long"));
        }
    }
    Ok(result)
}

fn read_n(stream: &mut impl Read, n: usize) -> std::io::Result<Vec<u8>> {
    let mut buf = vec![0u8; n];
    stream.read_exact(&mut buf)?;
    Ok(buf)
}

fn motd_to_text(v: &serde_json::Value) -> String {
    match v {
        serde_json::Value::String(s) => s.clone(),
        serde_json::Value::Object(_) => {
            let mut out = String::new();
            if let Some(t) = v.get("text").and_then(|x| x.as_str()) {
                out.push_str(t);
            }
            if let Some(extra) = v.get("extra").and_then(|x| x.as_array()) {
                for e in extra {
                    out.push_str(&motd_to_text(e));
                }
            }
            if out.is_empty() {
                // hover-event-free description objects sometimes translate
                v.get("translate").and_then(|x| x.as_str()).unwrap_or("").to_string()
            } else {
                out
            }
        }
        serde_json::Value::Array(a) => a.iter().map(motd_to_text).collect::<Vec<_>>().join(" "),
        _ => String::new(),
    }
}

pub fn ping_server(host: &str, port: u16, timeout_ms: u64) -> Result<PingResult, String> {
    let timeout = Duration::from_millis(timeout_ms.max(500));
    let start = Instant::now();

    let addr = format!("{host}:{port}")
        .to_socket_addrs()
        .map_err(|e| format!("DNS lookup failed: {e}"))?
        .next()
        .ok_or("No address for host")?;

    let mut stream = std::net::TcpStream::connect_timeout(&addr, timeout)
        .map_err(|e| format!("Server offline ({e})"))?;
    stream.set_read_timeout(Some(timeout)).map_err(|e| e.to_string())?;
    stream.set_write_timeout(Some(timeout)).map_err(|e| e.to_string())?;

    // handshake
    let mut data: Vec<u8> = Vec::new();
    write_varint(&mut data, 0); // packet id
    write_varint(&mut data, 767); // protocol version (any modern)
    let host_bytes = host.as_bytes();
    write_varint(&mut data, host_bytes.len() as i64);
    data.extend_from_slice(host_bytes);
    data.extend_from_slice(&port.to_be_bytes());
    write_varint(&mut data, 1); // next state: status
    let mut packet: Vec<u8> = Vec::new();
    write_varint(&mut packet, data.len() as i64);
    packet.extend_from_slice(&data);
    stream.write_all(&packet).map_err(|e| e.to_string())?;

    // status request
    stream.write_all(&[1, 0]).map_err(|e| e.to_string())?;
    stream.flush().map_err(|e| e.to_string())?;

    // response
    let _len = read_varint(&mut stream).map_err(|e| e.to_string())?;
    let id = read_varint(&mut stream).map_err(|e| e.to_string())?;
    if id != 0 {
        return Err("Bad ping response".into());
    }
    let json_len = read_varint(&mut stream).map_err(|e| e.to_string())? as usize;
    let json_bytes = read_n(&mut stream, json_len.min(1 << 20)).map_err(|e| e.to_string())?;
    let v: serde_json::Value =
        serde_json::from_slice(&json_bytes).map_err(|e| format!("Bad ping data: {e}"))?;

    // latency ping (best effort)
    let ping_ms = {
        let mut ping_pkt: Vec<u8> = Vec::new();
        write_varint(&mut ping_pkt, 9);
        write_varint(&mut ping_pkt, 1);
        ping_pkt.extend_from_slice(&42i64.to_be_bytes());
        let t = Instant::now();
        let measured = if stream.write_all(&ping_pkt).is_ok() {
            let mut pong = [0u8; 10];
            stream.read_exact(&mut pong).ok().map(|_| t.elapsed().as_millis() as u64)
        } else {
            None
        };
        measured.unwrap_or_else(|| start.elapsed().as_millis() as u64)
    };

    let players_online = v
        .get("players")
        .and_then(|p| p.get("online"))
        .and_then(|x| x.as_u64())
        .unwrap_or(0);
    let players_max = v
        .get("players")
        .and_then(|p| p.get("max"))
        .and_then(|x| x.as_u64())
        .unwrap_or(0);
    let motd = v.get("description").map(motd_to_text).unwrap_or_default();
    let icon = v
        .get("favicon")
        .and_then(|x| x.as_str())
        .unwrap_or("")
        .to_string();
    let version = v
        .get("version")
        .and_then(|p| p.get("name"))
        .and_then(|x| x.as_str())
        .unwrap_or("")
        .to_string();

    Ok(PingResult {
        online: true,
        players_online,
        players_max,
        motd: motd.trim().to_string(),
        icon,
        version,
        ping_ms,
    })
}

use std::net::ToSocketAddrs;

// ---------------------------------------------------------------------------
// Remote list parsing (strict: drop anything suspicious)

pub fn parse_server_list(raw: &str) -> Vec<RemoteServer> {
    let v: serde_json::Value = match serde_json::from_str(raw) {
        Ok(v) => v,
        Err(_) => return vec![],
    };
    let arr = match v.get("servers").and_then(|x| x.as_array()) {
        Some(a) => a,
        None => return vec![],
    };
    let mut out = Vec::new();
    for item in arr.iter().take(64) {
        let get = |k: &str| item.get(k).and_then(|x| x.as_str()).unwrap_or("").to_string();
        let name = clean_text(&get("name"), 48);
        let ip = get("ip");
        if name.is_empty() || !valid_ip(&ip) {
            continue;
        }
        out.push(RemoteServer {
            name,
            ip,
            port: item.get("port").and_then(|x| x.as_u64()).map(|p| p as u16),
            icon: clean_url(&get("icon")),
            motd: clean_text(&get("motd"), 120),
            category: {
                let c = clean_text(&get("category"), 24);
                if c.is_empty() { "Servers".into() } else { c }
            },
            sponsored: item.get("sponsored").and_then(|x| x.as_bool()).unwrap_or(false),
            min_version: clean_text(&get("minVersion"), 16),
        });
    }
    out
}

fn valid_ip(ip: &str) -> bool {
    // host[:port] — letters, digits, dots, dashes only; port must be numeric
    if ip.len() > 260 || ip.contains('/') || ip.contains('?') || ip.contains('&') {
        return false;
    }
    let mut parts = ip.split(':');
    let host = parts.next().unwrap_or("");
    let port_ok = match parts.next() {
        None => true,
        Some(p) => !p.is_empty() && p.len() <= 5 && p.chars().all(|c| c.is_ascii_digit()),
    };
    parts.next().is_none()
        && port_ok
        && !host.is_empty()
        && host.len() <= 253
        && host.contains('.')
        && host
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '.' || c == '-')
}

fn clean_text(s: &str, max: usize) -> String {
    s.chars()
        .filter(|c| !c.is_control())
        .take(max)
        .collect::<String>()
        .trim()
        .to_string()
}

fn clean_url(s: &str) -> String {
    if s.starts_with("https://") || s.starts_with("data:image/png;base64,") {
        clean_text(s, 4096)
    } else {
        String::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn varint_roundtrip() {
        for v in [0i64, 1, 127, 128, 255, 2147483647, -1, -2147483648] {
            let mut buf = Vec::new();
            write_varint(&mut buf, v);
            // two's complement for negatives is fine for our positive use,
            // but make sure positive values roundtrip through reader:
            if v >= 0 {
                let mut slice = &buf[..];
                assert_eq!(read_varint(&mut slice).unwrap(), v);
            }
        }
    }

    #[test]
    fn parse_list_filters_bad() {
        let raw = r#"{"servers":[
            {"name":"Cool SMP","ip":"play.cool.gg","category":"Survival","motd":"hi","sponsored":true},
            {"name":"","ip":"play.cool.gg"},
            {"name":"Bad","ip":"http://evil.com/x?y=1"},
            {"name":"Ok","ip":"mc.ok.net:25566"}
        ]}"#;
        let list = parse_server_list(raw);
        assert_eq!(list.len(), 2);
        assert_eq!(list[0].name, "Cool SMP");
        assert!(list[0].sponsored);
        assert_eq!(list[0].ip.split(':').next().unwrap(), "play.cool.gg");
    }
}
