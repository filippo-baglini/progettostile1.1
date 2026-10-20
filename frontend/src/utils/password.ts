import { t } from '../i18n';

// Mirrors Supabase Auth's settings (Authentication -> Email): keep the two in sync.
// Supabase checks again on signup and password change; this only gives the message before the request.
export const passwordProblem = (password: string): string | null =>
  password.length >= 8 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password)
    ? null
    : t().auth.passwordHint;
