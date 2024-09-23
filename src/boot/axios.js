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
      const accessToken = sessionStorage.getItem("accessToken");
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Intercepta respostas com erro 401 para tentar fazer o refresh
  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      if (
        error.response &&
        error.response.status === 401 &&
        !originalRequest._retry
      ) {
        originalRequest._retry = true;

        try {
          const refreshToken = localStorage.getItem("refreshToken");
          if (!refreshToken) {
            throw new Error("Refresh token não encontrado.");
          }

          // Faz a requisição para obter um novo token de acesso
          const { data } = await axios.post(
            `${process.env.VUE_APP_BACKEND_HOST}/users/token/refresh/`,
            {
              refresh: refreshToken,
            }
          );

          // Atualiza o accessToken na sessionStorage
          sessionStorage.setItem("accessToken", data.access);

          // Refaz a requisição original com o novo token
          originalRequest.headers.Authorization = `Bearer ${data.access}`;
          return api(originalRequest);
        } catch (refreshError) {
          console.error("Erro ao tentar fazer refresh do token:", refreshError);

          // Se o refresh falhar, faça o logout chamando a função do store
          store.logoutUser(); // Chamando a função de logout centralizada no store
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );

  // Adiciona o axios ao contexto global do Vue
  app.config.globalProperties.$axios = axios;
  app.config.globalProperties.$api = api;
});

// Exporta a instância da API
export { api };
