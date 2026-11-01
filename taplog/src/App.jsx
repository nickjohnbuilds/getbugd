import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'

// The six quick-log buttons. `action` is what gets saved in the logs table.
const BUTTONS = [
  { action: 'watered', label: 'Watered' },
  { action: 'food', label: 'Food' },
  { action: 'problem', label: 'Problem' },
  { action: 'moved', label: 'Moved' },
  { action: 'babies_seen', label: 'Babies seen' },
  { action: 'harvested_or_sold', label: 'Harvested or sold' },
]

// Choices in the Food dropdown. `other` shows a box to type your own food.
const FOODS = [
  { value: 'protein', label: 'Protein' },
  { value: 'vegetables', label: 'Vegetables' },
  { value: 'calcium', label: 'Calcium' },
  { value: 'leaf_litter_bark', label: 'Leaf litter / bark' },
  { value: 'other', label: 'Other (type your own)' },
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
    <section>
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
        <button type="submit" disabled={busy}>Log in</button>
      </form>
      {message && <p role="alert">{message}</p>}
    </section>
  )
}

function LogButtons({ tubId }) {
  const [choosingFood, setChoosingFood] = useState(false)
  const [food, setFood] = useState(FOODS[0].value)
  const [otherFood, setOtherFood] = useState('')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null)

  async function save(row) {
    setSaving(true)
    setStatus(null)
    const { data, error } = await supabase
      .from('logs')
      .insert({ tub_id: tubId, ...row })
      .select('action, food_type, food_other, logged_at')
      .single()
    setSaving(false)
    if (error) {
      setStatus({ ok: false, text: `Not saved: ${error.message}` })
      return
    }
    const time = new Date(data.logged_at).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    })
    setStatus({ ok: true, text: `Saved: ${labelFor(data)} at ${time}` })
    setChoosingFood(false)
    setOtherFood('')
  }

  function tap(action) {
    if (action === 'food') {
      setChoosingFood(true)
      setStatus(null)
    } else {
      save({ action })
    }
  }

  function saveFood(e) {
    e.preventDefault()
    if (food === 'other') save({ action: 'food', food_type: 'other', food_other: otherFood.trim() })
    else save({ action: 'food', food_type: food })
  }

  return (
    <section>
      <div className="buttons">
        {BUTTONS.map((b) => (
          <button key={b.action} onClick={() => tap(b.action)} disabled={saving}>
            {b.label}
          </button>
        ))}
      </div>

      {choosingFood && (
        <form onSubmit={saveFood}>
          <select value={food} onChange={(e) => setFood(e.target.value)}>
            {FOODS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
          {food === 'other' && (
            <input
              placeholder="What food?"
              value={otherFood}
              onChange={(e) => setOtherFood(e.target.value)}
              required
            />
          )}
          <button type="submit" disabled={saving}>Save food</button>
          <button type="button" onClick={() => setChoosingFood(false)}>Cancel</button>
        </form>
      )}

      {saving && <p>Saving…</p>}
      {status && <p role={status.ok ? 'status' : 'alert'}>{status.text}</p>}
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
      <h1>Buglog</h1>
      <h2>{heading}</h2>
      {tub && session === null && <Login />}
      {tub && session && <LogButtons tubId={tub.id} />}
    </main>
  )
}

export default function App() {
  const match = window.location.pathname.match(/^\/t\/([^/]+)\/?$/)
  if (match) return <TubPage code={decodeURIComponent(match[1]).toLowerCase()} />
  return <h1>getbugd log</h1>
}
