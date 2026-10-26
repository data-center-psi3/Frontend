import axios from "axios";
export function errorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401)
      return "A API recusou as credenciais. Confira API_USERNAME e API_PASSWORD no proxy (.env.local), os valores configurados no backend e reinicie o Vite.";
    if (error.code === "ECONNABORTED")
      return "A API demorou para responder. Tente novamente.";
    return (
      error.response?.data?.detail ??
      (error.response
        ? `A API retornou o código ${error.response.status}.`
        : "Não foi possível conectar à API. Verifique o endereço, o backend e a configuração de CORS.")
    );
  }
  return error instanceof Error
    ? error.message
    : "Não foi possível carregar os dados.";
}
