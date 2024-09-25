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
      if (
        error.response &&
        error.response.status === 401 &&
        !originalRequest._retry
      ) {
        originalRequest._retry = true;

        const refreshToken = getRefreshToken();

        if (refreshToken) {
          try {
            const response = await api.post("/users/token/refresh/", {
              refresh: refreshToken,
            });
            const newAccessToken = response.data.access;
            setAccessToken(newAccessToken);

            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

            return api(originalRequest);
          } catch (refreshError) {
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
