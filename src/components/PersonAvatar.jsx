import { useState } from 'react'
import { getInitials } from '../hooks/useFamilyData'

// House color accent for GoT theme avatar backgrounds
const HOUSE_COLORS = {
  Targaryen: { bg: '#3d0000', text: '#c9a84c' },
  Hightower: { bg: '#1a2e1a', text: '#7ec87a' },
  Arryn: { bg: '#001a3d', text: '#7aaec8' },
  Stark: { bg: '#1a1a2e', text: '#9e9eb0' },
  default: { bg: '#2a2a2a', text: '#aaaaaa' },
}

export default function PersonAvatar({ person, size = 48, fontSize = null }) {
  const [imgError, setImgError] = useState(false)
  const hasPortrait = person?.portrait_url && !imgError

  const colors = HOUSE_COLORS[person?.house] || HOUSE_COLORS.default
  const fSize = fontSize || Math.round(size * 0.36)
  const initials = getInitials(person)

  const style = {
    width: size,
    height: size,
    borderRadius: '50%',
    overflow: 'hidden',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid var(--border)',
    backgroundColor: colors.bg,
    color: colors.text,
    fontFamily: 'var(--font-display)',
    fontSize: fSize,
    fontWeight: 600,
    letterSpacing: '0.05em',
    userSelect: 'none',
  }

  if (hasPortrait) {
    return (
      <div style={style}>
        <img
          src={person.portrait_url}
          alt={`${person.first_name} ${person.last_name}`}
          onError={() => setImgError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
    )
  }

  return (
    <div style={style}>
      {initials}
    </div>
  )
}
