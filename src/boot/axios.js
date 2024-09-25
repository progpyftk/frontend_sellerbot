// src/boot/axios.js
import { boot } from "quasar/wrappers";
import axios from "axios";

// Define a URL base dependendo do ambiente
const apiBaseUrl =
  process.env.NODE_ENV === "development"
    ? "http://localhost:8000" // URL da API de desenvolvimento
    : "VITE_BACKEND_HOST_PLACEHOLDER"; // Placeholder que será substituído no Nginx

// Crie a instância do Axios
const api = axios.create({ baseURL: apiBaseUrl });

export default boot(({ app }) => {
  console.log("API Base URL:", api.defaults.baseURL);

  // Interceptor para adicionar o token de acesso
  api.interceptors.request.use(
    (config) => {
      const token = sessionStorage.getItem("accessToken");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  api.interceptors.response.use(
    (response) => response, // Retorna a resposta diretamente se for bem-sucedida
    async (error) => {
      const originalRequest = error.config;

      // Se for um erro 401 (não autorizado) e não for uma tentativa de renovação do token
      if (
        error.response &&
        error.response.status === 401 &&
        !originalRequest._retry
      ) {
        originalRequest._retry = true; // Marca a requisição para não tentar renovar várias vezes

        const refreshToken = localStorage.getItem("refreshToken");

        if (refreshToken) {
          console.log("Erro 401 detectado. Tentando renovar o token...");
          try {
            console.log(
              "Tentando renovar o token com o refresh token:",
              refreshToken
            );

            const response = await api.post("/users/token/refresh/", {
              refresh: refreshToken,
            });

            const newAccessToken = response.data.access;
            console.log(
              "Token renovado com sucesso. Novo accessToken:",
              newAccessToken
            );

            sessionStorage.setItem("accessToken", newAccessToken);

            // Atualiza o cabeçalho da requisição original com o novo token
            originalRequest.headers[
              "Authorization"
            ] = `Bearer ${newAccessToken}`;
            console.log(
              "Cabeçalhos atualizados com o novo accessToken. Reenviando a requisição original."
            );

            // Reenvia a requisição original com o novo token
            return api(originalRequest);
          } catch (refreshError) {
            console.error(
              "Erro ao renovar o token. Redirecionando para login."
            );
            console.error(
              "Detalhes do erro ao tentar renovar o token:",
              refreshError.response
                ? refreshError.response.data
                : refreshError.message
            );

            // Limpa os tokens e redireciona para o login
            sessionStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            console.log(
              "Tokens removidos. Redirecionando para a página de login."
            );
            window.location.href = "/login";

            // Interrompe o fluxo e rejeita a promessa para evitar loop
            return Promise.reject(refreshError);
          }
        } else {
          // Se não houver refresh token, redireciona diretamente para o login
          console.error("Refresh token ausente. Redirecionando para login.");
          console.log(
            "Redirecionando imediatamente para o login. Nenhum refresh token encontrado."
          );
          sessionStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");

          window.location.href = "/login";

          // Interrompe o fluxo e rejeita a promessa para evitar loop
          return Promise.reject(error);
        }
      }

      // Se o erro não for 401 ou já for uma tentativa de renovação
      if (error.response) {
        const { data, status } = error.response;

        // Exibe a mensagem de erro retornada pelo backend, se houver
        if (status === 400 && data.errors) {
          console.error(`Erro ${status}:`, data.message || "Erro desconhecido");
        } else {
          // Outros erros com status diferente
          console.error(
            `Erro sem tentativa de renovação de token (${status}):`,
            error.message
          );
        }
      } else {
        console.error("Erro desconhecido:", error.message);
      }

      return Promise.reject(error); // Rejeita a promessa e passa o erro adiante
    }
  );

  // Adiciona o axios ao contexto global do Vue
  app.config.globalProperties.$axios = axios;
  app.config.globalProperties.$api = api;
});

// Exporta a instância da API
export { api };
