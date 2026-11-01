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
const logs = []
let nextLogId = 1

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
  }
  select(columns) {
    this.columns = columns
    return this
  }
  eq(column, value) {
    this.filters.push((r) => r[column] === value)
    return this
  }
  order(column) {
    this.orderBy = column
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
    if (this.orderBy) {
      found = [...found].sort((a, b) => String(a[this.orderBy]).localeCompare(b[this.orderBy]))
    }
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
