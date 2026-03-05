import { useState, useMemo, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useFamilyData, formatYear } from '../hooks/useFamilyData'
import PersonAvatar from '../components/PersonAvatar'
import { useTheme } from '../context/ThemeContext'
import { Baby, Skull, Filter, ArrowUp, BookOpen, Users, Calendar, Layers } from 'lucide-react'

// ── Eras for the Targaryen timeline ──────────────────────────────────────────
const ERAS = [
  { id: 'bc',      label: 'Before Conquest',     min: -Infinity, max: -1  },
  { id: 'early',   label: 'Early Conquest',       min: 0,         max: 99  },
  { id: 'classic', label: 'Classic Era',          min: 100,       max: 199 },
  { id: 'later',   label: 'Later Dynasty',        min: 200,       max: 259 },
  { id: 'end',     label: 'Fall of the Dragons',  min: 260,       max: Infinity },
]

function getEra(year) {
  if (year === null || year === undefined) return null
  return ERAS.find(e => year >= e.min && year <= e.max) || null
}

// ── Build flat list of timeline events from people data ───────────────────────
function buildEvents(people) {
  const events = []
  people.forEach(person => {
    if (person.birth_year !== null) {
      events.push({ type: 'born', year: person.birth_year, person })
    }
    if (person.death_year !== null && person.status !== 'alive') {
      events.push({ type: 'died', year: person.death_year, person })
    }
  })
  return events.sort((a, b) => a.year - b.year)
}

// ── Group events into eras ────────────────────────────────────────────────────
function groupByEra(events) {
  const groups = {}
  ERAS.forEach(era => { groups[era.id] = { era, events: [] } })
  events.forEach(ev => {
    const era = getEra(ev.year)
    if (era) groups[era.id].events.push(ev)
  })
  return ERAS.map(era => groups[era.id]).filter(g => g.events.length > 0)
}

// ── Summary stats ─────────────────────────────────────────────────────────────
function computeStats(people, events) {
  const births = events.filter(e => e.type === 'born')
  const deaths = events.filter(e => e.type === 'died')
  const alive = people.filter(p => p.status === 'alive')
  const years = events.map(e => e.year)
  const minYear = Math.min(...years)
  const maxYear = Math.max(...years)
  const lifespans = people
    .filter(p => p.birth_year !== null && p.death_year !== null)
    .map(p => p.death_year - p.birth_year)
  const avgLifespan = lifespans.length
    ? Math.round(lifespans.reduce((a, b) => a + b, 0) / lifespans.length)
    : null
  return { births: births.length, deaths: deaths.length, alive: alive.length, minYear, maxYear, avgLifespan, span: maxYear - minYear }
}

// ══════════════════════════════════════════════════════════════════════════════
export default function FamilyTimeline() {
  const { people, loading } = useFamilyData()
  const { theme } = useTheme()
  const isGot = theme === 'got'
  const [filter, setFilter] = useState('all') // 'all' | 'born' | 'died'
  const [activeEra, setActiveEra] = useState(null) // era id for jump-to
  const eraRefs = useRef({})
  const topRef = useRef(null)

  const allEvents = useMemo(() => buildEvents(people), [people])

  const filtered = useMemo(() => {
    if (filter === 'all') return allEvents
    return allEvents.filter(e => e.type === filter)
  }, [allEvents, filter])

  const groups = useMemo(() => groupByEra(filtered), [filtered])
  const stats = useMemo(() => computeStats(people, allEvents), [people, allEvents])

  // Scroll to era section when activeEra changes
  useEffect(() => {
    if (!activeEra) return
    const el = eraRefs.current[activeEra]
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActiveEra(null)
  }, [activeEra])

  const scrollToTop = () => topRef.current?.scrollIntoView({ behavior: 'smooth' })

  if (loading) return <Shell><LoadingState /></Shell>

  return (
    <Shell>
      <div ref={topRef} />

      {/* ── Page header ─────────────────────────────────────────── */}
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
          {isGot ? 'The Blood of the Dragon — Timeline' : 'Family Timeline'}
        </h1>
        <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>
          {formatYear(stats.minYear)} to {formatYear(stats.maxYear)} · {stats.span} years of history
        </p>
      </div>

      {/* ── Summary stats cards ──────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: '0.75rem',
        marginBottom: '2rem',
      }}>
        <StatCard icon={Users} label="Family Members" value={people.length} />
        <StatCard icon={Baby} label="Total Births" value={stats.births} color="var(--badge-alive-text)" />
        <StatCard icon={Skull} label="Total Deaths" value={stats.deaths} color="var(--badge-deceased-text)" />
        <StatCard icon={Layers} label="Generations" value={Math.max(...people.map(p => p.generation || 0))} />
        {stats.avgLifespan && (
          <StatCard icon={Calendar} label="Avg. Lifespan" value={`${stats.avgLifespan} yrs`} />
        )}
        <StatCard icon={BookOpen} label="Alive" value={stats.alive} color="var(--badge-alive-text)" />
      </div>

      {/* ── Controls ────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.75rem',
        alignItems: 'center',
        marginBottom: '2rem',
      }}>
        {/* Event type filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Filter size={13} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Show:</span>
        </div>
        {[
          { value: 'all',  label: 'All Events' },
          { value: 'born', label: 'Births only' },
          { value: 'died', label: 'Deaths only' },
        ].map(opt => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={filter === opt.value ? 'theme-btn theme-btn-primary' : 'theme-btn'}
          >
            {opt.label}
          </button>
        ))}

        <div style={{ height: '20px', width: '1px', backgroundColor: 'var(--border)', margin: '0 0.25rem' }} />

        {/* Jump to era */}
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Jump to:</span>
        {groups.map(({ era }) => (
          <button
            key={era.id}
            onClick={() => setActiveEra(era.id)}
            className="theme-btn"
            style={{ fontSize: '0.8rem' }}
          >
            {era.label}
          </button>
        ))}
      </div>

      {/* ── Timeline ────────────────────────────────────────────── */}
      <div style={{ position: 'relative' }}>
        {/* Vertical spine */}
        <div style={{
          position: 'absolute',
          left: '28px',
          top: 0,
          bottom: 0,
          width: '2px',
          backgroundColor: 'var(--border)',
          zIndex: 0,
        }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {groups.map(({ era, events }) => (
            <EraSection
              key={era.id}
              era={era}
              events={events}
              eraRef={el => eraRefs.current[era.id] = el}
            />
          ))}
        </div>
      </div>

      {/* ── Scroll to top button ─────────────────────────────────── */}
      <div style={{ marginTop: '3rem', textAlign: 'center' }}>
        <button onClick={scrollToTop} className="theme-btn" style={{ gap: '0.4rem' }}>
          <ArrowUp size={13} /> Back to top
        </button>
      </div>
    </Shell>
  )
}

// ── Era Section ───────────────────────────────────────────────────────────────
function EraSection({ era, events, eraRef }) {
  return (
    <div ref={eraRef} style={{ paddingBottom: '1rem' }}>
      {/* Era heading */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        paddingLeft: '0',
        marginBottom: '1rem',
        paddingTop: '1.5rem',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Diamond on spine */}
        <div style={{
          width: '58px',
          display: 'flex',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <div style={{
            width: '14px',
            height: '14px',
            transform: 'rotate(45deg)',
            backgroundColor: 'var(--accent)',
            flexShrink: 0,
          }} />
        </div>

        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.85rem',
          fontWeight: 700,
          color: 'var(--accent)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}>
          {era.label}
        </span>

        <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }} />
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0 }}>
          {events.length} event{events.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Events */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {events.map((ev, i) => (
          <TimelineEvent key={`${ev.person.id}-${ev.type}`} event={ev} isLast={i === events.length - 1} />
        ))}
      </div>
    </div>
  )
}

// ── Single timeline event row ─────────────────────────────────────────────────
function TimelineEvent({ event }) {
  const { type, year, person } = event
  const isBorn = type === 'born'

  const dotColor = isBorn ? 'var(--badge-alive-text)' : 'var(--badge-deceased-text)'
  const dotBg   = isBorn ? 'var(--badge-alive)'       : 'var(--badge-deceased)'

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '0',
      position: 'relative',
      zIndex: 1,
    }}>
      {/* Dot column */}
      <div style={{
        width: '58px',
        display: 'flex',
        justifyContent: 'center',
        paddingTop: '10px',
        flexShrink: 0,
      }}>
        <div style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          backgroundColor: dotColor,
          border: `2px solid var(--surface)`,
          outline: `2px solid ${dotColor}`,
          flexShrink: 0,
        }} />
      </div>

      {/* Card */}
      <Link
        to={`/person/${person.id}`}
        style={{ textDecoration: 'none', flex: 1 }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.6rem 0.9rem',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--surface)',
            cursor: 'pointer',
            transition: 'background-color 0.1s, border-color 0.1s',
            marginBottom: '0',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = 'var(--accent-light)'
            e.currentTarget.style.borderColor = 'var(--accent)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = 'var(--surface)'
            e.currentTarget.style.borderColor = 'var(--border)'
          }}
        >
          {/* Avatar */}
          <PersonAvatar person={person} size={36} fontSize={12} />

          {/* Name + location */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontWeight: 600,
              fontSize: '0.9rem',
              color: 'var(--text)',
              fontFamily: 'var(--font-display)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {person.first_name} {person.last_name}
            </div>
            {(isBorn ? person.birth_location : person.death_location) && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                {isBorn ? person.birth_location : person.death_location}
              </div>
            )}
          </div>

          {/* Event type badge */}
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.15rem 0.55rem',
            borderRadius: '99px',
            fontSize: '0.75rem',
            fontWeight: 600,
            backgroundColor: dotBg,
            color: dotColor,
            flexShrink: 0,
          }}>
            {isBorn ? <Baby size={10} /> : <Skull size={10} />}
            {isBorn ? 'Born' : 'Died'}
          </span>

          {/* Year */}
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.85rem',
            fontWeight: 700,
            color: 'var(--accent)',
            flexShrink: 0,
            minWidth: '70px',
            textAlign: 'right',
          }}>
            {formatYear(year)}
          </div>
        </div>
      </Link>
    </div>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div style={{
      padding: '0.9rem 1rem',
      borderRadius: '8px',
      border: '1px solid var(--border)',
      backgroundColor: 'var(--surface)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
        <Icon size={13} style={{ color: color || 'var(--accent)' }} />
        <span style={{
          fontSize: '0.7rem',
          fontWeight: 600,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
        }}>
          {label}
        </span>
      </div>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: '1.5rem',
        fontWeight: 700,
        color: color || 'var(--text)',
        lineHeight: 1,
      }}>
        {value}
      </div>
    </div>
  )
}

// ── Shells ────────────────────────────────────────────────────────────────────
function Shell({ children }) {
  return (
    <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {children}
    </main>
  )
}

function LoadingState() {
  return (
    <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
      Loading timeline…
    </div>
  )
}
