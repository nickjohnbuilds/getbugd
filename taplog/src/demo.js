// Dev-only stand-in for Supabase, used for screenshots and trying the UI.
// Open the dev server with ?demo (npm run dev, then /?demo). Only loaded when
// import.meta.env.DEV is true, so it never ships in the built app and never
// talks to the real database. Covers just the calls App.jsx makes.

const tubs = [
  { id: 1, code: 'rubber-ducky-1', name: 'Rubber Ducky' },
  { id: 2, code: 'dairy-cow-1', name: 'Dairy Cow' },
  { id: 3, code: 'zebra-1', name: 'Zebra' },
  { id: 4, code: 'magic-potion-1', name: 'Magic Potion' },
  { id: 5, code: 'dairy-cow-2', name: 'Dairy Cow Breeders' },
  { id: 6, code: 'powder-orange-1', name: 'Powder Orange' },
  { id: 7, code: 'springtails-1', name: 'Springtail Culture' },
  { id: 8, code: 'lava-1', name: 'Lava' },
]
// A few past logs on Rubber Ducky, so the history has something to show.
// Seven, so "View all" appears.
const minutesAgo = (m) => new Date(Date.now() - m * 60000).toISOString()
const base = { tub_id: 1, note: null, food_type: null, food_other: null }
const logs = [
  { ...base, id: 1, action: 'watered', logged_at: minutesAgo(60 * 24 * 6) },
  { ...base, id: 2, action: 'food', food_type: 'vegetables', logged_at: minutesAgo(60 * 24 * 5) },
  { ...base, id: 3, action: 'moved', note: 'Top shelf', logged_at: minutesAgo(60 * 24 * 4) },
  { ...base, id: 4, action: 'watered', logged_at: minutesAgo(60 * 24 * 3) },
  { ...base, id: 5, action: 'food', food_type: 'other', food_other: 'Fish flakes', logged_at: minutesAgo(60 * 24 * 2) },
  { ...base, id: 6, action: 'babies_seen', logged_at: minutesAgo(60 * 24) },
  { ...base, id: 7, action: 'food', food_type: 'protein', logged_at: minutesAgo(90) },
]

// Setups, so the home grid has groups and the setup page has a history.
// Rubber Ducky has two (current + earlier); Magic Potion and Lava have none, so
// they land under "Other".
const daysAgo = (d) => minutesAgo(60 * 24 * d)
const blankSetup = {
  enclosure_type: null, main_species: null, also_living_here: null, container: null,
  substrate: null, temp_min_f: null, temp_max_f: null, humidity_min_pct: null,
  humidity_max_pct: null, ventilation: null, notes: null,
}
const tub_setups = [
  { ...blankSetup, id: 1, tub_id: 1, effective_at: daysAgo(40), enclosure_type: 'tub',
    main_species: 'Rubber Ducky', container: '6 qt', substrate: 'Coco fiber + leaf litter',
    temp_min_f: 70, temp_max_f: 76 },
  { ...blankSetup, id: 2, tub_id: 1, effective_at: daysAgo(3), enclosure_type: 'tub',
    main_species: 'Rubber Ducky', also_living_here: 'Springtails', container: '16 qt',
    substrate: 'Coco fiber, oak leaf litter, cork bark', temp_min_f: 72, temp_max_f: 78,
    humidity_min_pct: 70, humidity_max_pct: 85, ventilation: 'Four 1 in holes, mesh',
    notes: 'Moved up to the bigger tub; moss on one side.' },
  { ...blankSetup, id: 3, tub_id: 2, effective_at: daysAgo(20), main_species: 'Dairy Cow', container: '6 qt' },
  { ...blankSetup, id: 4, tub_id: 5, effective_at: daysAgo(10), main_species: 'Dairy Cow', container: '32 qt' },
  { ...blankSetup, id: 5, tub_id: 3, effective_at: daysAgo(15), main_species: 'Zebra' },
  { ...blankSetup, id: 6, tub_id: 6, effective_at: daysAgo(8), main_species: 'Powder Orange' },
  { ...blankSetup, id: 7, tub_id: 7, effective_at: daysAgo(30), enclosure_type: 'culture_cup',
    main_species: 'Springtails', container: '32 oz deli cup' },
]

const tables = { tubs, logs, tub_setups }
const nextId = { logs: logs.length + 1, tub_setups: tub_setups.length + 1 }
// What the database fills in on insert, per table.
const defaults = {
  logs: () => ({ logged_at: new Date().toISOString(), note: null, food_type: null, food_other: null, source: null }),
  tub_setups: () => ({ ...blankSetup, effective_at: new Date().toISOString() }),
}

const session = { user: { id: 'demo-user', email: 'demo@example.com' } }

// Extra switches for one page load: ?demo&loggedout shows the logged-out view;
// ?demo&nosetups makes reading tub_setups fail, as it would before 004 is run.
const params = new URLSearchParams(window.location.search)
const loggedOut = params.has('loggedout')
const noSetups = params.has('nosetups')

function pick(row, columns) {
  if (!columns || columns === '*') return { ...row }
  const out = {}
  for (const c of columns.split(',').map((s) => s.trim())) out[c] = row[c] ?? null
  return out
}

class Query {
  constructor(table) {
    this.table = table
    this.filters = []
    this.orders = []
  }
  select(columns) {
    this.columns = columns
    return this
  }
  eq(column, value) {
    this.filters.push((r) => r[column] === value)
    return this
  }
  order(column, { ascending = true } = {}) {
    this.orders.push({ column, ascending })
    return this
  }
  limit(n) {
    this.max = n
    return this
  }
  insert(row) {
    this.inserting = row
    return this
  }
  delete() {
    this.deleting = true
    return this
  }
  maybeSingle() {
    this.one = true
    return this
  }
  single() {
    this.one = true
    return this
  }
  run() {
    if (noSetups && this.table === 'tub_setups') {
      return { data: null, error: { message: 'relation "public.tub_setups" does not exist' } }
    }
    const rows = tables[this.table]
    if (this.inserting) {
      const row = { ...defaults[this.table](), id: nextId[this.table]++, ...this.inserting }
      rows.push(row)
      return { data: pick(row, this.columns), error: null }
    }
    let found = rows.filter((r) => this.filters.every((f) => f(r)))
    if (this.deleting) {
      for (const r of found) rows.splice(rows.indexOf(r), 1)
      return { data: null, error: null }
    }
    if (this.orders.length) {
      const compare = (x, y) =>
        typeof x === 'number' ? x - y : String(x).localeCompare(String(y))
      found = [...found].sort((a, b) => {
        for (const { column, ascending } of this.orders) {
          const c = compare(a[column], b[column])
          if (c) return ascending ? c : -c
        }
        return 0
      })
    }
    if (this.max !== undefined) found = found.slice(0, this.max)
    found = found.map((r) => pick(r, this.columns))
    return { data: this.one ? found[0] ?? null : found, error: null }
  }
  then(resolve, reject) {
    // A short delay so "Saving…" states show up like they would on a phone.
    return new Promise((r) => setTimeout(r, 250)).then(() => this.run()).then(resolve, reject)
  }
}

export const demoClient = {
  from: (table) => new Query(table),
  auth: {
    getSession: async () => ({ data: { session: loggedOut ? null : session } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signInWithPassword: async () => ({ error: null }),
  },
}
