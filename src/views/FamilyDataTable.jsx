import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useFamilyData, formatYear } from '../hooks/useFamilyData'
import PersonAvatar from '../components/PersonAvatar'
import { ArrowUp, ArrowDown, ArrowUpDown, Copy, Check } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

const COLUMNS = [
  { key: 'portrait',       label: 'Portrait',    sortable: false, width: 84  },
  { key: 'first_name',     label: 'First Name',  sortable: true,  width: 120 },
  { key: 'last_name',      label: 'Last Name',   sortable: true,  width: 120 },
  { key: 'id',             label: 'ID',          sortable: true,  width: 150 },
  { key: 'gender',         label: 'Gender',      sortable: true,  width: 80  },
  { key: 'house',          label: 'House',       sortable: true,  width: 110 },
  { key: 'generation',     label: 'Gen.',        sortable: true,  width: 60  },
  { key: 'status',         label: 'Status',      sortable: true,  width: 95  },
  { key: 'birth_year',     label: 'Birth Year',  sortable: true,  width: 95  },
  { key: 'death_year',     label: 'Death Year',  sortable: true,  width: 95  },
  { key: 'birth_location', label: 'Born In',     sortable: true,  width: 150 },
  { key: 'death_location', label: 'Died In',     sortable: true,  width: 150 },
  { key: 'father_id',      label: 'Father ID',   sortable: true,  width: 140 },
  { key: 'mother_id',      label: 'Mother ID',   sortable: true,  width: 140 },
  { key: 'spouse_ids',     label: 'Spouses',     sortable: false, width: 180 },
  { key: 'bio',            label: 'Bio',         sortable: false, width: 300 },
]

function SortIcon({ col, sortKey, sortDir }) {
  if (col !== sortKey) return <ArrowUpDown size={11} style={{ opacity: 0.35, flexShrink: 0 }} />
  if (sortDir === 'asc')  return <ArrowUp   size={11} style={{ color: 'var(--accent)', flexShrink: 0 }} />
  return                         <ArrowDown  size={11} style={{ color: 'var(--accent)', flexShrink: 0 }} />
}

function CopyBtn({ url }) {
  const [copied, setCopied] = useState(false)
  if (!url) return <div style={{ width: 20 }} />

  const handleCopy = (e) => {
    e.preventDefault()
    e.stopPropagation()
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <button
      onClick={handleCopy}
      title="Copy portrait URL"
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '3px 4px',
        borderRadius: '4px',
        color: copied ? 'var(--accent)' : 'var(--text-muted)',
        display: 'flex',
        alignItems: 'center',
        flexShrink: 0,
        transition: 'color 0.15s',
      }}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  )
}

function DataRow({ person, isEven }) {
  const [hovered, setHovered] = useState(false)
  const bg = hovered
    ? 'var(--accent-light)'
    : isEven ? 'var(--surface)' : 'var(--bg)'

  const cell = {
    padding: '0.45rem 0.75rem',
    borderBottom: '1px solid var(--border)',
    borderRight: '1px solid var(--border)',
    color: 'var(--text)',
    verticalAlign: 'middle',
    backgroundColor: bg,
    transition: 'background-color 0.1s',
    whiteSpace: 'nowrap',
  }
  const muted = { ...cell, color: 'var(--text-muted)' }
  const mono  = { ...muted, fontFamily: 'monospace', fontSize: '0.72rem' }

  return (
    <tr onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>

      {/* Portrait + copy button */}
      <td style={cell}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <PersonAvatar person={person} size={30} />
          <CopyBtn url={person.portrait_url} />
        </div>
      </td>

      {/* First name (linked) */}
      <td style={cell}>
        <Link
          to={`/person/${person.id}`}
          style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}
        >
          {person.first_name}
        </Link>
      </td>

      {/* Last name */}
      <td style={cell}>{person.last_name}</td>

      {/* ID */}
      <td style={mono}>{person.id}</td>

      {/* Gender */}
      <td style={muted}>{person.gender}</td>

      {/* House */}
      <td style={cell}>{person.house}</td>

      {/* Generation */}
      <td style={{ ...cell, textAlign: 'center' }}>{person.generation ?? '—'}</td>

      {/* Status badge */}
      <td style={cell}>
        <span className={person.status === 'alive' ? 'badge-alive' : 'badge-deceased'}>
          {person.status === 'alive' ? 'Alive' : 'Deceased'}
        </span>
      </td>

      {/* Birth year */}
      <td style={muted}>{person.birth_year !== null ? formatYear(person.birth_year) : '—'}</td>

      {/* Death year */}
      <td style={muted}>{person.death_year !== null ? formatYear(person.death_year) : '—'}</td>

      {/* Birth location */}
      <td style={muted}>{person.birth_location || '—'}</td>

      {/* Death location */}
      <td style={muted}>{person.death_location || '—'}</td>

      {/* Father ID */}
      <td style={mono}>{person.father_id || '—'}</td>

      {/* Mother ID */}
      <td style={mono}>{person.mother_id || '—'}</td>

      {/* Spouse IDs */}
      <td style={mono}>{person.spouse_ids?.length ? person.spouse_ids.join(', ') : '—'}</td>

      {/* Bio (2-line clamp) */}
      <td style={{ ...muted, whiteSpace: 'normal', maxWidth: 300 }}>
        <span
          title={person.bio}
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: 1.45,
          }}
        >
          {person.bio || '—'}
        </span>
      </td>
    </tr>
  )
}

export default function FamilyDataTable() {
  const { people, loading, error } = useFamilyData()
  const [sortKey, setSortKey] = useState('last_name')
  const [sortDir, setSortDir] = useState('asc')
  const { theme } = useTheme()
  const isGot = theme === 'got'

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sorted = useMemo(() => {
    return [...people].sort((a, b) => {
      const numeric = ['birth_year', 'death_year', 'generation']
      if (numeric.includes(sortKey)) {
        const av = a[sortKey] ?? (sortDir === 'asc' ? Infinity : -Infinity)
        const bv = b[sortKey] ?? (sortDir === 'asc' ? Infinity : -Infinity)
        return sortDir === 'asc' ? av - bv : bv - av
      }
      const av = (a[sortKey] || '').toLowerCase()
      const bv = (b[sortKey] || '').toLowerCase()
      const cmp = av.localeCompare(bv)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [people, sortKey, sortDir])

  if (loading) return (
    <main style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
      Loading family data…
    </main>
  )
  if (error) return (
    <main style={{ padding: '4rem', textAlign: 'center', color: 'var(--badge-deceased-text)', fontFamily: 'var(--font-body)' }}>
      Error loading data: {error}
    </main>
  )

  return (
    <main style={{ padding: '1.5rem 1.5rem 3rem' }}>

      {/* Page header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.5rem',
          fontWeight: 700,
          color: 'var(--text)',
          margin: '0 0 0.3rem 0',
          letterSpacing: isGot ? '0.06em' : '0',
          textTransform: isGot ? 'uppercase' : 'none',
        }}>
          {isGot ? 'The Blood of the Dragon — Data Records' : 'Family Data Table'}
        </h1>
        <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.85rem' }}>
          {sorted.length} records · Click any column header to sort · Click a name to open the person card
        </p>
      </div>

      {/* Scrollable table */}
      <div style={{
        overflowX: 'auto',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        backgroundColor: 'var(--surface)',
      }}>
        <table style={{
          borderCollapse: 'collapse',
          fontSize: '0.8rem',
          width: 'max-content',
          minWidth: '100%',
          fontFamily: 'var(--font-body)',
        }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)' }}>
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  onClick={() => col.sortable && handleSort(col.key)}
                  style={{
                    padding: '0.55rem 0.75rem',
                    textAlign: 'left',
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    letterSpacing: '0.07em',
                    textTransform: 'uppercase',
                    color: sortKey === col.key ? 'var(--accent)' : 'var(--text-muted)',
                    backgroundColor: 'var(--surface)',
                    whiteSpace: 'nowrap',
                    cursor: col.sortable ? 'pointer' : 'default',
                    userSelect: 'none',
                    width: col.width,
                    borderRight: '1px solid var(--border)',
                    position: 'sticky',
                    top: 0,
                    zIndex: 2,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    {col.label}
                    {col.sortable && (
                      <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((person, i) => (
              <DataRow key={person.id} person={person} isEven={i % 2 === 0} />
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
