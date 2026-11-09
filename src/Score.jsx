import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';

export const formatScore = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

// Nuanța culorii: 1 = roșu, 10 = verde.
const hue = (v) => Math.round(((v - 1) / 9) * 130);

/** Nota afișată ca badge colorat (nimic dacă nu există notă). */
export function ScoreBadge({ value, size = 'md' }) {
  if (!value) return null;
  return (
    <span className={`score-badge score-${size}`} style={{ '--h': hue(value) }} aria-label={`Nota ${formatScore(value)} din 10`}>
      {formatScore(value)}
    </span>
  );
}

const clamp = (v) => Math.min(10, Math.max(1, Math.round(v * 2) / 2));

/**
 * Notă 1–10 cu pas de 0.5: slider + butoane ±0.5.
 * Salvează după o scurtă pauză, ca tragerea slider-ului să nu trimită zeci de cereri.
 */
export function ScoreInput({ value, onChange }) {
  const [draft, setDraft] = useState(value || null);
  const timer = useRef(null);
  const pending = useRef(null);

  useEffect(() => {
    if (pending.current === null) setDraft(value || null);
  }, [value]);

  // La închiderea panoului, trimite nota încă nesalvată.
  useEffect(() => () => {
    clearTimeout(timer.current);
    if (pending.current !== null) onChange(pending.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function set(v, delay = 450) {
    const next = v === null ? null : clamp(v);
    setDraft(next);
    pending.current = next ?? 0;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      onChange(pending.current);
      pending.current = null;
    }, delay);
  }

  const shown = draft ?? 5;

  return (
    <div className={`score-input ${draft ? '' : 'is-empty'}`} style={{ '--h': hue(shown) }}>
      <div className="score-display">
        <span className="score-value">{draft ? formatScore(draft) : '–'}</span>
        <span className="score-max">/10</span>
        {draft && (
          <button type="button" className="ghost-btn small" onClick={() => set(null, 0)}>
            <Icon name="x" size={14} /> Fără notă
          </button>
        )}
      </div>
      <div className="score-controls">
        <button type="button" className="step-btn" aria-label="Scade cu 0.5" onClick={() => set((draft ?? 5.5) - 0.5)} disabled={draft === 1}>
          <Icon name="minus" />
        </button>
        <input
          type="range"
          min="1"
          max="10"
          step="0.5"
          value={shown}
          aria-label="Nota"
          aria-valuetext={draft ? `${formatScore(draft)} din 10` : 'Fără notă'}
          style={{ '--p': `${((shown - 1) / 9) * 100}%` }}
          onChange={(e) => set(Number(e.target.value))}
          onPointerUp={(e) => !draft && set(Number(e.target.value))}
        />
        <button type="button" className="step-btn" aria-label="Crește cu 0.5" onClick={() => set((draft ?? 4.5) + 0.5)} disabled={draft === 10}>
          <Icon name="plus" />
        </button>
      </div>
      <div className="score-ticks" aria-hidden="true">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <button key={n} type="button" tabIndex={-1} onClick={() => set(n, 0)} className={draft === n ? 'on' : ''}>{n}</button>
        ))}
      </div>
    </div>
  );
}
