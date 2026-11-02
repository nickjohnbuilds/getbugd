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

// "Nov 1, 1:59 PM", for the history list.
function whenOf(log) {
  return new Date(log.logged_at).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

// The columns the app reads for a log, both after saving and in the history.
const LOG_COLUMNS = 'id, action, food_type, food_other, note, logged_at'

// How many logs the history shows before "View all".
const HISTORY_SHOWN = 5

// Newest first. Two logs saved in the same moment fall back to the newer id.
function newestFirst(a, b) {
  return new Date(b.logged_at) - new Date(a.logged_at) || b.id - a.id
}

// Where this visit came from, saved as logs.source. Home tiles link with
// ?via=home; new NFC stickers carry ?via=nfc. No ?via is saved as 'nfc' too, as
// a best guess: the 20 stickers written so far are plain /t/<code>.
const VIA = new URLSearchParams(window.location.search).get('via')
const SOURCE = VIA === 'home' ? 'tile' : 'nfc'

// Keeps ?via when moving between a tub page and its setup page.
const VIA_QUERY = VIA ? `?via=${encodeURIComponent(VIA)}` : ''

// The logged-in session: undefined while checking, null when logged out.
function useSession() {
  const [session, setSession] = useState(undefined)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])
  return session
}

// Looks up a tub by its code. undefined while loading, null if there's none.
function useTub(code) {
  const [tub, setTub] = useState(undefined)
  const [loadError, setLoadError] = useState('')
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
  return { tub, loadError }
}

function tubHeading(code, tub, loadError) {
  if (tub === undefined) return 'Loading…'
  if (tub) return tub.name
  if (loadError) return `Couldn't load the tub: ${loadError}`
  return `No tub called "${code}"`
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

function LogButtons({ tubId, onSaved, onUndone }) {
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
      .insert({ tub_id: tubId, source: SOURCE, ...row, ...(trimmed && { note: trimmed }) })
      .select(LOG_COLUMNS)
      .single()
    setSaving(false)
    if (error) {
      setStatus({ kind: 'error', text: `Not saved: ${error.message}` })
      return
    }
    setStatus({ kind: 'saved', log: data })
    onSaved(data)
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
    onUndone(log.id)
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

// What was done to the tub and when, newest at the top. Starts with the last
// five; "View all" loads the rest. Logs are only readable when logged in, so
// this only shows after login.
function History({ logs, showAll, loading, error, onViewAll }) {
  const shown = showAll ? logs : logs.slice(0, HISTORY_SHOWN)
  const hasMore = !showAll && logs.length > HISTORY_SHOWN

  return (
    <section className="history" aria-labelledby="history-title">
      <h2 id="history-title" className="history-title">History</h2>
      {error && <p role="alert" className="error">Couldn't load the history: {error}</p>}
      {!error && logs.length === 0 && (
        <p className="history-empty">{loading ? 'Loading…' : 'No logs yet.'}</p>
      )}
      {shown.length > 0 && (
        <ol className="history-list">
          {shown.map((log) => (
            <li key={log.id} className="history-item">
              <span className="history-line">{labelFor(log)} · {whenOf(log)}</span>
              {log.note && <span className="history-note">{log.note}</span>}
            </li>
          ))}
        </ol>
      )}
      {hasMore && (
        <button type="button" className="secondary view-all" onClick={onViewAll} disabled={loading}>
          {loading ? 'Loading…' : 'View all'}
        </button>
      )}
    </section>
  )
}

// The log buttons and the history under them. Holds the tub's logs, so a log
// saved with a button shows at the top of the history right away (and leaves
// it again on Undo) without asking the database again.
function TubLogs({ tubId }) {
  const [logs, setLogs] = useState([])
  const [showAll, setShowAll] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Adds rows to what's already here, without doubles, newest first. A log
  // saved while the history is still loading may come back in the load too.
  function merge(rows) {
    setLogs((current) => {
      const ids = new Set(current.map((l) => l.id))
      return [...current, ...rows.filter((r) => !ids.has(r.id))].sort(newestFirst)
    })
  }

  // Asks for one more than it shows, to know whether "View all" is needed.
  // `all` asks for every log for the tub. Resolves to true if it loaded.
  function load(all) {
    let query = supabase
      .from('logs')
      .select(LOG_COLUMNS)
      .eq('tub_id', tubId)
      .order('logged_at', { ascending: false })
      .order('id', { ascending: false })
    if (!all) query = query.limit(HISTORY_SHOWN + 1)
    return query.then(({ data, error }) => {
      setLoading(false)
      if (error) {
        console.error('Supabase:', error.message)
        setError(error.message)
        return false
      }
      merge(data)
      return true
    })
  }

  // The first five load when the page opens (`loading` starts on). The tub
  // page makes a new TubLogs for each tub, so this runs once.
  useEffect(() => {
    load(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function viewAll() {
    setLoading(true)
    setError('')
    if (await load(true)) setShowAll(true)
  }

  return (
    <>
      <LogButtons
        tubId={tubId}
        onSaved={(log) => merge([log])}
        onUndone={(id) => setLogs((current) => current.filter((l) => l.id !== id))}
      />
      <History logs={logs} showAll={showAll} loading={loading} error={error} onViewAll={viewAll} />
    </>
  )
}

function TubPage({ code }) {
  const { tub, loadError } = useTub(code)
  const session = useSession()

  return (
    <main>
      <div className="tub-head">
        <h1 className="tub-name">{tubHeading(code, tub, loadError)}</h1>
        {tub && session && (
          <a className="small-link" href={`/t/${encodeURIComponent(code)}/setup${VIA_QUERY}`}>
            Setup
          </a>
        )}
      </div>
      {tub && session === null && <Login />}
      {tub && session && <TubLogs tubId={tub.id} />}
    </main>
  )
}

// One square tile per tub. The colored block is a placeholder for Nick's
// species cartoons.
function TubGrid({ tubs }) {
  return (
    <ul className="tub-grid">
      {tubs.map((t) => (
        <li key={t.code}>
          <a href={`/t/${encodeURIComponent(t.code)}?via=home`} className="tub-tile">
            <span className="tub-tile-art" aria-hidden="true" />
            <span className="tub-tile-name">{t.name}</span>
          </a>
        </li>
      ))}
    </ul>
  )
}

// Groups tubs under each one's current (latest) setup main species, sorted by
// species with "Other" (no setup, or no species) last. `setups` is newest
// first, so the first row seen for a tub is its current setup.
function groupBySpecies(tubs, setups) {
  const species = new Map()
  for (const s of setups) {
    if (!species.has(s.tub_id)) species.set(s.tub_id, s.main_species?.trim() || null)
  }
  const groups = new Map()
  for (const t of tubs) {
    const name = species.get(t.id) || 'Other'
    if (!groups.has(name)) groups.set(name, [])
    groups.get(name).push(t)
  }
  return [...groups]
    .sort(([a], [b]) => (a === 'Other') - (b === 'Other') || a.localeCompare(b))
    .map(([name, list]) => ({ name, tubs: list }))
}

// Every tub as a tile, sorted by name. Read-only; tap one to log on it. When
// logged in, tiles are grouped by species. Setups are only readable when logged
// in, and if they can't be read the page shows one plain grid instead.
function HomePage() {
  const session = useSession()
  const [tubs, setTubs] = useState(undefined)
  const [loadError, setLoadError] = useState('')
  // Every setup, newest first. undefined while loading, null if it failed.
  const [setups, setSetups] = useState(undefined)

  useEffect(() => {
    supabase
      .from('tubs')
      .select('id, code, name')
      .order('name')
      .then(({ data, error }) => {
        if (error) {
          console.error('Supabase:', error.message)
          setLoadError(error.message)
        }
        setTubs(data ?? [])
      })
  }, [])

  const grouping = Boolean(session) && tubs?.length > 0

  useEffect(() => {
    if (!grouping) return
    supabase
      .from('tub_setups')
      .select('id, tub_id, main_species, effective_at')
      .order('effective_at', { ascending: false })
      .order('id', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error('Supabase (setups, showing a plain grid):', error.message)
        setSetups(error ? null : data)
      })
  }, [grouping])

  // null means one plain grid: logged out, or setups couldn't be read.
  const groups = grouping && setups ? groupBySpecies(tubs, setups) : null
  const loading = tubs === undefined || session === undefined || (grouping && setups === undefined)

  return (
    <main>
      <h1 className="page-title">Tubs</h1>
      {loading && <p>Loading…</p>}
      {loadError && <p role="alert" className="error">Couldn't load tubs: {loadError}</p>}
      {tubs?.length === 0 && !loadError && <p>No tubs yet.</p>}
      {!loading && !groups && tubs.length > 0 && <TubGrid tubs={tubs} />}
      {!loading &&
        groups?.map((g) => (
          <section key={g.name} className="tub-group">
            <h2 className="tub-group-title">{g.name}</h2>
            <TubGrid tubs={g.tubs} />
          </section>
        ))}
    </main>
  )
}

// Main species choices on the setup form. Edit this list to add, rename or
// remove one. "Other" is added after these and lets you type the species.
const SPECIES = [
  'Bumblebee Millipede',
  'Dairy Cow',
  'Dwarf White',
  'Giant Canyon',
  'Lava',
  'Magic Potion',
  'Montenegro',
  'Powder Orange',
  'Rubber Ducky',
  'Springtails',
  'Zebra',
]

// `value` is what gets saved in tub_setups.enclosure_type.
const ENCLOSURES = [
  { value: 'tub', label: 'Tub' },
  { value: 'culture_cup', label: 'Culture cup' },
  { value: 'vivarium', label: 'Vivarium' },
  { value: 'terrarium', label: 'Terrarium' },
]

const SETUP_COLUMNS =
  'id, effective_at, enclosure_type, main_species, also_living_here, container, substrate, ' +
  'temp_min_f, temp_max_f, humidity_min_pct, humidity_max_pct, ventilation, notes'

// Newest first, like the history.
function newestSetupFirst(a, b) {
  return new Date(b.effective_at) - new Date(a.effective_at) || b.id - a.id
}

function dateOf(setup) {
  return new Date(setup.effective_at).toLocaleDateString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// "72–78 °F", "from 72 °F", "up to 78 °F", or null when neither is set.
function rangeOf(min, max, unit) {
  if (min != null && max != null) return min === max ? `${min} ${unit}` : `${min}–${max} ${unit}`
  if (min != null) return `from ${min} ${unit}`
  if (max != null) return `up to ${max} ${unit}`
  return null
}

// The filled-in parts of a setup, as label/value pairs, in form order.
function setupDetails(s) {
  return [
    ['Main species', s.main_species],
    ['Also living here', s.also_living_here],
    ['Enclosure', ENCLOSURES.find((e) => e.value === s.enclosure_type)?.label],
    ['Container', s.container],
    ['Substrate', s.substrate],
    ['Temperature', rangeOf(s.temp_min_f, s.temp_max_f, '°F')],
    ['Humidity', rangeOf(s.humidity_min_pct, s.humidity_max_pct, '%')],
    ['Ventilation', s.ventilation],
    ['Notes', s.notes],
  ].filter(([, value]) => value)
}

// Today as yyyy-mm-dd in local time, for the date field.
function today() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// Form fields start from the current setup, so an update only needs the change.
function formFrom(s) {
  const species = s?.main_species ?? ''
  const known = species === '' || SPECIES.includes(species)
  const text = (v) => v ?? ''
  return {
    date: today(),
    species: known ? species : 'other',
    otherSpecies: known ? '' : species,
    also_living_here: text(s?.also_living_here),
    enclosure_type: text(s?.enclosure_type),
    container: text(s?.container),
    substrate: text(s?.substrate),
    temp_min_f: text(s?.temp_min_f),
    temp_max_f: text(s?.temp_max_f),
    humidity_min_pct: text(s?.humidity_min_pct),
    humidity_max_pct: text(s?.humidity_max_pct),
    ventilation: text(s?.ventilation),
    notes: text(s?.notes),
  }
}

function SetupForm({ current, saving, onSave, onCancel }) {
  const [form, setForm] = useState(() => formFrom(current))
  const [problem, setProblem] = useState('')
  const [more, setMore] = useState(
    current?.humidity_min_pct != null || current?.humidity_max_pct != null,
  )
  const panel = useRef(null)
  const otherInput = useRef(null)

  // Same as the food panel: glide the form into view on a phone.
  useEffect(() => {
    panel.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    panel.current.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    if (form.species !== 'other' || form.otherSpecies) return
    otherInput.current.focus()
  }, [form.species]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  const text = (v) => v.trim() || null
  const num = (v) => (v === '' ? null : Number(v))

  function submit(e) {
    e.preventDefault()
    const row = {
      main_species: form.species === 'other' ? text(form.otherSpecies) : form.species || null,
      also_living_here: text(form.also_living_here),
      enclosure_type: form.enclosure_type || null,
      container: text(form.container),
      substrate: text(form.substrate),
      temp_min_f: num(form.temp_min_f),
      temp_max_f: num(form.temp_max_f),
      humidity_min_pct: num(form.humidity_min_pct),
      humidity_max_pct: num(form.humidity_max_pct),
      ventilation: text(form.ventilation),
      notes: text(form.notes),
    }
    if (row.temp_min_f != null && row.temp_max_f != null && row.temp_min_f > row.temp_max_f) {
      setProblem('Temperature: the low number is above the high one.')
      return
    }
    if (
      row.humidity_min_pct != null &&
      row.humidity_max_pct != null &&
      row.humidity_min_pct > row.humidity_max_pct
    ) {
      setMore(true)
      setProblem('Humidity: the low number is above the high one.')
      return
    }
    setProblem('')
    // Today: leave effective_at to the database (now). Another day: noon local
    // time that day, so the date reads the same in any time zone nearby.
    if (form.date && form.date !== today()) {
      const [y, m, d] = form.date.split('-').map(Number)
      row.effective_at = new Date(y, m - 1, d, 12).toISOString()
    }
    onSave(row)
  }

  return (
    <form className="setup-form" onSubmit={submit} ref={panel} tabIndex={-1} aria-label="Update setup">
      <h2 className="section-title">Update setup</h2>
      <p className="hint">Saves a new dated setup. Earlier ones stay in the list below.</p>

      <label className="field">
        <span>Date</span>
        <input type="date" value={form.date} max={today()} onChange={set('date')} />
      </label>

      <label className="field">
        <span>Main species</span>
        <select value={form.species} onChange={set('species')}>
          <option value="">—</option>
          {SPECIES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
          <option value="other">Other</option>
        </select>
      </label>
      {form.species === 'other' && (
        <label className="field">
          <span>Which species?</span>
          <input
            ref={otherInput}
            value={form.otherSpecies}
            onChange={set('otherSpecies')}
            placeholder="Type the species"
            required
          />
        </label>
      )}

      <label className="field">
        <span>Also living here</span>
        <input value={form.also_living_here} onChange={set('also_living_here')} placeholder="e.g. springtails" />
      </label>

      <label className="field">
        <span>Enclosure type</span>
        <select value={form.enclosure_type} onChange={set('enclosure_type')}>
          <option value="">—</option>
          {ENCLOSURES.map((e) => (
            <option key={e.value} value={e.value}>{e.label}</option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Container</span>
        <input value={form.container} onChange={set('container')} placeholder="e.g. 6 qt, 18x18x24 in" />
      </label>

      <label className="field">
        <span>Substrate</span>
        <input value={form.substrate} onChange={set('substrate')} />
      </label>

      <fieldset className="field">
        <legend>Temperature (°F)</legend>
        <div className="pair">
          <input
            type="number"
            inputMode="numeric"
            aria-label="Temperature low, °F"
            placeholder="Low"
            value={form.temp_min_f}
            onChange={set('temp_min_f')}
          />
          <span aria-hidden="true">to</span>
          <input
            type="number"
            inputMode="numeric"
            aria-label="Temperature high, °F"
            placeholder="High"
            value={form.temp_max_f}
            onChange={set('temp_max_f')}
          />
        </div>
      </fieldset>

      <label className="field">
        <span>Ventilation</span>
        <input value={form.ventilation} onChange={set('ventilation')} />
      </label>

      <label className="field">
        <span>Notes</span>
        <textarea rows="3" value={form.notes} onChange={set('notes')} />
      </label>

      <button
        type="button"
        className="link more-toggle"
        aria-expanded={more}
        onClick={() => setMore((m) => !m)}
      >
        {more ? 'Less' : 'More'}
      </button>
      {more && (
        <fieldset className="field">
          <legend>Humidity (%), optional</legend>
          <div className="pair">
            <input
              type="number"
              inputMode="numeric"
              min="0"
              max="100"
              aria-label="Humidity low, %"
              placeholder="Low"
              value={form.humidity_min_pct}
              onChange={set('humidity_min_pct')}
            />
            <span aria-hidden="true">to</span>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              max="100"
              aria-label="Humidity high, %"
              placeholder="High"
              value={form.humidity_max_pct}
              onChange={set('humidity_max_pct')}
            />
          </div>
        </fieldset>
      )}

      {problem && <p role="alert" className="error">{problem}</p>}

      <div className="food-actions">
        <button type="button" className="secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="primary" disabled={saving}>Save</button>
      </div>
    </form>
  )
}

function SetupDetails({ setup }) {
  const details = setupDetails(setup)
  if (details.length === 0) return <p className="hint">Nothing filled in.</p>
  return (
    <dl className="setup-details">
      {details.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

// The tub's current setup, a form to save a new one, and the earlier ones.
// Logged in only, since setups are only readable when logged in.
function SetupPage({ code }) {
  const { tub, loadError } = useTub(code)
  const session = useSession()
  const [setups, setSetups] = useState(undefined)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  // The "✓ saved" message after saving a setup, or '' for none.
  const [saved, setSaved] = useState('')

  useEffect(() => {
    if (!tub || !session) return
    supabase
      .from('tub_setups')
      .select(SETUP_COLUMNS)
      .eq('tub_id', tub.id)
      .order('effective_at', { ascending: false })
      .order('id', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error('Supabase:', error.message)
          setError(error.message)
        }
        setSetups(data ?? [])
      })
  }, [tub, session])

  async function save(row) {
    setSaving(true)
    setError('')
    const { data, error } = await supabase
      .from('tub_setups')
      .insert({ tub_id: tub.id, ...row })
      .select(SETUP_COLUMNS)
      .single()
    setSaving(false)
    if (error) {
      setError(`Not saved: ${error.message}`)
      return
    }
    // A backdated setup older than the current one goes into the earlier list
    // and leaves Current as it was, so say where it went.
    const isCurrent = !setups[0] || newestSetupFirst(data, setups[0]) < 0
    setSetups((current) => [data, ...current].sort(newestSetupFirst))
    setEditing(false)
    setSaved(isCurrent ? '✓ Setup saved' : `✓ Saved as an earlier setup (${dateOf(data)})`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const [current, ...past] = setups ?? []
  const tubHref = `/t/${encodeURIComponent(code)}${VIA_QUERY}`

  return (
    <main>
      {tub && (
        <p className="back">
          <a className="small-link" href={tubHref}>‹ {tub.name}</a>
        </p>
      )}
      <h1 className="tub-name">{tub ? 'Setup' : tubHeading(code, tub, loadError)}</h1>
      {tub && session === null && <Login />}
      {tub && session && (
        <>
          {error && <p role="alert" className="error">{error}</p>}
          {setups === undefined && !error && <p>Loading…</p>}
          {saved && !editing && (
            <p role="status" className="status fade" onAnimationEnd={() => setSaved('')}>
              {saved}
            </p>
          )}

          {setups && (
            <section className="setup-current" aria-labelledby="current-title">
              <h2 id="current-title" className="section-title">
                Current{current && <span className="section-date"> · since {dateOf(current)}</span>}
              </h2>
              {current ? <SetupDetails setup={current} /> : <p className="hint">No setup yet.</p>}
            </section>
          )}

          {setups && !editing && (
            <button type="button" className="primary wide" onClick={() => { setEditing(true); setSaved('') }}>
              Update setup
            </button>
          )}
          {editing && (
            <SetupForm
              current={current}
              saving={saving}
              onSave={save}
              onCancel={() => setEditing(false)}
            />
          )}

          {past.length > 0 && (
            <section className="setup-past" aria-labelledby="past-title">
              <h2 id="past-title" className="section-title">Earlier setups</h2>
              <ol className="history-list">
                {past.map((s) => (
                  <li key={s.id} className="history-item">
                    <details>
                      <summary>
                        <span className="history-line">{dateOf(s)}</span>
                        <span className="history-note">
                          {[s.main_species, s.container].filter(Boolean).join(' · ') || 'Details'}
                        </span>
                      </summary>
                      <SetupDetails setup={s} />
                    </details>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </>
      )}
    </main>
  )
}

function Page() {
  const path = window.location.pathname
  const setup = path.match(/^\/t\/([^/]+)\/setup\/?$/)
  if (setup) return <SetupPage code={decodeURIComponent(setup[1]).toLowerCase()} />
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
