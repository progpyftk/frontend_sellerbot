<template>
  <q-layout view="hHh lpR fFf">
    <HomeToolbar />
    <q-page-container>
      <q-page class="flex flex-center bg-grey-1">
        <q-card class="signup-card q-pa-lg">
          <q-card-section class="text-center">
            <h5 class="text-h5 q-mt-sm q-mb-md">Crie sua conta</h5>
          </q-card-section>

          <q-card-section>
            <q-form @submit="registerUser" class="q-gutter-md">
              <q-input
                v-model="formattedUsername"
                label="Nome de usuário"
                filled
                :rules="[(val) => !!val || 'Campo obrigatório']"
                :error="!!usernameError"
                :error-message="usernameError"
              >
                <template v-slot:prepend>
                  <q-icon name="person" />
                </template>
                <template v-slot:append>
                  <q-icon name="help_outline" class="cursor-pointer">
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
                filled
                :rules="[(val) => !!val || 'Campo obrigatório', isValidEmail]"
                :error="!!emailError"
                :error-message="emailError"
              >
                <template v-slot:prepend>
                  <q-icon name="email" />
                </template>
              </q-input>

              <q-input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                label="Senha"
                filled
                :rules="[(val) => !!val || 'Campo obrigatório', isStrongPassword]"
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

              <q-input
                v-model="passwordConfirmation"
                :type="showPasswordConfirmation ? 'text' : 'password'"
                label="Confirme a Senha"
                filled
                :rules="[
                  (val) => !!val || 'Campo obrigatório',
                  (val) => val === password || 'As senhas não coincidem',
                ]"
                :error="!!passwordConfirmationError"
                :error-message="passwordConfirmationError"
              >
                <template v-slot:prepend>
                  <q-icon name="lock" />
                </template>
                <template v-slot:append>
                  <q-icon
                    :name="showPasswordConfirmation ? 'visibility_off' : 'visibility'"
                    class="cursor-pointer"
                    @click="showPasswordConfirmation = !showPasswordConfirmation"
                  />
                </template>
              </q-input>

              <div class="text-center q-mt-lg">
                <q-btn
                  label="Registrar"
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
              label="Já tenho uma conta"
              color="primary"
              @click="goToLogin"
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
.signup-card {
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
