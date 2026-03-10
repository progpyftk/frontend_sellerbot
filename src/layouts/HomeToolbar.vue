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

        <template v-if="!store.isAuthenticated">
          <q-btn unelevated color="primary" label="Login" no-caps class="login-btn q-mr-sm" @click="goToLogin" />
          <q-btn unelevated color="purple" label="Signup" class="login-btn q-mr-sm" no-caps @click="goToSignup" />
        </template>

        <template v-else>
          <span class="q-mr-md gt-xs">Bem-vindo, {{ store.currentUser?.username || 'Usuário' }}!</span>

          <q-btn unelevated color="secondary" label="Sellerbot App" no-caps class="app-btn q-mr-sm" @click="goToApp" />

          <q-btn unelevated color="negative" label="Logout" no-caps class="logout-btn" @click="handleLogout" />
        </template>
      </q-toolbar>
    </div>
  </q-header>
</template>

<script setup>
import { useRouter } from "vue-router";
import { useStore } from "../stores/store";

const router = useRouter();
const store = useStore();

const goToLogin = () => {
  router.push("/login");
};

const goToSignup = () => {
  router.push("/signup");
};

const goToApp = () => {
  router.push("/app");
};

const handleLogout = () => {
  store.logoutUser();
  // O router.push('/login') já está sendo feito dentro do logoutUser() no store,
  // mas se preferir garantir, pode deixar aqui também sem problemas.
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
  margin-left: 20px;
}

.q-btn {
  font-weight: 500;
}

.logo-img {
  max-height: 40px;
  width: auto;
}

@media (max-width: 1200px) {
  .container-width {
    max-width: 100%;
  }
}

.login-btn,
.app-btn,
.logout-btn {
  font-size: 14px;
  padding: 8px 16px;
  border-radius: 10px;
}

:deep(.q-btn) {
  text-transform: none;
}
</style>
