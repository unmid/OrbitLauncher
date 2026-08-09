import { useEffect, useRef, useState } from 'react'

/**
 * Loading screen: plays the intro video with sound ON.
 * The last 1 second of the video fades the picture out (the sound keeps playing)
 * and then we slide into the launcher.
 */
export default function Splash({ onDone }) {
  const videoRef = useRef(null)
  const [fading, setFading] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const doneRef = useRef(false)

  useEffect(() => {
    const v = videoRef.current
    if (v) {
      v.volume = 1
      v.muted = false
      const tryPlay = v.play()
      if (tryPlay && tryPlay.catch) {
        tryPlay.catch(() => {
          // Browser wants a user gesture before sound: start muted, offer tap
          v.muted = true
          v.play().catch(() => {})
        })
      }
    }
  }, [])

  const finish = () => {
    if (doneRef.current) return
    doneRef.current = true
    setLeaving(true)
    setTimeout(onDone, 450) // let the slide-out animation play
  }

  const onTimeUpdate = () => {
    const v = videoRef.current
    if (!v || !v.duration) return
    // last 1 second -> gentle fade of the picture (sound keeps going)
    if (v.duration - v.currentTime <= 1) {
      setFading(true)
    }
  }

  return (
    <div className={`splash ${leaving ? 'splash-leave' : ''}`}>
      <video
        ref={videoRef}
        className={`splash-video ${fading ? 'splash-video-fade' : ''}`}
        src="./intro.mp4"
        autoPlay
        playsInline
        onTimeUpdate={onTimeUpdate}
        onEnded={finish}
        onError={finish}
      />
    </div>
  )
}
