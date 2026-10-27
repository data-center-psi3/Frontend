# Deploy na Vercel

O proxy de `vite.config.js` funciona apenas em desenvolvimento e preview local. Na Vercel, `vercel.json` encaminha `/api/*` para a função `api/proxy.js`, que adiciona Basic Auth no servidor. Ela aceita GET e HEAD e permite POST exclusivamente em `/api/agent/chat`, preserva os parâmetros de consulta e não armazena as respostas em cache.

1. Configure a **Root Directory** da Vercel para esta pasta frontend, onde estão `package.json`, `vercel.json` e `api/`. Não publique apenas a pasta `dist`.
2. Em **Settings → Environment Variables**, cadastre para Production (e Preview, se utilizado):

   | Variável            | Valor                                                     |
   | ------------------- | --------------------------------------------------------- |
   | `API_PROXY_TARGET`  | `https://backend-5lgu.onrender.com` (sem `/api`)          |
   | `API_USERNAME`      | Mesmo valor de `SPRING_SECURITY_USER_NAME` do backend     |
   | `API_PASSWORD`      | Mesmo valor de `SPRING_SECURITY_USER_PASSWORD` do backend |
   | `RADAR_DATA_SOURCE` | `radar`                                                   |

   `RADAR_API_PROXY_TARGET`, `RADAR_API_USERNAME` e `RADAR_API_PASSWORD` são opcionais; quando ausentes ou vazios, usam os valores da API principal. Não use prefixo `VITE_` para credenciais. Na interface da Vercel, informe os valores literais, sem as aspas ou escapes próprios de arquivos dotenv.

3. Faça um novo deploy com os arquivos desta alteração. `.env.local` não é versionado e não configura o ambiente remoto.
4. Confira `/api/auth/me` e `/api/mapa?page=0&size=1` no domínio publicado. Uma resposta 401 indica credenciais rejeitadas; 502/504 indica falha de conexão/timeout; consulte `[API proxy]` nos logs da função. Esses testes identificam o usuário compartilhado configurado no servidor.

O build permanece `npm run build`, com saída em `dist`. A função é implantada separadamente pela Vercel. Este frontend usa navegação por hash, dispensando uma regra genérica que transforme as respostas da API em `index.html`.
