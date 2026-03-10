// src/boot/axiosInterceptors.js
import {
  getAccessToken,
  setAccessToken,
  getRefreshToken,
  clearTokens,
} from "src/services/tokenService";
import { api } from "./axios";

export const setupInterceptors = (store) => {
  // Interceptor de requisição para adicionar o token de acesso
  api.interceptors.request.use(
    (config) => {
      const token = getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Interceptor de resposta para lidar com erros e renovação do token
  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      // Verifica se é erro 401 e SE NÃO É a própria rota de refresh para evitar loop infinito
      if (
        error.response &&
        error.response.status === 401 &&
        !originalRequest._retry &&
        !originalRequest.url.includes('/users/token/refresh/') // <-- PROTEÇÃO AQUI
      ) {
        originalRequest._retry = true;

        const refreshToken = getRefreshToken();
        console.log("Attempting token refresh with:", refreshToken);

        if (refreshToken) {
          try {
            // Faz o refresh
            const response = await api.post("/users/token/refresh/", {
              refresh: refreshToken,
            });

            const newAccessToken = response.data.access;

            // 1. Salva o token novo no localStorage/Cookies
            setAccessToken(newAccessToken);

            // 2. Atualiza o cabeçalho global do Axios para as próximas requisições não falharem
            api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;

            // 3. Atualiza o cabeçalho desta requisição que falhou e tenta de novo
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

            return api(originalRequest);
          } catch (refreshError) {
            console.error("Refresh falhou, deslogando usuário...");
            clearTokens();
            window.location.href = "/login";
            return Promise.reject(refreshError);
          }
        } else {
          clearTokens();
          window.location.href = "/login";
          return Promise.reject(error);
        }
      }
      return Promise.reject(error);
    }
  );
};
