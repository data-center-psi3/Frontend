import { it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DataCentersTable } from "../components/DataCentersTable";
import { importedCentersQueryKey } from "../queries/imports";
import { importColumns } from "../types/imports";

it("combines column filters, searches displayed missing values and keeps headers available for empty results", async () => {
  const user = userEvent.setup();
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity } },
  });
  const blank = Object.fromEntries(
    Object.values(importColumns).map((key) => [key, null]),
  );
  client.setQueryData(
    importedCentersQueryKey({ baseUrl: "/api", username: "", password: "" }),
    [
      {
        ...blank,
        idOriginal: "1",
        unidade: "Unidade A",
        endereco: "Rua São José",
        uf: "SP",
        carriers: "__",
      },
      {
        ...blank,
        idOriginal: "2",
        unidade: "Unidade B",
        endereco: "Rua São José",
        uf: "RJ",
        carriers: "Operadora",
      },
      {
        ...blank,
        idOriginal: "3",
        unidade: "Unidade C",
        endereco: "Outra rua",
        uf: "SP",
        carriers: "Operadora",
      },
    ],
  );
  render(
    <QueryClientProvider client={client}>
      <DataCentersTable
        connection={{ baseUrl: "/api", username: "", password: "" }}
      />
    </QueryClientProvider>,
  );
  expect(
    screen.getByRole("textbox", { name: "Pesquisar dados da tabela" }),
  ).toBeInTheDocument();
  await user.click(
    screen.getByRole("button", { name: "Filtrar coluna endereco" }),
  );
  await user.type(
    screen.getByRole("textbox", { name: "Filtrar endereco" }),
    "sao jose",
  );
  expect(screen.getByRole("status")).toHaveTextContent("2 de 3 registros");
  await user.click(screen.getByRole("button", { name: "Filtrar coluna uf" }));
  await user.type(screen.getByRole("textbox", { name: "Filtrar uf" }), "sp");
  expect(screen.getByRole("status")).toHaveTextContent("1 de 3 registros");
  expect(screen.getByText("Unidade A")).toBeInTheDocument();
  await user.click(
    screen.getByRole("button", { name: "Filtrar coluna carriers" }),
  );
  await user.type(
    screen.getByRole("textbox", { name: "Filtrar carriers" }),
    "nao informado",
  );
  expect(screen.getByRole("status")).toHaveTextContent("1 de 3 registros");
  await user.type(
    screen.getByRole("textbox", { name: "Filtrar carriers" }),
    " inexistente",
  );
  expect(screen.getByRole("status")).toHaveTextContent("0 de 3 registros");
  expect(
    screen.getByRole("textbox", { name: "Filtrar carriers" }),
  ).toBeInTheDocument();
  await user.click(
    screen.getByRole("button", { name: "Limpar filtro carriers" }),
  );
  expect(screen.getByRole("status")).toHaveTextContent("1 de 3 registros");
  await user.click(screen.getByRole("button", { name: "Limpar filtros (2)" }));
  expect(screen.getByRole("status")).toHaveTextContent("3 de 3 registros");
  const search = screen.getByRole("textbox", {
    name: "Pesquisar dados da tabela",
  });
  await user.type(search, "sao jose");
  expect(screen.getByRole("status")).toHaveTextContent("2 de 3 registros");
  expect(document.querySelectorAll("mark")).toHaveLength(2);
  expect(document.querySelector("mark")).toHaveTextContent("São José");
  await user.click(screen.getByRole("button", { name: "Filtrar coluna uf" }));
  await user.type(screen.getByRole("textbox", { name: "Filtrar uf" }), "sp");
  expect(screen.getByRole("status")).toHaveTextContent("1 de 3 registros");
  expect(document.querySelectorAll("mark")).toHaveLength(2);
  await user.click(screen.getByRole("button", { name: "Limpar filtros (2)" }));
  expect(search).toHaveValue("");
  expect(document.querySelectorAll("mark")).toHaveLength(0);
  expect(screen.getByRole("status")).toHaveTextContent("3 de 3 registros");
  const ufOptions = within(
    screen.getByRole("group", { name: "Valores de uf" }),
  );
  await user.click(ufOptions.getByRole("button", { name: "SP" }));
  expect(screen.getByRole("status")).toHaveTextContent("2 de 3 registros");
  await user.click(ufOptions.getByRole("button", { name: "RJ" }));
  expect(screen.getByRole("status")).toHaveTextContent("3 de 3 registros");
  expect(
    screen.getByRole("button", { name: "Remover RJ de uf" }),
  ).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Remover RJ de uf" }));
  expect(screen.getByRole("status")).toHaveTextContent("2 de 3 registros");
  await user.click(
    screen.getByRole("button", { name: "Filtrar coluna endereco" }),
  );
  const addressInput = screen.getByRole("textbox", {
    name: "Filtrar endereco",
  });
  await user.type(addressInput, "sao{Enter}");
  expect(
    screen.getByRole("button", { name: "Remover sao de endereco" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("1 de 3 registros");
  await user.type(addressInput, "Outra{Enter}");
  expect(screen.getByRole("status")).toHaveTextContent("2 de 3 registros");
  await user.type(addressInput, "SAO{Enter}");
  expect(
    screen.getAllByRole("button", { name: "Remover sao de endereco" }),
  ).toHaveLength(1);
  await user.click(screen.getByRole("button", { name: "Limpar filtros (2)" }));
  expect(screen.getByRole("status")).toHaveTextContent("3 de 3 registros");
});
