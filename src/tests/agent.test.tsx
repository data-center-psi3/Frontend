import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Agent } from "../pages/Agent";
import { askAgent, listConversations, getConversation } from "../services/agent";
import { AgentWidget } from "../components/layout/AgentWidget";

vi.mock("../services/agent", () => ({ askAgent: vi.fn(), listConversations: vi.fn(), getConversation: vi.fn() }));
beforeEach(() => {
  vi.mocked(askAgent).mockReset();
  vi.mocked(listConversations).mockReset().mockResolvedValue([]);
  vi.mocked(getConversation).mockReset();
});

describe("Assistente", () => {
  it("loads a previous session and continues using its conversation id", async () => {
    vi.mocked(listConversations).mockResolvedValue([{ id: "old-session", title: "Consulta anterior", updatedAt: "2026-11-05T12:00:00Z", expired: false }]);
    vi.mocked(getConversation).mockResolvedValue({ id: "old-session", expired: false, messages: [
      { role: "user", content: "Pergunta antiga" }, { role: "assistant", content: "Resposta antiga" },
    ] });
    vi.mocked(askAgent).mockResolvedValue({ response: "Nova resposta", conversationId: "old-session" });
    render(<Agent />);
    await userEvent.click(screen.getByRole("combobox", { name: "Sessões anteriores" }));
    await userEvent.click(await screen.findByRole("option", { name: /Consulta anterior/ }));
    expect(await screen.findByText("Resposta antiga")).toBeInTheDocument();
    await userEvent.type(screen.getByRole("textbox", { name: "Sua pergunta" }), "Continuar");
    await userEvent.click(screen.getByRole("button", { name: "Enviar pergunta" }));
    await screen.findByText("Nova resposta");
    expect(askAgent).toHaveBeenCalledWith("Continuar", expect.any(AbortSignal), "old-session");
    await userEvent.click(screen.getByRole("button", { name: /Nova conversa/ }));
    expect(screen.queryByText("Resposta antiga")).not.toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Sessões anteriores" })).toHaveTextContent("Histórico");
  });

  it("keeps the current conversation when loading another fails", async () => {
    vi.mocked(listConversations).mockResolvedValue([{ id: "old", title: "Antiga", updatedAt: "2026-11-05T12:00:00Z", expired: false }]);
    vi.mocked(getConversation).mockRejectedValue(new Error("Sessão indisponível"));
    render(<Agent />);
    await userEvent.type(screen.getByRole("textbox", { name: "Sua pergunta" }), "Rascunho");
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(await screen.findByRole("option", { name: /Antiga/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Sessão indisponível");
    expect(screen.getByRole("textbox")).toHaveValue("Rascunho");
  });

  it("opens expired sessions for reading without sending to an expired id", async () => {
    vi.mocked(listConversations).mockResolvedValue([{ id: "expired", title: "Encerrada", updatedAt: "2026-10-01T12:00:00Z", expired: true }]);
    vi.mocked(getConversation).mockResolvedValue({ id: "expired", expired: true, messages: [{ role: "assistant", content: "Histórico antigo" }] });
    render(<Agent />);
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(await screen.findByRole("option", { name: /Encerrada/ }));
    await screen.findByText("Histórico antigo");
    expect(screen.getByRole("textbox")).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: /Nova conversa/ }));
    expect(screen.getByRole("textbox")).toBeEnabled();
  });

  it("opens from the fixed button and preserves the draft when closed with Escape", async () => {
    const user = userEvent.setup();
    render(<AgentWidget />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Abrir assistente" }));
    expect(screen.getByRole("dialog")).toBeVisible();
    await user.type(screen.getByRole("textbox", { name: "Sua pergunta" }), "Minha pergunta");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Abrir assistente" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Abrir assistente" }));
    expect(screen.getByRole("textbox", { name: "Sua pergunta" })).toHaveValue("Minha pergunta");
  });

  it("sends a question once, waits for the response and clears the conversation", async () => {
    let resolve!: (value: { response: string; conversationId?: string }) => void;
    vi.mocked(askAgent).mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    render(<Agent />);
    const input = screen.getByRole("textbox", { name: "Sua pergunta" });
    await userEvent.type(input, "O que é PUE?");
    await userEvent.click(
      screen.getByRole("button", { name: "Enviar pergunta" }),
    );
    expect(askAgent).toHaveBeenCalledWith(
      "O que é PUE?",
      expect.any(AbortSignal),
      undefined,
    );
    expect(
      screen.getByRole("button", { name: "Enviar pergunta" }),
    ).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Preparando");
    resolve({ response: "PUE é um indicador de eficiência energética.", conversationId: "conversation-1" });
    expect(
      await screen.findByText("PUE é um indicador de eficiência energética."),
    ).toBeInTheDocument();
    expect(askAgent).toHaveBeenCalledOnce();
    vi.mocked(askAgent).mockResolvedValue({ response: "Continuação", conversationId: "conversation-1" });
    await userEvent.type(input, "E como calcular?");
    await userEvent.click(screen.getByRole("button", { name: "Enviar pergunta" }));
    expect(await screen.findByText("Continuação")).toBeInTheDocument();
    expect(askAgent).toHaveBeenLastCalledWith("E como calcular?", expect.any(AbortSignal), "conversation-1");
    await userEvent.click(
      screen.getByRole("button", { name: /Nova conversa/ }),
    );
    expect(screen.getByText("O que vamos descobrir hoje?")).toBeInTheDocument();
    expect(
      screen.queryByText("PUE é um indicador de eficiência energética."),
    ).not.toBeInTheDocument();
    await userEvent.type(input, "Outra pergunta");
    await userEvent.click(screen.getByRole("button", { name: "Enviar pergunta" }));
    await screen.findByText("Continuação");
    expect(askAgent).toHaveBeenLastCalledWith("Outra pergunta", expect.any(AbortSignal), undefined);
  });

  it("retries a failed question without duplicating the user message", async () => {
    vi.mocked(askAgent)
      .mockRejectedValueOnce(new Error("Falha temporária"))
      .mockResolvedValueOnce({ response: "Resposta do agente", conversationId: undefined });
    render(<Agent />);
    await userEvent.click(
      screen.getByRole("button", { name: "O que significa PUE?" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Falha temporária",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Tentar novamente" }),
    );
    expect(await screen.findByText("Resposta do agente")).toBeInTheDocument();
    expect(screen.getAllByText("O que significa PUE?")).toHaveLength(1);
    await waitFor(() =>
      expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
    );
  });
});
