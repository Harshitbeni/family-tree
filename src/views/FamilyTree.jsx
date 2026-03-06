import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFamilyData, formatYear } from '../hooks/useFamilyData'
import PersonAvatar from '../components/PersonAvatar'
import { useTheme } from '../context/ThemeContext'
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'

// ── Layout constants ──────────────────────────────────────────────────────────
const NODE_W = 136
const NODE_H = 72
const H_GAP  = 32
const V_GAP  = 90

const TRANSFORM_KEY = 'family-tree-transform'

// ── Build parent→children map ─────────────────────────────────────────────────
function buildChildMap(people) {
  const map = {}
  people.forEach(p => {
    if (p.father_id) {
      if (!map[p.father_id]) map[p.father_id] = []
      if (!map[p.father_id].includes(p.id)) map[p.father_id].push(p.id)
    }
    if (p.mother_id) {
      if (!map[p.mother_id]) map[p.mother_id] = []
      if (!map[p.mother_id].includes(p.id)) map[p.mother_id].push(p.id)
    }
  })
  return map
}

// ── Generation-based layout algorithm ────────────────────────────────────────
// Sorts by parent position, then clusters spouses side-by-side.
function computeLayout(people) {
  if (!people.length) return {}

  const byGen = {}
  people.forEach(p => {
    const g = p.generation ?? 1
    if (!byGen[g]) byGen[g] = []
    byGen[g].push(p)
  })

  const positions = {}
  const genNums = Object.keys(byGen).map(Number).sort((a, b) => a - b)

  genNums.forEach((gen, genIdx) => {
    const members = [...byGen[gen]]

    // Preferred x = average of parent center-xs
    const withPref = members.map(p => {
      const pxs = []
      if (positions[p.father_id]) pxs.push(positions[p.father_id].cx)
      if (positions[p.mother_id]) pxs.push(positions[p.mother_id].cx)
      const preferred = pxs.length ? pxs.reduce((a, b) => a + b, 0) / pxs.length : null
      return { p, preferred }
    })

    // Sort by preferred x, unknowns last
    withPref.sort((a, b) => {
      if (a.preferred === null && b.preferred === null) return 0
      if (a.preferred === null) return 1
      if (b.preferred === null) return -1
      return a.preferred - b.preferred
    })

    // Cluster spouses together: pull each person's same-gen spouse immediately after them
    const genIds = new Set(members.map(m => m.id))
    const placed = new Set()
    const clustered = []
    for (const item of withPref) {
      if (placed.has(item.p.id)) continue
      clustered.push(item)
      placed.add(item.p.id)
      for (const sid of (item.p.spouse_ids || [])) {
        if (genIds.has(sid) && !placed.has(sid)) {
          const spouseItem = withPref.find(w => w.p.id === sid)
          if (spouseItem) { clustered.push(spouseItem); placed.add(sid) }
        }
      }
    }

    // Position nodes, centred on average preferred x
    const validPrefs = clustered.filter(w => w.preferred !== null).map(w => w.preferred)
    const centerX = validPrefs.length
      ? validPrefs.reduce((a, b) => a + b, 0) / validPrefs.length
      : 0
    const totalW = clustered.length * (NODE_W + H_GAP) - H_GAP
    const startX = centerX - totalW / 2

    clustered.forEach(({ p }, i) => {
      const x = startX + i * (NODE_W + H_GAP)
      positions[p.id] = {
        x,
        y: genIdx * (NODE_H + V_GAP),
        cx: x + NODE_W / 2,
        cy: genIdx * (NODE_H + V_GAP) + NODE_H / 2,
      }
    })

    // Resolve overlaps: push rightward
    for (let pass = 0; pass < 5; pass++) {
      let moved = false
      for (let i = 1; i < clustered.length; i++) {
        const prev = positions[clustered[i - 1].p.id]
        const curr = positions[clustered[i].p.id]
        const minX = prev.x + NODE_W + H_GAP
        if (curr.x < minX) {
          curr.x = minX
          curr.cx = curr.x + NODE_W / 2
          moved = true
        }
      }
      if (!moved) break
    }
  })

  return positions
}

// ── SVG bezier path ───────────────────────────────────────────────────────────
function getPath(from, to) {
  const x1 = from.x + NODE_W / 2
  const y1 = from.y + NODE_H
  const x2 = to.x   + NODE_W / 2
  const y2 = to.y
  const my = (y1 + y2) / 2
  return `M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`
}

// ── Bounding box for fit-to-screen ───────────────────────────────────────────
function getBounds(positions) {
  const xs = Object.values(positions).map(p => p.x)
  const ys = Object.values(positions).map(p => p.y)
  return {
    minX: Math.min(...xs) - 40,
    maxX: Math.max(...xs) + NODE_W + 40,
    minY: Math.min(...ys) - 40,
    maxY: Math.max(...ys) + NODE_H + 40,
  }
}

// ══════════════════════════════════════════════════════════════════════════════
export default function FamilyTree() {
  const { people, loading } = useFamilyData()
  const { theme } = useTheme()
  const navigate = useNavigate()
  const isGot = theme === 'got'

  const containerRef = useRef(null)

  // Restore saved canvas position/zoom from localStorage; skip auto-fit if present
  const [transform, setTransform] = useState(() => {
    try {
      const saved = localStorage.getItem(TRANSFORM_KEY)
      return saved ? JSON.parse(saved) : { x: 0, y: 0, scale: 1 }
    } catch { return { x: 0, y: 0, scale: 1 } }
  })
  const [dragging, setDragging] = useState(false)
  const dragOrigin = useRef({ x: 0, y: 0, tx: 0, ty: 0 })
  const [hoveredId, setHoveredId] = useState(null)
  const [fitDone, setFitDone] = useState(() => !!localStorage.getItem(TRANSFORM_KEY))

  // Persist canvas state on every change
  useEffect(() => {
    localStorage.setItem(TRANSFORM_KEY, JSON.stringify(transform))
  }, [transform])

  // Layout
  const positions = useMemo(() => computeLayout(people), [people])
  const childMap  = useMemo(() => buildChildMap(people), [people])

  // Parent–child edges, with IDs attached for lineage highlighting
  const edges = useMemo(() => {
    const lines = []
    people.forEach(child => {
      if (child.father_id && positions[child.father_id] && positions[child.id]) {
        lines.push({ from: positions[child.father_id], to: positions[child.id], toId: child.id, key: `f-${child.id}` })
      }
      if (child.mother_id && positions[child.mother_id] && positions[child.id]) {
        lines.push({ from: positions[child.mother_id], to: positions[child.id], toId: child.id, key: `m-${child.id}` })
      }
    })
    return lines
  }, [people, positions])

  // Spouse edges
  const spouseEdges = useMemo(() => {
    const drawn = new Set()
    const lines = []
    people.forEach(p => {
      (p.spouse_ids || []).forEach(sid => {
        const key = [p.id, sid].sort().join('-')
        if (drawn.has(key)) return
        drawn.add(key)
        if (positions[p.id] && positions[sid]) {
          lines.push({ from: positions[p.id], to: positions[sid], key: `s-${key}` })
        }
      })
    })
    return lines
  }, [people, positions])

  // Ancestor set for the hovered person (self + all ancestors back to Gen 1)
  const ancestorIds = useMemo(() => {
    if (!hoveredId) return new Set()
    const set = new Set()
    const queue = [hoveredId]
    const pMap = new Map(people.map(p => [p.id, p]))
    while (queue.length) {
      const id = queue.shift()
      if (set.has(id)) continue
      set.add(id)
      const p = pMap.get(id)
      if (!p) continue
      if (p.father_id) queue.push(p.father_id)
      if (p.mother_id) queue.push(p.mother_id)
    }
    return set
  }, [hoveredId, people])

  // Auto-fit on first load (skipped if a saved transform exists)
  const fitToScreen = useCallback(() => {
    if (!containerRef.current || !Object.keys(positions).length) return
    const bounds = getBounds(positions)
    const cw = containerRef.current.clientWidth
    const ch = containerRef.current.clientHeight
    const treeW = bounds.maxX - bounds.minX
    const treeH = bounds.maxY - bounds.minY
    const scale = Math.min(cw / treeW, ch / treeH, 1) * 0.92
    const x = (cw - treeW * scale) / 2 - bounds.minX * scale
    const y = (ch - treeH * scale) / 2 - bounds.minY * scale
    setTransform({ x, y, scale })
  }, [positions])

  useEffect(() => {
    if (!loading && !fitDone && Object.keys(positions).length) {
      setTimeout(() => { fitToScreen(); setFitDone(true) }, 60)
    }
  }, [loading, positions, fitDone, fitToScreen])

  // ── Pan ───────────────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e) => {
    if (e.button !== 0) return
    dragOrigin.current = { x: e.clientX, y: e.clientY, tx: transform.x, ty: transform.y, started: false }
  }, [transform])

  const onMouseMove = useCallback((e) => {
    const o = dragOrigin.current
    if (!o || o.x === undefined) return
    const dx = e.clientX - o.x
    const dy = e.clientY - o.y
    if (!o.started && Math.hypot(dx, dy) < 4) return
    o.started = true
    setDragging(true)
    setTransform(t => ({ ...t, x: o.tx + dx, y: o.ty + dy }))
  }, [])

  const onMouseUp = useCallback(() => {
    setDragging(false)
    dragOrigin.current = {}
  }, [])

  // ── Wheel / trackpad ─────────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handleWheel = (e) => {
      e.preventDefault()
      if (e.ctrlKey) {
        const factor = e.deltaY < 0 ? 1.06 : 0.945
        setTransform(t => {
          const newScale = Math.max(0.15, Math.min(2.5, t.scale * factor))
          const rect = containerRef.current.getBoundingClientRect()
          const mx = e.clientX - rect.left
          const my = e.clientY - rect.top
          const dx = mx - t.x
          const dy = my - t.y
          const ratio = newScale / t.scale
          return { x: mx - dx * ratio, y: my - dy * ratio, scale: newScale }
        })
      } else {
        setTransform(t => ({ ...t, x: t.x - e.deltaX, y: t.y - e.deltaY }))
      }
    }
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [loading])

  const zoomBy = (factor) => {
    setTransform(t => {
      const cw = containerRef.current?.clientWidth  || 800
      const ch = containerRef.current?.clientHeight || 600
      const newScale = Math.max(0.15, Math.min(2.5, t.scale * factor))
      const cx = cw / 2
      const cy = ch / 2
      const ratio = newScale / t.scale
      return { x: cx - (cx - t.x) * ratio, y: cy - (cy - t.y) * ratio, scale: newScale }
    })
  }

  if (loading) return (
    <div style={{ height: 'calc(100vh - 56px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
      Loading family tree…
    </div>
  )

  const bounds = Object.keys(positions).length ? getBounds(positions) : { minX: 0, maxX: 800, minY: 0, maxY: 600 }
  const svgW = bounds.maxX - bounds.minX
  const svgH = bounds.maxY - bounds.minY
  const isHighlighting = hoveredId !== null

  return (
    <div style={{ height: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: 'var(--bg)' }}>

      {/* ── Top bar ──────────────────────────────────────────────── */}
      <div style={{
        padding: '0.75rem 1.5rem',
        borderBottom: '1px solid var(--border)',
        backgroundColor: 'var(--surface)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        flexShrink: 0,
      }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.1rem',
            fontWeight: 700,
            color: 'var(--text)',
            margin: 0,
            letterSpacing: isGot ? '0.06em' : '0',
            textTransform: isGot ? 'uppercase' : 'none',
          }}>
            {isGot ? 'The Blood of the Dragon — Family Tree' : 'Family Tree'}
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.8rem' }}>
            {people.length} members · {Math.max(...people.map(p => p.generation || 0))} generations · pinch to zoom · two-finger scroll to pan · drag to pan · click any node to view details
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <button className="theme-btn" onClick={() => zoomBy(1.2)} title="Zoom in" style={{ padding: '0.4rem' }}>
            <ZoomIn size={14} />
          </button>
          <button className="theme-btn" onClick={() => zoomBy(0.8)} title="Zoom out" style={{ padding: '0.4rem' }}>
            <ZoomOut size={14} />
          </button>
          <button className="theme-btn" onClick={fitToScreen} title="Fit to screen" style={{ padding: '0.4rem' }}>
            <Maximize2 size={14} />
          </button>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', minWidth: '38px', textAlign: 'center' }}>
            {Math.round(transform.scale * 100)}%
          </span>
        </div>

        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <div style={{ width: 12, height: 2, backgroundColor: 'var(--accent)', borderRadius: 1 }} />
            Parent–Child
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <div style={{ width: 12, height: 2, borderTop: '2px dashed var(--text-muted)' }} />
            Spouse
          </span>
        </div>
      </div>

      {/* ── Canvas ───────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
          cursor: dragging ? 'grabbing' : 'grab',
          userSelect: 'none',
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {/* Background grid */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}>
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"
              patternTransform={`translate(${transform.x % 40} ${transform.y % 40})`}>
              <circle cx="0.5" cy="0.5" r="0.5" fill="var(--border)" opacity="0.6" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Transformed layer */}
        <div style={{
          position: 'absolute',
          transformOrigin: '0 0',
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          willChange: 'transform',
        }}>
          {/* SVG edges */}
          <svg style={{
            position: 'absolute',
            left: bounds.minX,
            top: bounds.minY,
            width: svgW,
            height: svgH,
            overflow: 'visible',
            pointerEvents: 'none',
          }}>
            {/* Parent–child edges — highlighted for hovered person's lineage */}
            {edges.map(({ from, to, toId, key }) => {
              const lit = isHighlighting && ancestorIds.has(toId)
              return (
                <path
                  key={key}
                  d={getPath(
                    { x: from.x - bounds.minX, y: from.y - bounds.minY },
                    { x: to.x   - bounds.minX, y: to.y   - bounds.minY }
                  )}
                  fill="none"
                  stroke={lit ? 'var(--accent)' : 'var(--border)'}
                  strokeWidth={lit ? 2.5 : 1.5}
                  opacity={isHighlighting && !lit ? 0.12 : 1}
                  style={{ transition: 'opacity 0.15s, stroke 0.15s, stroke-width 0.15s' }}
                />
              )
            })}
            {/* Spouse edges — dimmed when lineage is active */}
            {spouseEdges.map(({ from, to, key }) => (
              <line
                key={key}
                x1={from.x < to.x ? from.x - bounds.minX + NODE_W : from.x - bounds.minX}
                y1={from.y - bounds.minY + NODE_H / 2}
                x2={from.x < to.x ? to.x   - bounds.minX           : to.x   - bounds.minX + NODE_W}
                y2={to.y   - bounds.minY + NODE_H / 2}
                stroke="var(--text-muted)"
                strokeWidth="1.5"
                strokeDasharray="4 3"
                opacity={isHighlighting ? 0.12 : 0.7}
                style={{ transition: 'opacity 0.15s' }}
              />
            ))}
          </svg>

          {/* Person nodes */}
          {people.map(person => {
            const pos = positions[person.id]
            if (!pos) return null
            const isHovered  = hoveredId === person.id
            const inLineage  = !isHighlighting || ancestorIds.has(person.id)
            const hasChildren = (childMap[person.id] || []).length > 0

            return (
              <TreeNode
                key={person.id}
                person={person}
                pos={pos}
                isHovered={isHovered}
                inLineage={inLineage}
                isHighlighting={isHighlighting}
                hasChildren={hasChildren}
                onHover={setHoveredId}
                onClick={() => navigate(`/person/${person.id}`)}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Tree Node ─────────────────────────────────────────────────────────────────
function TreeNode({ person, pos, isHovered, inLineage, isHighlighting, hasChildren, onHover, onClick }) {
  const born = formatYear(person.birth_year)
  const died = person.status === 'alive' ? '—' : formatYear(person.death_year)

  const accentColor = person.house === 'Targaryen' ? '#8b0000'
    : person.house === 'Arryn'     ? '#1a3d6b'
    : person.house === 'Hightower' ? '#1a3d1a'
    : 'var(--accent)'

  return (
    <button
      className="tree-node"
      onClick={onClick}
      onMouseEnter={() => onHover(person.id)}
      onMouseLeave={() => onHover(null)}
      title={`${person.first_name} ${person.last_name} · ${person.birth_year !== null ? formatYear(person.birth_year) : '?'}${person.status !== 'alive' && person.death_year !== null ? ' – ' + formatYear(person.death_year) : ''}`}
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        width: NODE_W,
        height: NODE_H,
        backgroundColor: isHovered ? 'var(--accent-light)' : 'var(--surface)',
        border: isHovered ? '1.5px solid var(--accent)' : '1px solid var(--border)',
        borderLeft: `3px solid ${accentColor}`,
        borderRadius: '8px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '0 10px',
        boxShadow: isHovered ? '0 4px 16px rgba(0,0,0,0.15)' : '0 1px 4px rgba(0,0,0,0.07)',
        transition: 'border-color 0.1s, background-color 0.1s, box-shadow 0.1s, opacity 0.15s',
        zIndex: isHovered ? 10 : 1,
        fontFamily: 'inherit',
        textAlign: 'left',
        outline: 'none',
        opacity: isHighlighting && !inLineage ? 0.2 : 1,
      }}
    >
      <PersonAvatar person={person} size={28} fontSize={10} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '0.72rem',
          fontWeight: 600,
          color: 'var(--text)',
          fontFamily: 'var(--font-display)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          lineHeight: 1.3,
        }}>
          {person.first_name} {person.last_name}
        </div>
        <div style={{
          fontSize: '0.65rem',
          color: 'var(--text-muted)',
          marginTop: '2px',
          whiteSpace: 'nowrap',
        }}>
          {born}{person.status !== 'alive' && ` – ${died}`}
        </div>
        {person.generation && (
          <div style={{
            fontSize: '0.6rem',
            color: 'var(--accent)',
            marginTop: '1px',
            fontWeight: 500,
          }}>
            Gen. {person.generation}
          </div>
        )}
      </div>
    </button>
  )
}
