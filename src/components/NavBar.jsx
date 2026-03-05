import { Link, useLocation } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { List, Clock, GitBranch, Flame, Sun } from 'lucide-react'

const LINKS = [
  { to: '/', label: 'Family List', icon: List },
  { to: '/timeline', label: 'Timeline', icon: Clock },
  { to: '/tree', label: 'Family Tree', icon: GitBranch },
]

export default function NavBar() {
  const { theme, toggleTheme } = useTheme()
  const { pathname } = useLocation()
  const isGot = theme === 'got'

  return (
    <header style={{
      backgroundColor: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 1.5rem',
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
      }}>
        {/* Logo / wordmark */}
        <Link to="/" style={{ textDecoration: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1rem',
              fontWeight: 700,
              color: 'var(--accent)',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              lineHeight: 1,
            }}>
              {isGot ? '🐉 House Targaryen' : 'Family Archive'}
            </span>
          </div>
        </Link>

        {/* Nav links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          {LINKS.map(({ to, label, icon: Icon }) => {
            const active = pathname === to || (to !== '/' && pathname.startsWith(to))
            return (
              <Link
                key={to}
                to={to}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: active ? 600 : 400,
                  color: active ? 'var(--accent)' : 'var(--text-muted)',
                  backgroundColor: active ? 'var(--accent-light)' : 'transparent',
                  textDecoration: 'none',
                  transition: 'all 0.15s',
                }}
              >
                <Icon size={14} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Theme switcher */}
        <button
          onClick={toggleTheme}
          className="theme-btn"
          title={isGot ? 'Switch to Neutral Theme' : 'Switch to GoT Theme'}
          style={{ minWidth: 'fit-content' }}
        >
          {isGot
            ? <><Sun size={14} /> Neutral</>
            : <><Flame size={14} /> GoT Theme</>
          }
        </button>
      </div>
    </header>
  )
}
