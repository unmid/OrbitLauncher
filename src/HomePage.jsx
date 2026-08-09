import { useEffect, useState } from 'react'
import { api } from './api.js'
import { IconNews, IconShield, IconGlobe } from './icons.jsx'

const HOME_URL = 'https://unmid.github.io/OL-updater/ol.html'
const DISCORD_URL = 'https://discord.gg/Z7QfWSPJmJ'
const RELEASENOTES_URL = 'https://github.com/unmid/Orbit-Launcher/releases'
const WALLPAPERS = ['./wallpapers/w1.png', './wallpapers/w2.png', './wallpapers/w3.png', './wallpapers/w4.png']

/**
 * Home hero: embeds the published marketing page (https://unmid.github.io/OL-updater/ol.html)
 * as a live iframe. Offline -> calm wallpaper slideshow so the hero is never blank.
 */
export default function HomePage() {
  const [online, setOnline] = useState(navigator.onLine)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])

  useEffect(() => {
    if (online) return
    const t = setInterval(() => setIndex((i) => (i + 1) % WALLPAPERS.length), 7000)
    return () => clearInterval(t)
  }, [online])

  return (
    <div className="page page-home">
      <section className="hero">
        <div className="hero-body">
          {online ? (
            <iframe
              className="hero-frame hero-frame-live"
              src={HOME_URL}
              title="Orbit Launcher"
              allow="fullscreen"
            />
          ) : (
            WALLPAPERS.map((src, i) => (
              <div
                key={src}
                className={`hero-slide ${i === index ? 'on' : ''}`}
                style={{ backgroundImage: `url(${src})` }}
              />
            ))
          )}
        </div>
      </section>

      <section className="home-lower">
        <button className="link-card link-card-discord" onClick={() => api.openUrl(DISCORD_URL)}>
          <img src="./icons/loader/discord.png" width="30" height="30" alt="" draggable={false} />
          <div>
            <div className="link-card-title">Discord</div>
            <div className="link-card-sub">Community, support and sneak peeks</div>
          </div>
        </button>
        <button className="link-card" onClick={() => api.openUrl(RELEASENOTES_URL)}>
          <IconNews size={26} />
          <div>
            <div className="link-card-title">Changelog</div>
            <div className="link-card-sub">What's new in Orbit Launcher (beta)</div>
          </div>
        </button>
        <button className="link-card" onClick={() => api.openUrl('https://www.minecraft.net')}>
          <IconGlobe size={26} />
          <div>
            <div className="link-card-title">Minecraft.net</div>
            <div className="link-card-sub">Official site, marketplace &amp; realms</div>
          </div>
        </button>
        <div className="secure-note">
          <IconShield size={16} />
          <span>Everything is stored locally on your PC — accounts, worlds and settings never leave this machine except official Microsoft sign-in.</span>
        </div>
      </section>
    </div>
  )
}
