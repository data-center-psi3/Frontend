# Radar de Concentração de Data Centers

## Acesso e preservação do mapa existente

Em `/#/mapa`, o botão com ícone de chama, ao lado de “Ver todo o território”, abre o Radar em mapa de calor (`mode=radar&view=heat`). O modo de localizações continua sendo o padrão. Não dispara consultas do Radar antes da ativação. Ao voltar por “Localizações”, a instância Leaflet original, a cidade selecionada e seu enquadramento são preservados. A seção suspensa fica invisível e `inert` para o teclado e leitores de tela.

Rotas adicionais: `/#/radar` e `/#/radar/estado/SP` (qualquer UF válida). Não dependem do carregamento do dataset antigo. O detalhamento de uma instalação usa a página e os endpoints de detalhes existentes; os filtros globais são limpos nessa navegação explícita para permitir exibir a instalação escolhida.

## Contratos verificados no backend

Fonte: `../backend/datacenter/datacenter/src/main/java/datacenter/datacenter/radar/{RadarController,RadarDtos,RadarFilter,RadarService,RadarRepository}.java`. Nenhuma alteração de backend.

A conexão reutiliza `createApi`, `/api`, o proxy e a autenticação do projeto. Coleções do Radar são arrays diretos, não páginas Spring. Filtros AND: `uf`, `region`, `operator`, `installationType`; valores vazios são omitidos.

| Método e caminho                                             | Uso                                                                                         |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| GET `/radar/overview`                                        | Seis indicadores, somas e cobertura de conectividade                                        |
| GET `/radar/states?sortBy=installations`                     | Agregados por UF; reordenação visual local por métrica                                      |
| GET `/radar/states/{uf}`                                     | Indicadores e participação nacional do estado                                               |
| GET `/radar/states/{uf}/cities?sortBy=installations`         | Municípios do estado; reordenação visual local                                              |
| GET `/radar/operators/ranking?sortBy=installations&limit=10` | Ranking de operadores; `networks` quando essa métrica está ativa                            |
| GET `/radar/cities/ranking?sortBy=installations&limit=1000`  | Municípios nacionais retornados pela API                                                    |
| GET `/radar/map`                                             | Pontos com coordenadas e conectividade por instalação                                       |
| GET `/radar/filters`                                         | Opções reais dos quatro filtros                                                             |
| GET `/data-centers?page=...&size=100&sort=id,asc`            | Tabela estadual, incluindo instalações sem coordenadas; paginação percorrida e filtro local |

Consultas têm cache TanStack Query, cancelamento por `AbortSignal`, sem recarregamento por foco. Trocar métrica ou visualização reutiliza os pontos e agregados já carregados. Falhas são isoladas por seção, com tentativa novamente. Ausência de API nunca ativa dados demonstrativos.

## Geografia e interpretação

- Malha oficial com 27 UFs, obtida do [IBGE](https://servicodados.ibge.gov.br/api/docs/malhas?versao=3), em `public/geo/br-states.geojson`; proveniência e URL em `public/geo/SOURCE.txt`. Qualidade mínima para visualização, sem finalidade de precisão territorial.
- Coroplético usa agregados reais por UF, cinco intervalos de largura igual e legenda. Estados sem registros ou sem valor válido ficam neutros, com distinção no tooltip. Ranking textual oferece alternativa ao mapa.
- Heatmap usa coordenadas de `/radar/map`, agrupamento em células de tela e núcleo radial. Intensidade relativa normalizada no campo visível; muda com zoom. Instalações pesam 1; redes, IX e carriers pesam seu valor informado. Zero tem peso zero; nulo é excluído. Não representa medição ambiental nem levantamento completo do Brasil.
- Operadores distintos e médias não têm modo de calor, pois densidade de instalações não representa essas métricas. Coroplético e marcadores seguem disponíveis.
- Média de redes vem de `conectividade.mediaRedesPorInstalacao`, com denominador de instalações com valor válido. Operadores distintos vêm dos agregados do servidor; não são somados entre estados.
- Participação nacional usa o denominador de toda a base brasileira, sem filtros, conforme o contrato do backend. A interface explicita isso.
- Somas de redes, IX e carriers são registros por instalação; não representam entidades únicas. Nulos exibem “Não informado”, inclusive na tabela. Zero permanece zero.
- Marcadores têm agrupamento por zoom e popup com operador, unidade, cidade/UF, tipo, redes, IX, carriers e precisão geográfica. Abrir popup não desloca o mapa.

## Limitações precisas dos contratos

1. Ranking de operadores não oferece média, IX ou carriers agregados. Nessas métricas ele permanece por instalações, com aviso explícito.
2. Não há endpoint Radar de instalações estaduais completo e paginado. Reutilizamos `/data-centers`, incluindo sem coordenadas, com busca, ordenação e paginação local. Conectividade é associada pelo `id` real de `/radar/map`; para instalações sem ponto, permanece “Não informado”. Em bases grandes, um endpoint estadual com esses campos evitaria carregar todas as instalações.
3. O ranking nacional de municípios aceita no máximo 1.000 resultados. Os gráficos nacionais representam esse conjunto retornado, reordenado localmente; não garantem todos os municípios em bases que ultrapassem esse limite. O endpoint municipal estadual não possui esse limite.
4. Ao validar em 16/10/2026, o backend local não respondeu. Contratos foram conferidos no código Java. Integração HTTP e interações foram verificadas com respostas sintéticas exclusivas dos testes; confirmar dados reais exige o backend em execução e conectado à base. Não há fallback fictício em produção.
5. Tiles OpenStreetMap precisam de rede. Em falha, malha local, heatmap, marcadores e análises continuam disponíveis.

## Verificação

- `npm test -- --maxWorkers=1 --testTimeout=15000`: suíte existente e testes de contratos, cancelamento, filtros, valores ausentes, zero, rankings e métricas de calor.
- `node e2e/radar.mjs` com frontend em `http://127.0.0.1:5173`: navegador Chrome, respostas sintéticas somente no teste; valida ativação isolada, 27 polígonos IBGE reais, pixels do heatmap, cache entre métricas, filtros AND, cards/rankings, navegação estadual/detalhes, busca, ausência de coordenadas, retorno preservando DOM/enquadramento, falha parcial, retry, loading, tema escuro e viewport móvel. `PREVIEW_URL` e `BROWSER_EXECUTABLE_PATH` configuráveis.
- `npm run lint` e `npm run build`.

## Arquivos principais

`src/pages/Radar/RadarPage.tsx`, `radar.css`, `src/components/maps/RadarMap.tsx`, `src/services/radar.ts`, `src/types/radar.ts`, `src/utils/radar.ts`; integração em `src/pages/Map.tsx`, `src/App.tsx`, `src/components/layout/Shell.tsx`, `src/components/maps/territory.css`. O gráfico reutilizado ganhou apenas a opção de eixo decimal, mantendo o comportamento anterior por padrão.

## Correção de conexão: duas APIs locais

Diagnóstico confirmado em 16/10/2026: a aplicação `backend/datacenter/datacenter` na porta 8080 responde `/api/radar/overview`, mas não implementa `/api/data-centers`, `/api/mapa`, `/api/dashboard` ou os demais recursos originais. O 404 vinha desse backend, inclusive com acesso direto, portanto não era CORS nem indisponibilidade do processo Java.

A API dos recursos originais é `real/Backend/brasil`, conectada à base já utilizada pelo frontend. Seu JAR existente foi iniciado na porta 8081 sem alterar seu código ou banco. A verificação real retornou 352 instalações, 348 pontos geográficos e 352 linhas de importação. Já o inventário nacional da API Radar retornou zero instalações. Esses números são observações do diagnóstico, não constantes da interface.

A configuração local ficou:

```dotenv
API_PROXY_TARGET=http://localhost:8081
RADAR_API_PROXY_TARGET=http://localhost:8080
```

O proxy específico `/api/radar` precede `/api`. O mesmo encaminhamento vale para desenvolvimento e preview. `RADAR_API_USERNAME`/`RADAR_API_PASSWORD` permitem autenticação separada; quando omitidas, reutilizam a configuração privada da API principal. O navegador continua usando `/api` na mesma origem e não recebe credenciais.

Para iniciar a API original novamente: `npm run api:original` (usa o JAR existente). Mantenha a API Radar na porta 8080 e o Vite em execução. Se gerar um novo JAR, use o Maven Wrapper do projeto original. Alterações de ambiente exigem reinício do Vite.

**As bases têm identidades independentes.** Quando os destinos são diferentes, `VITE_RADAR_ISOLATED` é definido pelo Vite como flag pública sem credenciais. O Radar não consulta nem associa os cadastros da API original por ID: sua tabela usa os pontos reais do próprio Radar e o detalhamento abre no módulo. O endpoint Radar atual não expõe instalações sem coordenadas individualmente; elas continuam nos indicadores, com limitação explícita na tabela. Para ter um inventário único, será necessário integrar o Radar à API/base original no backend; não se infere correspondência entre IDs e não se copia/importa dados automaticamente.

## Fonte atual: levantamento de `/api/importacoes`

Após comparação HTTP real, `/api/radar/overview` continuava respondendo zero e `/api/radar/map` respondia `[]`, enquanto `/api/importacoes` tinha os 352 registros exibidos na captura. O frontend não estava perdendo os pontos do endpoint Radar: os dados pertenciam a outra coleção. Não foram alterados controllers, tabelas, IDs ou dados do banco.

Para apresentar o levantamento já existente, a configuração local passou a incluir `RADAR_DATA_SOURCE=imports`. Este modo carrega **todas** as páginas de `/api/importacoes` e calcula agrupamentos no frontend, com origem explícita na interface. Não consulta nem combina o inventário vazio de `/api/radar/*`. Não é fallback automático: `RADAR_DATA_SOURCE=radar` mantém a integração dedicada original, inclusive mostrando vazio se sua API devolver vazio.

O adaptador em `src/services/importedRadar.ts` converte coordenadas com vírgula ou ponto decimal; nulos e traços permanecem ausentes, e zero explícito é válido. Pontos fora dos intervalos de latitude/longitude não entram no mapa. Conectividade aceita inteiros não negativos e seguros em JavaScript; frações, faixas e valores acima da precisão segura permanecem desconhecidos. Médias dividem somente pela cobertura válida, somas de conjuntos sem observação são nulas e nomes de operadores são normalizados por caixa, acentos e espaços, sem consolidar aliases comerciais. Municípios usam UF + IBGE válido, com fallback UF + nome. Registros sem UF brasileira válida são excluídos com aviso quantitativo. Cada linha representa um registro, sem deduplicação física presumida.

As chaves negativas dos pontos importados são apenas referências de interface dentro da coleção carregada, nunca IDs da API `/data-centers`. O identificador `idOriginal` e a URL original permanecem no detalhamento do levantamento, inclusive para instalações sem coordenadas. Tabela e indicadores incluem esses registros; somente o mapa exige coordenadas válidas. Não há associação entre registros de bases diferentes por coincidência numérica.

O cache `imported-centers` é compartilhado com a tabela de localizações e cancelado por AbortSignal. Filtros, troca de métrica, rankings, rotas e mapa reutilizam a coleção integral carregada. Falha em qualquer página impede mostrar totais parciais e oferece nova tentativa. Atualizar a coleção invalida os agregados derivados pela revisão dos dados no cache.

Na validação real desta configuração, o navegador apresentou 352 instalações, 348 pontos, 231 operadores, 98 municípios, 25 UFs e 3.612 redes registradas. São resultados observados da API, não números fixos no produto. Esses agregados são derivados das importações pelo frontend; não são apresentados como resposta do inventário dedicado do Radar.

Validação adicional: `src/tests/imported-radar.test.ts`, `node e2e/radar-imports.mjs` (respostas exclusivas do teste; requer modo imports) e `node e2e/radar-live.mjs` (backend real, sem interceptação, requer levantamento com registros). O teste anterior `e2e/radar.mjs` é específico para `RADAR_DATA_SOURCE=radar` com os recursos em uma API integrada. Build e lint também foram executados.
