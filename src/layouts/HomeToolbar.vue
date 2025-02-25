<template>
  <q-header elevated class="bg-white text-black">
    <div class="container-width">
      <q-toolbar class="q-pa-none">
        <q-toolbar-title shrink class="text-weight-bold q-mr-md">
          <img src="images/logo_sellerbot.png" alt="Logo" class="logo-img" />
        </q-toolbar-title>

        <div class="gt-sm nav-items">
          <q-btn flat no-caps label="Product" />
          <q-btn flat no-caps label="Pricing" />
          <q-btn flat no-caps label="Company" />
          <q-btn flat no-caps label="Resources" />
        </div>

        <q-space />

        <!-- Botões de Login e Signup (exibidos apenas se o usuário não estiver logado) -->
        <template v-if="!currentUser">
          <q-btn
            unelevated
            color="primary"
            label="Login"
            no-caps
            class="login-btn q-mr-sm"
            @click="goToLogin"
          />
          <q-btn
            unelevated
            color="purple"
            label="Signup"
            class="login-btn q-mr-sm"
            no-caps
            @click="goToSignup"
          />
        </template>

        <!-- Nome do usuário, botão de Logout e Sellerbot App (exibidos apenas se o usuário estiver logado) -->
        <template v-else>
          <span class="q-mr-md">Bem-vindo, {{ currentUser.username }}!</span>

          <!-- Botão Sellerbot App -->
          <q-btn
            unelevated
            color="secondary"
            label="Sellerbot App"
            no-caps
            class="app-btn q-mr-sm"
            @click="goToApp"
          />

          <q-btn
            unelevated
            color="negative"
            label="Logout"
            no-caps
            class="logout-btn"
            @click="handleLogout"
          />
        </template>
      </q-toolbar>
    </div>
  </q-header>
</template>

<script setup>
import { computed } from "vue";
import { useRouter } from "vue-router";
import { useStore } from "../stores/store"; // Importa o store para pegar os dados do usuário

// Acessando o roteador para redirecionar
const router = useRouter();
const store = useStore(); // Acessando o store

// Computed para verificar se o usuário está logado
const currentUser = computed(() => store.currentUser);

// Função para redirecionar para a página de Login
const goToLogin = () => {
  router.push("/login"); // Redireciona para a página de login
};

// Função para redirecionar para a página de Signup
const goToSignup = () => {
  router.push("/signup"); // Redireciona para a página de signup
};

// Função para redirecionar para a página /app
const goToApp = () => {
  router.push("/app"); // Redireciona para a página do Sellerbot App
};

// Função de logout
const handleLogout = () => {
  store.logoutUser(); // Chama a função de logout do store
  router.push("/login"); // Redireciona para a página de login após logout
};
</script>

<style lang="scss" scoped>
.container-width {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.q-header {
  .q-toolbar {
    min-height: 64px;
  }
}

.nav-items {
  margin-left: 20px; // Ajuste este valor conforme necessário
}

.q-btn {
  font-weight: 500;
}

/* Estilo para a imagem do logo */
.logo-img {
  max-height: 40px; /* Ajuste a altura máxima do logo */
  width: auto; /* Mantém a proporção da imagem */
}

@media (max-width: 1200px) {
  .container-width {
    max-width: 100%;
  }
}

.login-btn,
.app-btn {
  font-size: 14px;
  padding: 8px 16px;
  border-radius: 10px;
}

.logout-btn {
  font-size: 14px;
  padding: 8px 16px;
  border-radius: 10px;
}

:deep(.q-btn) {
  text-transform: none;
}
</style>
