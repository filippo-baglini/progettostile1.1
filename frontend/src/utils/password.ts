// Mirrors Supabase Auth's settings (Authentication -> Email): keep the two in sync.
// Supabase checks again on signup and password change; this only gives the message before the request.
export const PASSWORD_HINT = 'At least 8 characters, with upper- and lowercase letters, a number and a symbol';

export const passwordProblem = (password: string): string | null =>
  password.length >= 8 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password)
    ? null
    : PASSWORD_HINT;
