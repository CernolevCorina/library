import { useState } from 'react';

export default function BookItem({ book, onUpdate, onDelete }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [title, setTitle] = useState(book.title);
  const [author, setAuthor] = useState(book.author || '');
  const [comment, setComment] = useState(book.comment || '');

  const commentDirty = comment !== (book.comment || '');

  function startEdit() {
    setTitle(book.title);
    setAuthor(book.author || '');
    setEditing(true);
  }

  function saveEdit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    onUpdate(book.id, { title, author });
    setEditing(false);
  }

  function toggleOpen() {
    if (!open) setComment(book.comment || '');
    setOpen(!open);
    setConfirmDelete(false);
  }

  return (
    <li className={`card book ${book.read ? 'is-read' : ''}`}>
      <div className="book-main">
        <label className="check" title={book.read ? 'Marchează ca necitită' : 'Marchează ca citită'}>
          <input
            type="checkbox"
            checked={book.read}
            onChange={(e) => onUpdate(book.id, { read: e.target.checked })}
          />
          <span className="box" aria-hidden="true" />
        </label>

        <button type="button" className="book-info" onClick={toggleOpen} aria-expanded={open}>
          <span className="book-title">{book.title}</span>
          {book.author && <span className="book-author">{book.author}</span>}
          {!open && book.comment && <span className="book-comment-preview">💬 {book.comment}</span>}
        </button>
      </div>

      {open && (
        <div className="book-details">
          {editing ? (
            <form className="edit-form" onSubmit={saveEdit}>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Denumire *" required />
              <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Autor" />
              <div className="row">
                <button type="submit" className="primary" disabled={!title.trim()}>Salvează</button>
                <button type="button" onClick={() => setEditing(false)}>Anulează</button>
              </div>
            </form>
          ) : (
            <>
              <label className="comment-label" htmlFor={`c-${book.id}`}>Comentariu</label>
              <textarea
                id={`c-${book.id}`}
                rows={3}
                value={comment}
                placeholder="Impresii, citate, notițe…"
                onChange={(e) => setComment(e.target.value)}
              />
              <div className="row">
                <button
                  type="button"
                  className="primary"
                  disabled={!commentDirty}
                  onClick={() => onUpdate(book.id, { comment })}
                >
                  Salvează comentariul
                </button>
                <button type="button" onClick={startEdit}>Editează</button>
                {confirmDelete ? (
                  <>
                    <button type="button" className="danger" onClick={() => onDelete(book.id)}>Da, șterge</button>
                    <button type="button" onClick={() => setConfirmDelete(false)}>Nu</button>
                  </>
                ) : (
                  <button type="button" className="danger-outline" onClick={() => setConfirmDelete(true)}>Șterge</button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </li>
  );
}
