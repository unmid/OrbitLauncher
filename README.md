# Orbit Launcher (beta)

A **fast, free, and open-source Minecraft launcher** for Windows. Create isolated
installations (called *Spaces*) in seconds, attach a mod loader, grab content from
Modrinth or CurseForge, and press **Play** — one click and you are in the game.

> **Beta software.** Orbit Launcher is actively being refined. Back up important
> worlds and report reproducible issues with the Log tab output where possible.

## What makes it different

- **One-click play system** — a Space is version + loader + content in one bundle.
  Pick them, name it, press Play. Downloads, Java selection, and launch arguments
  are handled automatically.
- **Isolated Spaces** — every Space keeps its own game settings, saves, mods,
  resource packs, shaders, and logs. A modded experiment never disturbs another world.
- **Zero setup** — Java runtimes are downloaded and selected automatically for the
  Minecraft version you choose. No manual Java, no environment variables.
- **API keys stay hidden** — CurseForge API keys are loaded from a local
  `src-tauri/secrets.env` file that is **git-ignored and never bundled** into
  builds or the installer. The published source and releases contain no keys.
- **Built for reliability** — checksums, parallel downloads, cached loader
  metadata, official launch arguments, and in-app logs make failures rare and
  easy to diagnose.

## Features

| Area | Details |
| --- | --- |
| **Spaces** | Create, edit, duplicate, export, import, and open independent Minecraft installations |
| **Software** | Vanilla, Fabric, Quilt, Forge, NeoForge, and OptiFine, resolved from official metadata or installers |
| **Java** | Java 8/16/17/21 selected and validated per Minecraft version, with a verified system-Java fallback |
| **Content browser** | Install mods, resource packs, and shaders from Modrinth or CurseForge; remove, re-add, update, and per-version compatibility warnings |
| **Project details** | Click any project title for a safely rendered description (markdown-like HTML: headings, links, code, tables, images) |
| **Accounts** | Microsoft and offline accounts, sign-in validation, skin and cape tools |
| **Servers** | Server browser, ping, and direct join |
| **Performance** | Balanced and Performance presets that write valid `options.txt` settings and JVM tuning flags |
| **Logs** | In-app Log tab with launcher, loader, Java, and Minecraft output |
| **Extras** | News feed, update checks, wallpapers, background music, light/dark themes, adjustable accent colors |

## Installing

Download the Windows **setup installer** from the latest release, run it, and
launch **Orbit Launcher (beta)** from the Start menu or desktop shortcut.

Orbit does not bundle Minecraft. On first launch it downloads the selected
Minecraft files, libraries, assets, loader metadata, and a compatible Java
runtime from their respective official sources.

## Quick start

1. Open **Spaces** and choose **New Space**.
2. Select a Minecraft version and software (Vanilla, Fabric, Quilt, Forge,
   NeoForge, or OptiFine).
3. Optionally add content in the Content step.
4. Name the Space and choose **Create Space**.
5. Add an account and press **Play**.

To manage installed content later, open a Space menu and choose **Edit** — the
Content step is a real management tool: remove an installed item, install the
newest compatible file, or re-add files that went missing.

## Loader notes

- **Forge / NeoForge** use their official headless installers. Orbit creates the
  small launcher profile those installers require and validates it before launch.
- **Fabric / Quilt** use their official metadata profiles, with a valid cached
  fallback when the metadata service is temporarily unavailable.
- **OptiFine** is a standalone option and does not make Fabric/Forge mods compatible.
- Mod availability is controlled by the project author. Orbit filters results for
  the selected Minecraft version and marks unsupported projects.

## Logs and troubleshooting

Open the **Log** tab after a failed launch. Useful checks:

- Confirm the selected loader supports the selected Minecraft version.
- Use **Edit → Content** to remove or update a conflicting mod.
- Keep only one version of a mod in a Space — Orbit removes the prior file when
  updating through the browser.
- Include the visible Log entries when reporting an issue.

Game data lives in `%APPDATA%\OrbitLauncher`; each Space lives under
`%APPDATA%\OrbitLauncher\spaces`. Microsoft account tokens are stored by Windows
Credential Manager, never in plain-text launcher files.

## Security and API keys

- CurseForge / other API keys are read from `src-tauri/secrets.env`, which is
  **ignored by git** and **excluded from every build**.
- Builds use only what is present in the repository at build time; a build without
  the env file simply ships with those integrations disabled.
- No keys, tokens, or credentials ever appear in source control or release assets.

## Building from source

Requirements:

- Windows 10/11
- Node.js 18 or newer
- Rust via `rustup`
- Visual Studio C++ Build Tools with the Windows SDK

```bat
npm install
npm.cmd run tauri build
```

The NSIS Windows installer is written to:

```text
src-tauri\target\release\bundle\nsis\Orbit Launcher (beta)_x64-setup.exe
```

### Checks

```bat
npm.cmd run build
cargo test --manifest-path src-tauri\Cargo.toml
cargo check --manifest-path src-tauri\Cargo.toml
```

The executable also provides a launch-pipeline self-test:

```bat
src-tauri\target\release\orbit-launcher.exe --selftest 1.21.1 forge
src-tauri\target\release\orbit-launcher.exe --selftest 1.21.1 neoforge
src-tauri\target\release\orbit-launcher.exe --selftest 1.20.4 quilt
```

Use `--run` only when you intentionally want the self-test to open Minecraft.

## Releases

- **Orbit Launcher Beta v2** — new minimal create-Space wizard, cleaner Space
  cards, rebuilt mod preview window, and responsive layout for all window sizes.

## License

MIT — see [LICENSE](LICENSE).

## Privacy and attribution

Orbit Launcher is not an official Minecraft product and is not approved by or
associated with Mojang, Microsoft, Modrinth, CurseForge, Fabric, Quilt, Forge,
NeoForge, or OptiFine. Minecraft is a trademark of Mojang AB / Microsoft. The
launcher does not redistribute Minecraft game files; it downloads them from the
appropriate upstream services when needed.
