import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useFamilyData, formatYear, fullName } from '../hooks/useFamilyData'
import PersonAvatar from '../components/PersonAvatar'
import { Search, ArrowUpDown, ArrowUp, ArrowDown, ChevronRight } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

const SORT_OPTIONS = [
  { value: 'last_name_asc', label: 'Last Name A–Z' },
  { value: 'first_name_asc', label: 'First Name A–Z' },
  { value: 'birth_year_asc', label: 'Birth Year (Oldest First)' },
  { value: 'birth_year_desc', label: 'Birth Year (Newest First)' },
  { value: 'generation_asc', label: 'Generation (1st → Last)' },
]

function sortPeople(people, sortKey) {
  return [...people].sort((a, b) => {
    switch (sortKey) {
      case 'first_name_asc':
        return a.first_name.localeCompare(b.first_name)
      case 'last_name_asc':
        return a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name)
      case 'birth_year_asc': {
        const ay = a.birth_year ?? Infinity
        const by = b.birth_year ?? Infinity
        return ay - by
      }
      case 'birth_year_desc': {
        const ay = a.birth_year ?? -Infinity
        const by = b.birth_year ?? -Infinity
        return by - ay
      }
      case 'generation_asc': {
        const ag = a.generation ?? Infinity
        const bg = b.generation ?? Infinity
        return ag - bg || a.first_name.localeCompare(b.first_name)
      }
      default:
        return 0
    }
  })
}

// Group alphabetically by first letter of sort key
function getAlphaGroups(people, sortKey) {
  if (sortKey === 'birth_year_asc' || sortKey === 'birth_year_desc') return null
  if (sortKey === 'generation_asc') return null

  const key = sortKey === 'first_name_asc' ? 'first_name' : 'last_name'
  const groups = {}
  people.forEach(p => {
    const letter = (p[key]?.[0] || '?').toUpperCase()
    if (!groups[letter]) groups[letter] = []
    groups[letter].push(p)
  })
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
}

export default function FamilyList() {
  const { people, loading, error } = useFamilyData()
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('last_name_asc')
  const { theme } = useTheme()
  const isGot = theme === 'got'

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return people
    return people.filter(p =>
      fullName(p).toLowerCase().includes(q) ||
      p.birth_location?.toLowerCase().includes(q) ||
      p.bio?.toLowerCase().includes(q)
    )
  }, [people, search])

  const sorted = useMemo(() => sortPeople(filtered, sort), [filtered, sort])
  const groups = useMemo(() => getAlphaGroups(sorted, sort), [sorted, sort])

  if (loading) return <PageShell><LoadingState /></PageShell>
  if (error) return <PageShell><ErrorState message={error} /></PageShell>

  return (
    <PageShell>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="got-heading-deco" style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.75rem',
          fontWeight: 700,
          color: 'var(--text)',
          margin: '0 0 0.35rem 0',
          letterSpacing: isGot ? '0.08em' : '0',
          textTransform: isGot ? 'uppercase' : 'none',
        }}>
          {isGot ? 'House Targaryen — Members of the Blood' : 'Family Directory'}
        </h1>
        <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>
          {people.length} family members across {Math.max(...people.map(p => p.generation || 0))} generations
        </p>
      </div>

      {/* Controls */}
      <div style={{
        display: 'flex',
        gap: '0.75rem',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: '400px' }}>
          <Search size={14} style={{
            position: 'absolute', left: '10px', top: '50%',
            transform: 'translateY(-50%)', color: 'var(--text-muted)',
            pointerEvents: 'none',
          }} />
          <input
            type="text"
            placeholder="Search by name or location…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '0.45rem 0.75rem 0.45rem 2rem',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface)',
              color: 'var(--text)',
              fontSize: '0.875rem',
              fontFamily: 'var(--font-body)',
              outline: 'none',
            }}
          />
        </div>

        {/* Sort */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ArrowUpDown size={14} style={{ color: 'var(--text-muted)' }} />
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            style={{
              padding: '0.45rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface)',
              color: 'var(--text)',
              fontSize: '0.875rem',
              fontFamily: 'var(--font-body)',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Count */}
        {search && (
          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {sorted.length} result{sorted.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Person list */}
      {sorted.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          No family members found.
        </div>
      ) : groups ? (
        // Alphabetical grouped view
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {groups.map(([letter, members]) => (
            <section key={letter}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '0.75rem',
              }}>
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  color: 'var(--accent)',
                  minWidth: '1.5rem',
                }}>
                  {letter}
                </span>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }} />
              </div>
              <PersonTable members={members} />
            </section>
          ))}
        </div>
      ) : (
        // Flat sorted view (for year/generation sorts)
        <PersonTable members={sorted} showExtra={sort} />
      )}
    </PageShell>
  )
}

function PersonTable({ members, showExtra }) {
  return (
    <div style={{
      backgroundColor: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      overflow: 'hidden',
    }}>
      {members.map((person, i) => (
        <PersonRow
          key={person.id}
          person={person}
          showExtra={showExtra}
          isLast={i === members.length - 1}
        />
      ))}
    </div>
  )
}

function PersonRow({ person, isLast, showExtra }) {
  const born = formatYear(person.birth_year)
  const died = person.status === 'alive' ? 'alive' : formatYear(person.death_year)

  return (
    <Link
      to={`/person/${person.id}`}
      style={{ textDecoration: 'none' }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '0.75rem 1rem',
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
        cursor: 'pointer',
        transition: 'background-color 0.1s',
      }}
        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--accent-light)'}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        {/* Avatar */}
        <PersonAvatar person={person} size={40} />

        {/* Name + location */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 600,
            fontSize: '0.95rem',
            color: 'var(--text)',
            fontFamily: 'var(--font-display)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {person.first_name} {person.last_name}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '1px' }}>
            {person.birth_location || 'Unknown location'}
          </div>
        </div>

        {/* Extra: birth year or generation */}
        {(showExtra === 'birth_year_asc' || showExtra === 'birth_year_desc') && (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'right', flexShrink: 0 }}>
            <div>b. {born}</div>
            <div>d. {died}</div>
          </div>
        )}
        {showExtra === 'generation_asc' && person.generation && (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'right', flexShrink: 0 }}>
            Gen. {person.generation}
          </div>
        )}

        {/* Status badge */}
        <span className={person.status === 'alive' ? 'badge-alive' : 'badge-deceased'}>
          {person.status === 'alive' ? 'Alive' : 'Deceased'}
        </span>

        {/* Arrow */}
        <ChevronRight size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
      </div>
    </Link>
  )
}

function PageShell({ children }) {
  return (
    <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {children}
    </main>
  )
}

function LoadingState() {
  return (
    <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
      Loading family data…
    </div>
  )
}

function ErrorState({ message }) {
  return (
    <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--badge-deceased-text)' }}>
      Error loading data: {message}
    </div>
  )
}
