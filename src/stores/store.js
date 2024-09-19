import { defineStore } from "pinia";
import { api } from "boot/axios"; // Importa o axios configurado
import router from "src/router"; // Importe o router diretamente

export const useStore = defineStore("main", {
  state: () => ({
    authToken: sessionStorage.getItem("accessToken") || "", // Token de acesso
    refreshToken: localStorage.getItem("refreshToken") || "", // Refresh token
    currentUser: JSON.parse(localStorage.getItem("currentUser")) || null, // Dados do usuário atual
  }),
  actions: {
    // Login do usuário
    loginUser(accessToken, refreshToken, userData) {
      this.authToken = accessToken;
      this.refreshToken = refreshToken;
      this.currentUser = userData;

      // Armazena o token de acesso no sessionStorage e o refresh token no localStorage
      sessionStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);

      // Armazena o usuário logado no localStorage
      localStorage.setItem("currentUser", JSON.stringify(this.currentUser));
    },

    // Buscar os dados do usuário logado
    async fetchCurrentUser() {
      try {
        const response = await api.get("/users/me/"); // Supondo que a URL seja essa para obter o usuário
        this.currentUser = response.data;

        // Armazena o usuário logado no localStorage
        localStorage.setItem("currentUser", JSON.stringify(this.currentUser));
      } catch (error) {
        console.error("Erro ao buscar o usuário atual", error);
        this.logoutUser(); // Faz logout se der erro ao buscar o usuário
      }
    },

    // Logout do usuário
    logoutUser() {
      this.authToken = null;
      this.refreshToken = null;
      this.currentUser = null;

      // Remove os dados do sessionStorage e localStorage
      sessionStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("currentUser");
      console.log("Usuário deslogado");
      console.log(this.currentUser);
      console.log(this.authToken);
      console.log(this.refreshToken);
      // Redirecionar para a página de login
      router.push("/login");
    },
  },
});
