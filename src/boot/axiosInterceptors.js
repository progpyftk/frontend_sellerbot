// src/boot/axiosInterceptors.js
import { getAccessToken, getRefreshToken, clearTokens } from "src/services/tokenService";
import { api } from "./axios";

export const setupInterceptors = (store) => {
  api.interceptors.request.use(
    (config) => {
      const token = getAccessToken();
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    },
    (error) => Promise.reject(error)
  );

  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      if (
        error.response &&
        error.response.status === 401 &&
        !originalRequest._retry &&
        !originalRequest.url.includes('/users/token/refresh/')
      ) {
        originalRequest._retry = true;
        const refreshToken = getRefreshToken();

        if (refreshToken) {
          try {
            const response = await api.post("/users/token/refresh/", {
              refresh: refreshToken,
            });

            const newAccessToken = response.data.access;
            // Se o backend também retornou um refresh token novo, pega ele. Senão, mantém o velho.
            const newRefreshToken = response.data.refresh || refreshToken;

            // ESTA É A MÁGICA: Atualiza o store do Pinia! A tela reage instantaneamente!
            store.updateTokensState(newAccessToken, newRefreshToken);

            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return api(originalRequest);

          } catch (refreshError) {
            console.error("Refresh falhou, deslogando...");
            store.logoutUser(); // Desloga via Store para limpar tudo e redirecionar
            return Promise.reject(refreshError);
          }
        } else {
          store.logoutUser();
          return Promise.reject(error);
        }
      }
      return Promise.reject(error);
    }
  );
};
