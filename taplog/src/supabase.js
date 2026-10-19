import { createClient } from '@supabase/supabase-js'

// Set in Cloudflare Pages environment variables. Only the public (publishable)
// key belongs here, never the secret key.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
)
