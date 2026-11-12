// src/boot/axiosInterceptors.js
import { getAccessToken, getRefreshToken, setAccessToken, clearTokens } from "src/services/tokenService";
import { useStore } from "src/stores/store";
import { api } from "./axios";
import { nomeConta } from "src/utils/nomeConta";

// Alias de exibição do nickname da conta (MOGIVITTA → Dose Verde).
// Roda só na resposta da API, no campo `account_nickname`: não altera
// account_id, filtros enviados, OAuth nem qualquer vínculo da conta.
const CAMPOS_PESADOS = new Set(["raw_data", "escrow_raw", "invoice_data", "tax_snapshot", "discounts_raw"]);
const PROFUNDIDADE_MAX = 5;

const aplicarNomeConta = (valor, nivel = 0) => {
  if (!valor || typeof valor !== "object" || nivel > PROFUNDIDADE_MAX) return;
  if (Array.isArray(valor)) {
    for (const item of valor) aplicarNomeConta(item, nivel + 1);
    return;
  }
  if (Object.prototype.hasOwnProperty.call(valor, "account_nickname") && typeof valor.account_nickname === "string") {
    valor.account_nickname = nomeConta(valor.account_nickname);
  }
  for (const chave of Object.keys(valor)) {
    if (CAMPOS_PESADOS.has(chave)) continue;
    const filho = valor[chave];
    if (filho && typeof filho === "object") aplicarNomeConta(filho, nivel + 1);
  }
};

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
    (response) => {
      aplicarNomeConta(response?.data);
      return response;
    },
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
            try {
                const mainStore = useStore(store); // store = Pinia instance
                mainStore.updateTokensState(newAccessToken, refreshToken);
            } catch (_) {
                api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
            }

            // 3. Refaz a requisição original que falhou usando o .set()
            originalRequest.headers.set('Authorization', `Bearer ${newAccessToken}`);

            return api(originalRequest);
          } catch (refreshError) {
            console.error("Refresh falhou, deslogando...");
            try {
                useStore(store).logoutUser();
            } catch (_) {
                clearTokens();
                window.location.href = "/login";
            }
            return Promise.reject(refreshError);
          }
        } else {
          try { useStore(store).logoutUser(); } catch (_) { clearTokens(); window.location.href = "/login"; }
          return Promise.reject(error);
        }
      }
      return Promise.reject(error);
    }
  );
};
