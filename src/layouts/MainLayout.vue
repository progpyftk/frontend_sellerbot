<template>
  <q-layout view="hHh lpR fFf" id="inspire">
    <!-- Menu Lateral -->
    <q-drawer v-model="drawer" side="left" :content-class="'bg-grey-1'" bordered>
      <q-list dense>
        <q-item-label header class="text-primary">Navegação</q-item-label>
        <q-separator spaced></q-separator>

        <q-item
          v-for="item in items"
          :key="item.title"
          :to="item.router_name"
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
    <q-header class="bg-grey-1" elevated>
      <q-toolbar>
        <q-btn flat round dense icon="mdi-menu" @click="drawer = !drawer" color="primary"></q-btn>
        <q-avatar size="35px">
          <!-- <img src="/assets/laranja.png" alt="logo" /> -->
        </q-avatar>
        <q-toolbar-title style="color: black">
          SellerBot v1.0.0
        </q-toolbar-title>
        <q-space></q-space>

        <!-- Exibe o nome do usuário logado -->
        <div v-if="currentUser" style="color: black">User: {{ currentUser.username }}</div>
        <div v-else style="color: black">User: Guest</div>

        <!-- Condicional para exibir botão de Login ou Logout -->
        <q-btn
          v-if="currentUser"
          flat
          icon="exit_to_app"
          @click="handleLogout"
          label="Logout"
          color="negative"
          class="q-ml-md"
        />
        <q-btn
          v-else
          flat
          icon="login"
          @click="redirectToLogin"
          label="Login"
          color="primary"
          class="q-ml-md"
        />

        <q-space></q-space>
        <div style="color: black">Database: {{ databaseUpdate }}</div>
      </q-toolbar>
    </q-header>

    <!-- Conteúdo Principal -->
    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useStore } from '../stores/store'; // Importa o store
import { useRouter } from 'vue-router'; // Importa o router para redirecionamento

const store = useStore();
const router = useRouter(); // Para fazer o redirecionamento

// Estado do Drawer e Itens do Menu
const drawer = ref(false);
const items = [
  { title: "Signup", icon: "mdi-login", router_name: "/signup" },
  { title: "Login", icon: "mdi-login", router_name: "/login" },
  { title: "Contas", icon: "mdi-playlist-edit", router_name: "/accounts" },
  { title: "Full Sem Estoque", icon: "mdi-package-variant", router_name: "/no-stock-fulfillment" },
  { title: "Frete Grátis", icon: "mdi-truck-fast", router_name: "/free-shipping" },
  { title: "Flex - Fulfillment", icon: "mdi-truck-fast", router_name: "/flex" },
  { title: "API - Dados Fiscais", icon: "mdi-api", router_name: "/fiscal-data" },
  { title: "API - Dados Gerais", icon: "mdi-api", router_name: "/general-data" },
  { title: "Atualizar DB - Tiny", icon: "mdi-database", router_name: "/update-db" },
  { title: "Promoções", icon: "mdi-database", router_name: "/deals" },
];

// Computed para pegar o usuário atual
const currentUser = computed(() => store.currentUser);

// Computed para a atualização do banco de dados
const databaseUpdate = computed(() => store.databaseUpdate);

// Função de logout
const handleLogout = () => {
  store.logoutUser(); // Chama a função de logout do store
  router.push('/login'); // Redireciona para a página de login
};

// Redireciona para a página de login
const redirectToLogin = () => {
  router.push('/login');
};
</script>

<style scoped>
#inspire {
  background-color: var(--q-background-base);
}
</style>
