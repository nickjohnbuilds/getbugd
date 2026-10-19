import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'

// Tub codes are species-number, lowercase, hyphen. Tubs come from the
// Supabase `tubs` table; this list is the fallback until that table is filled.
const TUBS = {
  'rubber-ducky-1': { name: 'Rubber Ducky' },
}

function TubPage({ code }) {
  const [tub, setTub] = useState(undefined)

  useEffect(() => {
    supabase
      .from('tubs')
      .select('name')
      .eq('code', code)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error('Supabase:', error.message)
        setTub(data ?? TUBS[code] ?? null)
      })
  }, [code])

  return (
    <main>
      <h1>Buglog</h1>
      <h2>
        {tub === undefined ? 'Loading…' : tub ? tub.name : `No tub called "${code}"`}
      </h2>
    </main>
  )
}

export default function App() {
  const match = window.location.pathname.match(/^\/t\/([^/]+)\/?$/)
  if (match) return <TubPage code={decodeURIComponent(match[1]).toLowerCase()} />
  return <h1>getbugd log</h1>
}
