import { useCallback, useEffect, useMemo, useState } from 'react';
import * as api from './api.js';
import BookItem from './BookItem.jsx';
import AuthScreen from './AuthScreen.jsx';

const collator = new Intl.Collator('ro', { sensitivity: 'base', numeric: true });

const SORTS = {
  title: { label: 'Denumire', fn: (a, b) => collator.compare(a.title, b.title) },
  author: {
    label: 'Autor',
    fn: (a, b) => collator.compare(a.author || '￿', b.author || '￿') || collator.compare(a.title, b.title),
  },
  unread: { label: 'Necitite întâi', fn: (a, b) => Number(a.read) - Number(b.read) || collator.compare(a.title, b.title) },
  read: { label: 'Citite întâi', fn: (a, b) => Number(b.read) - Number(a.read) || collator.compare(a.title, b.title) },
  recent: { label: 'Adăugate recent', fn: (a, b) => (b.createdAt || '').localeCompare(a.createdAt || '') },
};

const FILTERS = { all: 'Toate', unread: 'Necitite', read: 'Citite' };

export default function App() {
  // undefined = se verifică sesiunea, null = neautentificat
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    api.me().then(setUser).catch(() => setUser(null));
  }, []);

  if (user === undefined) return <div className="app"><p className="empty">Se încarcă…</p></div>;
  if (!user) return <AuthScreen onAuth={setUser} />;
  return <Library key={user.username} user={user} onLogout={() => setUser(null)} />;
}

function Library({ user, onLogout }) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sort, setSort] = useState('title');
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [adding, setAdding] = useState(false);

  const handleError = useCallback((err) => {
    if (err instanceof api.AuthError) onLogout();
    else setError(err.message);
  }, [onLogout]);

  const load = useCallback(async () => {
    try {
      setBooks(await api.listBooks());
      setError('');
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  useEffect(() => {
    load();
    // Re-sync when returning to the app (e.g. after editing on another device)
    const onVisible = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load]);

  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('ro');
    return books
      .filter((b) => filter === 'all' || (filter === 'read' ? b.read : !b.read))
      .filter((b) => !q || `${b.title} ${b.author}`.toLocaleLowerCase('ro').includes(q))
      .sort(SORTS[sort].fn);
  }, [books, sort, filter, query]);

  const readCount = books.filter((b) => b.read).length;

  async function addBook(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setAdding(true);
    try {
      const book = await api.createBook({ title, author });
      setBooks((bs) => [...bs, book]);
      setTitle('');
      setAuthor('');
    } catch (err) {
      handleError(err);
    } finally {
      setAdding(false);
    }
  }

  async function updateBook(id, patch) {
    const prev = books;
    setBooks((bs) => bs.map((b) => (b.id === id ? { ...b, ...patch } : b)));
    try {
      const saved = await api.updateBook(id, patch);
      setBooks((bs) => bs.map((b) => (b.id === id ? saved : b)));
    } catch (err) {
      setBooks(prev);
      handleError(err);
    }
  }

  async function removeBook(id) {
    const prev = books;
    setBooks((bs) => bs.filter((b) => b.id !== id));
    try {
      await api.deleteBook(id);
    } catch (err) {
      setBooks(prev);
      handleError(err);
    }
  }

  async function logout() {
    try {
      await api.logout();
    } finally {
      onLogout();
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-top">
          <h1>Biblioteca mea</h1>
          <div className="user">
            <span title="Utilizator">👤 {user.username}</span>
            <button type="button" onClick={logout}>Ieșire</button>
          </div>
        </div>
        <p className="stats">
          {books.length} {books.length === 1 ? 'carte' : 'cărți'} · {readCount} citite · {books.length - readCount} necitite
        </p>
      </header>

      <form className="card add-form" onSubmit={addBook}>
        <input
          placeholder="Denumirea cărții *"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <input placeholder="Autor" value={author} onChange={(e) => setAuthor(e.target.value)} />
        <button type="submit" className="primary" disabled={adding || !title.trim()}>
          {adding ? 'Se adaugă…' : 'Adaugă'}
        </button>
      </form>

      <div className="toolbar">
        <input
          type="search"
          className="search"
          placeholder="Caută după denumire sau autor"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="toolbar-row">
          <div className="segmented" role="group" aria-label="Filtru">
            {Object.entries(FILTERS).map(([k, label]) => (
              <button key={k} type="button" className={filter === k ? 'active' : ''} onClick={() => setFilter(k)}>
                {label}
              </button>
            ))}
          </div>
          <label className="sort">
            <span>Ordonează:</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              {Object.entries(SORTS).map(([k, s]) => (
                <option key={k} value={k}>{s.label}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {error && (
        <div className="error" role="alert">
          {error} <button type="button" onClick={() => { setError(''); load(); }}>Reîncearcă</button>
        </div>
      )}

      {loading ? (
        <p className="empty">Se încarcă…</p>
      ) : visible.length === 0 ? (
        <p className="empty">{books.length === 0 ? 'Nicio carte încă. Adaugă prima carte mai sus.' : 'Nicio carte nu corespunde.'}</p>
      ) : (
        <ul className="book-list">
          {visible.map((b) => (
            <BookItem key={b.id} book={b} onUpdate={updateBook} onDelete={removeBook} />
          ))}
        </ul>
      )}
    </div>
  );
}
