import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AgentResponse } from "../components/AgentResponse";
import { formatAgentResponse } from "../utils/formatAgentResponse";

describe("Agent response formatting", () => {
  it("converts text bars using numeric values and preserves the source note", () => {
    const response = "Distribuição:\n` ``text\nSP | █████ (112)\nRJ | ██ (34)\nAL |  (1) `` `\n\n*(Registros da DataTerra).*";
    expect(formatAgentResponse(response)).toEqual([
      { type: "paragraph", text: "Distribuição:" },
      { type: "chart", data: [{ name: "SP", value: 112 }, { name: "RJ", value: 34 }, { name: "AL", value: 1 }] },
      { type: "paragraph", text: "*(Registros da DataTerra).*" },
    ]);
    render(<AgentResponse response={response} />);
    expect(screen.getByRole("img", { name: /SP: 112; RJ: 34; AL: 1/ })).toBeInTheDocument();
    expect(screen.getByText("(Registros da DataTerra).")).toBeInTheDocument();
    expect(screen.queryByText(/█/)).not.toBeInTheDocument();
  });

  it("handles standard code fences and retains isolated text bar rows as text", () => {
    expect(formatAgentResponse("```text\nSP | █ (112)\nRJ | (34)\n```\nNota.")).toEqual([
      { type: "chart", data: [{ name: "SP", value: 112 }, { name: "RJ", value: 34 }] },
      { type: "paragraph", text: "Nota." },
    ]);
    expect(formatAgentResponse("SP | █ (112)")).toEqual([{ type: "paragraph", text: "SP | █ (112)" }]);
  });

  it("renders Markdown tables with formatted cells and column alignment", () => {
    render(<AgentResponse response={"Por estado:\n\n| Estado (UF) | Quantidade |\n| :--- | ---: |\n| **SP** (São Paulo) | 112 |\n| RJ (Rio de Janeiro) | 34 |\n\nTotal cadastrado."} />);
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getAllByRole("columnheader")).toHaveLength(2);
    expect(screen.getAllByRole("row")).toHaveLength(3);
    expect(screen.getByRole("cell", { name: "112" })).toHaveStyle({ textAlign: "right" });
    expect(screen.getByRole("cell", { name: "SP (São Paulo)" }).querySelector("strong")).toHaveTextContent("SP");
    expect(screen.getByText("Total cadastrado.")).toBeInTheDocument();
  });

  it("handles optional outer pipes and escaped pipes without treating ordinary text as a table", () => {
    expect(formatAgentResponse("Nome | Valor\n--- | :---:\nA\\|B | 2")).toEqual([
      { type: "table", headers: ["Nome", "Valor"], alignments: ["left", "center"], rows: [["A|B", "2"]] },
    ]);
    expect(formatAgentResponse("Texto | outro\nSem separador")).toEqual([
      { type: "paragraph", text: "Texto | outro\nSem separador" },
    ]);
  });

  it("formats nested emphasis and italic terms from the agent response", () => {
    const { container } = render(<AgentResponse response={"Métricas como o **PUE (*Power Usage Effectiveness*)** medem eficiência.\n\nConsumo de água (*Water Usage Effectiveness* — WUE), __destaque__, _itálico_ e ***ambos***."} />);
    expect(container.querySelector("strong")).toHaveTextContent("PUE (Power Usage Effectiveness)");
    expect(container.querySelector("strong em")).toHaveTextContent("Power Usage Effectiveness");
    expect(container.querySelectorAll("em")).toHaveLength(4);
    expect(container.textContent).not.toMatch(/\*|__/);
    expect(container.textContent).toContain("Water Usage Effectiveness — WUE");
  });

  it("organizes database records while preserving values and the final note", () => {
    const blocks = formatAgentResponse("Registros:\r\n\r\n- Unidade RJ\r\nmunicipio: Rio de Janeiro\r\npotencia_campus_mw: 13\r\n.\r\n\r\nNão é um censo.");
    expect(blocks).toEqual([
      { type: "paragraph", text: "Registros:" },
      { type: "record", title: "Unidade RJ", fields: [
        { label: "Município", value: "Rio de Janeiro" },
        { label: "Potência do campus (MW)", value: "13" },
      ] },
      { type: "paragraph", text: "Não é um censo." },
    ]);
  });

  it("renders emphasis and safe links while keeping HTML and unsafe links as text", () => {
    const { container } = render(<AgentResponse response={'## Fontes\n\n**Eficiência**\n\n- [Fonte](https://example.com)\n- [Inválido](javascript:alert(1))\n\n<img src=x onerror=alert(1)>'} />);
    expect(screen.getByRole("heading", { name: "Fontes" })).toBeInTheDocument();
    expect(container.querySelector("strong")).toHaveTextContent("Eficiência");
    expect(screen.getByRole("link", { name: "Fonte" })).toHaveAttribute("href", "https://example.com");
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("<img src=x onerror=alert(1)>")).toBeInTheDocument();
  });
});
