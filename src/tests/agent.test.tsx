import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Agent } from "../pages/Agent";
import { askAgent } from "../services/agent";

vi.mock("../services/agent", () => ({ askAgent: vi.fn() }));
beforeEach(() => {
  vi.mocked(askAgent).mockReset();
});

describe("Assistente", () => {
  it("sends a question once, waits for the response and clears the conversation", async () => {
    let resolve!: (value: string) => void;
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
    );
    expect(
      screen.getByRole("button", { name: "Enviar pergunta" }),
    ).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Preparando");
    resolve("PUE é um indicador de eficiência energética.");
    expect(
      await screen.findByText("PUE é um indicador de eficiência energética."),
    ).toBeInTheDocument();
    expect(askAgent).toHaveBeenCalledOnce();
    await userEvent.click(
      screen.getByRole("button", { name: /Nova conversa/ }),
    );
    expect(screen.getByText("O que vamos descobrir hoje?")).toBeInTheDocument();
    expect(
      screen.queryByText("PUE é um indicador de eficiência energética."),
    ).not.toBeInTheDocument();
  });

  it("retries a failed question without duplicating the user message", async () => {
    vi.mocked(askAgent)
      .mockRejectedValueOnce(new Error("Falha temporária"))
      .mockResolvedValueOnce("Resposta do agente");
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
