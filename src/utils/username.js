/** Normaliza usernames no mesmo formato aceito pelo cadastro e pelo backend. */
export const normalizeUsername = (value) =>
  String(value ?? '').toLowerCase().replace(/[^a-z0-9_-]/g, '')
