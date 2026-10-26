# DataTerra — Data Centers & Sustentabilidade

A landing page é um projeto separado na pasta `../LandingPage`, executado em `http://localhost:5174`. Este frontend mantém o dashboard na rota inicial `/#/` (com alias `/#/dashboard`). O link “Conheça a DataTerra” usa `VITE_LANDING_URL` quando definido; em desenvolvimento, aponta para `http://localhost:5174`.

Frontend educativo e analítico da iniciativa **Entre a Tecnologia e a Sustentabilidade: os Desafios Ambientais na Implantação de Data Centers**, do IFSP — Campus Hortolândia.

## Executar

Requer Node.js 22.12+ (verificado com Node.js 24) e npm.

```powershell
npm install
npm run dev
```

Abra **http://127.0.0.1:5173/**. A aplicação conecta automaticamente à API local e carrega todas as páginas das coleções. O caminho `/api` usa o proxy Vite para `http://localhost:8080`. A autenticação HTTP Basic é adicionada pelo servidor Vite; as credenciais ficam em `.env.local`, ignorado pelo Git, e não entram no bundle do navegador. A conexão automática também funciona após recarregar a página. Apenas a preferência de tema é persistida no navegador.

O arquivo `.env.local` já foi configurado neste workspace com os dados locais fornecidos na documentação. Em outro checkout, copie `.env.example` para `.env.local` e preencha `API_PROXY_TARGET`, `API_USERNAME` e `API_PASSWORD`. Reinicie o Vite depois de modificar essas variáveis. Não use prefixo `VITE_` para credenciais. `npm run preview` utiliza o mesmo proxy; uma hospedagem estática precisa de um proxy de servidor equivalente para `/api`.

O frontend utiliza exclusivamente a API local. O conjunto sintético em `src/mocks/demo.ts` é usado somente nos testes automatizados; não existe botão de conexão, demonstração ou fallback para dados fictícios na aplicação. Se o backend estiver indisponível, a interface mostra o erro e permite tentar novamente.

## APIs locais em projetos separados

Se `backend/datacenter/datacenter` está rodando na porta 8080, ele oferece apenas `/api/radar/*`. Os recursos de localizações e dashboard pertencem a `../real/Backend/brasil`. Inicie o JAR existente dessa API com `npm run api:original` (porta 8081) e configure `.env.local`:

```dotenv
API_PROXY_TARGET=http://localhost:8081
RADAR_API_PROXY_TARGET=http://localhost:8080
RADAR_DATA_SOURCE=imports
```

Preserve as credenciais privadas já configuradas. Reinicie o Vite após mudar variáveis. `/api/radar` será encaminhado à API Radar; os demais `/api/*` vão à API original. Se todos os recursos existirem em uma única API, omita `RADAR_API_PROXY_TARGET`.

As duas APIs atuais consultam inventários diferentes. Com `RADAR_DATA_SOURCE=imports`, o Radar utiliza todas as páginas do levantamento real em `/api/importacoes`, incluindo conversão de coordenadas e agregação no frontend. A interface informa essa origem. Para usar os endpoints dedicados `/api/radar/*`, configure `RADAR_DATA_SOURCE=radar`; uma resposta vazia continua vazia, sem fallback automático. IDs das duas APIs nunca são associados por coincidência numérica. Consulte [o diagnóstico e as limitações](docs/radar.md#correção-de-conexão-duas-apis-locais).

## Páginas e funcionalidades

| Página                 | Funcionalidades                                                                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Visão geral            | Indicadores de cobertura, potência declarada, gráficos por instalação, distribuição de evidências, mapa resumido e distribuição por cidade       |
| Indicadores ambientais | Categorias de energia, água, emissões, resíduos e recursos; seleção de medidas; série anual; gráficos por grupo; registros qualitativos e fontes |
| Mapa de data centers   | Leaflet, coordenadas do backend, zoom, deslocamento, agrupamento de pontos, busca, filtros e painel de detalhes                                  |
| Comparação             | Seleção múltipla de instalações e indicadores, gráficos separados por tipo/unidade/período e tabela de evidências                                |
| Benefícios             | Registros cadastrados na API, categorias, descrições e fontes                                                                                    |
| Fontes e metodologia   | Pesquisa por instituição/publicação, filtro de instituição, datas de calendário, links originais seguros e orientações metodológicas             |
| Sobre o projeto        | Contexto acadêmico, objetivos, justificativa, público-alvo, limites e conteúdos de pesquisa cadastrados                                          |

Layout inspirado nas referências fornecidas: sidebar, superfícies claras, cards arredondados, acentos verdes e marcadores violetas. Inclui tema escuro, navegação móvel, exportação CSV, skeletons, estados vazios, tratamento de erros, tooltips e navegação por teclado. Componentes shadcn locais e primitives Radix para selects, tabs, dialog e tooltip.

Filtros de país, estado, cidade, instalação, período e busca são aplicados localmente **depois de carregar todas as páginas** das coleções. País/estado/cidade são encadeados e limpam seleções incompatíveis. O período não limita o número de instalações ou a potência: ele filtra somente os indicadores ambientais.

## Integração implementada

Contrato de referência: documentação do backend fornecida pelo usuário, revisada em 13/10/2026. O diretório `../backend/datacenter/datacenter` existe, mas não contém os controllers desse contrato. Nenhum arquivo do backend ou banco foi alterado.

Todas as rotas abaixo são GET, com prefixo `/api` e HTTP Basic:

| Rota                        | Uso                                               |
| --------------------------- | ------------------------------------------------- |
| `/data-centers`             | Instalações e filtros geográficos                 |
| `/indicadores-ambientais`   | Registros quantitativos e qualitativos            |
| `/fontes`                   | Referências                                       |
| `/beneficios`               | Benefícios associados                             |
| `/conteudos-pesquisa`       | Textos e pesquisa                                 |
| `/mapa`                     | Pontos geográficos paginados                      |
| `/dashboard`                | Array com contagens agregadas por cidade          |
| `/data-centers/{id}`        | Detalhes carregados ao selecionar uma instalação  |
| `/data-centers/{id}/fontes` | Referências vinculadas, com `sort=id.fonteId,asc` |

Axios centralizado em `src/services/api.ts`, timeout de 20 segundos por chamada, paginação com tamanho 100 e ordenação por ID, AbortSignal e cache TanStack Query. Respostas paginadas e o formato não paginado do dashboard são verificados. Erros de rede, timeout, 401 e mensagens Problem Detail têm feedback na interface. O cache não usa credenciais como chave. A autenticação local ocorre no proxy do Vite, com configuração privada do servidor.

## Regras de interpretação

- Ausências permanecem ausências: `null` nunca é convertido em zero.
- MW representa potência declarada, não consumo de energia.
- Gráficos comparativos separam tipo de indicador, unidade e período. Valores sem unidade ou período permanecem na tabela.
- A distribuição em rosca representa **contagem de registros**, não participação nos impactos ambientais.
- Evolução temporal usa apenas anos `YYYY` da mesma instalação, tipo e unidade; períodos duplicados impedem formar uma série confiável.
- Não há porcentagens de crescimento, projeções ou metas inventadas.
- O dashboard do backend agrupa pelo texto da cidade; homônimos de estados diferentes podem aparecer juntos. A interface explica essa limitação.
- URLs de fontes aceitam apenas HTTP/HTTPS. Datas são exibidas como datas de calendário. O CSV escapa aspas e protege contra fórmulas em campos textuais.
- O mapa usa OpenStreetMap com atribuição. As imagens dependem de acesso à internet; falhas mostram aviso, e as instalações continuam disponíveis na lista.

## Organização

```text
src/
  App.tsx                         composição, rotas, tema e conexão
  components/
    common.tsx                    cards, fontes e estados compartilhados
    ui/                           componentes shadcn / Radix
    charts/                       barras, linhas e distribuição
    filters/                      filtros encadeados
    maps/                         mapa e painel de detalhes
  pages/                          sete páginas
  services/api.ts                 Axios e contrato HTTP
  types/api.ts                    DTOs e tipos de dados
  utils/data.ts                   filtros, unidades, agrupamento e CSV
  mocks/demo.ts                   conjunto sintético explicitamente fictício
  tests/                          testes unitários e de interação
e2e/smoke.mjs                      verificação com Chrome/Playwright
```

Arquivos principais alterados: `src/App.jsx` substituído por `src/App.tsx`, `src/index.css`, componentes UI usados convertidos de JSX para TSX, `package.json`, lockfile, Vite, Tailwind, PostCSS, `index.html` e README. Adicionados contratos, serviços, páginas, componentes, fixtures, testes, `.env.example`, `components.json`, TypeScript e `.gitignore`. As páginas usam carregamento sob demanda.

## Verificação

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm audit
```

27 testes automatizados cobrem formatação/nulos, filtros, categorias, unidades/períodos, datas, URLs, exportação, coordenadas, paginação, contratos HTTP, erros, comparação, estados, zoom e seleção no mapa, séries anuais, distinção entre consumo e eficiência e pesquisa nos seletores. O build executa TypeScript antes de gerar `dist/`. O lint utiliza ESLint e typescript-eslint; o TypeScript 6 mantém compatibilidade com essas ferramentas.

Com o servidor de desenvolvimento ativo:

```powershell
node e2e/smoke.mjs
node e2e/redesign.mjs
```

O smoke test usa o Chrome instalado no Windows e o backend real em execução. Para outro ambiente, defina `BROWSER_EXECUTABLE_PATH` ou instale o Chromium do Playwright. Confere as contagens da API, paginação completa do mapa/lista, sete páginas, detalhes, tema, largura de celular e conexão automática após recarregar. Capturas são geradas em `artifacts/`, que não é versionado. `node scripts/check-local-api.mjs` consulta as contagens diretamente no backend sem imprimir as credenciais.

## Redesign da interface

Identidade em verde-esmeralda, tipografia Inter, cores semânticas para energia (âmbar), água (azul), emissões (violeta), resíduos (laranja) e recursos naturais (verde). Tokens em `src/index.css` padronizam espaçamento, controles, bordas, raios, contraste e temas.

Componentes novos: `AppSidebar`, `Topbar` e `PageHeader` em `src/components/layout/Shell.tsx`; `EnvironmentalMetricCard`; seletores pesquisáveis para listas longas. A sidebar recolhe em desktop; filtros ativos podem ser removidos individualmente. A comparação apresenta etapas, busca de instalações, lista com altura limitada e seleção de período. As fontes são exibidas em blocos de 24 com ação para carregar mais.

Os cinco KPIs ambientais mostram um registro de referência explicitamente identificado por instalação, unidade, período e fonte quando há medição. PUE/WUE não substituem consumo. Séries históricas exigem anos válidos sem duplicação. O gráfico por cidade mostra as 12 maiores contagens com indicação da cobertura. A rosca representa somente a composição dos registros.

Arquivos do redesign: `src/App.tsx`, `src/index.css`, `src/constants/design.ts`, `src/constants/navigation.ts`, `src/components/layout/Shell.tsx`, `src/components/EnvironmentalMetricCard.tsx`, `src/components/ui/filter-select.tsx`, `src/components/filters/FilterPanel.tsx`, `src/components/charts/IndicatorChart.tsx`, `src/pages/Dashboard.tsx`, `src/pages/Indicators.tsx`, `src/pages/Comparison.tsx`, `src/pages/Content.tsx`, `src/types/api.ts`, `src/utils/analytics.ts`, `src/tests/redesign.test.tsx`, `e2e/redesign.mjs`, `eslint.config.js`, `tailwind.config.js`, `package.json` e lockfile.

`e2e/redesign.mjs` valida as sete páginas, os KPIs, a sidebar, a pesquisa dos seletores, os temas e as larguras 1536, 1024, 768, 390 e 320 px. Defina `PREVIEW_URL` para testar outra porta. Após atualizar dependências, reinicie o servidor de desenvolvimento para renovar seu cache de módulos. As capturas ficam em `artifacts/redesign-*.png`.

## Limites da integração

A tabela da página do mapa consulta `GET /api/importacoes` e percorre todas as páginas. Exibe as 28 colunas originais do levantamento em snake_case, mapeadas dos nomes camelCase da API. `id` corresponde a `idOriginal`, sem associação presumida com o ID do cadastro normalizado. Valores numéricos e datas brutos permanecem como texto. A tabela possui pesquisa própria, independente dos filtros do mapa, e links seguros para as fontes originais.

Os testes unitários usam respostas simuladas; o smoke test verifica a integração com a API local real. Na verificação desta alteração, o backend retornou 352 cadastros e 348 pontos no mapa, em quatro páginas cada. As contagens dependem da base atual e dos filtros. Cadastros sem latitude e longitude não aparecem no mapa, mas permanecem na lista. Não há alterações de banco, CRUD administrativo, upload/importação ou chamadas de população: esses fluxos não fazem parte das sete páginas educativas solicitadas. Em produção, configure HTTPS e um proxy de servidor equivalente para `/api`. Não é necessário Swagger, JWT ou servidor de autenticação adicional.

## Organização do código

- `src/App.tsx`: declaração das rotas.
- `src/providers/`: providers globais de router e TanStack Query, montados no `main.jsx`.
- `src/components/layout/AppLayout.tsx`: shell compartilhado e estados de carregamento das páginas.
- `src/hooks/useAppData.ts`: filtros compartilhados, exportação e acesso ao dataset.
- `src/routes/RoutePages.tsx`: carregamento das páginas e passagem dos dados do outlet.

- `src/services/http/`: cliente Axios, paginação e mensagens de erro.
- `src/services/`: chamadas HTTP por recurso; `dataset.ts` compõe os dados de múltiplos recursos. `api.ts` centraliza somente as rotas dos endpoints.
- `src/queries/`: configuração do TanStack Query, identificação de conexões, opções reutilizáveis e hooks de consulta (dataset, imports, radar e geometria).
- `src/adapters/`: transformação e agregação do inventário importado para o contrato do Radar.
- `src/types/`: contratos compartilhados de dados.
- `src/pages/` e `src/components/`: estado de interface e apresentação; consultas ficam nos hooks de `queries`.

Para adicionar uma consulta, implemente a chamada no service do recurso e exponha um hook em `queries`. Passe o `AbortSignal` até a requisição e inclua na chave todos os parâmetros que alteram a resposta. Consultas com credenciais diferentes usam identidades de cache distintas, sem expor senhas nas chaves.
