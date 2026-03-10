import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useFamilyData, formatYear } from '../hooks/useFamilyData'
import { useTheme } from '../context/ThemeContext'
import { Baby, Skull, Users, Calendar, Layers, BookOpen, ZoomIn, ZoomOut } from 'lucide-react'

// ── Constants ─────────────────────────────────────────────────────────────────
const YEAR_COL_W = 76   // width of the sticky year axis
const COL_W      = 52   // width of each person column
const COL_GAP    = 4    // gap between person columns
const CHART_PAD  = 32   // top/bottom padding inside chart area
const LABEL_STEP = 25   // year label every N years
const MIN_PX     = 1.2
const MAX_PX     = 6
const DEFAULT_PX = 2.2

// ── Eras ──────────────────────────────────────────────────────────────────────
const ERAS = [
  { id: 'bc',      label: 'Before Conquest',    min: -Infinity, max: -1,       color: 'rgba(124,58,237,0.07)' },
  { id: 'early',   label: 'Early Conquest',      min: 0,         max: 99,       color: 'rgba(185,28,28,0.06)'  },
  { id: 'classic', label: 'Classic Era',         min: 100,       max: 199,      color: 'rgba(29,78,216,0.05)'  },
  { id: 'later',   label: 'Later Dynasty',       min: 200,       max: 259,      color: 'rgba(21,128,61,0.06)'  },
  { id: 'end',     label: 'Fall of the Dragons', min: 260,       max: Infinity, color: 'rgba(194,65,12,0.07)'  },
]

// ── House colours ─────────────────────────────────────────────────────────────
const HOUSE_COLORS = {
  Targaryen: '#b91c1c',
  Velaryon:  '#1d4ed8',
  Arryn:     '#0369a1',
  Hightower: '#b45309',
  Stark:     '#374151',
  Rogare:    '#7c3aed',
  Martell:   '#c2410c',
  Blackwood: '#065f46',
  Dayne:     '#5b21b6',
}
function houseColor(house) {
  return HOUSE_COLORS[house] || '#6b7280'
}

// ── Stats helpers ─────────────────────────────────────────────────────────────
function computeStats(people) {
  const withBirth = people.filter(p => p.birth_year !== null)
  const withDeath = people.filter(p => p.death_year !== null)
  const alive     = people.filter(p => p.status === 'alive')
  const lifespans = people
    .filter(p => p.birth_year !== null && p.death_year !== null)
    .map(p => p.death_year - p.birth_year)
  const avgLifespan = lifespans.length
    ? Math.round(lifespans.reduce((a, b) => a + b, 0) / lifespans.length)
    : null
  const gens = Math.max(...people.map(p => p.generation || 0))
  return { births: withBirth.length, deaths: withDeath.length, alive: alive.length, avgLifespan, gens }
}

// ══════════════════════════════════════════════════════════════════════════════
export default function FamilyTimeline() {
  const { people, loading } = useFamilyData()
  const { theme } = useTheme()
  const isGot = theme === 'got'

  const [pxPerYear, setPxPerYear]       = useState(DEFAULT_PX)
  const [hovered, setHovered]           = useState(null)
  const [tooltipPos, setTooltipPos]     = useState({ x: 0, y: 0 })

  // ── Derive sorted people + year range ────────────────────────────────────
  const { sorted, minYear, maxYear } = useMemo(() => {
    if (!people.length) return { sorted: [], minYear: -50, maxYear: 310 }
    const sorted = [...people]
      .filter(p => p.birth_year !== null)
      .sort((a, b) => a.birth_year - b.birth_year)
    const allYears = people.flatMap(p =>
      [p.birth_year, p.death_year].filter(y => y !== null)
    )
    return {
      sorted,
      minYear: Math.min(...allYears) - 20,
      maxYear: Math.max(...allYears) + 20,
    }
  }, [people])

  const yearToY       = (y) => CHART_PAD + (y - minYear) * pxPerYear
  const totalHeight   = CHART_PAD * 2 + (maxYear - minYear) * pxPerYear
  const totalWidth    = sorted.length * (COL_W + COL_GAP) - COL_GAP

  // ── Year axis labels ───────────────────────────────────────────────────────
  const yearLabels = useMemo(() => {
    const labels = []
    const start  = Math.ceil(minYear / LABEL_STEP) * LABEL_STEP
    for (let y = start; y <= maxYear; y += LABEL_STEP) labels.push(y)
    return labels
  }, [minYear, maxYear])

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => computeStats(people), [people])

  if (loading) {
    return (
      <Shell>
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          Loading…
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{
          fontFamily:    'var(--font-display)',
          fontSize:      '1.75rem',
          fontWeight:    700,
          color:         'var(--text)',
          margin:        '0 0 0.35rem 0',
          letterSpacing: isGot ? '0.08em' : '0',
          textTransform: isGot ? 'uppercase' : 'none',
        }}>
          {isGot ? 'The Blood of the Dragon — Timeline' : 'Family Timeline'}
        </h1>
        <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>
          {formatYear(minYear + 20)} to {formatYear(maxYear - 20)} · Gantt view — each bar = one life
        </p>
      </div>

      {/* ── Stats cards ──────────────────────────────────────────────────── */}
      <div style={{
        display:             'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap:                 '0.75rem',
        marginBottom:        '1.75rem',
      }}>
        <StatCard icon={Users}    label="Members"     value={people.length}        />
        <StatCard icon={Baby}     label="Births"      value={stats.births}   color="var(--badge-alive-text)"     />
        <StatCard icon={Skull}    label="Deaths"      value={stats.deaths}   color="var(--badge-deceased-text)"  />
        <StatCard icon={Layers}   label="Generations" value={stats.gens}           />
        {stats.avgLifespan && (
          <StatCard icon={Calendar} label="Avg Lifespan" value={`${stats.avgLifespan} yrs`} />
        )}
        <StatCard icon={BookOpen} label="Alive"       value={stats.alive}    color="var(--badge-alive-text)"     />
      </div>

      {/* ── Gantt chart card ─────────────────────────────────────────────── */}
      <div style={{
        border:       '1px solid var(--border)',
        borderRadius: '12px',
        overflow:     'hidden',
        backgroundColor: 'var(--surface)',
      }}>

        {/* Zoom toolbar */}
        <div style={{
          display:         'flex',
          alignItems:      'center',
          gap:             '0.5rem',
          padding:         '0.6rem 0.9rem',
          borderBottom:    '1px solid var(--border)',
          backgroundColor: 'var(--surface)',
        }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: '0.25rem' }}>Zoom</span>
          <button
            className="theme-btn"
            onClick={() => setPxPerYear(v => Math.max(MIN_PX, +(v - 0.4).toFixed(1)))}
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
            title="Zoom out"
          >
            <ZoomOut size={13} />
          </button>
          <button
            className="theme-btn"
            onClick={() => setPxPerYear(v => Math.min(MAX_PX, +(v + 0.4).toFixed(1)))}
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
            title="Zoom in"
          >
            <ZoomIn size={13} />
          </button>
          <button
            className="theme-btn"
            onClick={() => setPxPerYear(DEFAULT_PX)}
            style={{ fontSize: '0.75rem' }}
          >
            Reset
          </button>

          {/* Legend */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            {[
              { label: 'Birth',         color: '#22c55e', shape: 'circle'  },
              { label: 'Death',         color: '#ef4444', shape: 'diamond' },
              { label: 'Alive',         color: '#22c55e', shape: 'fade'    },
              { label: 'Unknown death', color: '#7c3aed', shape: 'fade'    },
            ].map(({ label, color, shape }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                {shape === 'circle'  && <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: color }} />}
                {shape === 'diamond' && <div style={{ width: 8, height: 8, backgroundColor: color, transform: 'rotate(45deg)' }} />}
                {shape === 'fade'    && <div style={{ width: 8, height: 14, borderRadius: '2px 2px 0 0', background: `linear-gradient(to bottom, ${color}, transparent)` }} />}
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{label}</span>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <div style={{ width: 12, height: 12, backgroundColor: '#b91c1c', borderRadius: '2px', opacity: 0.75 }} />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Bar = house colour</span>
            </div>
          </div>
        </div>

        {/* ── Scrollable chart ───────────────────────────────────────────── */}
        <div style={{ overflow: 'auto', maxHeight: '72vh' }}>
          <div style={{ minWidth: `${YEAR_COL_W + totalWidth}px`, position: 'relative' }}>

            {/* ── Sticky header row: person names ─────────────────────── */}
            <div style={{
              position:        'sticky',
              top:             0,
              zIndex:          10,
              display:         'flex',
              backgroundColor: 'var(--surface)',
              borderBottom:    '1px solid var(--border)',
            }}>
              {/* Corner cell */}
              <div style={{
                position:        'sticky',
                left:            0,
                zIndex:          11,
                width:           YEAR_COL_W,
                flexShrink:      0,
                backgroundColor: 'var(--surface)',
                borderRight:     '1px solid var(--border)',
                display:         'flex',
                alignItems:      'flex-end',
                padding:         '0.4rem 0.5rem',
              }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Year ↓
                </span>
              </div>

              {/* Person name cells */}
              <div style={{ display: 'flex', alignItems: 'flex-end', padding: '0 0 0 0' }}>
                {sorted.map((person, i) => {
                  const color = houseColor(person.house)
                  return (
                    <Link
                      key={person.id}
                      to={`/person/${person.id}`}
                      title={`${person.first_name} ${person.last_name}`}
                      style={{
                        display:         'flex',
                        alignItems:      'flex-end',
                        justifyContent:  'center',
                        width:           COL_W,
                        marginRight:     i < sorted.length - 1 ? COL_GAP : 0,
                        flexShrink:      0,
                        paddingBottom:   '6px',
                        height:          '90px',
                        textDecoration:  'none',
                        overflow:        'visible',
                      }}
                    >
                      <span style={{
                        display:         'block',
                        whiteSpace:      'nowrap',
                        fontSize:        '0.67rem',
                        fontFamily:      'var(--font-display)',
                        fontWeight:      700,
                        color,
                        transform:       'rotate(-45deg)',
                        transformOrigin: 'bottom left',
                        marginLeft:      '24px',
                      }}>
                        {person.first_name}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* ── Body: year axis + chart ──────────────────────────────── */}
            <div style={{ display: 'flex' }}>

              {/* Year axis — sticky left */}
              <div style={{
                position:        'sticky',
                left:            0,
                zIndex:          5,
                width:           YEAR_COL_W,
                flexShrink:      0,
                backgroundColor: 'var(--surface)',
                borderRight:     '1px solid var(--border)',
              }}>
                <div style={{ position: 'relative', height: totalHeight }}>
                  {yearLabels.map(year => (
                    <div
                      key={year}
                      style={{
                        position:   'absolute',
                        top:        yearToY(year),
                        right:      0,
                        transform:  'translateY(-50%)',
                        display:    'flex',
                        alignItems: 'center',
                        gap:        '4px',
                      }}
                    >
                      <span style={{
                        fontSize:  '0.65rem',
                        color:     'var(--text-muted)',
                        paddingRight: '10px',
                        whiteSpace: 'nowrap',
                      }}>
                        {formatYear(year)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chart area */}
              <div style={{ position: 'relative', width: totalWidth, height: totalHeight, flexShrink: 0 }}>

                {/* Era bands */}
                {ERAS.map(era => {
                  const bandTop    = yearToY(Math.max(era.min === -Infinity ? minYear : era.min, minYear))
                  const bandBottom = yearToY(Math.min(era.max === Infinity  ? maxYear : era.max, maxYear))
                  if (bandBottom <= 0 || bandTop >= totalHeight) return null
                  return (
                    <div
                      key={era.id}
                      style={{
                        position:        'absolute',
                        top:             bandTop,
                        left:            0,
                        right:           0,
                        height:          Math.max(0, bandBottom - bandTop),
                        backgroundColor: era.color,
                        pointerEvents:   'none',
                      }}
                    >
                      <span style={{
                        position:   'absolute',
                        right:      6,
                        top:        4,
                        fontSize:   '0.6rem',
                        color:      'var(--text-muted)',
                        opacity:    0.7,
                        fontFamily: 'var(--font-display)',
                        fontWeight: 600,
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                      }}>
                        {era.label}
                      </span>
                    </div>
                  )
                })}

                {/* Horizontal grid lines */}
                {yearLabels.map(year => (
                  <div
                    key={year}
                    style={{
                      position:        'absolute',
                      top:             yearToY(year),
                      left:            0,
                      right:           0,
                      height:          1,
                      backgroundColor: 'var(--border)',
                      opacity:         0.5,
                      pointerEvents:   'none',
                    }}
                  />
                ))}

                {/* Person bars */}
                {sorted.map((person, i) => {
                  const color            = houseColor(person.house)
                  const isAlive          = person.status === 'alive'
                  const isUnknownDeath   = person.status === 'deceased' && person.death_year === null
                  const barTop           = yearToY(person.birth_year)
                  const endYear          = isUnknownDeath
                    ? person.birth_year + 50
                    : (person.death_year ?? maxYear)
                  const barHeight        = Math.max(6, (endYear - person.birth_year) * pxPerYear)
                  const colLeft          = i * (COL_W + COL_GAP)
                  const barLeft          = colLeft + Math.floor((COL_W - Math.max(20, COL_W - 16)) / 2)
                  const barW             = Math.max(20, COL_W - 16)
                  const isHov            = hovered?.id === person.id
                  const fadeBar          = isAlive || isUnknownDeath

                  return (
                    <div
                      key={person.id}
                      style={{
                        position: 'absolute',
                        left:     colLeft,
                        top:      0,
                        width:    COL_W,
                        height:   totalHeight,
                      }}
                    >
                      <Link to={`/person/${person.id}`} style={{ textDecoration: 'none' }}>
                        {/* Lifespan bar */}
                        <div
                          onMouseEnter={(e) => { setHovered(person); setTooltipPos({ x: e.clientX, y: e.clientY }) }}
                          onMouseLeave={() => setHovered(null)}
                          onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
                          style={{
                            position:        'absolute',
                            left:            barLeft - colLeft,
                            top:             barTop,
                            width:           barW,
                            height:          barHeight,
                            borderRadius:    fadeBar ? '4px 4px 0 0' : '4px',
                            background:      fadeBar
                              ? `linear-gradient(to bottom, ${color}ee, ${color}00)`
                              : color,
                            opacity:         isHov ? 1 : 0.72,
                            transition:      'opacity 0.12s',
                            cursor:          'pointer',
                            boxShadow:       isHov ? `0 0 0 2px ${color}` : 'none',
                          }}
                        />
                      </Link>

                      {/* Birth dot (green circle) */}
                      <div style={{
                        position:        'absolute',
                        left:            barLeft - colLeft + Math.floor(barW / 2) - 4,
                        top:             barTop - 4,
                        width:           8,
                        height:          8,
                        borderRadius:    '50%',
                        backgroundColor: '#22c55e',
                        border:          '1.5px solid var(--surface)',
                        zIndex:          2,
                        pointerEvents:   'none',
                      }} />

                      {/* Death diamond (red) — only when death year is known */}
                      {!isAlive && !isUnknownDeath && person.death_year !== null && (
                        <div style={{
                          position:        'absolute',
                          left:            barLeft - colLeft + Math.floor(barW / 2) - 4,
                          top:             barTop + barHeight - 4,
                          width:           8,
                          height:          8,
                          backgroundColor: '#ef4444',
                          border:          '1.5px solid var(--surface)',
                          transform:       'rotate(45deg)',
                          zIndex:          2,
                          pointerEvents:   'none',
                        }} />
                      )}

                      {/* Unknown death "?" label — fades at the bottom of the bar */}
                      {isUnknownDeath && (
                        <div style={{
                          position:   'absolute',
                          left:       barLeft - colLeft,
                          width:      barW,
                          top:        barTop + barHeight - 2,
                          textAlign:  'center',
                          fontSize:   '0.65rem',
                          fontWeight: 700,
                          color:      color,
                          opacity:    0.6,
                          pointerEvents: 'none',
                          fontFamily: 'var(--font-display)',
                          zIndex:     2,
                        }}>
                          ?
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Hover tooltip ──────────────────────────────────────────────────── */}
      {hovered && (
        <div style={{
          position:        'fixed',
          left:            tooltipPos.x + 14,
          top:             tooltipPos.y - 70,
          zIndex:          9999,
          backgroundColor: 'var(--surface)',
          border:          '1px solid var(--border)',
          borderRadius:    '10px',
          padding:         '0.55rem 0.85rem',
          boxShadow:       '0 4px 16px rgba(0,0,0,0.18)',
          pointerEvents:   'none',
          minWidth:        '160px',
        }}>
          <div style={{
            fontWeight:  700,
            fontSize:    '0.88rem',
            fontFamily:  'var(--font-display)',
            color:       'var(--text)',
            marginBottom: '3px',
          }}>
            {hovered.first_name} {hovered.last_name}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {formatYear(hovered.birth_year)} → {
              hovered.death_year
                ? formatYear(hovered.death_year)
                : hovered.status === 'deceased'
                  ? 'unknown'
                  : 'present'
            }
          </div>
          {hovered.death_year !== null && (
            <div style={{ fontSize: '0.72rem', color: 'var(--accent)', marginTop: '2px' }}>
              {hovered.death_year - hovered.birth_year} years
            </div>
          )}
          {hovered.status === 'deceased' && hovered.death_year === null && (
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px', fontStyle: 'italic' }}>
              Death date unrecorded
            </div>
          )}
          <div style={{
            fontSize:   '0.7rem',
            fontWeight: 700,
            color:      houseColor(hovered.house),
            marginTop:  '3px',
          }}>
            House {hovered.house}
          </div>
          {hovered.status === 'alive' && (
            <div style={{
              display:         'inline-block',
              marginTop:       '4px',
              padding:         '1px 8px',
              borderRadius:    '99px',
              fontSize:        '0.68rem',
              fontWeight:      600,
              backgroundColor: 'var(--badge-alive)',
              color:           'var(--badge-alive-text)',
            }}>
              Alive
            </div>
          )}
        </div>
      )}
    </Shell>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div style={{
      padding:         '0.9rem 1rem',
      borderRadius:    '8px',
      border:          '1px solid var(--border)',
      backgroundColor: 'var(--surface)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
        <Icon size={13} style={{ color: color || 'var(--accent)' }} />
        <span style={{
          fontSize:      '0.7rem',
          fontWeight:    600,
          color:         'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
        }}>
          {label}
        </span>
      </div>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize:   '1.5rem',
        fontWeight: 700,
        color:      color || 'var(--text)',
        lineHeight: 1,
      }}>
        {value}
      </div>
    </div>
  )
}

// ── Shell ─────────────────────────────────────────────────────────────────────
function Shell({ children }) {
  return (
    <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {children}
    </main>
  )
}
