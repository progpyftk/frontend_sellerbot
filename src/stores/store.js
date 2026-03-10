import { defineStore } from "pinia";
import { api } from "boot/axios";

// Veja se não há duas linhas importando as mesmas coisas do tokenService
import {
  getAccessToken, getRefreshToken,
  setAccessToken, setRefreshToken, clearTokens
} from "src/services/tokenService";

export const useStore = defineStore("main", {
  state: () => ({
    authToken: getAccessToken() || "",
    refreshToken: getRefreshToken() || "",
    currentUser: JSON.parse(localStorage.getItem("currentUser")) || null,
  }),

  // Um getter para a interface saber facilmente se está logado
  getters: {
    isAuthenticated: (state) => !!state.authToken,
  },

  actions: {
    // Agora recebe os dados do usuário vindos do login para economizar requisições
    loginUser(accessToken, refreshToken, userData = null) {
      this.updateTokensState(accessToken, refreshToken);

      if (userData) {
        this.currentUser = userData;
        localStorage.setItem("currentUser", JSON.stringify(this.currentUser));
      } else {
        this.fetchCurrentUser();
      }
    },

    // Separa a lógica de salvar os tokens no state e no storage
    updateTokensState(accessToken, refreshToken) {
      this.authToken = accessToken;
      this.refreshToken = refreshToken;

      setAccessToken(accessToken);
      if (refreshToken) setRefreshToken(refreshToken);

      api.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
    },

    async fetchCurrentUser() {
      try {
        const response = await api.get("/users/me/");
        this.currentUser = response.data;
        localStorage.setItem("currentUser", JSON.stringify(this.currentUser));
      } catch (error) {
        console.error("Erro ao buscar o usuário atual:", error);
        this.logoutUser();
      }
    },

    logoutUser() {
      this.authToken = "";
      this.refreshToken = "";
      this.currentUser = null;

      clearTokens();
      delete api.defaults.headers.common["Authorization"];

      if (this.$router) {
        this.$router.push("/login");
      }
    }
  },
});
