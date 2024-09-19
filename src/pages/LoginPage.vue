<!-- src/pages/LoginPage.vue -->

<template>
  <q-layout view="hHh lpR fFf">
    <!-- Incluindo a toolbar personalizada no layout -->
    <HomeToolbar />

    <!-- Container para as páginas dentro do layout -->
    <q-page-container>
      <!-- Página de login -->
      <q-page class="flex flex-center">
        <q-card class="q-pa-lg" style="width: 350px; margin-top: 40px">
          <q-card-section>
            <div class="text-h6 text-center">Login</div>
          </q-card-section>

          <q-card-section>
            <q-alert v-if="errorMessage" color="negative" icon="warning" class="q-mb-md">
              {{ errorMessage }}
            </q-alert>

            <q-form @submit="loginUser">
              <!-- Atualização para aceitar nome de usuário ou email -->
              <q-input
                v-model="usernameOrEmail"
                label="Email ou Nome de Usuário"
                type="text"
                outlined
                required
                class="q-mb-md"
              />
              <q-input
                v-model="password"
                label="Senha"
                type="password"
                outlined
                required
                class="q-mb-md"
              />
              <q-btn
                label="Login"
                type="submit"
                color="primary"
                class="full-width q-mt-md"
                :loading="loading"
              />
            </q-form>
          </q-card-section>
        </q-card>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { api } from "boot/axios"; // Importando o `api` configurado
import { useStore } from "../stores/store"; // Importando o store principal
import HomeToolbar from "src/layouts/HomeToolbar.vue";

const usernameOrEmail = ref("");
const password = ref("");
const loading = ref(false);
const errorMessage = ref(null);
const router = useRouter();
const store = useStore(); // Acessando o store

const loginUser = () => {
  loading.value = true;
  errorMessage.value = null;

  api
    .post("/users/login/", {
      username: usernameOrEmail.value, // Usando 'username' para o campo
      password: password.value,
    })
    .then((response) => {
      console.log("Login Response:", response.data);
      const accessToken = response.data.access;
      const refreshToken = response.data.refresh;
      const userData = response.data.user; // Definindo `userData`

      // Chama a ação para armazenar o token e o usuário logado
      store.loginUser(accessToken, refreshToken, userData);

      // Redireciona para a página principal
      router.push("/app"); // Ajuste para redirecionar para a rota principal autenticada
    })
    .catch((error) => {
      if (error.response && error.response.data) {
        errorMessage.value =
          error.response.data.detail ||
          error.response.data.non_field_errors ||
          "Erro ao fazer login. Verifique suas credenciais.";
      } else {
        errorMessage.value = "Erro de rede. Tente novamente mais tarde.";
      }
      console.error("Erro no login:", error.response?.data || error);
    })
    .finally(() => {
      loading.value = false;
    });
};
</script>
