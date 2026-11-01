import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase.js'

// Simple outline icons for the log buttons. They draw in the button's text color.
const ICONS = {
  watered: <path d="M12 3s-6 7-6 11.5a6 6 0 0 0 12 0C18 10 12 3 12 3z" />,
  food: (
    <>
      <path d="M5 19C5 10 10 5 20 4c0 10-5 15-14 15z" />
      <path d="M5 19l8-8" />
    </>
  ),
  problem: (
    <>
      <path d="M12 3.5 22 20H2z" />
      <path d="M12 10v4.5M12 17.5v.01" />
    </>
  ),
  moved: (
    <>
      <path d="M7 4 3 8l4 4M3 8h14" />
      <path d="m17 12 4 4-4 4M21 16H7" />
    </>
  ),
  babies_seen: (
    <>
      <ellipse cx="12" cy="14.5" rx="4.5" ry="5.5" />
      <circle cx="12" cy="7" r="2" />
      <path d="M10.5 5.5 9 3M13.5 5.5 15 3M7.5 12H4.5M7.5 16l-3 1.5M16.5 12h3M16.5 16l3 1.5" />
    </>
  ),
  harvested_or_sold: (
    <>
      <path d="m3 7.5 9-4 9 4v9l-9 4-9-4z" />
      <path d="m3 7.5 9 4 9-4M12 11.5v9" />
    </>
  ),
}

function Icon({ name }) {
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  )
}

// The six quick-log buttons. `action` is what gets saved in the logs table.
const BUTTONS = [
  { action: 'watered', label: 'Watered' },
  { action: 'food', label: 'Food' },
  { action: 'problem', label: 'Problem' },
  { action: 'moved', label: 'Moved' },
  { action: 'babies_seen', label: 'Babies seen' },
  { action: 'harvested_or_sold', label: 'Harvested or sold' },
]

// Food chips. `other` shows a box to type your own food.
const FOODS = [
  { value: 'protein', label: 'Protein' },
  { value: 'vegetables', label: 'Vegetables' },
  { value: 'calcium', label: 'Calcium' },
  { value: 'leaf_litter_bark', label: 'Leaf litter / bark' },
  { value: 'other', label: 'Other' },
]

function labelFor(log) {
  const button = BUTTONS.find((b) => b.action === log.action)
  if (log.action !== 'food') return button.label
  const food =
    log.food_type === 'other'
      ? log.food_other
      : FOODS.find((f) => f.value === log.food_type).label
  return `Food: ${food}`
}

function timeOf(log) {
  return new Date(log.logged_at).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
}

// Logo mark and "Buglog", top-left. Both go Home.
function Header() {
  return (
    <header className="header">
      <a href="/" className="brand">
        <img src="/icons/mark.svg" alt="" width="32" height="32" />
        <span>Buglog</span>
      </a>
    </header>
  )
}

// Logs in with email + password. The user and password are set in Supabase
// (Authentication -> Users); nothing about them lives in this code. Sign-ups
// are off, so only users already added there can log in. The phone stays
// logged in afterwards.
function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function logIn(e) {
    e.preventDefault()
    setBusy(true)
    setMessage('')
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    setBusy(false)
    setPassword('')
    if (error) setMessage(`Couldn't log in: ${error.message}`)
  }

  return (
    <section className="login">
      <p>Log in to save logs.</p>
      <form onSubmit={logIn}>
        <input
          type="email"
          autoComplete="username"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          autoComplete="current-password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" className="primary" disabled={busy}>Log in</button>
      </form>
      {message && <p role="alert" className="error">{message}</p>}
    </section>
  )
}

function FoodPicker({ saving, onSave, onCancel }) {
  const [food, setFood] = useState(null)
  const [otherFood, setOtherFood] = useState('')
  const panel = useRef(null)
  const otherInput = useRef(null)

  // On a phone the panel opens below the fold: glide it into view and move
  // focus there. preventScroll keeps focus from jumping instead of gliding.
  useEffect(() => {
    panel.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    panel.current.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    if (food !== 'other') return
    otherInput.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    otherInput.current.focus({ preventScroll: true })
  }, [food])

  function submit(e) {
    e.preventDefault()
    if (food === 'other') onSave({ food_type: 'other', food_other: otherFood.trim() })
    else onSave({ food_type: food })
  }

  return (
    <form className="food" onSubmit={submit} ref={panel} tabIndex={-1} aria-label="Choose food">
      <p className="food-title">What food?</p>
      <div className="chips">
        {FOODS.map((f) => (
          <button
            key={f.value}
            type="button"
            className="chip"
            aria-pressed={food === f.value}
            onClick={() => setFood(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>
      {food === 'other' && (
        <input
          ref={otherInput}
          className="other-food"
          placeholder="Type the food"
          value={otherFood}
          onChange={(e) => setOtherFood(e.target.value)}
          required
        />
      )}
      <div className="food-actions">
        <button type="button" className="secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="primary" disabled={saving || !food}>Save</button>
      </div>
    </form>
  )
}

function LogButtons({ tubId }) {
  const [note, setNote] = useState('')
  const [choosingFood, setChoosingFood] = useState(false)
  const [saving, setSaving] = useState(false)
  // What shows in the confirmation spot under the grid: the last save (with
  // Undo), an undo result, or an error.
  const [status, setStatus] = useState(null)

  async function save(row) {
    setSaving(true)
    setStatus(null)
    const trimmed = note.trim()
    const { data, error } = await supabase
      .from('logs')
      .insert({ tub_id: tubId, ...row, ...(trimmed && { note: trimmed }) })
      .select('id, action, food_type, food_other, note, logged_at')
      .single()
    setSaving(false)
    if (error) {
      setStatus({ kind: 'error', text: `Not saved: ${error.message}` })
      return
    }
    setStatus({ kind: 'saved', log: data })
    setChoosingFood(false)
    setNote('')
  }

  async function undo(log) {
    setStatus({ kind: 'busy', text: 'Undoing…' })
    const { error } = await supabase.from('logs').delete().eq('id', log.id)
    if (error) {
      setStatus({ kind: 'error', text: `Couldn't undo: ${error.message}` })
      return
    }
    // Put the note back so it isn't lost with the entry.
    if (log.note) setNote(log.note)
    setStatus({ kind: 'undone', text: `Removed ${labelFor(log)} · ${timeOf(log)}` })
  }

  function tap(action) {
    if (action === 'food') {
      setChoosingFood(true)
      setStatus(null)
    } else {
      save({ action })
    }
  }

  return (
    <section>
      <div className="note-row">
        <input
          className="note"
          placeholder="Add a note"
          aria-label="Note for the next log"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        {/* Room for a mic (voice-to-text) button here later. */}
      </div>

      <div className="buttons">
        {BUTTONS.map((b) => (
          <button
            key={b.action}
            className={`tile tile-${b.action}`}
            onClick={() => tap(b.action)}
            disabled={saving}
          >
            <Icon name={b.action} />
            {b.label}
          </button>
        ))}
      </div>

      <div className="status-spot">
        {saving && <p className="status">Saving…</p>}
        {status?.kind === 'saved' && (
          <p
            key={status.log.id}
            role="status"
            className="status fade"
            onAnimationEnd={() => setStatus(null)}
          >
            <span>✓ {labelFor(status.log)} · {timeOf(status.log)}</span>
            <button type="button" className="link" onClick={() => undo(status.log)}>
              Undo
            </button>
          </p>
        )}
        {status?.kind === 'busy' && <p className="status">{status.text}</p>}
        {status?.kind === 'undone' && (
          <p role="status" className="status fade" onAnimationEnd={() => setStatus(null)}>
            {status.text}
          </p>
        )}
        {status?.kind === 'error' && <p role="alert" className="status error">{status.text}</p>}
      </div>

      {choosingFood && (
        <FoodPicker
          saving={saving}
          onSave={(food) => save({ action: 'food', ...food })}
          onCancel={() => setChoosingFood(false)}
        />
      )}
    </section>
  )
}

function TubPage({ code }) {
  const [tub, setTub] = useState(undefined)
  const [loadError, setLoadError] = useState('')
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase
      .from('tubs')
      .select('id, name')
      .eq('code', code)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error('Supabase:', error.message)
          setLoadError(error.message)
        }
        setTub(data ?? null)
      })
  }, [code])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  let heading
  if (tub === undefined) heading = 'Loading…'
  else if (tub) heading = tub.name
  else if (loadError) heading = `Couldn't load the tub: ${loadError}`
  else heading = `No tub called "${code}"`

  return (
    <main>
      <h1 className="tub-name">{heading}</h1>
      {tub && session === null && <Login />}
      {tub && session && <LogButtons tubId={tub.id} />}
    </main>
  )
}

// Every tub, sorted by name. Read-only; tap one to log on it.
function HomePage() {
  const [tubs, setTubs] = useState(undefined)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    supabase
      .from('tubs')
      .select('code, name')
      .order('name')
      .then(({ data, error }) => {
        if (error) {
          console.error('Supabase:', error.message)
          setLoadError(error.message)
        }
        setTubs(data ?? [])
      })
  }, [])

  return (
    <main>
      <h1 className="page-title">Tubs</h1>
      {tubs === undefined && <p>Loading…</p>}
      {loadError && <p role="alert" className="error">Couldn't load tubs: {loadError}</p>}
      {tubs?.length === 0 && !loadError && <p>No tubs yet.</p>}
      <ul className="tub-list">
        {tubs?.map((t) => (
          <li key={t.code}>
            <a href={`/t/${encodeURIComponent(t.code)}`} className="tub-row">
              <span>
                <span className="tub-row-name">{t.name}</span>
                <span className="tub-row-code">{t.code}</span>
              </span>
              <span className="chevron" aria-hidden="true">›</span>
            </a>
          </li>
        ))}
      </ul>
    </main>
  )
}

function Page() {
  const path = window.location.pathname
  const match = path.match(/^\/t\/([^/]+)\/?$/)
  if (match) return <TubPage code={decodeURIComponent(match[1]).toLowerCase()} />
  if (path === '/') return <HomePage />
  return (
    <main>
      <h1 className="page-title">Page not found</h1>
      <p><a href="/">Go to all tubs</a></p>
    </main>
  )
}

export default function App() {
  return (
    <>
      <Header />
      <Page />
    </>
  )
}
