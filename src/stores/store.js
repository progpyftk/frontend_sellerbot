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
    loginUser(accessToken, refreshToken) {
      this.authToken = accessToken;
      this.refreshToken = refreshToken;

      sessionStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);

      // Configura o cabeçalho do axios com o novo token
      api.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;

      // Buscar o usuário atual após o login
      this.fetchCurrentUser();
    },

    async fetchCurrentUser() {
      try {
        const response = await api.get("/users/me/");
        this.currentUser = response.data;
        localStorage.setItem("currentUser", JSON.stringify(this.currentUser));
        console.log("Usuário atual obtido com sucesso:", this.currentUser);
      } catch (error) {
        console.error("Erro ao buscar o usuário atual:", error);
        this.logoutUser(); // Se não conseguir pegar o currentUser, desloga o usuário
      }
    },

    async ensureValidToken() {
      if (this.isTokenExpired()) {
        const success = await this.refreshAuthToken();
        if (!success) {
          this.logoutUser();
          return false;
        }
      }
      return true;
    },

    async refreshAuthToken() {
      const refreshToken = this.refreshToken;
      if (!refreshToken) {
        console.log(
          "Nenhum refresh token disponível. Redirecionando para o login."
        );
        this.logoutUser();
        return false;
      }

      try {
        console.log(
          "Tentando renovar o token com o refresh token:",
          refreshToken
        );
        const response = await api.post("/users/token/refresh/", {
          refresh: refreshToken,
        });
        const newAccessToken = response.data.access;
        this.loginUser(newAccessToken, refreshToken); // Chama o loginUser para pegar o currentUser
        return true;
      } catch (error) {
        console.error(
          "Erro ao renovar o token:",
          error.response ? error.response.data : error.message
        );
        this.logoutUser();
        return false;
      }
    },

    logoutUser() {
      this.authToken = null;
      this.refreshToken = null;
      this.currentUser = null;

      sessionStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("currentUser");

      delete api.defaults.headers.common["Authorization"];
      router.push("/login"); // Redireciona para login
    },

    isTokenExpired() {
      if (!this.authToken) return true;
      try {
        const payload = JSON.parse(atob(this.authToken.split(".")[1]));
        return Date.now() >= payload.exp * 1000; // Verifica a expiração do token
      } catch (e) {
        return true;
      }
    },
  },
});
