<template>
  <q-layout view="hHh lpR fFf" class="sb-auth-layout">
    <HomeToolbar />
    <q-page-container>
      <q-page class="sb-auth-page">
        <q-card class="login-card q-pa-lg">
          <q-card-section class="text-center sb-auth-head">
            <div class="sb-auth-mark">
              <q-icon name="rocket_launch" size="20px" />
            </div>
            <h5 class="sb-auth-title">Entrar no SellerBot</h5>
            <p class="sb-auth-sub">Acesse seu painel de inteligência de vendas</p>
          </q-card-section>

          <q-card-section>
            <q-form @submit="loginUser" class="q-gutter-md">
              <q-input
                v-model="formattedUsernameOrEmail"
                label="Nome de usuário ou Email"
                outlined
                :rules="[(val) => !!val || 'Campo obrigatório']"
                :error="!!usernameOrEmailError"
                :error-message="usernameOrEmailError"
                class="sb-input"
              >
                <template v-slot:prepend>
                  <q-icon name="person" color="grey-6" />
                </template>
              </q-input>

              <q-input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                label="Senha"
                outlined
                :rules="[(val) => !!val || 'Campo obrigatório']"
                :error="!!passwordError"
                :error-message="passwordError"
                class="sb-input"
              >
                <template v-slot:prepend>
                  <q-icon name="lock" color="grey-6" />
                </template>
                <template v-slot:append>
                  <q-icon
                    :name="showPassword ? 'visibility_off' : 'visibility'"
                    class="cursor-pointer"
                    color="grey-6"
                    @click="showPassword = !showPassword"
                  />
                </template>
              </q-input>

              <div class="text-center q-mt-lg">
                <q-btn
                  label="Entrar"
                  type="submit"
                  color="primary"
                  unelevated
                  :loading="loading"
                  size="md"
                  class="full-width sb-btn-primary"
                />
              </div>
            </q-form>
          </q-card-section>

          <q-card-section class="text-center q-pa-none q-pt-md">
            <span class="sb-auth-foot">Ainda não tem conta?</span>
            <q-btn
              flat
              no-caps
              label="Criar conta"
              color="primary"
              @click="goToSignup"
              class="q-mt-xs"
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
import { normalizeUsername } from "src/utils/username";

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
       usernameOrEmail.value = normalizeUsername(value);
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
.sb-auth-layout { background: #f8fafc; }
.sb-auth-page {
  min-height: calc(100vh - 68px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  background: #f8fafc;
  background-image:
    radial-gradient(ellipse 600px 400px at 50% 0%, rgba(13, 148, 136, 0.06), transparent 60%);
}

.login-card {
  width: 100%;
  max-width: 420px;
  border-radius: 16px !important;
  border: 1px solid #e2e8f0 !important;
  box-shadow: 0 4px 24px rgba(15, 23, 42, 0.06) !important;
  overflow: hidden;
  background: #ffffff;
}

.sb-auth-head {
  padding-bottom: 8px;
}

.sb-auth-mark {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #0d9488, #14b8a6);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  box-shadow: 0 6px 16px rgba(13, 148, 136, 0.25);
}

.sb-auth-title {
  font-size: 22px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 4px;
  letter-spacing: -0.4px;
}

.sb-auth-sub {
  font-size: 13px;
  color: #64748b;
  margin: 0;
}

.sb-btn-primary {
  border-radius: 8px !important;
  padding: 10px 20px !important;
  font-weight: 600 !important;
  box-shadow: 0 4px 12px rgba(13, 148, 136, 0.25) !important;
}

.sb-auth-foot {
  color: #64748b;
  font-size: 13px;
  margin-right: 4px;
}

@media (max-width: 480px) {
  .login-card {
    margin: 0;
    width: 100%;
    max-width: 100%;
  }
}
</style>
