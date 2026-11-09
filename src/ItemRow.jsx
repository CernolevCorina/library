import { useEffect, useRef, useState } from 'react';
import CreatorInput, { fold } from './CreatorInput.jsx';
import Icon from './Icon.jsx';
import { ScoreBadge, ScoreInput } from './Score.jsx';

export default function ItemRow({
  item,
  number,
  kind,
  creators,
  askComment,
  onCommentPromptDone,
  onToggleDone,
  onUpdate,
  onDelete,
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [writing, setWriting] = useState(false); // textarea de comentariu deschis
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [creator, setCreator] = useState(item.creator || '');
  const [comment, setComment] = useState(item.comment || '');
  const commentRef = useRef(null);
  const itemRef = useRef(null);

  const expanded = open || askComment;
  const showTextarea = writing || askComment;
  const commentDirty = comment.trim() !== (item.comment || '');

  // Când elementul e bifat: deschide detaliile și pune cursorul în comentariu.
  useEffect(() => {
    if (!askComment) return;
    setComment(item.comment || '');
    setEditing(false);
    setConfirmDelete(false);
    setOpen(true);
    requestAnimationFrame(() => {
      itemRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [askComment]);

  function startEdit() {
    setTitle(item.title);
    setCreator(item.creator || '');
    setConfirmDelete(false);
    setEditing(true);
  }

  function saveEdit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    const known = creators.find((c) => fold(c) === fold(creator));
    onUpdate(item.id, { title, creator: known || creator });
    setEditing(false);
  }

  function startWriting() {
    setComment(item.comment || '');
    setWriting(true);
    requestAnimationFrame(() => {
      const el = commentRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
    });
  }

  function closePrompt() {
    onCommentPromptDone();
    setOpen(false);
  }

  function saveComment() {
    if (commentDirty) onUpdate(item.id, { comment });
    setWriting(false);
    if (askComment) closePrompt();
  }

  function cancelComment() {
    setComment(item.comment || '');
    setWriting(false);
    if (askComment) closePrompt();
  }

  function onCommentKey(e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      saveComment();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelComment();
    }
  }

  function toggleOpen() {
    if (expanded) {
      if (askComment) onCommentPromptDone();
      setOpen(false);
    } else {
      setOpen(true);
    }
    setConfirmDelete(false);
    setEditing(false);
    setWriting(false);
  }

  return (
    <li
      ref={itemRef}
      className={`item ${item.done ? 'is-done' : ''} ${askComment ? 'is-prompt' : ''} ${expanded ? 'is-open' : ''}`}
    >
      <div className="item-main">
        <span className="item-number" aria-label={`Nr. ${number}`}>{number}</span>
        <label className="check" title={item.done ? `Marchează ca ne${kind.doneOne}` : `Marchează ca ${kind.doneOne}`}>
          <input type="checkbox" checked={item.done} onChange={(e) => onToggleDone(item.id, e.target.checked)} />
          <span className="box" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="14" height="14"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
          </span>
        </label>

        <button type="button" className="item-info" onClick={toggleOpen} aria-expanded={expanded}>
          <span className="item-title">{item.title}</span>
          {(item.creator || (!expanded && item.comment)) && (
            <span className="item-meta">
              {item.creator && <span className="item-creator">{item.creator}</span>}
              {!expanded && item.comment && (
                <span className="item-comment-preview"><Icon name="comment" size={13} /> {item.comment}</span>
              )}
            </span>
          )}
        </button>
        <ScoreBadge value={item.rating} />
        <button type="button" className={`chevron ${expanded ? 'up' : ''}`} onClick={toggleOpen} tabIndex={-1} aria-hidden="true">
          <Icon name="chevron" size={18} />
        </button>
      </div>

      {expanded && (
        <div className="item-details">
          {editing ? (
            <form className="edit-form" onSubmit={saveEdit}>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titlu *" aria-label="Titlu" required autoFocus />
              <CreatorInput value={creator} onChange={setCreator} options={creators} placeholder={kind.creator} />
              <div className="row">
                <button type="submit" className="primary" disabled={!title.trim()}>Salvează</button>
                <button type="button" className="ghost-btn" onClick={() => setEditing(false)}>Anulează</button>
              </div>
            </form>
          ) : (
            <>
              {askComment && <p className="prompt-msg">🎉 {kind.prompt} Cum a fost?</p>}

              <section className="detail-section">
                <span className="field-label">Nota</span>
                <ScoreInput value={item.rating} onChange={(rating) => onUpdate(item.id, { rating })} />
              </section>

              <section className="detail-section">
                <span className="field-label">Comentariu</span>
                {showTextarea ? (
                  <>
                    <textarea
                      ref={commentRef}
                      rows={3}
                      value={comment}
                      placeholder="Impresii, notițe…"
                      aria-label="Comentariu"
                      autoFocus={askComment}
                      onChange={(e) => setComment(e.target.value)}
                      onKeyDown={onCommentKey}
                    />
                    <div className="row">
                      <button type="button" className="primary" onClick={saveComment} disabled={!askComment && !commentDirty}>
                        {askComment && !commentDirty ? 'Gata' : 'Salvează'}
                      </button>
                      <button type="button" className="ghost-btn" onClick={cancelComment}>{askComment ? 'Mai târziu' : 'Anulează'}</button>
                      <span className="hint kbd-hint">Ctrl+Enter salvează · Esc anulează</span>
                    </div>
                  </>
                ) : item.comment ? (
                  <button type="button" className="comment-text" onClick={startWriting} aria-label={`Comentariu: ${item.comment}. Apasă pentru a edita`}>
                    {item.comment}
                    <Icon name="edit" size={14} className="comment-edit-icon" />
                  </button>
                ) : (
                  <button type="button" className="add-comment" onClick={startWriting}>
                    <Icon name="plus" size={16} /> Adaugă un comentariu
                  </button>
                )}
              </section>

              {!askComment && !writing && (
                <div className="row actions">
                  <button type="button" className="ghost-btn" onClick={startEdit}><Icon name="edit" size={16} /> Editează</button>
                  <span className="spacer" />
                  {confirmDelete ? (
                    <>
                      <span className="confirm-text">Sigur?</span>
                      <button type="button" className="danger" onClick={() => onDelete(item.id)}>Da, șterge</button>
                      <button type="button" className="ghost-btn" onClick={() => setConfirmDelete(false)}>Nu</button>
                    </>
                  ) : (
                    <button type="button" className="ghost-btn danger-text" onClick={() => setConfirmDelete(true)}><Icon name="trash" size={16} /> Șterge</button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </li>
  );
}
