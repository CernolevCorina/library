import { useState } from 'react';
import * as api from './api.js';

export default function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const isRegister = mode === 'register';

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (isRegister && password !== password2) {
      setError('Parolele nu coincid.');
      return;
    }
    setBusy(true);
    try {
      const user = isRegister ? await api.register(username, password) : await api.login(username, password);
      onAuth(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function switchMode(next) {
    setMode(next);
    setError('');
    setPassword('');
    setPassword2('');
  }

  return (
    <div className="app">
      <form className="card auth" onSubmit={submit}>
        <h1>Biblioteca mea</h1>

        <div className="segmented" role="tablist">
          <button type="button" role="tab" aria-selected={!isRegister} className={!isRegister ? 'active' : ''} onClick={() => switchMode('login')}>
            Logare
          </button>
          <button type="button" role="tab" aria-selected={isRegister} className={isRegister ? 'active' : ''} onClick={() => switchMode('register')}>
            Înregistrare
          </button>
        </div>

        <label>
          <span>Nume de utilizator</span>
          <input
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </label>
        <label>
          <span>Parolă</span>
          <input
            type="password"
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {isRegister && (
          <label>
            <span>Repetă parola</span>
            <input
              type="password"
              autoComplete="new-password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              required
            />
          </label>
        )}

        {error && <div className="error" role="alert">{error}</div>}

        <button type="submit" className="primary" disabled={busy || !username || !password}>
          {busy ? 'Se trimite…' : isRegister ? 'Creează cont' : 'Intră'}
        </button>
        {isRegister && <p className="hint">Minim 3 caractere pentru nume și 6 pentru parolă.</p>}
      </form>
    </div>
  );
}
