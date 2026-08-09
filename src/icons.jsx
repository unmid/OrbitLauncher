// Paper-doodle icon set — thick ink strokes + candy fills, inspired by the
// "paper edition" mockup. Every icon strokes with var(--line) and fills with
// the paper palette so they adapt to light/dark themes automatically.
// Detailed 80px raster icons live in public/icons/{app,space,loader}.
// No emojis anywhere.
import { useEffect, useRef, useState } from 'react'

const S = ({ size = 20, children, style, ...rest }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    aria-hidden="true"
    style={{ flex: 'none', display: 'inline-block', verticalAlign: 'middle', ...style }}
    {...rest}
  >
    {children}
  </svg>
)

// --- navigation ------------------------------------------------------------
export const IconHome = (p) => (
  <S {...p}><g stroke="var(--line)" strokeWidth="1.8" strokeLinejoin="round"><path d="M4 11l8-7 8 7v9h-6v-6h-4v6H4z" fill="var(--yellow)" /></g></S>
)
export const IconLayers = (p) => (
  <S {...p}><g stroke="var(--line)" strokeWidth="1.8" strokeLinejoin="round"><path d="M12 3l9 5-9 5-9-5z" fill="var(--blue)" /><path d="M3 13.5l9 5 9-5" fill="none" /></g></S>
)
export const IconServer = (p) => (
  <S {...p}><g stroke="var(--line)" strokeWidth="1.8"><rect x="3" y="4" width="18" height="7" rx="2" fill="var(--paper2)" /><rect x="3" y="13" width="18" height="7" rx="2" fill="var(--paper2)" /><circle cx="7" cy="7.5" r="1.4" fill="var(--green)" stroke="none" /><circle cx="7" cy="16.5" r="1.4" fill="var(--green)" stroke="none" /><path d="M12 7.5h6M12 16.5h6" /></g></S>
)
export const IconUser = (p) => (
  <S {...p}><g stroke="var(--line)" strokeWidth="1.8"><circle cx="12" cy="8" r="4.2" fill="var(--yellow)" /><path d="M4 20c0-4 4-6 8-6s8 2 8 6z" fill="var(--blue)" /></g></S>
)
export const IconBolt = (p) => (
  <S {...p}><path d="M13 2L5 13.5h5L8 22l9-11.5h-5z" fill="var(--yellow)" stroke="var(--line)" strokeWidth="1.8" strokeLinejoin="round" /></S>
)
export const IconNews = (p) => (
  <S {...p}><g stroke="var(--line)" strokeWidth="1.8"><rect x="4" y="4" width="16" height="16" rx="2.5" fill="var(--card)" /><path d="M8 9h8M8 12.5h8M8 16h5" fill="none" /></g></S>
)
export const IconGear = (p) => (
  <S {...p}><g stroke="var(--line)" strokeWidth="1.9" strokeLinecap="round"><circle cx="12" cy="12" r="4.4" fill="var(--pink)" /><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5 5l2.1 2.1M16.9 16.9L19 19M19 5l-2.1 2.1M7.1 16.9L5 19" fill="none" /></g></S>
)
export const IconUpdate = (p) => (
  <S {...p}><g stroke="var(--line)" strokeWidth="2" strokeLinecap="round" fill="none"><path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" /><path d="M19.8 3.5v3.7h-3.7" /></g></S>
)
export const IconKey = (p) => (
  <S {...p}><g stroke="var(--line)" strokeWidth="1.8" strokeLinecap="round"><circle cx="8" cy="12" r="4.4" fill="var(--yellow)" /><path d="M12.5 12H21M18 12v3.5M21 12v2.5" fill="none" /></g></S>
)
export const IconBack = (p) => (
  <S {...p}><path d="M14.5 6l-6 6 6 6" fill="none" stroke="var(--line)" strokeWidth="2.4" strokeLinecap="round" /></S>
)

// --- actions / ui ------------------------------------------------------------
export const IconPlay = (p) => (
  <S {...p}><path d="M8 5l12 7-12 7z" fill="currentColor" stroke="var(--line)" strokeWidth="1.8" strokeLinejoin="round" /></S>
)
export const IconPause = (p) => (
  <S {...p}><path d="M7 5h4v14H7zM13.5 5h4v14h-4z" fill="currentColor" stroke="var(--line)" strokeWidth="1.6" /></S>
)
export const IconPlus = (p) => (
  <S {...p}><path d="M12 5v14M5 12h14" stroke="var(--line)" strokeWidth="2.4" strokeLinecap="round" fill="none" /></S>
)
export const IconEdit = (p) => (
  <S {...p}><path d="M4 20l1-5L16.5 3.5a2.1 2.1 0 0 1 3 3L8 18z" fill="var(--yellow)" stroke="var(--line)" strokeWidth="1.8" strokeLinejoin="round" /></S>
)
export const IconCopy = (p) => (
  <S {...p}><g stroke="var(--line)" strokeWidth="1.8" fill="var(--card)"><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h9" fill="none" /></g></S>
)
export const IconTrash = (p) => (
  <S {...p}><g stroke="var(--line)" strokeWidth="1.8"><path d="M5 7h14M9 7V4.5h6V7M7 7l1 13h8l1-13" fill="var(--red)" /><path d="M10.3 10.5v6M13.7 10.5v6" stroke="var(--card)" /></g></S>
)
export const IconSearch = (p) => (
  <S {...p}><g stroke="var(--line)" strokeWidth="2" fill="none"><circle cx="10.5" cy="10.5" r="5.5" fill="var(--card)" /><path d="M15 15l5.5 5.5" /></g></S>
)
export const IconX = (p) => (
  <S {...p}><path d="M6 6l12 12M18 6L6 18" stroke="var(--line)" strokeWidth="2.4" strokeLinecap="round" fill="none" /></S>
)
export const IconCheck = (p) => (
  <S {...p}><path d="M5 12.5l4.5 5L19 7" fill="none" stroke="var(--line)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></S>
)
export const IconFolder = (p) => (
  <S {...p}><path d="M3 6h7l2 2.5h9V19H3z" fill="var(--yellow)" stroke="var(--line)" strokeWidth="1.8" strokeLinejoin="round" /></S>
)
export const IconDownload = (p) => (
  <S {...p}><g stroke="var(--line)" strokeWidth="2" strokeLinecap="round" fill="none"><path d="M12 4v10M8 10l4 4 4-4" /><path d="M5 19h14" /></g></S>
)
export const IconUpload = (p) => (
  <S {...p}><g stroke="var(--line)" strokeWidth="2" strokeLinecap="round" fill="none"><path d="M12 14V4M8 8l4-4 4 4" /><path d="M5 19h14" /></g></S>
)
export const IconImport = (p) => (
  <S {...p}><g stroke="var(--line)" strokeWidth="2" strokeLinecap="round" fill="none"><path d="M12 3v10M8 9l4 4 4-4" /><path d="M4 15v4h16v-4" /></g></S>
)
export const IconShare = (p) => (
  <S {...p}><g stroke="var(--line)" strokeWidth="2" strokeLinecap="round" fill="none"><path d="M12 13V3M8 7l4-4 4 4" /><path d="M4 15v4h16v-4" /></g></S>
)
export const IconMore = (p) => (
  <S {...p}><g fill="var(--line)"><circle cx="12" cy="5.5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="18.5" r="2" /></g></S>
)
export const IconClock = (p) => (
  <S {...p}><g stroke="var(--line)" strokeWidth="1.8"><circle cx="12" cy="12" r="8.5" fill="var(--card)" /><path d="M12 7v5l3.5 2.5" fill="none" strokeLinecap="round" /></g></S>
)
export const IconGlobe = (p) => (
  <S {...p}><g stroke="var(--line)" strokeWidth="1.7"><circle cx="12" cy="12" r="8.5" fill="var(--blue)" /><path d="M3.5 12h17M12 3.5c3 2.5 3 14.5 0 17-3-2.5-3-14.5 0-17z" fill="none" /></g></S>
)
export const IconShield = (p) => (
  <S {...p}><g stroke="var(--line)" strokeWidth="1.8"><path d="M12 3l7 2.5V12c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V5.5z" fill="var(--green)" /><path d="M9 11.5l2.3 2.5L15.5 9" fill="none" stroke="var(--card)" strokeWidth="2" /></g></S>
)
export const IconLock = (p) => (
  <S {...p}><g stroke="var(--line)" strokeWidth="1.8"><rect x="5" y="11" width="14" height="9" rx="2" fill="var(--violet)" /><path d="M8 11V7a4 4 0 0 1 8 0v4" fill="none" /></g></S>
)
export const IconMusic = (p) => (
  <S {...p}><g stroke="var(--line)" strokeWidth="1.8" fill="var(--pink)"><path d="M9 17.5V6l10-2.5V15" fill="none" /><circle cx="6.8" cy="17.7" r="2.6" /><circle cx="16.8" cy="15.2" r="2.6" /></g></S>
)
export const IconGamepad = (p) => (
  <S {...p}><g stroke="var(--line)" strokeWidth="1.8"><path d="M7 7h10c3 0 5 2.5 5 6s-2 5-4 4l-2-2H8l-2 2c-2 1-4-.5-4-4s2-6 5-6z" fill="var(--violet)" /><path d="M8 10.5v4M6 12.5h4" stroke="var(--card)" /><circle cx="16" cy="11" r="1.3" fill="var(--card)" stroke="none" /><circle cx="18" cy="13.5" r="1.3" fill="var(--card)" stroke="none" /></g></S>
)
export const IconBrush = (p) => (
  <S {...p}><g stroke="var(--line)" strokeWidth="1.8" strokeLinejoin="round"><path d="M14 3l7 7-9.5 2.5a2.6 2.6 0 0 1-1.9-.66c-.66-.66-.84-1.63-.52-2.47z" fill="var(--violet)" /><path d="M7 13c-2.5.8-4 2.8-4 6 1.8.8 4 .3 5.2-1S9.6 14.4 7 13z" fill="var(--pink)" /></g></S>
)
export const IconCape = (p) => (
  <S {...p}><path d="M8 4h8l2 14c-4 2-8 2-12 0z" fill="var(--red)" stroke="var(--line)" strokeWidth="1.8" strokeLinejoin="round" /></S>
)
export const IconHeart = (p) => (
  <S {...p}><path d="M12 20s-8-5-8-10.5C4 6 6.5 4 9 4c1.5 0 3 1 3 2.5C12 5 13.5 4 15 4c2.5 0 5 2 5 5.5C20 15 12 20 12 20z" fill="var(--pink)" stroke="var(--line)" strokeWidth="1.8" /></S>
)
export const IconHammer = (p) => (
  <S {...p}><g stroke="var(--line)" strokeWidth="1.8" strokeLinejoin="round"><rect x="9" y="3" width="11" height="6" rx="2" fill="var(--paper2)" transform="rotate(35 14 6)" /><path d="M9 13L3.5 18.5a2 2 0 0 0 3 3L12 16" fill="var(--yellow)" /></g></S>
)
export const IconCpu = (p) => (
  <S {...p}><g stroke="var(--line)" strokeWidth="1.7"><rect x="6" y="6" width="12" height="12" rx="2" fill="var(--blue)" /><rect x="9.5" y="9.5" width="5" height="5" fill="var(--card)" /><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" fill="none" /></g></S>
)
export const IconRam = (p) => (
  <S {...p}><g stroke="var(--line)" strokeWidth="1.7"><rect x="3" y="8" width="18" height="8" rx="2" fill="var(--pink)" /><path d="M7 11v3M11 11v3M15 11v3M5 16v2M19 16v2" fill="none" /></g></S>
)
export const IconGpu = (p) => (
  <S {...p}><g stroke="var(--line)" strokeWidth="1.7"><rect x="3" y="7" width="18" height="10" rx="2" fill="var(--green)" /><circle cx="10" cy="12" r="3" fill="var(--card)" /><path d="M16 10v4M18.5 10v4" fill="none" /></g></S>
)
export const IconOs = (p) => (
  <S {...p}><g stroke="var(--line)" strokeWidth="1.7"><rect x="3.5" y="4.5" width="17" height="14" rx="2" fill="var(--card)" /><path d="M3.5 8.5h17" /><path d="M9 21h6M12 18.5V21" fill="none" /></g></S>
)
export const IconSparkle = (p) => (
  <S {...p}><path d="M12 3l2.7 5.8 6.3.7-4.7 4.3 1.3 6.2-5.6-3.2L6.4 20l1.3-6.2L3 9.5l6.3-.7z" fill="var(--yellow)" stroke="var(--line)" strokeWidth="1.7" strokeLinejoin="round" /></S>
)
export const IconStar = IconSparkle
export const IconDisk = (p) => (
  <S {...p}><g stroke="var(--line)" strokeWidth="1.7"><rect x="3.5" y="4.5" width="17" height="14" rx="2" fill="var(--card)" /><path d="M3.5 8.5h17" /><path d="M9 21h6M12 18.5V21" fill="none" /></g></S>
)
export const IconExternal = (p) => (
  <S {...p}><g stroke="var(--line)" strokeWidth="2" strokeLinecap="round" fill="none"><path d="M7 17L17 7" /><path d="M9 7h8v8" /><path d="M5 5v14h14" /></g></S>
)
export const IconRefresh = (p) => (
  <S {...p}><g stroke="var(--line)" strokeWidth="2" strokeLinecap="round" fill="none"><path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" /><path d="M19.8 3.5v3.7h-3.7" /></g></S>
)
export const IconCube = (p) => (
  <S {...p}><g stroke="var(--line)" strokeWidth="1.8" strokeLinejoin="round"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" fill="var(--violet)" /><path d="M12 3l8 4.5-8 4.5-8-4.5z" fill="var(--pink)" /><path d="M12 12v9" fill="none" /></g></S>
)
export const IconPlayers = (p) => (
  <S {...p}><g stroke="var(--line)" strokeWidth="1.8"><circle cx="9" cy="8" r="3.6" fill="var(--yellow)" /><path d="M2.5 19c0-3.4 3.2-5 6.5-5s6.5 1.6 6.5 5z" fill="var(--blue)" /><circle cx="17" cy="9.5" r="2.8" fill="var(--green)" /></g></S>
)
export const IconSignal = (p) => (
  <S {...p}><g stroke="var(--line)" strokeWidth="1.7"><rect x="3" y="13" width="4" height="7" rx="1.5" fill="var(--red)" /><rect x="10" y="9" width="4" height="11" rx="1.5" fill="var(--yellow)" /><rect x="17" y="4" width="4" height="16" rx="1.5" fill="var(--green)" /></g></S>
)
export const IconInfo = (p) => (
  <S {...p}><g stroke="var(--line)" strokeWidth="1.8"><circle cx="12" cy="12" r="8.5" fill="var(--blue)" /><path d="M12 11v5" fill="none" stroke="var(--card)" strokeWidth="2.2" strokeLinecap="round" /><circle cx="12" cy="8" r="1.3" fill="var(--card)" stroke="none" /></g></S>
)
export const IconWarn = (p) => (
  <S {...p}><g stroke="var(--line)" strokeWidth="1.8"><path d="M12 3.5L22 20H2z" fill="var(--yellow)" strokeLinejoin="round" /><path d="M12 9.5v4.5" fill="none" strokeWidth="2.2" strokeLinecap="round" /><circle cx="12" cy="17" r="1.2" fill="var(--line)" stroke="none" /></g></S>
)
export const IconRocket = (p) => (
  <S {...p}><g stroke="var(--line)" strokeWidth="1.8" strokeLinejoin="round"><path d="M12 2c3.2 2 5 6 5 10l-2.6 3h-4.8L7 12c0-4 1.8-8 5-10z" fill="var(--orange)" /><circle cx="12" cy="10" r="2" fill="var(--card)" /><path d="M7.5 13L5 17l3.4-1M16.5 13L19 17l-3.4-1" fill="var(--yellow)" /><path d="M10.4 17.5L12 22l1.6-4.5" fill="var(--yellow)" /></g></S>
)
export const IconSun = (p) => (
  <S {...p}><g stroke="var(--line)" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="4.4" fill="var(--yellow)" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.4 5.4l1.4 1.4M17.2 17.2l1.4 1.4M18.6 5.4l-1.4 1.4M6.8 17.2l-1.4 1.4" fill="none" /></g></S>
)
export const IconMoon = (p) => (
  <S {...p}><path d="M20 14.5A8.5 8.5 0 1 1 10.5 4a7 7 0 0 0 9.5 10.5z" fill="var(--yellow)" stroke="var(--line)" strokeWidth="1.8" /></S>
)

// --- social ------------------------------------------------------------------
export const IconGithub = (p) => (
  <S {...p}><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55v-2.15c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.11-.75.4-1.26.72-1.55-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.06.78 2.13v3.16c0 .31.21.67.8.55A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" fill="var(--line)" /></S>
)
export const IconDiscord = (p) => (
  <S {...p}><g stroke="var(--line)" strokeWidth="1.8"><path d="M7 7.5C9 6.3 10.5 6 12 6s3 .3 5 1.5c2 3 2.6 6.6 1.8 9.5l-3 1.5-1-2c-1.8.4-3.8.4-5.6 0l-1 2-3-1.5C4.4 14.1 5 10.5 7 7.5z" fill="var(--blue)" /><circle cx="9.5" cy="12" r="1.5" fill="var(--card)" stroke="none" /><circle cx="14.5" cy="12" r="1.5" fill="var(--card)" stroke="none" /></g></S>
)
export const IconMicrosoft = (p) => (
  <S {...p}><g stroke="var(--line)" strokeWidth="1.4"><rect x="3.5" y="3.5" width="8" height="8" fill="#f25022" /><rect x="12.5" y="3.5" width="8" height="8" fill="#7fba00" /><rect x="3.5" y="12.5" width="8" height="8" fill="#00a4ef" /><rect x="12.5" y="12.5" width="8" height="8" fill="#ffb900" /></g></S>
)
export const IconModrinth = (p) => (
  <S {...p}><g stroke="var(--line)" strokeWidth="1.8"><circle cx="12" cy="12" r="9" fill="#21bf4e" /><path d="M8.5 15.5v-5l3.5 3 3.5-3v5" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></g></S>
)
export const IconCurse = (p) => (
  <S {...p}><path d="M12 2.5c1 3.5 5.5 4.5 5.5 9.5a5.5 5.5 0 0 1-11 0c0-3 2-4.5 3-6.5.2 2 2.5 2.5 2.5-3z" fill="var(--orange)" stroke="var(--line)" strokeWidth="1.8" strokeLinejoin="round" /></S>
)

// --- loader logos (real logos from public/icons/loader) --------------------------
const LOADER_LOGO = {
  vanilla: './icons/space/crafting-table.png',
  fabric: './icons/loader/fabric.png',
  quilt: './icons/loader/quilt.png',
  forge: './icons/loader/forge.png',
  neoforge: './icons/loader/neoforge.png',
  optifine: './icons/loader/optifine.png',
}
const LogoMark = (src) => function LogoMarkInner({ size = 20 }) {
  return <img src={src} width={size} height={size} alt="" draggable={false} style={{ objectFit: 'contain', borderRadius: Math.round(size / 6) }} />
}
export const LoaderMark = Object.fromEntries(
  Object.entries(LOADER_LOGO).map(([k, src]) => [k, LogoMark(src)])
)

export const LOADER_META = {
  vanilla: { label: 'Vanilla', desc: 'Pure Minecraft, zero extras' },
  fabric: { label: 'Fabric', desc: 'Lightweight modding, fast updates' },
  quilt: { label: 'Quilt', desc: 'The open fork of Fabric' },
  forge: { label: 'Forge', desc: 'The classic modding API' },
  neoforge: { label: 'NeoForge', desc: 'Community-driven Forge fork' },
  optifine: { label: 'OptiFine', desc: 'FPS boost & zoom' },
}

// --- space icons (real Minecraft block art from public/icons/space) -------------
export const SPACE_ICONS = [
  { id: 'crafting-table', label: 'Crafting Table' },
  { id: 'diamond-block', label: 'Diamond Block' },
  { id: 'beacon', label: 'Beacon' },
  { id: 'enchanting-table', label: 'Enchanting Table' },
  { id: 'tnt', label: 'TNT' },
  { id: 'end-portal-frame', label: 'End Portal' },
  { id: 'crafter', label: 'Crafter' },
  { id: 'chain-command-block', label: 'Command Block' },
  { id: 'emerald-block', label: 'Emerald Block' },
  { id: 'amethyst-block', label: 'Amethyst' },
  { id: 'bookshelf', label: 'Bookshelf' },
  { id: 'carved-pumpkin', label: 'Pumpkin' },
  { id: 'fletching-table', label: 'Fletching Table' },
  { id: 'hay-block', label: 'Hay Bale' },
  { id: 'honey-block', label: 'Honey Block' },
  { id: 'lectern', label: 'Lectern' },
  { id: 'melon', label: 'Melon' },
  { id: 'piston', label: 'Piston' },
  { id: 'shulker-box', label: 'Shulker Box' },
  { id: 'target', label: 'Target' },
]
const SPACE_ICON_FILES = new Set(SPACE_ICONS.map((i) => i.id))

// legacy hand-drawn defs kept so Spaces saved with old icon names still render
const LEGACY_SPACE_ICON_DEFS = {
  rocket: IconRocket,
  cube: IconCube,
  sword: (p) => <S {...p}><g stroke="var(--line)" strokeWidth="1.8" strokeLinejoin="round"><path d="M5 19L17 7l2 2L7 21z" fill="var(--card)" /><path d="M14 3l2 3 3 2 2-2-4.5-4.5z" fill="var(--yellow)" /><path d="M5 15l4 4" fill="none" /></g></S>,
  shield: IconShield,
  gem: (p) => <S {...p}><g stroke="var(--line)" strokeWidth="1.8" strokeLinejoin="round"><path d="M12 3l6.5 5.5L12 21 5.5 8.5z" fill="var(--blue)" /><path d="M5.5 8.5h13M12 3l-2.5 5.5L12 21l2.5-12.5z" fill="none" /></g></S>,
  castle: (p) => <S {...p}><g stroke="var(--line)" strokeWidth="1.8" strokeLinejoin="round"><path d="M5 21V9l3-2 2 3 2-5 2 5 2-3 3 2v12z" fill="var(--paper2)" /><path d="M10 21v-4h4v4" fill="var(--yellow)" /></g></S>,
  pickaxe: (p) => <S {...p}><g stroke="var(--line)" strokeWidth="1.8" strokeLinejoin="round"><path d="M3 21L13 11" strokeWidth="2.4" strokeLinecap="round" fill="none" /><path d="M11.5 10C14 5.5 18 4 21 4.5c-1 4-3.5 7.5-7.5 9" fill="var(--card)" /></g></S>,
  volcano: (p) => <S {...p}><g stroke="var(--line)" strokeWidth="1.8" strokeLinejoin="round"><path d="M8 9L3 20h18L16 9z" fill="var(--paper2)" /><path d="M10 9c-1-2 1-3 0-5s3-2 3 1-1 3-1 4z" fill="var(--orange)" /></g></S>,
  snow: (p) => <S {...p}><g stroke="var(--line)" strokeWidth="2" strokeLinecap="round" fill="none"><path d="M12 3v18M4 7.5l16 9M20 7.5l-16 9" /></g></S>,
  heart: IconHeart,
  dragon: (p) => <S {...p}><g stroke="var(--line)" strokeWidth="1.8" strokeLinejoin="round"><path d="M4 18c5 0 12-1 15-6l2-2-2 5-3 1" fill="var(--green)" /><path d="M6 15L4 8c4 0 9 1 12 4z" fill="var(--green)" /><circle cx="9" cy="12.5" r="1" fill="var(--line)" stroke="none" /></g></S>,
  island: (p) => <S {...p}><g stroke="var(--line)" strokeWidth="1.8" strokeLinejoin="round"><path d="M2 19c3-2 6-2 10 0s7 2 10 0" fill="none" strokeLinecap="round" /><path d="M12 13V7" fill="none" strokeLinecap="round" /><path d="M12 7C9 7 8 4.5 8 3c2.5 0 4 1.5 4 4 0-2.5 1.5-4 4-4 0 1.5-1 4-4 4z" fill="var(--green)" /></g></S>,
  bolt: IconBolt,
  skull: (p) => <S {...p}><g stroke="var(--line)" strokeWidth="1.8"><path d="M12 3a8 8 0 0 0-8 8c0 2.2 1 4.2 2.6 5.6L7 21h10l.4-4.4A7.97 7.97 0 0 0 20 11a8 8 0 0 0-8-8z" fill="var(--card)" /><circle cx="9" cy="11" r="1.6" fill="var(--line)" stroke="none" /><circle cx="15" cy="11" r="1.6" fill="var(--line)" stroke="none" /></g></S>,
  star: IconSparkle,
  mushroom: (p) => <S {...p}><g stroke="var(--line)" strokeWidth="1.8" strokeLinejoin="round"><path d="M12 3C6.5 3 3 6.5 3 10h18c0-3.5-3.5-7-9-7z" fill="var(--red)" /><circle cx="8.5" cy="6.5" r="1.4" fill="var(--card)" stroke="none" /><circle cx="14.5" cy="5.8" r="1.1" fill="var(--card)" stroke="none" /><path d="M9.5 10v5c0 3.5 5 3.5 5 0v-5z" fill="var(--card)" /></g></S>,
  anchor: (p) => <S {...p}><g stroke="var(--line)" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="5" r="2.6" fill="var(--card)" /><path d="M12 8v13" fill="none" /><path d="M4 14a8 8 0 0 0 16 0M4 14v-3m16 3v-3" fill="none" /></g></S>,
}
export const SPACE_ICON_KEYS = SPACE_ICONS.map((i) => i.id)

export function SpaceIcon({ name, size = 30 }) {
  if (SPACE_ICON_FILES.has(name)) {
    return (
      <img
        src={`./icons/space/${name}.png`}
        width={size}
        height={size}
        alt=""
        draggable={false}
        style={{ objectFit: 'contain' }}
      />
    )
  }
  // Older saved Spaces can still contain hand-drawn names. New or unknown
  // names use a real block asset instead of silently falling back to a rocket.
  const Def = LEGACY_SPACE_ICON_DEFS[name]
  if (Def) return <Def size={size} />
  return <img src="./icons/space/crafting-table.png" width={size} height={size} alt="" draggable={false} style={{ objectFit: 'contain' }} />
}

export const SPACE_COLORS = ['#f26a3c', '#3ea1d9', '#eeb64d', '#ef8fa5', '#71b06c', '#8d7ae0', '#e0503a', '#4fc4b5']

// Legacy pixel-family shims (kept so stale imports don't explode): sun/moon only.
export const McSun = IconSun
export const McMoon = IconMoon

/* ============================================================================
   Detailed 80px raster app icons (public/icons/app).
   Every icon exists as <name>.png; icons that have a matching <name>.gif
   play the animation while pressed (or while `active` is forced true).
   ========================================================================== */
const APP_ICONS_WITH_GIF = new Set([
  'add', 'favorite-add', 'checkbox-on', 'check', 'done', 'download',
  'installing', 'loading', 'menu', 'notification', 'process', 'trash',
  'tune', 'upload',
])

export function appIconUrl(name, animated = false) {
  return `./icons/app/${name}.${animated ? 'gif' : 'png'}`
}

export function AppIcon({ name, size = 20, active = false, alt = '', style, ...rest }) {
  const [pressed, setPressed] = useState(false)
  const hasGif = APP_ICONS_WITH_GIF.has(name)
  const animated = hasGif && (active || pressed)
  useEffect(() => {
    if (!pressed) return
    const up = () => setPressed(false)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [pressed])
  return (
    <img
      src={appIconUrl(name, animated)}
      width={size}
      height={size}
      alt={alt}
      draggable={false}
      className="app-icon"
      onPointerDown={hasGif ? () => setPressed(true) : undefined}
      style={{ objectFit: 'contain', verticalAlign: 'middle', flex: 'none', ...style }}
      {...rest}
    />
  )
}
