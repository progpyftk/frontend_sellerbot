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
        >=
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
    <q-header class="bg-grey-1" elevated >
      <q-toolbar>
        <q-btn flat round dense icon="mdi-menu" @click="drawer = !drawer" color="primary"></q-btn>
        <q-avatar size="35px">
         <!-- <img src="/assets/laranja.png" alt="logo" /> -->
        </q-avatar>
        <q-toolbar-title style="color: black">
        SellerBot v1.0.0
        </q-toolbar-title>
        <q-space></q-space>
        <div style="color: black">User: {{ currentUser }}</div>
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
import { ref, onMounted, computed } from 'vue';
import { useStore } from '../stores/store';

// Estado do Drawer e Itens do Menu
const drawer = ref(false);
const items = [
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

// Usando Pinia para acessar o estado
const store = useStore();
const currentUser = computed(() => store.currentUser);
const databaseUpdate = computed(() => store.databaseUpdate);

// Lifecycle hook
onMounted(() => {
  console.log('Criando o createCable');
  store.createCable();  // Chama a ação diretamente
});
</script>

<style scoped>
#inspire {
  background-color: var(--q-background-base);
}
</style>
