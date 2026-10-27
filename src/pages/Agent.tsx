import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Bot,
  Loader2,
  Plus,
  RotateCcw,
  Sparkles,
  User,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { askAgent } from "../services/agent";
import { errorMessage } from "../services/http/errors";
import "./agent.css";

type Message = { role: "user" | "assistant"; content: string };
const suggestions = [
  "O que é um data center?",
  "Como funciona a refrigeração?",
  "Quais são os impactos ambientais?",
  "O que significa PUE?",
];

export function Agent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    end.current?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  }, [messages, pending, error]);

  async function send(value: string, retry = false) {
    const message = value.trim();
    if (!message || pending || controller.current) return;
    const request = new AbortController();
    controller.current = request;
    if (!retry)
      setMessages((current) => [
        ...current,
        { role: "user", content: message },
      ]);
    setInput("");
    setError("");
    setPending(true);
    try {
      const response = await askAgent(message, request.signal);
      if (!request.signal.aborted)
        setMessages((current) => [
          ...current,
          { role: "assistant", content: response },
        ]);
    } catch (cause) {
      if (!request.signal.aborted) setError(errorMessage(cause));
    } finally {
      if (controller.current === request) {
        controller.current = null;
        setPending(false);
        textarea.current?.focus();
      }
    }
  }

  function reset() {
    controller.current?.abort();
    controller.current = null;
    setMessages([]);
    setInput("");
    setError("");
    setPending(false);
    textarea.current?.focus();
  }

  return (
    <section className="agent-page" aria-label="Assistente DataTerra">
      <header className="agent-header">
        <div className="flex items-center gap-3">
          <span className="agent-avatar">
            <Bot size={22} />
          </span>
          <div>
            <h1 className="text-lg font-semibold">Assistente DataTerra</h1>
            <p className="text-sm text-muted-foreground">
              Uma conversa sobre tecnologia e sustentabilidade.
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={reset}>
          <Plus size={16} /> Nova conversa
        </Button>
      </header>

      <div className="agent-conversation">
        {!messages.length && (
          <div className="agent-welcome">
            <span className="agent-welcome-icon">
              <Sparkles size={30} />
            </span>
            <span className="text-xs font-medium uppercase tracking-widest text-primary">
              Explore. Pergunte. Entenda.
            </span>
            <h2>O que vamos descobrir hoje?</h2>
            <p>
              Entenda a infraestrutura por trás do digital e sua relação com o
              meio ambiente.
            </p>
            <div className="agent-suggestions">
              {suggestions.map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  onClick={() => void send(suggestion)}
                >
                  {suggestion}
                  <ArrowUp size={15} />
                </Button>
              ))}
            </div>
          </div>
        )}
        <div
          role="log"
          aria-label="Mensagens da conversa"
          aria-live="polite"
          aria-relevant="additions"
          className="agent-messages"
        >
          {messages.map((message, index) => (
            <article
              key={index}
              className={`agent-message agent-message-${message.role}`}
            >
              <span className="agent-avatar" aria-hidden="true">
                {message.role === "assistant" ? (
                  <Bot size={18} />
                ) : (
                  <User size={18} />
                )}
              </span>
              <div>
                <span className="agent-author">
                  {message.role === "assistant" ? "DataTerra" : "Você"}
                </span>
                <p>{message.content}</p>
              </div>
            </article>
          ))}
        </div>
        {pending && (
          <div role="status" className="agent-thinking">
            <Loader2 className="animate-spin" size={16} /> Preparando uma
            resposta…
          </div>
        )}
        {error && (
          <div role="alert" className="agent-error">
            <p>{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                void send(messages[messages.length - 1]?.content ?? "", true)
              }
            >
              <RotateCcw size={14} /> Tentar novamente
            </Button>
          </div>
        )}
        <div ref={end} />
      </div>

      <div className="agent-composer-area">
        <form
          className="agent-composer"
          onSubmit={(event) => {
            event.preventDefault();
            void send(input);
          }}
        >
          <label htmlFor="agent-question" className="sr-only">
            Sua pergunta
          </label>
          <textarea
            ref={textarea}
            id="agent-question"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Pergunte sobre data centers…"
            maxLength={8000}
            rows={2}
            disabled={pending}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                void send(input);
              }
            }}
          />
          <div className="agent-composer-footer">
            <span>Enter para enviar · Shift + Enter para nova linha</span>
            <Button
              type="submit"
              disabled={!input.trim() || pending}
              aria-label="Enviar pergunta"
            >
              {pending ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <ArrowUp size={18} />
              )}
            </Button>
          </div>
        </form>
        <p className="agent-disclaimer">
          O assistente pode cometer erros. Confira informações importantes nas
          fontes do projeto.
        </p>
      </div>
    </section>
  );
}
