import { useRef, useState } from "react";
import { Bot, X } from "lucide-react";
import { Agent } from "../../pages/Agent";
import "./agent-widget.css";

export function AgentWidget() {
  const [open, setOpen] = useState(false);
  const [started, setStarted] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);

  function close() {
    setOpen(false);
    trigger.current?.focus();
  }

  return (
    <aside className="agent-widget" aria-label="Assistente virtual">
      {started && (
        <div
          id="agent-widget-panel"
          className="agent-widget-panel"
          role="dialog"
          aria-label="Assistente DataTerra"
          hidden={!open}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              close();
            }
          }}
        >
          <button
            type="button"
            className="agent-widget-close"
            aria-label="Fechar assistente"
            onClick={close}
            autoFocus
          >
            <X size={20} />
          </button>
          <Agent />
        </div>
      )}
      <button
        ref={trigger}
        type="button"
        className="agent-widget-trigger"
        aria-label={open ? "Fechar assistente" : "Abrir assistente"}
        aria-expanded={open}
        aria-controls={started ? "agent-widget-panel" : undefined}
        aria-haspopup="dialog"
        onClick={() => {
          setStarted(true);
          setOpen((value) => !value);
        }}
      >
        {open ? <X size={26} /> : <Bot size={28} />}
      </button>
    </aside>
  );
}
