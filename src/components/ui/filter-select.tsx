import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, Search } from "lucide-react";
import { Input } from "./input";
import { Button } from "./button";
import { normalize, displayValue } from "../../utils/data";
export interface FilterSelectProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  allowEmpty?: boolean;
}
export function FilterSelect({
  label,
  value,
  onChange,
  options,
  placeholder = "Todos",
  allowEmpty = true,
}: FilterSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownId = useId();
  const [position, setPosition] = useState({
    top: 0,
    left: 0,
    width: 240,
    maxHeight: 360,
  });
  useEffect(() => {
    if (!open) return;
    const reposition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const below = window.innerHeight - rect.bottom - 14;
      const above = rect.top - 14;
      const height = Math.min(360, Math.max(below, above));
      const width = Math.min(Math.max(rect.width, 240), window.innerWidth - 16);
      setPosition({
        top:
          below >= Math.min(360, above)
            ? rect.bottom + 6
            : Math.max(8, rect.top - height - 6),
        left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
        width,
        maxHeight: height,
      });
    };
    const dismiss = (event: PointerEvent) => {
      if (
        !triggerRef.current?.contains(event.target as Node) &&
        !dropdownRef.current?.contains(event.target as Node)
      )
        setOpen(false);
    };
    reposition();
    document.addEventListener("pointerdown", dismiss);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open]);
  const filtered = options.filter((o) =>
    normalize(displayValue(o.label)).includes(normalize(search)),
  );
  const selected = options.find((o) => o.value === value);
  const choose = (v: string) => {
    onChange(v);
    setOpen(false);
    setSearch("");
    triggerRef.current?.focus();
  };
  return (
    <div className={`filter-field ${value ? "has-value" : ""}`}>
      <span>{label}</span>
      {options.length > 12 ? (
        <>
          <button
            ref={triggerRef}
            type="button"
            className="select-trigger"
            aria-label={label}
            aria-controls={open ? dropdownId : undefined}
            aria-haspopup="true"
            aria-expanded={open}
            onClick={() => {
              setSearch("");
              setOpen((current) => !current);
            }}
          >
            <span>{selected ? displayValue(selected.label) : placeholder}</span>
            <ChevronDown size={15} />
          </button>
          {open &&
            createPortal(
              <div
                ref={dropdownRef}
                id={dropdownId}
                className="searchable-select searchable-dropdown"
                style={position}
                aria-label={`Selecionar ${label.toLowerCase()}`}
                onBlur={(event) => {
                  if (
                    !event.currentTarget.contains(event.relatedTarget as Node)
                  )
                    setOpen(false);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    setOpen(false);
                    triggerRef.current?.focus();
                  }
                  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                    event.preventDefault();
                    const items = Array.from(
                      event.currentTarget.querySelectorAll<HTMLElement>(
                        "input, button",
                      ),
                    );
                    const index = items.indexOf(
                      document.activeElement as HTMLElement,
                    );
                    items[
                      (index +
                        (event.key === "ArrowDown" ? 1 : -1) +
                        items.length) %
                        items.length
                    ]?.focus();
                  }
                }}
              >
                <div className="filter-search">
                  <Search size={16} />
                  <Input
                    autoFocus
                    aria-label={`Pesquisar ${label.toLowerCase()}`}
                    placeholder="Digite para pesquisar..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="searchable-options">
                  {allowEmpty && (
                    <>
                      <Button
                        variant="ghost"
                        className="searchable-option"
                        onClick={() => choose("")}
                      >
                        {placeholder}
                        {!value && <Check size={16} />}
                      </Button>
                    </>
                  )}
                  {filtered.map((o) => (
                    <Button
                      variant="ghost"
                      className={`searchable-option ${o.value === value ? "selected" : ""}`}
                      key={o.value}
                      onClick={() => choose(o.value)}
                    >
                      <span>{displayValue(o.label)}</span>
                      {o.value === value && <Check size={16} />}
                    </Button>
                  ))}
                  {!filtered.length && (
                    <p className="search-no-results">
                      Nenhum resultado para esta pesquisa.
                    </p>
                  )}
                </div>
                <span className="select-result-count">
                  {filtered.length} opções disponíveis
                </span>
              </div>,
              document.body,
            )}
        </>
      ) : (
        <SelectPrimitive.Root
          value={value || (allowEmpty ? "__all" : undefined)}
          onValueChange={(v) => onChange(allowEmpty && v === "__all" ? "" : v)}
        >
          <SelectPrimitive.Trigger
            className="select-trigger"
            aria-label={label}
          >
            <SelectPrimitive.Value />
            <ChevronDown size={15} />
          </SelectPrimitive.Trigger>
          <SelectPrimitive.Portal>
            <SelectPrimitive.Content
              className="select-content"
              position="popper"
              sideOffset={6}
            >
              <SelectPrimitive.Viewport>
                {allowEmpty && (
                  <>
                    <SelectPrimitive.Item className="select-item" value="__all">
                      <SelectPrimitive.ItemText>
                        {placeholder}
                      </SelectPrimitive.ItemText>
                      <SelectPrimitive.ItemIndicator>
                        <Check size={14} />
                      </SelectPrimitive.ItemIndicator>
                    </SelectPrimitive.Item>
                  </>
                )}
                {options.map((o) => (
                  <SelectPrimitive.Item
                    className="select-item"
                    key={o.value}
                    value={o.value}
                  >
                    <SelectPrimitive.ItemText>
                      {displayValue(o.label)}
                    </SelectPrimitive.ItemText>
                    <SelectPrimitive.ItemIndicator>
                      <Check size={14} />
                    </SelectPrimitive.ItemIndicator>
                  </SelectPrimitive.Item>
                ))}
              </SelectPrimitive.Viewport>
            </SelectPrimitive.Content>
          </SelectPrimitive.Portal>
        </SelectPrimitive.Root>
      )}
    </div>
  );
}
