import { useEffect, useRef, useState } from 'react'
import { useTheme } from '../context/ThemeContext'

const VIDEO_ID = '60xrQTUPies'

export default function ThemeMusic() {
  const { theme } = useTheme()
  const divRef = useRef(null)
  const playerRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [muted, setMuted] = useState(false)

  // Load YouTube IFrame API once and create the player
  useEffect(() => {
    let mounted = true

    function createPlayer() {
      if (!divRef.current || playerRef.current) return
      playerRef.current = new window.YT.Player(divRef.current, {
        videoId: VIDEO_ID,
        playerVars: {
          loop: 1,
          playlist: VIDEO_ID,
          controls: 0,
          disablekb: 1,
          playsinline: 1,
        },
        events: {
          onReady: () => { if (mounted) setReady(true) },
        },
      })
    }

    if (window.YT?.Player) {
      createPlayer()
    } else {
      const prev = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        prev?.()
        if (mounted) createPlayer()
      }
      if (!document.getElementById('yt-api-script')) {
        const s = document.createElement('script')
        s.id = 'yt-api-script'
        s.src = 'https://www.youtube.com/iframe_api'
        document.head.appendChild(s)
      }
    }

    return () => {
      mounted = false
      playerRef.current?.destroy()
      playerRef.current = null
    }
  }, [])

  // Play or pause when theme changes, once player is ready
  useEffect(() => {
    if (!ready || !playerRef.current) return
    if (theme === 'got') {
      playerRef.current.setVolume(40)
      if (!muted) playerRef.current.unMute()
      playerRef.current.playVideo()
    } else {
      playerRef.current.pauseVideo()
    }
  }, [theme, ready])

  const toggleMute = () => {
    setMuted(m => {
      const next = !m
      if (playerRef.current) {
        next ? playerRef.current.mute() : playerRef.current.unMute()
      }
      return next
    })
  }

  return (
    <>
      {/* Invisible player element — always in DOM so the ref is available */}
      <div
        ref={divRef}
        style={{ position: 'fixed', top: -9999, left: -9999, width: 1, height: 1, pointerEvents: 'none' }}
      />

      {/* Floating mute button — only visible in GoT theme */}
      {theme === 'got' && (
        <button
          onClick={toggleMute}
          title={muted ? 'Unmute music' : 'Mute music'}
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1000,
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: '1px solid var(--accent)',
            background: 'rgba(15, 8, 4, 0.88)',
            backdropFilter: 'blur(6px)',
            color: 'var(--accent)',
            fontSize: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
            transition: 'opacity 0.2s',
          }}
        >
          {muted ? '🔇' : '🎵'}
        </button>
      )}
    </>
  )
}
