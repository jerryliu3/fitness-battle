"use client";

import { useEffect, useId, useRef, useState } from "react";

export function SearchableCombobox({ label, placeholder, value, displayValue, optionsFor, onChange, emptyMessage }: {
  label: string;
  placeholder: string;
  value: string;
  displayValue: string;
  optionsFor: (query: string) => readonly { value: string; label: string }[];
  onChange: (value: string) => void;
  emptyMessage: string;
}) {
  const id = useId();
  const listId = `${id}-options`;
  const [query, setQuery] = useState<string | null>(null);
  const [active, setActive] = useState(-1);
  const activeRow = useRef<HTMLLIElement>(null);
  const options = query === null ? [] : optionsFor(query);
  const option = options[active];
  const expanded = options.length > 0;

  useEffect(() => {
    activeRow.current?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function close() {
    setQuery(null);
    setActive(-1);
  }

  function select(next: string) {
    onChange(next);
    close();
  }

  return (
    <div className="fb-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="search"
        role="combobox"
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={expanded}
        aria-activedescendant={option ? `${listId}-${active}` : undefined}
        autoComplete="off"
        placeholder={placeholder}
        value={query ?? displayValue}
        onFocus={event => { setQuery(displayValue); event.currentTarget.select(); }}
        onClick={() => { if (query === null) setQuery(displayValue); }}
        onChange={event => { setQuery(event.currentTarget.value); setActive(-1); }}
        onBlur={close}
        onKeyDown={event => {
          if (event.nativeEvent.isComposing) return;
          if (event.key === "Escape" && query !== null) {
            event.preventDefault();
            event.stopPropagation();
            close();
          } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (query === null) setQuery(displayValue);
            setActive(index => event.key === "ArrowDown"
              ? Math.min(index + 1, Math.max(0, options.length - 1))
              : Math.max(0, index - 1));
          } else if (event.key === "Enter" && option) {
            event.preventDefault();
            select(option.value);
          }
        }}
      />
      <ul id={listId} role="listbox" aria-label={label} className="fb-search-options" hidden={!expanded}>
        {options.map((item, index) => (
          <li key={item.value} id={`${listId}-${index}`} role="option" aria-selected={item.value === value}
            ref={index === active ? activeRow : undefined}
            className={index === active ? "active" : undefined}
            onMouseDown={event => event.preventDefault()}
            onClick={() => select(item.value)}>
            <span>{item.label}</span>
            {item.value === value && <span aria-hidden="true">✓</span>}
          </li>
        ))}
      </ul>
      {query !== null && !expanded && <small role="status">{emptyMessage}</small>}
    </div>
  );
}
