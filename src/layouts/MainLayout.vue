<template>
  <q-layout view="hHh lpR fFf" id="inspire">
    <!-- Menu Lateral -->
    <q-drawer
      v-model="drawer"
      side="left"
      :content-class="'bg-grey-1'"
      bordered
      show-if-above
    >
      <q-list dense>
        <q-item-label header class="text-primary">Navegação</q-item-label>
        <q-separator spaced></q-separator>

        <q-item
          v-for="item in items"
          :key="item.title"
          :to="{ name: item.router_name }"
          clickable
          v-ripple
        >
          <q-item-section avatar>
            <q-icon :name="item.icon"></q-icon>
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ item.title }}</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <!-- Barra Superior -->
    <q-header class="bg-white text-black" elevated>
      <q-toolbar class="q-pa-none">
        <!-- Botão para abrir o menu lateral, fixado à esquerda -->
        <q-btn
          flat
          round
          size="lg"
          icon="mdi-menu"
          @click="drawer = !drawer"
          color="primary"
        ></q-btn>

        <!-- Espaço flexível para empurrar logo para o centro -->
        <q-space />

        <!-- Logo SellerBot -->
        <q-toolbar-title class="text-center">
          <img src="/images/logo_sellerbot.png" alt="Logo" class="logo-img" />
        </q-toolbar-title>

        <!-- Espaço flexível para empurrar os elementos de login/logout para a direita -->
        <q-space />

        <!-- Coluna com os botões de login/logout à direita -->
        <div
          style="
            display: flex;
            justify-content: flex-end;
            align-items: center;
            margin-right: 20px;
          "
        >
          <template v-if="currentUser">
            <span class="q-mr-md">Bem-vindo, {{ currentUser.username }}!</span>
            <q-btn
              unelevated
              color="negative"
              label="Logout"
              no-caps
              class="logout-btn"
              @click="handleLogout"
            />
          </template>
          <template v-else>
            <q-btn
              unelevated
              color="primary"
              label="Login"
              no-caps
              class="login-btn"
              @click="redirectToLogin"
            />
          </template>
        </div>
      </q-toolbar>
    </q-header>

    <!-- Conteúdo Principal -->
    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, computed } from "vue";
import { useStore } from "../stores/store"; // Importa o store
import { useRouter } from "vue-router"; // Importa o router para redirecionamento

const store = useStore();
const router = useRouter(); // Para fazer o redirecionamento

// Estado do Drawer e Itens do Menu
const drawer = ref(true); // Menu começa aberto

// Itens do menu
const items = [
  { title: "Contas", icon: "mdi-playlist-edit", router_name: "accounts" },
  {
    title: "Full Sem Estoque",
    icon: "mdi-package-variant",
    router_name: "/no-stock-fulfillment",
  },
  { title: "Frete Grátis", icon: "mdi-truck-fast", router_name: "/free-shipping" },
  { title: "Flex - Fulfillment", icon: "mdi-truck-fast", router_name: "/flex" },
  { title: "API - Dados Fiscais", icon: "mdi-api", router_name: "/fiscal-data" },
  { title: "API - Dados Gerais", icon: "mdi-api", router_name: "/general-data" },
  { title: "Atualizar DB - Tiny", icon: "mdi-database", router_name: "/update-db" },
  { title: "Promoções", icon: "mdi-database", router_name: "/deals" },
];

// Computed para pegar o usuário atual
const currentUser = computed(() => store.currentUser);

// Função de logout
const handleLogout = () => {
  store.logoutUser(); // Chama a função de logout do store
  router.push("/login"); // Redireciona para a página de login
};

// Redireciona para a página de login
const redirectToLogin = () => {
  router.push("/login");
};
</script>

<style scoped>
.q-header {
  .q-toolbar {
    min-height: 64px;
  }
}

.logo-img {
  max-height: 40px;
  width: auto;
}

/* Estilo para alinhar os botões de login/logout */
.logout-btn,
.login-btn {
  font-size: 14px;
  padding: 8px 16px;
  border-radius: 10px;
}

.q-btn {
  font-weight: 500;
}

:deep(.q-btn) {
  text-transform: none;
}
</style>
