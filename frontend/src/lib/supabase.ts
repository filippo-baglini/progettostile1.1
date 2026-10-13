import { createClient } from '@supabase/supabase-js';

// Logins (email/password, Google, password reset) go through Supabase Auth; the backend checks its tokens
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
);
