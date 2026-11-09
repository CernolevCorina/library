import { useCallback, useEffect, useMemo, useState } from 'react';
import * as api from './api.js';
import ItemRow from './ItemRow.jsx';
import AuthScreen from './AuthScreen.jsx';
import ListDialog from './ListDialog.jsx';
import CreatorInput, { fold } from './CreatorInput.jsx';
import { kindOf, plural } from './kinds.js';
import Icon from './Icon.jsx';
import { formatScore } from './Score.jsx';

const collator = new Intl.Collator('ro', { sensitivity: 'base', numeric: true });
const byTitle = (a, b) => collator.compare(a.title, b.title);

function sorts(k) {
  return {
    title: { label: 'Titlu', fn: byTitle },
    creator: {
      label: k.creator,
      fn: (a, b) => collator.compare(a.creator || '￿', b.creator || '￿') || byTitle(a, b),
    },
    rating: { label: 'Nota', fn: (a, b) => b.rating - a.rating || byTitle(a, b) },
    todo: { label: `${k.todo} întâi`, fn: (a, b) => Number(a.done) - Number(b.done) || byTitle(a, b) },
    done: { label: `${k.done} întâi`, fn: (a, b) => Number(b.done) - Number(a.done) || byTitle(a, b) },
    recent: { label: 'Adăugate recent', fn: (a, b) => (b.createdAt || '').localeCompare(a.createdAt || '') },
  };
}

const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
};

export default function App() {
  // undefined = se verifică sesiunea, null = neautentificat
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    api.me().then(setUser).catch(() => setUser(null));
  }, []);

  if (user === undefined) return <div className="app"><p className="empty">Se încarcă…</p></div>;
  if (!user) return <AuthScreen onAuth={setUser} />;
  return <Home key={user.username} user={user} onLogout={() => setUser(null)} />;
}

function Home({ user, onLogout }) {
  const [lists, setLists] = useState(null);
  const [activeId, setActiveId] = useState(() => store.get(`lastList:${user.username}`));
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState(null); // null | 'new' | 'edit'

  const handleError = useCallback((err) => {
    if (err instanceof api.AuthError) onLogout();
    else setError(err.message);
  }, [onLogout]);

  const loadLists = useCallback(async () => {
    try {
      setLists(await api.listLists());
      setError('');
    } catch (err) {
      handleError(err);
    }
  }, [handleError]);

  useEffect(() => { loadLists(); }, [loadLists]);

  const active = lists?.find((l) => l.id === activeId) || lists?.[0];

  function selectList(id) {
    setActiveId(id);
    store.set(`lastList:${user.username}`, id);
  }

  async function saveList(data) {
    try {
      if (dialog === 'new') {
        const list = await api.createList(data);
        setLists((ls) => [...ls, list]);
        selectList(list.id);
      } else {
        const saved = await api.updateList(active.id, data);
        setLists((ls) => ls.map((l) => (l.id === saved.id ? { ...l, ...saved } : l)));
      }
      setDialog(null);
    } catch (err) {
      handleError(err);
    }
  }

  async function deleteList() {
    try {
      await api.deleteList(active.id);
      setLists((ls) => ls.filter((l) => l.id !== active.id));
      setDialog(null);
    } catch (err) {
      handleError(err);
    }
  }

  const setCount = useCallback((listId, count) => {
    setLists((ls) => ls && ls.map((l) => (l.id === listId && l.count !== count ? { ...l, count } : l)));
  }, []);

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
        <div className="topbar">
          <h1 className="brand"><span className="brand-mark" aria-hidden="true">✓</span>Listele mele</h1>
          <div className="user">
            <span className="avatar" aria-hidden="true">{user.username[0].toUpperCase()}</span>
            <span className="user-name">{user.username}</span>
            <button type="button" className="icon-btn" onClick={logout} aria-label="Ieșire" title="Ieșire">
              <Icon name="logout" />
            </button>
          </div>
        </div>

        {lists && (
          <nav className="tabs" aria-label="Liste">
            {lists.map((l) => (
              <button
                key={l.id}
                type="button"
                className={`tab ${l.id === active?.id ? 'active' : ''}`}
                aria-current={l.id === active?.id ? 'page' : undefined}
                onClick={() => selectList(l.id)}
              >
                {l.emoji && <span className="tab-emoji" aria-hidden="true">{l.emoji}</span>}
                <span>{l.name}</span>
                <span className="tab-count">{l.count}</span>
              </button>
            ))}
            <button type="button" className="tab tab-new" onClick={() => setDialog('new')}>
              <Icon name="plus" size={16} /> Listă nouă
            </button>
          </nav>
        )}
      </header>

      {error && (
        <div className="error" role="alert">
          {error} <button type="button" onClick={() => { setError(''); loadLists(); }}>Reîncearcă</button>
        </div>
      )}

      {!lists ? (
        !error && <p className="empty">Se încarcă…</p>
      ) : (
        active && (
          <ListView
            key={active.id}
            list={active}
            onEditList={() => setDialog('edit')}
            onCount={setCount}
            onError={handleError}
          />
        )
      )}

      {dialog && (
        <ListDialog
          list={dialog === 'edit' ? active : null}
          canDelete={lists.length > 1}
          onSave={saveList}
          onDelete={deleteList}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}

function ListView({ list, onEditList, onCount, onError }) {
  const kind = kindOf(list);
  const SORTS = useMemo(() => sorts(kind), [kind.creator, kind.done, kind.todo]); // eslint-disable-line react-hooks/exhaustive-deps
  const FILTERS = { all: 'Toate', todo: kind.todo, done: kind.done };

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('title');
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [title, setTitle] = useState('');
  const [creator, setCreator] = useState('');
  const [adding, setAdding] = useState(false);
  // Elementul tocmai bifat: îi cerem rating + comentariu și îl ținem vizibil chiar dacă filtrul îl ascunde.
  const [promptId, setPromptId] = useState(null);

  const load = useCallback(async () => {
    try {
      setItems(await api.listItems(list.id));
    } catch (err) {
      onError(err);
    } finally {
      setLoading(false);
    }
  }, [list.id, onError]);

  useEffect(() => {
    load();
    // Re-sincronizare la revenirea în aplicație (ex. după editare pe alt dispozitiv)
    const onVisible = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load]);

  useEffect(() => {
    if (!loading) onCount(list.id, items.length);
  }, [items.length, loading, list.id, onCount]);

  const visible = useMemo(() => {
    const q = fold(query);
    return items
      .filter((b) => b.id === promptId || filter === 'all' || (filter === 'done' ? b.done : !b.done))
      .filter((b) => !q || fold(`${b.title} ${b.creator} ${b.comment}`).includes(q))
      .sort((SORTS[sort] || SORTS.title).fn);
  }, [items, sort, filter, query, promptId, SORTS]);

  // Valorile existente (unice, fără dubluri de scriere), pentru câmpul de creator.
  const creators = useMemo(() => {
    const byKey = new Map();
    for (const b of items) if (b.creator && !byKey.has(fold(b.creator))) byKey.set(fold(b.creator), b.creator);
    return [...byKey.values()].sort(collator.compare);
  }, [items]);

  const doneCount = items.filter((b) => b.done).length;
  const rated = items.filter((b) => b.rating > 0);
  const average = rated.length ? Math.round((rated.reduce((s, b) => s + b.rating, 0) / rated.length) * 10) / 10 : 0;
  const progress = items.length ? Math.round((doneCount / items.length) * 100) : 0;

  async function addItem(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setAdding(true);
    try {
      const known = creators.find((a) => fold(a) === fold(creator));
      const item = await api.createItem(list.id, { title, creator: known || creator });
      setItems((bs) => [...bs, item]);
      setTitle('');
      setCreator('');
    } catch (err) {
      onError(err);
    } finally {
      setAdding(false);
    }
  }

  async function updateItem(id, changes) {
    const prev = items;
    setItems((bs) => bs.map((b) => (b.id === id ? { ...b, ...changes } : b)));
    try {
      const saved = await api.updateItem(list.id, id, changes);
      setItems((bs) => bs.map((b) => (b.id === id ? saved : b)));
    } catch (err) {
      setItems(prev);
      onError(err);
    }
  }

  async function removeItem(id) {
    const prev = items;
    setItems((bs) => bs.filter((b) => b.id !== id));
    try {
      await api.deleteItem(list.id, id);
    } catch (err) {
      setItems(prev);
      onError(err);
    }
  }

  function toggleDone(id, done) {
    updateItem(id, { done });
    setPromptId(done ? id : null);
  }

  return (
    <>
      <section className="hero">
        <div className="hero-top">
          <span className="hero-emoji" aria-hidden="true">{list.emoji || '📋'}</span>
          <div className="hero-text">
            <h2>{list.name}</h2>
            <p className="stats">
              {plural(items.length, kind)} · {doneCount} {kind.done.toLowerCase()}
              {average > 0 && <> · medie <strong>{formatScore(average)}</strong></>}
            </p>
          </div>
          <button type="button" className="icon-btn" onClick={onEditList} aria-label="Setările listei" title="Setările listei">
            <Icon name="settings" />
          </button>
        </div>
        {items.length > 0 && (
          <div className="progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={`${progress}% ${kind.done.toLowerCase()}`}>
            <span style={{ width: `${progress}%` }} />
          </div>
        )}
      </section>

      <form className="composer" onSubmit={addItem}>
        <input
          className="composer-title"
          placeholder={`Adaugă ${kind.addWhat}…`}
          aria-label="Titlu"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <CreatorInput value={creator} onChange={setCreator} options={creators} placeholder={kind.creator} />
        <button type="submit" className="primary add-btn" disabled={adding || !title.trim()} aria-label="Adaugă">
          <Icon name="plus" /> <span>{adding ? 'Se adaugă…' : 'Adaugă'}</span>
        </button>
      </form>

      <div className="toolbar">
        <div className="search">
          <Icon name="search" />
          <input
            type="search"
            placeholder={`Caută după titlu, ${kind.creator.toLowerCase()} sau comentariu`}
            aria-label="Caută"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="toolbar-row">
          <div className="segmented" role="group" aria-label="Filtru">
            {Object.entries(FILTERS).map(([k, label]) => (
              <button key={k} type="button" className={filter === k ? 'active' : ''} onClick={() => setFilter(k)}>
                {label}
              </button>
            ))}
          </div>
          <label className="sort" title="Ordonează">
            <Icon name="sort" />
            <select aria-label="Ordonează" value={sort} onChange={(e) => setSort(e.target.value)}>
              {Object.entries(SORTS).map(([k, s]) => (
                <option key={k} value={k}>{s.label}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {loading ? (
        <p className="empty">Se încarcă…</p>
      ) : visible.length === 0 ? (
        <div className="empty">
          <span className="empty-emoji" aria-hidden="true">{items.length === 0 ? list.emoji || '📋' : '🔍'}</span>
          <p>{items.length === 0 ? 'Lista e goală.' : 'Nimic nu corespunde.'}</p>
          <p className="hint">{items.length === 0 ? 'Adaugă primul element mai sus.' : 'Încearcă alt filtru sau altă căutare.'}</p>
        </div>
      ) : (
        <>
          <p className="list-count">
            {visible.length === items.length ? `${plural(items.length, kind)} în listă` : `Afișate ${visible.length} din ${items.length}`}
          </p>
          <ol className="item-list">
            {visible.map((b, i) => (
              <ItemRow
                key={b.id}
                item={b}
                number={i + 1}
                kind={kind}
                creators={creators}
                askComment={b.id === promptId}
                onCommentPromptDone={() => setPromptId(null)}
                onToggleDone={toggleDone}
                onUpdate={updateItem}
                onDelete={removeItem}
              />
            ))}
          </ol>
        </>
      )}
    </>
  );
}
