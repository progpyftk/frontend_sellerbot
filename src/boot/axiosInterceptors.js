// src/boot/axiosInterceptors.js
import { getAccessToken, getRefreshToken, setAccessToken, clearTokens } from "src/services/tokenService";
import { api } from "./axios";

export const setupInterceptors = (store) => {
  api.interceptors.request.use(
    (config) => {
      const token = getAccessToken();
      if (token) {
        // O segredo do Axios moderno: usar o método .set()
        config.headers.set('Authorization', `Bearer ${token}`);
      }
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

            // 1. Salva no localStorage
            setAccessToken(newAccessToken);

            // 2. Atualiza o state global do Pinia para a UI não piscar
            if (store && typeof store.updateTokensState === 'function') {
                store.updateTokensState(newAccessToken, refreshToken);
            } else {
                api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
            }

            // 3. Refaz a requisição original que falhou usando o .set()
            originalRequest.headers.set('Authorization', `Bearer ${newAccessToken}`);

            return api(originalRequest);
          } catch (refreshError) {
            console.error("Refresh falhou, deslogando...");
            if (store && typeof store.logoutUser === 'function') {
                store.logoutUser();
            } else {
                clearTokens();
                window.location.href = "/login";
            }
            return Promise.reject(refreshError);
          }
        } else {
          if (store && typeof store.logoutUser === 'function') store.logoutUser();
          return Promise.reject(error);
        }
      }
      return Promise.reject(error);
    }
  );
};
