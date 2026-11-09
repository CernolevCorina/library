// Autentificarea se face cu un cookie httpOnly setat de server; în browser nu se salvează nimic.
export class AuthError extends Error {}

async function request(url, options = {}) {
  const res = await fetch(url, {
    credentials: 'same-origin',
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) throw new AuthError(data.error || 'Neautentificat');
  if (!res.ok) throw new Error(data.error || `Eroare ${res.status}`);
  return data;
}

const post = (url, body) => request(url, { method: 'POST', body: JSON.stringify(body ?? {}) });

export const me = () => request('/api/auth/me');
export const login = (username, password) => post('/api/auth/login', { username, password });
export const register = (username, password) => post('/api/auth/register', { username, password });
export const logout = () => post('/api/auth/logout');

export const listBooks = () => request('/api/books');
export const createBook = (book) => post('/api/books', book);
export const updateBook = (id, patch) =>
  request(`/api/books/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) });
export const deleteBook = (id) => request(`/api/books/${encodeURIComponent(id)}`, { method: 'DELETE' });
