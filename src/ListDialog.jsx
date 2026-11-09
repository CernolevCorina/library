import { useEffect, useRef, useState } from 'react';
import { KINDS } from './kinds.js';

/** Fereastră pentru crearea sau editarea unei liste. `list` lipsă = listă nouă. */
export default function ListDialog({ list, canDelete, onSave, onDelete, onClose }) {
  const ref = useRef(null);
  const isNew = !list;
  const [kind, setKind] = useState(list?.kind || 'other');
  const [name, setName] = useState(list?.name || '');
  const [emoji, setEmoji] = useState(list?.emoji || (isNew ? KINDS.other.emoji : ''));
  const [creatorLabel, setCreatorLabel] = useState(list?.creatorLabel || '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  // La alegerea tipului, completează numele / emoji dacă nu au fost schimbate de mână.
  function pickKind(k) {
    const prev = KINDS[kind];
    if (k !== 'other' && (!name.trim() || name === prev.label)) setName(KINDS[k].label);
    else if (k === 'other' && name === prev.label) setName('');
    if (!emoji || emoji === prev.emoji) setEmoji(KINDS[k].emoji);
    setKind(k);
  }

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await onSave({ name, emoji, kind, creatorLabel });
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog ref={ref} className="dialog" onClose={onClose} onCancel={onClose}>
      <form className="dialog-body" onSubmit={submit}>
        <h2>{isNew ? 'Listă nouă' : 'Setările listei'}</h2>

        <fieldset className="kind-picker">
          <legend>Tip</legend>
          {Object.entries(KINDS).map(([k, v]) => (
            <button key={k} type="button" className={`chip ${kind === k ? 'active' : ''}`} onClick={() => pickKind(k)} aria-pressed={kind === k}>
              {v.emoji} {v.label}
            </button>
          ))}
        </fieldset>

        <div className="name-row">
          <label className="emoji-field">
            <span>Icon</span>
            <input value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={8} placeholder="🙂" />
          </label>
          <label>
            <span>Nume *</span>
            <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} autoFocus placeholder="ex. Energizante, Seriale, Restaurante" />
          </label>
        </div>

        <label>
          <span>Cum se numește al doilea câmp (opțional)</span>
          <input
            value={creatorLabel}
            onChange={(e) => setCreatorLabel(e.target.value)}
            maxLength={40}
            placeholder={KINDS[kind].creator}
          />
        </label>
        <p className="hint">
          Ex.: „{KINDS[kind].creator}”. Elementele bifate apar ca „{KINDS[kind].done.toLowerCase()}”.
        </p>

        <div className="row dialog-actions">
          {!isNew && canDelete && (
            confirmDelete ? (
              <>
                <button type="button" className="danger" onClick={onDelete}>Șterge lista și tot din ea</button>
                <button type="button" onClick={() => setConfirmDelete(false)}>Nu</button>
              </>
            ) : (
              <button type="button" className="danger-outline" onClick={() => setConfirmDelete(true)}>Șterge lista</button>
            )
          )}
          <span className="spacer" />
          <button type="button" onClick={onClose}>Anulează</button>
          <button type="submit" className="primary" disabled={busy || !name.trim()}>{isNew ? 'Creează' : 'Salvează'}</button>
        </div>
      </form>
    </dialog>
  );
}
