<template>
  <q-layout view="hHh lpR fFf" class="sb-auth-layout">
    <HomeToolbar />
    <q-page-container>
      <q-page class="sb-auth-page">
        <q-card class="signup-card q-pa-lg">
          <q-card-section class="text-center sb-auth-head">
            <div class="sb-auth-mark">
              <q-icon name="rocket_launch" size="20px" />
            </div>
            <h5 class="sb-auth-title">Crie sua conta</h5>
            <p class="sb-auth-sub">Comece a usar o SellerBot gratuitamente</p>
          </q-card-section>

          <q-card-section>
            <q-form @submit="registerUser" class="q-gutter-md">
              <q-input
                v-model="formattedUsername"
                label="Nome de usuário"
                outlined
                :rules="[(val) => !!val || 'Campo obrigatório']"
                :error="!!usernameError"
                :error-message="usernameError"
              >
                <template v-slot:prepend>
                  <q-icon name="person" color="grey-6" />
                </template>
                <template v-slot:append>
                  <q-icon name="help_outline" class="cursor-pointer" color="grey-6">
                    <q-tooltip>
                      O nome de usuário deve conter apenas letras minúsculas, números, '_'
                      ou '-'. Não pode conter espaços.
                    </q-tooltip>
                  </q-icon>
                </template>
              </q-input>

              <q-input
                v-model="formattedEmail"
                label="Email"
                type="email"
                outlined
                :rules="[(val) => !!val || 'Campo obrigatório', isValidEmail]"
                :error="!!emailError"
                :error-message="emailError"
              >
                <template v-slot:prepend>
                  <q-icon name="email" color="grey-6" />
                </template>
              </q-input>

              <q-input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                label="Senha"
                outlined
                :rules="[(val) => !!val || 'Campo obrigatório', isStrongPassword]"
                :error="!!passwordError"
                :error-message="passwordError"
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

              <q-input
                v-model="passwordConfirmation"
                :type="showPasswordConfirmation ? 'text' : 'password'"
                label="Confirme a Senha"
                outlined
                :rules="[
                  (val) => !!val || 'Campo obrigatório',
                  (val) => val === password || 'As senhas não coincidem',
                ]"
                :error="!!passwordConfirmationError"
                :error-message="passwordConfirmationError"
              >
                <template v-slot:prepend>
                  <q-icon name="lock" color="grey-6" />
                </template>
                <template v-slot:append>
                  <q-icon
                    :name="showPasswordConfirmation ? 'visibility_off' : 'visibility'"
                    class="cursor-pointer"
                    color="grey-6"
                    @click="showPasswordConfirmation = !showPasswordConfirmation"
                  />
                </template>
              </q-input>

              <div class="text-center q-mt-lg">
                <q-btn
                  label="Criar conta"
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
            <span class="sb-auth-foot">Já tem conta?</span>
            <q-btn
              flat
              no-caps
              label="Entrar"
              color="primary"
              @click="goToLogin"
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
import HomeToolbar from "src/layouts/HomeToolbar.vue";

const $q = useQuasar();
const router = useRouter();

const username = ref("");
const email = ref("");
const password = ref("");
const passwordConfirmation = ref("");
const loading = ref(false);
const showPassword = ref(false);
const showPasswordConfirmation = ref(false);

const emailError = ref(null);
const passwordError = ref(null);
const passwordConfirmationError = ref(null);
const usernameError = ref(null);
const quasar = useQuasar();

const notify = (message, type = "positive") => {
  $q.notify({
    message,
    type,
    position: "top",
    timeout: 3000,
    actions: [{ icon: "close", color: "white" }],
  });
};

const formattedUsername = computed({
  get: () => username.value,
  set: (value) => {
    username.value = value.toLowerCase().replace(/[^a-z0-9_-]/g, "");
  },
});

const formattedEmail = computed({
  get: () => email.value,
  set: (value) => {
    email.value = value.toLowerCase();
  },
});

const isValidEmail = (val) => {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(val) || "Email inválido";
};

const isStrongPassword = (val) => {
  const strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[\W_]).{8,}$/;
  return (
    strongPasswordPattern.test(val) ||
    "A senha deve conter pelo menos 8 caracteres, incluindo maiúsculas, minúsculas, números e símbolos"
  );
};

const registerUser = async () => {
  try {
    loading.value = true;
    await api.post("/users/register/", {
      username: username.value,
      email: email.value,
      password: password.value,
      password_confirmation: passwordConfirmation.value,
    });
    notify("Bem-vindo! Seu cadastro foi concluído com sucesso.");
    // Redirecionar para a página de login após um breve delay
    setTimeout(() => {
      router.push("/");
    }, 1000);
  } catch (error) {
    handleRegistrationError(error);
  } finally {
    loading.value = false;
  }
};

const handleRegistrationError = (error) => {
  if (error.response && error.response.data) {
    if (error.response.data.email) {
      emailError.value = "Email já está em uso";
    }
    if (error.response.data.username) {
      usernameError.value = "Nome de usuário já está em uso";
    }
    if (!emailError.value && !usernameError.value) {
      $q.notify({
        color: "negative",
        message: "Erro ao registrar. Tente novamente mais tarde.",
        icon: "report_problem",
      });
    }
  } else {
    $q.notify({
      color: "negative",
      message: "Erro de conexão. Verifique sua rede.",
      icon: "wifi_off",
    });
  }
};

const goToLogin = () => {
  router.push("/login");
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

.signup-card {
  width: 100%;
  max-width: 460px;
  border-radius: 16px !important;
  border: 1px solid #e2e8f0 !important;
  box-shadow: 0 4px 24px rgba(15, 23, 42, 0.06) !important;
  overflow: hidden;
  background: #ffffff;
}

.sb-auth-head { padding-bottom: 8px; }

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
  .signup-card {
    width: 100%;
    max-width: 100%;
  }
}
</style>
