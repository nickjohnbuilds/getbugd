import { createClient } from '@supabase/supabase-js'

// Dev-only demo mode: `npm run dev`, then open /?demo. It swaps in fake tubs
// (src/demo.js) and stays on until the tab is closed. import.meta.env.DEV is
// false in `npm run build`, so this branch and demo.js are left out of the
// built app entirely.
let demo = false
if (import.meta.env.DEV) {
  if (new URLSearchParams(window.location.search).has('demo')) sessionStorage.setItem('demo', '1')
  demo = sessionStorage.getItem('demo') === '1'
}

// Set in Cloudflare Pages environment variables. Only the public (publishable)
// key belongs here, never the secret key.
export const supabase = demo
  ? (await import('./demo.js')).demoClient
  : createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    )
