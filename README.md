# Orbit Launcher

A fast, simple Minecraft launcher for Windows. Built with Tauri 2, React and Rust.

Orbit Launcher organizes your game into **Spaces** — self-contained instances with their own Minecraft version, mod loader, mods, resource packs, shaders and worlds. Everything is installed and updated for you; pressing Play is the only step that matters.

## Features

- **Spaces** — isolated instances per version and loader. Create one in four steps: pick a Minecraft version, pick software, optionally add content, name it.
- **Mod loaders** — Vanilla, Fabric, Quilt, Forge, NeoForge and OptiFine, installed automatically with the correct Java runtime.
- **Modrinth and CurseForge** — search and install mods, modpacks, resource packs, shaders and data packs directly into a Space. When you browse for a specific Minecraft version, Orbit resolves the newest project build that actually supports that version — on both platforms — instead of silently installing the latest incompatible file.
- **Modpacks** — one-click Modrinth and CurseForge packs pinned to the Minecraft version you selected.
- **Accounts** — Microsoft sign-in and offline accounts, with a live 3D skin preview, skin upload and cape selection.
- **Servers** — server list with live status and player counts.
- **Automatic updates** — the launcher updates itself in place from GitHub Releases. No reinstalling, ever.
- **Interface** — frameless glass design, dark and light themes, eight accent colors, animated wallpapers, ambient in-app music, and full keyboard navigation.

## Download

Get the latest Windows installer (`Orbit Launcher_x64-setup.exe`) from [Releases](https://github.com/unmid/OrbitLauncher/releases/latest).

Existing installs update automatically — see `update.txt`. macOS and Linux builds are planned for a later release.

## Building from source

Requirements: Node.js 22, Rust (stable), and the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS.

```bash
npm ci
npm run tauri build
```

Development mode with hot reload:

```bash
npm run tauri dev
```

## Releases

Releases are built by GitHub Actions for Windows (x64) whenever a `v*` tag is pushed. Each release publishes signed updater artifacts (`latest.json` and signatures) so installed apps update themselves to that tag automatically.

## Versioning

The workspace shares a single version, defined in the root `Cargo.toml` under `[workspace.package]`. The member crate in `src-tauri` inherits it with `version.workspace = true`; `package.json` and `src-tauri/tauri.conf.json` carry the same version for the frontend and the bundler.

## Code signing

This program uses free code signing provided by [SignPath.io](https://signpath.io), and a certificate by the SignPath Foundation. We thank them very much for their contributions to OSS software.

Updater packages are additionally signed with a minisign key. The private key exists only as encrypted GitHub Actions secrets (`TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`); the public key is embedded in the app and every update is verified before installation.

## Project structure

```
├── Cargo.toml            # workspace root — single shared version
├── package.json          # frontend (React 19, Vite)
├── src/                  # React UI — pages, components, design system
├── public/               # fonts, icons, wallpapers, music
└── src-tauri/            # Rust backend — installs, launch, accounts, content
    ├── src/              # commands and services
    ├── icons/            # app icons (generated from the Orbit mark)
    └── tauri.conf.json   # window, bundle and updater configuration
```

## License

MIT
