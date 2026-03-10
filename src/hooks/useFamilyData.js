import { useState, useEffect } from 'react'
import Papa from 'papaparse'

// Formats a year number into a readable string
// Negative = Before Conquest (BC), positive = After Conquest (AC)
export function formatYear(year) {
  if (year === null || year === undefined || year === '') return '?'
  const n = Number(year)
  if (isNaN(n)) return '?'
  if (n < 0) return `${Math.abs(n)} BC`
  return `${n} AC`
}

export function formatLifespan(person) {
  const birth = formatYear(person.birth_year)
  const death = person.status === 'alive' ? 'present' : formatYear(person.death_year)
  return `${birth} – ${death}`
}

// Returns a person's full name
export function fullName(person) {
  if (!person) return 'Unknown'
  return `${person.first_name} ${person.last_name}`.trim()
}

// Returns initials for avatar placeholder
export function getInitials(person) {
  if (!person) return '?'
  const f = person.first_name?.[0] || ''
  const l = person.last_name?.[0] || ''
  return (f + l).toUpperCase()
}

const DATA_FILE = `${import.meta.env.BASE_URL}data/targaryens.csv`

export function useFamilyData() {
  const [people, setPeople] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    Papa.parse(DATA_FILE, {
      download: true,
      header: true,
      skipEmptyLines: true,
      transformHeader: h => h.trim(),
      transform: (value) => value.trim(),
      complete: (results) => {
        // Enrich each person: split spouse_ids into array
        const enriched = results.data.map(p => ({
          ...p,
          spouse_ids: p.spouse_ids
            ? p.spouse_ids.split(';').map(s => s.trim()).filter(Boolean)
            : [],
          birth_year: p.birth_year !== '' ? Number(p.birth_year) : null,
          death_year: p.death_year !== '' ? Number(p.death_year) : null,
          generation: p.generation !== '' ? Number(p.generation) : null,
        }))
        setPeople(enriched)
        setLoading(false)
      },
      error: (err) => {
        setError(err.message)
        setLoading(false)
      }
    })
  }, [])

  // Quick lookup by id
  const getById = (id) => people.find(p => p.id === id) || null

  // Get all children of a person (where father_id or mother_id matches)
  const getChildren = (personId) =>
    people.filter(p => p.father_id === personId || p.mother_id === personId)

  // Get all spouses as person objects
  const getSpouses = (person) =>
    (person.spouse_ids || []).map(id => getById(id)).filter(Boolean)

  return { people, loading, error, getById, getChildren, getSpouses }
}
