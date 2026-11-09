# Sessões do assistente

O seletor abaixo do cabeçalho lista as 100 conversas mais recentes, não vazias, da conta autenticada na API. Cada opção contém a primeira pergunta ainda preservada na memória e a data de atualização. Selecionar uma sessão recupera as mensagens salvas e usa seu `conversationId` nas próximas perguntas. Nova conversa mantém as sessões antigas no banco.

## Backend necessário

As alterações correspondentes estão em `real/Backend/brasil`, no projeto irmão deste frontend:

- `GET /api/agent/conversations`: retorna `{ id, title, updatedAt, expired }[]`.
- `GET /api/agent/conversations/{id}`: retorna `{ id, messages, expired }`, com mensagens `{ role, content }`.

Publique ou reinicie o backend atualizado antes de usar o seletor em produção. Nenhuma migração é necessária quando a tabela `agent_conversation` já existe. O proxy atual já encaminha essas requisições GET.

## Limites existentes

A memória do backend é limitada por quantidade de turnos e tamanho. O seletor recupera o conteúdo ainda armazenado, sem reconstruir mensagens descartadas anteriormente. Sessões com memória expirada podem ser consultadas, mas precisam de uma nova conversa para continuar.

As rotas filtram pelo proprietário autenticado. Atualmente o proxy utiliza uma credencial Basic compartilhada: visitantes que usam essa mesma conta compartilham a lista de sessões. Histórico individual por visitante exige autenticação individual no backend e encaminhamento dessa identidade pelo proxy.
