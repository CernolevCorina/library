import { useEffect, useRef, useState } from 'react';
import AuthorInput, { fold } from './AuthorInput.jsx';

export default function BookItem({
  book,
  number,
  authors,
  askComment,
  onCommentPromptDone,
  onToggleRead,
  onUpdate,
  onDelete,
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [title, setTitle] = useState(book.title);
  const [author, setAuthor] = useState(book.author || '');
  const [comment, setComment] = useState(book.comment || '');
  const commentRef = useRef(null);
  const itemRef = useRef(null);

  const commentDirty = comment !== (book.comment || '');
  const expanded = open || askComment;

  // Când cartea e marcată ca citită: deschide detaliile și pune cursorul în comentariu.
  useEffect(() => {
    if (!askComment) return;
    setComment(book.comment || '');
    setEditing(false);
    setConfirmDelete(false);
    setOpen(true);
    requestAnimationFrame(() => {
      itemRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      commentRef.current?.focus({ preventScroll: true });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [askComment]);

  function startEdit() {
    setTitle(book.title);
    setAuthor(book.author || '');
    setEditing(true);
  }

  function saveEdit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    const known = authors.find((a) => fold(a) === fold(author));
    onUpdate(book.id, { title, author: known || author });
    setEditing(false);
  }

  function saveComment() {
    onUpdate(book.id, { comment });
    if (askComment) {
      onCommentPromptDone();
      setOpen(false);
    }
  }

  function skipComment() {
    setComment(book.comment || '');
    onCommentPromptDone();
    setOpen(false);
  }

  function toggleOpen() {
    if (expanded) {
      if (askComment) onCommentPromptDone();
      setOpen(false);
    } else {
      setComment(book.comment || '');
      setOpen(true);
    }
    setConfirmDelete(false);
    setEditing(false);
  }

  return (
    <li ref={itemRef} className={`card book ${book.read ? 'is-read' : ''} ${askComment ? 'is-prompt' : ''}`}>
      <div className="book-main">
        <span className="book-number" aria-label={`Nr. ${number}`}>{number}.</span>
        <label className="check" title={book.read ? 'Marchează ca necitită' : 'Marchează ca citită'}>
          <input
            type="checkbox"
            checked={book.read}
            onChange={(e) => onToggleRead(book.id, e.target.checked)}
          />
          <span className="box" aria-hidden="true" />
        </label>

        <button type="button" className="book-info" onClick={toggleOpen} aria-expanded={expanded}>
          <span className="book-title">{book.title}</span>
          {book.author && <span className="book-author">{book.author}</span>}
          {!expanded && book.comment && <span className="book-comment-preview">💬 {book.comment}</span>}
        </button>
      </div>

      {expanded && (
        <div className="book-details">
          {editing ? (
            <form className="edit-form" onSubmit={saveEdit}>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Denumire *" required />
              <AuthorInput value={author} onChange={setAuthor} authors={authors} />
              <div className="row">
                <button type="submit" className="primary" disabled={!title.trim()}>Salvează</button>
                <button type="button" onClick={() => setEditing(false)}>Anulează</button>
              </div>
            </form>
          ) : (
            <>
              {askComment ? (
                <p className="prompt-msg">🎉 Ai terminat-o! Vrei să lași un comentariu despre ea?</p>
              ) : (
                <label className="comment-label" htmlFor={`c-${book.id}`}>Comentariu</label>
              )}
              <textarea
                ref={commentRef}
                id={`c-${book.id}`}
                rows={3}
                value={comment}
                placeholder="Impresii, citate, notițe…"
                onChange={(e) => setComment(e.target.value)}
              />
              <div className="row">
                <button type="button" className="primary" disabled={!commentDirty} onClick={saveComment}>
                  Salvează comentariul
                </button>
                {askComment ? (
                  <button type="button" onClick={skipComment}>Mai târziu</button>
                ) : (
                  <>
                    <button type="button" onClick={startEdit}>Editează</button>
                    {confirmDelete ? (
                      <>
                        <button type="button" className="danger" onClick={() => onDelete(book.id)}>Da, șterge</button>
                        <button type="button" onClick={() => setConfirmDelete(false)}>Nu</button>
                      </>
                    ) : (
                      <button type="button" className="danger-outline" onClick={() => setConfirmDelete(true)}>Șterge</button>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </li>
  );
}
