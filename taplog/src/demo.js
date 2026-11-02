// Dev-only stand-in for Supabase, used for screenshots and trying the UI.
// Open the dev server with ?demo (npm run dev, then /?demo). Only loaded when
// import.meta.env.DEV is true, so it never ships in the built app and never
// talks to the real database. Covers just the calls App.jsx makes.

const tubs = [
  { id: 1, code: 'rubber-ducky-1', name: 'Rubber Ducky' },
  { id: 2, code: 'dairy-cow-1', name: 'Dairy Cow' },
  { id: 3, code: 'zebra-1', name: 'Zebra' },
  { id: 4, code: 'magic-potion-1', name: 'Magic Potion' },
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
let nextLogId = logs.length + 1

const session = { user: { id: 'demo-user', email: 'demo@example.com' } }

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
    const rows = this.table === 'tubs' ? tubs : logs
    if (this.inserting) {
      const row = {
        id: nextLogId++,
        logged_at: new Date().toISOString(),
        note: null,
        food_type: null,
        food_other: null,
        ...this.inserting,
      }
      logs.push(row)
      return { data: pick(row, this.columns), error: null }
    }
    let found = rows.filter((r) => this.filters.every((f) => f(r)))
    if (this.deleting) {
      for (const r of found) logs.splice(logs.indexOf(r), 1)
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
    getSession: async () => ({ data: { session } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signInWithPassword: async () => ({ error: null }),
  },
}
