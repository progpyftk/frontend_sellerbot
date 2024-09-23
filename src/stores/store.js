import { defineStore } from "pinia";
import { api } from "boot/axios";
import router from "src/router";

export const useStore = defineStore("main", {
  state: () => ({
    authToken: sessionStorage.getItem("accessToken") || "",
    refreshToken: localStorage.getItem("refreshToken") || "",
    currentUser: JSON.parse(localStorage.getItem("currentUser")) || null,
  }),
  actions: {
    loginUser(accessToken, refreshToken, userData) {
      this.authToken = accessToken;
      this.refreshToken = refreshToken;
      this.currentUser = userData;

      sessionStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("currentUser", JSON.stringify(this.currentUser));

      // Configure o token no cabeçalho padrão do Axios
      api.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
    },

    async fetchCurrentUser() {
      try {
        const response = await api.get("/users/me/");
        this.currentUser = response.data;
        localStorage.setItem("currentUser", JSON.stringify(this.currentUser));
      } catch (error) {
        console.error("Erro ao buscar o usuário atual", error);
        if (error.response && error.response.status === 401) {
          // Tenta renovar o token se a resposta for 401 (Não autorizado)
          await this.refreshAuthToken();
        } else {
          this.logoutUser();
        }
      }
    },

    logoutUser() {
      this.authToken = null;
      this.refreshToken = null;
      this.currentUser = null;

      sessionStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("currentUser");

      // Remove o token do cabeçalho padrão do Axios
      delete api.defaults.headers.common["Authorization"];

      console.log("Usuário deslogado");
    },

    async refreshAuthToken() {
      try {
        const response = await api.post("/auth/refresh/", {
          refresh: this.refreshToken,
        });

        const newAccessToken = response.data.access;
        this.loginUser(newAccessToken, this.refreshToken, this.currentUser);

        return true;
      } catch (error) {
        console.error("Erro ao renovar o token", error);
        this.logoutUser();
        return false;
      }
    },

    // Novo método para verificar e renovar o token se necessário
    async ensureValidToken() {
      const tokenExp = this.getTokenExpiration();
      if (tokenExp && tokenExp - Date.now() < 5 * 60 * 1000) {
        // Se o token expira em menos de 5 minutos
        await this.refreshAuthToken();
      }
    },

    // Método auxiliar para obter a expiração do token
    getTokenExpiration() {
      if (!this.authToken) return null;
      try {
        const payload = JSON.parse(atob(this.authToken.split(".")[1]));
        return payload.exp * 1000; // Converte para milissegundos
      } catch (e) {
        return null;
      }
    },
  },
});

// Interceptor para renovar o token automaticamente
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (
      error.response &&
      error.response.status === 401 &&
      error.config &&
      !error.config.__isRetryRequest
    ) {
      const store = useStore();
      const success = await store.refreshAuthToken();
      if (success) {
        error.config.__isRetryRequest = true;
        error.config.headers["Authorization"] = `Bearer ${store.authToken}`;
        return api(error.config);
      }
    }
    return Promise.reject(error);
  }
);
