// Tub codes are species-number, lowercase, hyphen. Until the database (step 6),
// the tubs live here.
const TUBS = {
  'rubber-ducky-1': { name: 'Rubber Ducky' },
}

function TubPage({ code }) {
  const tub = TUBS[code]
  return (
    <main>
      <h1>Buglog</h1>
      <h2>{tub ? tub.name : `No tub called "${code}"`}</h2>
    </main>
  )
}

export default function App() {
  const match = window.location.pathname.match(/^\/t\/([^/]+)\/?$/)
  if (match) return <TubPage code={decodeURIComponent(match[1]).toLowerCase()} />
  return <h1>getbugd log</h1>
}
