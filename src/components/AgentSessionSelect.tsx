import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown, History, MessageSquare, Plus } from "lucide-react";
import type { ConversationSummary } from "../services/agent";

export function AgentSessionSelect({ sessions, value, disabled, onChange, onOpen }: {
  sessions: ConversationSummary[];
  value: string;
  disabled: boolean;
  onChange: (id: string) => void;
  onOpen: () => void;
}) {
  const current = sessions.find((session) => session.id === value);
  return (
    <Select.Root value={value || "new"} onValueChange={(id) => onChange(id === "new" ? "" : id)}
      onOpenChange={(open) => { if (open) onOpen(); }} disabled={disabled}>
      <Select.Trigger className="agent-session-trigger" aria-label="Sessões anteriores" title={current?.title ?? "Histórico de conversas"}>
        <History size={15} aria-hidden="true" />
        <span>Histórico</span>
        <Select.Icon><ChevronDown size={12} /></Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="agent-session-menu" position="popper" align="end" sideOffset={8} collisionPadding={12}
          onEscapeKeyDown={(event) => event.stopPropagation()}>
          <div className="agent-session-menu-heading">Suas conversas <span>{sessions.length}</span></div>
          <Select.Viewport className="agent-session-viewport">
            <Select.Item value="new" className="agent-session-option agent-session-new">
              <Plus size={17} aria-hidden="true" />
              <Select.ItemText>Iniciar nova conversa</Select.ItemText>
              <Select.ItemIndicator><Check size={15} /></Select.ItemIndicator>
            </Select.Item>
            <Select.Separator className="agent-session-separator" />
            {value && !current && <Select.Item value={value} className="agent-session-option">
              <MessageSquare size={16} /><Select.ItemText>Conversa atual</Select.ItemText>
              <Select.ItemIndicator><Check size={15} /></Select.ItemIndicator>
            </Select.Item>}
            {sessions.map((session) => (
              <Select.Item key={session.id} value={session.id} className="agent-session-option" textValue={session.title}>
                <MessageSquare size={16} aria-hidden="true" />
                <span className="agent-session-option-copy">
                  <Select.ItemText>{session.title}</Select.ItemText>
                  <small>{new Date(session.updatedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                    {session.expired && <span className="agent-session-badge">Encerrada</span>}
                  </small>
                </span>
                <Select.ItemIndicator><Check size={15} /></Select.ItemIndicator>
              </Select.Item>
            ))}
            {!sessions.length && <p className="agent-session-empty">Suas conversas salvas aparecerão aqui.</p>}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
