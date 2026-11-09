import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  ArrowUpRight,
  Bot,
  Cpu,
  Droplets,
  Gauge,
  Leaf,
  Loader2,
  Plus,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { askAgent, listConversations, getConversation, type ConversationSummary, type AgentMessage } from "../services/agent";
import { errorMessage } from "../services/http/errors";
import { AgentResponse } from "../components/AgentResponse";
import { AgentSessionSelect } from "../components/AgentSessionSelect";
import "./agent.css";

type Message = AgentMessage;
const suggestions = [
  { text: "O que é um data center?", icon: Cpu },
  { text: "Como funciona a refrigeração?", icon: Droplets },
  { text: "Quais são os impactos ambientais?", icon: Leaf },
  { text: "O que significa PUE?", icon: Gauge },
];

export function Agent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [sessions, setSessions] = useState<ConversationSummary[]>([]);
  const [selectedSession, setSelectedSession] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [loadingSession, setLoadingSession] = useState(false);
  const [expired, setExpired] = useState(false);
  const historyRequest = useRef<AbortController | null>(null);
  const listRequest = useRef<AbortController | null>(null);
  const controller = useRef<AbortController | null>(null);
  const conversationId = useRef<string | undefined>();
  const end = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  async function refreshSessions() {
    listRequest.current?.abort();
    const request = new AbortController();
    listRequest.current = request;
    setHistoryError("");
    try {
      const rows = await listConversations(request.signal);
      if (!request.signal.aborted) setSessions(rows);
    } catch (cause) {
      if (!request.signal.aborted) setHistoryError(`Não foi possível carregar as sessões. ${errorMessage(cause)}`);
    }
  }
  useEffect(() => {
    void refreshSessions();
    return () => {
      controller.current?.abort();
      historyRequest.current?.abort();
      listRequest.current?.abort();
    };
  }, []);

  async function selectSession(id: string) {
    if (!id) { reset(); return; }
    historyRequest.current?.abort();
    const request = new AbortController();
    historyRequest.current = request;
    setLoadingSession(true);
    setHistoryError("");
    try {
      const session = await getConversation(id, request.signal);
      if (request.signal.aborted) return;
      conversationId.current = session.id;
      setSelectedSession(session.id);
      setMessages(session.messages);
      setExpired(session.expired);
      setInput("");
      setError("");
    } catch (cause) {
      if (!request.signal.aborted) setHistoryError(errorMessage(cause));
    } finally {
      if (!request.signal.aborted) setLoadingSession(false);
    }
  }
  useEffect(() => {
    end.current?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  }, [messages, pending, error]);

  async function send(value: string, retry = false) {
    const message = value.trim();
    if (!message || pending || controller.current || loadingSession || expired) return;
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
      const response = await askAgent(message, request.signal, conversationId.current);
      if (!request.signal.aborted) {
        conversationId.current = response.conversationId;
        setSelectedSession(response.conversationId ?? "");
        void refreshSessions();
        setMessages((current) => [
          ...current,
          { role: "assistant", content: response.response, visualizations: response.visualizations },
        ]);
      }
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
    historyRequest.current?.abort();
    setLoadingSession(false);
    setSelectedSession("");
    setExpired(false);
    setHistoryError("");
    controller.current?.abort();
    controller.current = null;
    conversationId.current = undefined;
    setMessages([]);
    setInput("");
    setError("");
    setPending(false);
    textarea.current?.focus();
  }

  return (
    <section className="agent-page" aria-label="Assistente DataTerra">
      <header className="agent-header">
        <div className="agent-header-identity">
          <span className="agent-avatar">
            <Bot size={22} />
          </span>
          <div>
            <h1 className="text-lg font-semibold">Assistente DataTerra</h1>
            <p className="agent-header-subtitle">
              Tecnologia com perspectiva ambiental
            </p>
          </div>
        </div>
        <div className="agent-header-actions">
          <AgentSessionSelect sessions={sessions} value={selectedSession} disabled={pending || loadingSession}
            onChange={(id) => void selectSession(id)} onOpen={() => void refreshSessions()} />
          <Button variant="ghost" size="sm" className="agent-reset" onClick={reset}>
            <Plus size={16} /> Nova conversa
          </Button>
        </div>
      </header>

      {(loadingSession || historyError || expired) && <div className="agent-session-bar">
        {loadingSession && <p role="status">Carregando conversa…</p>}
        {historyError && <p role="alert">{historyError}</p>}
        {expired && <p>Esta sessão foi encerrada. Você pode consultar as mensagens ou iniciar uma nova conversa.</p>}
      </div>}

      <div className="agent-conversation">
        {!messages.length && (
          <div className="agent-welcome">
            <span className="agent-welcome-icon">
              <Sparkles size={30} />
            </span>
            <span className="agent-eyebrow">
              SEU GUIA NO UNIVERSO DOS DATA CENTERS
            </span>
            <h2>O que vamos <br />descobrir hoje?</h2>
            <p>
              Entenda a infraestrutura por trás do digital e sua relação com o
              meio ambiente.
            </p>
            <div className="agent-suggestions">
              {suggestions.map(({ text, icon: Icon }) => (
                <Button
                  key={text}
                  variant="outline"
                  onClick={() => void send(text)}
                >
                  <span className="agent-suggestion-icon" aria-hidden="true"><Icon size={17} /></span>
                  <span>{text}</span>
                  <ArrowUpRight size={16} aria-hidden="true" />
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
              key={`${selectedSession}:${index}`}
              className={`agent-message agent-message-${message.role}`}
            >
              <div>
                <span className="agent-author">
                  {message.role === "assistant" && <Bot size={16} aria-hidden="true" />}
                  {message.role === "assistant" ? "DataTerra" : "Você"}
                </span>
                {message.role === "assistant" ? (
                  <AgentResponse response={message.content} visualizations={message.visualizations} conversationId={selectedSession || undefined} />
                ) : (
                  <p>{message.content}</p>
                )}
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
            disabled={pending || loadingSession || expired}
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
              disabled={!input.trim() || pending || loadingSession || expired}
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
