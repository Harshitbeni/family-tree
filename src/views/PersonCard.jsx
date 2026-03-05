import { Link, useParams, useNavigate } from 'react-router-dom'
import { useFamilyData, formatYear, formatLifespan, fullName } from '../hooks/useFamilyData'
import PersonAvatar from '../components/PersonAvatar'
import { ArrowLeft, MapPin, Calendar, Users, Crown, BookOpen } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

export default function PersonCard() {
  const { id } = useParams()
  const { people, loading, getById, getChildren, getSpouses } = useFamilyData()
  const { theme } = useTheme()
  const isGot = theme === 'got'
  const navigate = useNavigate()

  if (loading) return <Shell><LoadingState /></Shell>

  const person = getById(id)
  if (!person) return (
    <Shell>
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <p style={{ color: 'var(--text-muted)' }}>Person not found.</p>
        <Link to="/" className="theme-btn" style={{ marginTop: '1rem', display: 'inline-flex' }}>
          ← Back to List
        </Link>
      </div>
    </Shell>
  )

  const father = getById(person.father_id)
  const mother = getById(person.mother_id)
  const spouses = getSpouses(person)
  const children = getChildren(person.id)
  const siblings = people.filter(p =>
    p.id !== person.id &&
    ((person.father_id && p.father_id === person.father_id) ||
     (person.mother_id && p.mother_id === person.mother_id))
  )

  return (
    <Shell>
      {/* Back link */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button
          onClick={() => navigate(-1)}
          className="theme-btn"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <ArrowLeft size={14} /> Back
        </button>
      </div>

      {/* Card */}
      <div style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        overflow: 'hidden',
        maxWidth: '800px',
      }}>
        {/* Top banner / header */}
        <div style={{
          background: isGot
            ? 'linear-gradient(135deg, #1a0000 0%, #3d0000 50%, #1a1a2e 100%)'
            : 'linear-gradient(135deg, var(--accent-light) 0%, var(--surface-2) 100%)',
          padding: '2rem',
          display: 'flex',
          gap: '1.5rem',
          alignItems: 'flex-start',
          borderBottom: '1px solid var(--border)',
        }}>
          {/* Large avatar */}
          <PersonAvatar person={person} size={96} fontSize={32} />

          {/* Name, house, status */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {isGot && (
              <div className="got-ornament" />
            )}
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.6rem',
              fontWeight: 700,
              color: 'var(--text)',
              margin: '0 0 0.25rem 0',
              letterSpacing: isGot ? '0.06em' : '0',
              lineHeight: 1.2,
            }}>
              {person.first_name} {person.last_name}
            </h1>

            {/* Lifespan */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.75rem',
            }}>
              <Calendar size={13} />
              {formatLifespan(person)}
            </div>

            {/* Badges */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span className={person.status === 'alive' ? 'badge-alive' : 'badge-deceased'}>
                {person.status === 'alive' ? 'Alive' : 'Deceased'}
              </span>
              {person.house && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                  padding: '0.15rem 0.6rem', borderRadius: '99px',
                  fontSize: '0.75rem', fontWeight: 500,
                  backgroundColor: 'var(--tag-bg)', color: 'var(--tag-text)',
                }}>
                  <Crown size={10} /> House {person.house}
                </span>
              )}
              {person.generation && (
                <span style={{
                  padding: '0.15rem 0.6rem', borderRadius: '99px',
                  fontSize: '0.75rem', fontWeight: 500,
                  backgroundColor: 'var(--tag-bg)', color: 'var(--tag-text)',
                }}>
                  Generation {person.generation}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Vital details */}
          <Section icon={MapPin} title="Life Details">
            <DetailGrid items={[
              { label: 'Born', value: formatYear(person.birth_year) + (person.birth_location ? ` · ${person.birth_location}` : '') },
              { label: 'Died', value: person.status === 'alive' ? '—' : formatYear(person.death_year) + (person.death_location ? ` · ${person.death_location}` : '') },
              { label: 'Gender', value: person.gender ? capitalise(person.gender) : '—' },
            ]} />
          </Section>

          {/* Bio */}
          {person.bio && (
            <Section icon={BookOpen} title="Biography">
              <p style={{
                color: 'var(--text)',
                fontSize: '0.9rem',
                lineHeight: 1.7,
                margin: 0,
              }}>
                {person.bio}
              </p>
            </Section>
          )}

          {/* Family connections */}
          <Section icon={Users} title="Family">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Parents */}
              {(father || mother) && (
                <FamilyGroup label="Parents">
                  {father && <PersonPill person={father} label="Father" />}
                  {mother && <PersonPill person={mother} label="Mother" />}
                </FamilyGroup>
              )}

              {/* Spouses */}
              {spouses.length > 0 && (
                <FamilyGroup label={spouses.length === 1 ? 'Spouse' : 'Spouses'}>
                  {spouses.map(s => <PersonPill key={s.id} person={s} />)}
                </FamilyGroup>
              )}

              {/* Children */}
              {children.length > 0 && (
                <FamilyGroup label={children.length === 1 ? 'Child' : 'Children'}>
                  {children.map(c => <PersonPill key={c.id} person={c} />)}
                </FamilyGroup>
              )}

              {/* Siblings */}
              {siblings.length > 0 && (
                <FamilyGroup label={siblings.length === 1 ? 'Sibling' : 'Siblings'}>
                  {siblings.map(s => <PersonPill key={s.id} person={s} />)}
                </FamilyGroup>
              )}

              {!father && !mother && spouses.length === 0 && children.length === 0 && siblings.length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
                  No family connections recorded.
                </p>
              )}
            </div>
          </Section>

        </div>
      </div>
    </Shell>
  )
}

/* ── Sub-components ── */

function Section({ icon: Icon, title, children }) {
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        marginBottom: '0.75rem',
        paddingBottom: '0.5rem',
        borderBottom: '1px solid var(--border)',
      }}>
        <Icon size={14} style={{ color: 'var(--accent)' }} />
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.8rem',
          fontWeight: 600,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}>
          {title}
        </span>
      </div>
      {children}
    </div>
  )
}

function DetailGrid({ items }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
      {items.map(({ label, value }) => value && value !== '—' && (
        <div key={label} style={{
          padding: '0.6rem 0.75rem',
          borderRadius: '6px',
          backgroundColor: 'var(--surface-2)',
          border: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.2rem' }}>
            {label}
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text)', fontWeight: 500 }}>
            {value}
          </div>
        </div>
      ))}
    </div>
  )
}

function FamilyGroup({ label, children }) {
  return (
    <div>
      <div style={{
        fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.06em',
        marginBottom: '0.5rem',
      }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {children}
      </div>
    </div>
  )
}

function PersonPill({ person, label }) {
  if (!person) return null
  return (
    <Link
      to={`/person/${person.id}`}
      style={{ textDecoration: 'none' }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: '0.4rem 0.7rem',
        borderRadius: '8px',
        border: '1px solid var(--border)',
        backgroundColor: 'var(--surface-2)',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
        onMouseEnter={e => {
          e.currentTarget.style.backgroundColor = 'var(--accent-light)'
          e.currentTarget.style.borderColor = 'var(--accent)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.backgroundColor = 'var(--surface-2)'
          e.currentTarget.style.borderColor = 'var(--border)'
        }}
      >
        <PersonAvatar person={person} size={28} fontSize={10} />
        <div>
          <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text)', lineHeight: 1.2 }}>
            {person.first_name} {person.last_name}
          </div>
          {label && (
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{label}</div>
          )}
        </div>
      </div>
    </Link>
  )
}

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
      Loading…
    </div>
  )
}

function capitalise(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : ''
}
