import { Check, Plus, X } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { normalize } from "../utils/data";

export interface ColumnTerm {
  value: string;
  exact: boolean;
}
export function ColumnValueFilter({
  label,
  terms,
  draft,
  options,
  onDraft,
  onTerms,
  onClose,
}: {
  label: string;
  terms: ColumnTerm[];
  draft: string;
  options: string[];
  onDraft: (value: string) => void;
  onTerms: (terms: ColumnTerm[]) => void;
  onClose: () => void;
}) {
  const add = (value: string, exact: boolean) => {
    const clean = value.trim();
    if (!clean) return;
    if (!terms.some((term) => normalize(term.value) === normalize(clean)))
      onTerms([...terms, { value: clean, exact }]);
    onDraft("");
  };
  const visible = options.filter((value) =>
    normalize(value).includes(normalize(draft.trim())),
  );
  return (
    <div className="column-value-editor">
      <div className="column-filter-chips">
        {terms.map((term, index) => (
          <span
            className="column-filter-chip"
            key={`${term.exact}-${term.value}`}
            title={`${term.exact ? "Igual a" : "Contém"}: ${term.value}`}
          >
            <span>{term.value}</span>
            <Button
              variant="ghost"
              aria-label={`Remover ${term.value} de ${label}`}
              onClick={() => onTerms(terms.filter((_, i) => i !== index))}
            >
              <X size={11} />
            </Button>
          </span>
        ))}
      </div>
      <div className="column-filter-entry">
        <Input
          autoFocus
          aria-label={`Filtrar ${label}`}
          placeholder="Buscar ou digitar..."
          value={draft}
          onChange={(e) => onDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(draft, false);
            }
            if (e.key === "Escape") {
              onClose();
              e.currentTarget.closest("th")?.querySelector("button")?.focus();
            }
            if (e.key === "Backspace" && !draft && terms.length)
              onTerms(terms.slice(0, -1));
          }}
        />
        <Button
          variant="ghost"
          disabled={!draft.trim()}
          aria-label={`Adicionar termo em ${label}`}
          onClick={() => add(draft, false)}
        >
          <Plus size={13} />
        </Button>
        <Button
          variant="ghost"
          aria-label={`Limpar filtro ${label}`}
          onClick={() => {
            onTerms([]);
            onDraft("");
          }}
        >
          <X size={12} />
        </Button>
      </div>
      <p className="column-filter-help">
        Enter adiciona texto · selecione valores abaixo
      </p>
      <div
        className="column-filter-options"
        role="group"
        aria-label={`Valores de ${label}`}
      >
        {visible.slice(0, 100).map((value) => {
          const selected = terms.some(
            (term) => term.exact && normalize(term.value) === normalize(value),
          );
          return (
            <Button
              variant="ghost"
              key={value}
              title={value}
              aria-pressed={selected}
              onClick={() => {
                if (selected)
                  onTerms(
                    terms.filter(
                      (term) =>
                        !(
                          term.exact &&
                          normalize(term.value) === normalize(value)
                        ),
                    ),
                  );
                else add(value, true);
              }}
            >
              <span>{value}</span>
              {selected && <Check size={12} />}
            </Button>
          );
        })}
        {!visible.length && (
          <p>Sem opções. Use Enter para adicionar o texto.</p>
        )}
        {visible.length > 100 && (
          <p>Digite para refinar as {visible.length} opções.</p>
        )}
      </div>
    </div>
  );
}
