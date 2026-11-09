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
const patch = (url, body) => request(url, { method: 'PATCH', body: JSON.stringify(body) });
const del = (url) => request(url, { method: 'DELETE' });
const enc = encodeURIComponent;

export const me = () => request('/api/auth/me');
export const login = (username, password) => post('/api/auth/login', { username, password });
export const register = (username, password) => post('/api/auth/register', { username, password });
export const logout = () => post('/api/auth/logout');

export const listLists = () => request('/api/lists');
export const createList = (list) => post('/api/lists', list);
export const updateList = (id, changes) => patch(`/api/lists/${enc(id)}`, changes);
export const deleteList = (id) => del(`/api/lists/${enc(id)}`);

export const listItems = (listId) => request(`/api/lists/${enc(listId)}/items`);
export const createItem = (listId, item) => post(`/api/lists/${enc(listId)}/items`, item);
export const updateItem = (listId, id, changes) => patch(`/api/lists/${enc(listId)}/items/${enc(id)}`, changes);
export const deleteItem = (listId, id) => del(`/api/lists/${enc(listId)}/items/${enc(id)}`);
