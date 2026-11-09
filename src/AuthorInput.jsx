import { useId, useMemo, useRef, useState } from 'react';

// Compară fără diacritice și fără diferență între litere mari/mici: „ș” = „s”, „Ă” = „a”.
export const fold = (s) =>
  (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('ro').trim();

/**
 * Câmp de autor de tip „select sau creează”:
 * arată autorii existenți care se potrivesc cu ce scrii; dacă nu există, îl adaugi pe cel scris.
 */
export default function AuthorInput({ value, onChange, authors, placeholder = 'Autor' }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef(null);
  const listId = useId();

  const typed = value.trim();
  const exact = authors.find((a) => fold(a) === fold(typed));

  const options = useMemo(() => {
    const q = fold(value);
    const matches = authors.filter((a) => !q || fold(a).includes(q)).slice(0, 8);
    const items = matches.map((a) => ({ label: a, value: a }));
    if (typed && !exact) items.push({ label: `Adaugă autor nou: „${typed}”`, value: typed, isNew: true });
    return items;
  }, [authors, value, typed, exact]);

  function pick(option) {
    onChange(option.value);
    setOpen(false);
    setActive(-1);
  }

  function onKeyDown(e) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true);
      return;
    }
    if (!open || options.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % options.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i <= 0 ? options.length - 1 : i - 1));
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault(); // alege opțiunea în loc să trimită formularul
      pick(options[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  // Dacă ai scris un autor care există deja (cu altă scriere), folosește forma existentă.
  function onBlur() {
    setOpen(false);
    setActive(-1);
    if (exact && exact !== value) onChange(exact);
    else if (value !== typed) onChange(typed);
  }

  const showList = open && options.length > 0;

  return (
    <div className="combo">
      <input
        ref={inputRef}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
      />
      {value && (
        <button
          type="button"
          className="combo-clear"
          aria-label="Șterge autorul"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => { onChange(''); inputRef.current?.focus(); }}
        >
          ×
        </button>
      )}
      {showList && (
        <ul className="combo-list" id={listId} role="listbox">
          {options.map((o, i) => (
            <li
              key={o.isNew ? '__new' : o.value}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={`${i === active ? 'active' : ''} ${o.isNew ? 'is-new' : ''}`}
              // mousedown, ca alegerea să se facă înainte de blur
              onMouseDown={(e) => { e.preventDefault(); pick(o); }}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
