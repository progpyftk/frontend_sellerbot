<template>
  <q-layout view="hHh lpR fFf">
    <HomeToolbar />
    <q-page-container>
      <q-page class="flex flex-center bg-grey-1">
        <q-card class="login-card q-pa-lg">
          <q-card-section class="text-center">
            <h5 class="text-h5 q-mt-sm q-mb-md">Login</h5>
          </q-card-section>

          <q-card-section>
            <q-form @submit="loginUser" class="q-gutter-md">
              <q-input
                v-model="formattedUsernameOrEmail"
                label="Nome de usuário ou Email"
                filled
                :rules="[(val) => !!val || 'Campo obrigatório']"
                :error="!!usernameOrEmailError"
                :error-message="usernameOrEmailError"
              >
                <template v-slot:prepend>
                  <q-icon name="person" />
                </template>
              </q-input>

              <q-input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                label="Senha"
                filled
                :rules="[(val) => !!val || 'Campo obrigatório']"
                :error="!!passwordError"
                :error-message="passwordError"
              >
                <template v-slot:prepend>
                  <q-icon name="lock" />
                </template>
                <template v-slot:append>
                  <q-icon
                    :name="showPassword ? 'visibility_off' : 'visibility'"
                    class="cursor-pointer"
                    @click="showPassword = !showPassword"
                  />
                </template>
              </q-input>

              <div class="text-center q-mt-lg">
                <q-btn
                  label="Entrar"
                  type="submit"
                  color="primary"
                  :loading="loading"
                  size="lg"
                  class="full-width"
                />
              </div>
            </q-form>
          </q-card-section>

          <q-card-section class="text-center q-pa-none">
            <q-btn
              flat
              label="Criar uma conta"
              color="primary"
              @click="goToSignup"
              class="q-mt-sm"
            />
          </q-card-section>
        </q-card>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { api } from "boot/axios";
import { useQuasar } from "quasar";
import { useStore } from "../stores/store";
import HomeToolbar from "src/layouts/HomeToolbar.vue";

const $q = useQuasar();
const router = useRouter();
const store = useStore();

const usernameOrEmail = ref("");
const password = ref("");
const loading = ref(false);
const showPassword = ref(false);

const usernameOrEmailError = ref(null);
const passwordError = ref(null);

const formattedUsernameOrEmail = computed({
  get: () => usernameOrEmail.value,
  set: (value) => {
    // Se o valor parece ser um email, não aplicamos a formatação de username
    if (value.includes("@")) {
      usernameOrEmail.value = value.toLowerCase();
    } else {
      usernameOrEmail.value = value.toLowerCase().replace(/[^a-z0-9_]/g, "");
    }
  },
});

const loginUser = async () => {
  try {
    loading.value = true;
    usernameOrEmailError.value = null;
    passwordError.value = null;

    const response = await api.post("/users/login/", {
      username: usernameOrEmail.value,
      password: password.value,
    });

    const { access: accessToken, refresh: refreshToken, user: userData } = response.data;

    store.loginUser(accessToken, refreshToken, userData);

    $q.notify({
      type: "positive",
      message: "Login realizado com sucesso!",
      position: "top",
      timeout: 2000,
    });

    router.push("/app");
  } catch (error) {
    handleLoginError(error);
  } finally {
    loading.value = false;
  }
};

const handleLoginError = (error) => {
  if (error.response && error.response.data) {
    const errorData = error.response.data;
    if (errorData.detail) {
      $q.notify({
        type: "negative",
        message: errorData.detail,
        position: "top",
        timeout: 3000,
      });
    } else if (errorData.non_field_errors) {
      $q.notify({
        type: "negative",
        message: errorData.non_field_errors[0],
        position: "top",
        timeout: 3000,
      });
    } else {
      $q.notify({
        type: "negative",
        message: "Erro ao fazer login. Verifique suas credenciais.",
        position: "top",
        timeout: 3000,
      });
    }
  } else {
    $q.notify({
      type: "negative",
      message: "Erro de conexão. Verifique sua rede.",
      position: "top",
      timeout: 3000,
    });
  }
};

const goToSignup = () => {
  router.push("/signup");
};
</script>

<style lang="scss" scoped>
.login-card {
  width: 100%;
  max-width: 400px;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08);
}

.q-field {
  &::v-deep(.q-field__control) {
    height: 56px;
  }

  &::v-deep(.q-field__marginal) {
    height: 56px;
  }
}

.q-btn {
  text-transform: none;
}
</style>

