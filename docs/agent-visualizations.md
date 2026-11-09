# Visualizações dinâmicas do DataTerra AI

## Biblioteca e arquitetura

O motor reaproveita Recharts, já utilizado no dashboard. Não associa operações de banco a componentes: interpreta exclusivamente os campos declarados na especificação. `DynamicChart` é carregado sob demanda.

Fluxo: `services/agent.ts` → adaptador/validação em `utils/agentVisualization.ts` → `VisualizationRenderer` → `DynamicChart` ou `DynamicTable`.

Arquivos adicionados:

- `src/types/agentVisualization.ts`: contrato interno tipado.
- `src/utils/agentVisualization.ts`: validação, aliases, formatação, CSV e downloads.
- `src/components/ai/visualizations/VisualizationRenderer.tsx`: cartão, toolbar, expansão acessível, estados, error boundary e recuperação de páginas.
- `src/components/ai/visualizations/DynamicChart.tsx`: gráficos genéricos, séries, pesquisa, ordenação e rolagem.
- `src/components/ai/visualizations/DynamicTable.tsx`: colunas dinâmicas, busca, ordenação e paginação local.
- `src/components/ai/visualizations/visualizations.css`: temas e responsividade.
- `src/tests/agent-visualizations.test.tsx`, `src/tests/agent-visualization-api.test.ts`: testes de renderização e contrato.
- `e2e/agent-visualizations.mjs`: verificação desktop/celular com fixtures apenas no teste.

Arquivos integrados: `src/services/agent.ts`, `src/pages/Agent.tsx` e `src/components/AgentResponse.tsx`. Os gráficos e tabelas Markdown anteriores continuam funcionando. Uma representação textual equivalente é ocultada quando os mesmos dados estruturados estão presentes; texto explicativo e notas são preservados.

## Contrato inspecionado

Referência: `real/Backend/brasil/src/main/java/data_centers/brasil/agent/visualization/AgentVisualizationService.java`, DTO `AgentChatResponse` e `AgentDatasetController`.

```json
{
  "response": "Texto explicativo",
  "conversationId": "uuid",
  "visualization": {
    "schemaVersion": "1.0",
    "type": "chart",
    "chartType": "horizontalBar",
    "title": "Título da consulta",
    "description": "Descrição",
    "datasetId": "uuid-do-dataset",
    "columns": [
      { "field": "nome", "title": "Nome", "type": "nominal" },
      { "field": "valor", "title": "Valor", "type": "quantitative" }
    ],
    "encoding": {
      "x": { "field": "nome", "title": "Nome", "type": "nominal" },
      "y": { "field": "valor", "title": "Valor", "type": "quantitative", "format": "integer", "unit": "instalações" }
    },
    "legend": { "visible": false },
    "data": [{ "nome": "Categoria A", "valor": 12 }],
    "metadata": {
      "totalRecords": 1,
      "complete": true,
      "status": "ok",
      "source": "PostgreSQL DataTerra",
      "dataEndpoint": "/api/agent/conversations/{conversationId}/datasets/uuid-do-dataset?page=0&size=20"
    }
  }
}
```

O backend espelha `visualization` em `chartData`: o adaptador prioriza `visualization` e não duplica o gráfico. `chartData: null` mantém a resposta textual. O adaptador também aceita uma lista explícita `visualizations`, na ordem recebida, como ponto de extensão; esse campo ainda não faz parte do DTO atual.

Tipos suportados: `table`; gráficos `bar`, `horizontalBar`, `line`, `area`, `pie`, `doughnut` e `scatter`. Os campos `encoding.y.fields` representam múltiplas métricas e `encoding.color` representa séries categóricas. Não há soma implícita de observações ou combinação de datasets. Valores nulos são preservados e não viram zero. Formatos permitidos: `integer`, `decimal`, `percent` (fração, conforme Intl). Campos temporais seguem os valores fornecidos pela API. As escalas são as padrões da biblioteca; o contrato atual não expõe escalas, dimensões ou funções de formatação arbitrárias.

Para pizza e rosca, `dimension` e `metric` identificam explicitamente categorias e valores e têm prioridade sobre os campos equivalentes de `encoding`; o formato com apenas `encoding.x/y` continua compatível. Nesses gráficos `encoding.color` descreve cores de fatias, não séries métricas, e não aciona o limite de vinte séries dos gráficos cartesianos. Não há limite de categorias, agrupamento em Outros ou descarte de linhas. A legenda completa tem rolagem própria; os rótulos ficam fora das fatias e o tooltip mostra categoria, valor e porcentagem sobre a soma de todos os valores recebidos (mesmo durante pesquisa). Para muitas fatias, o espaçamento e o arredondamento são removidos para não esconder participações pequenas.

Especificações incompatíveis mostram um aviso e oferecem tabela quando as linhas são válidas. Configurações desconhecidas não são repassadas aos componentes. Não há eval, funções remotas, HTML executável ou acesso a URLs recebidas na especificação.

## Dados extensos, ferramentas e paginação

Todos os registros recebidos permanecem acessíveis. Tabelas mostram dez linhas por página, com pesquisa e ordenação sobre todo o conjunto carregado. Gráficos horizontais têm altura proporcional e rolagem vertical; outros gráficos com muitas categorias têm rolagem horizontal. Pesquisa não altera o dataset original.

Toolbar: alternância local de gráfico para tabela, CSV de todos os registros carregados, SVG do gráfico renderizado, expansão em diálogo e restauração de filtros/visualização. Tabelas sem encodings não são transformadas arbitrariamente em gráficos. CSV contém valores brutos, escape de delimitadores/aspas e proteção contra fórmulas de planilha. Dados filtrados ou páginas visíveis não limitam a exportação CSV. SVG reflete o gráfico atualmente exibido.

Dados parciais mostram contagem carregada separada do total informado. Quando o backend fornece `datasetId`, `conversationId` e `dataEndpoint`, a ação de paginação usa o endpoint real:

`GET /api/agent/conversations/{conversationId}/datasets/{datasetId}?page=0&size=50`

A URL é construída localmente; nenhum endereço arbitrário recebido é acessado. A primeira página substitui o conjunto parcial, e as seguintes são anexadas sequencialmente, preservando observações duplicadas. `hasNext` controla o término e `totalElements` informa o total conhecido. Pesquisa e ordenação são locais, sobre registros carregados; não simulam filtros do servidor. O backend pode reconsultar a fonte (`refreshed: true`); nesse caso a interface avisa que os dados podem ter mudado. Sessões expiradas podem rejeitar a recuperação de páginas e o erro é exibido sem apagar os dados recebidos.

## Histórico e pendências

Cada mensagem guarda seu próprio array de especificações. Ao trocar de sessão, os componentes anteriores são desmontados e requisições de páginas pendentes são canceladas. O adaptador de histórico reconhece `chartData`, `visualization` ou `visualizations` em cada mensagem individualmente.

O backend inspecionado ainda retorna `Message(role, content)` em `GET /api/agent/conversations/{id}`. Portanto, **a restauração de gráficos de sessões antigas depende de o backend incluir a especificação na mensagem correspondente**. O frontend está preparado e testado com esse contrato estendido; não reconstrói gráficos de um dataset de outra mensagem. Nenhum arquivo do backend foi modificado nesta tarefa.

Outras dependências de integração: disponibilizar as rotas de dataset na versão publicada da API, manter suas respostas autenticadas e confirmar novos campos/versões antes de ampliar o adaptador. O contrato atual não declara PNG, zoom ou novos tipos de gráfico; a implementação disponibiliza SVG, expansão e rolagem.

## Verificação

`npm run build`

`npx vitest run src/tests/agent-visualizations.test.tsx src/tests/agent-visualization-api.test.ts src/tests/agent-response.test.tsx src/tests/agent.test.tsx`

Com preview local na porta 5183: `node e2e/agent-visualizations.mjs`. Pode-se definir `PREVIEW_URL` e `BROWSER_EXECUTABLE_PATH`. As fixtures nunca são usadas pela aplicação.
