<template>
  <q-page class="flex flex-center">
    <q-card class="q-pa-lg" style="width: 350px; margin-top: 40px;">
      <q-card-section>
        <div class="text-h6 text-center">Registro de Usuário</div>
      </q-card-section>

      <q-card-section>
        <!-- Exibição do erro, caso exista -->
        <q-alert
          v-if="errorMessages.length"
          color="negative"
          icon="warning"
          class="custom-alert"
          dense
          style="width: 100%;"
        >
          <ul class="error-list">
            <li v-for="(message, index) in errorMessages" :key="index" class="error-message">{{ message }}</li>
          </ul>
        </q-alert>

        <q-form @submit="registerUser">
          <q-input
            v-model="username"
            label="Nome de usuário"
            outlined
            required
            class="q-mb-md"
            :error="!!usernameError"
            :error-message="usernameError"
          />
          <q-input
            v-model="email"
            label="Email"
            type="email"
            outlined
            required
            class="q-mb-md"
            :error="!!emailError"
            :error-message="emailError"
            @blur="validateEmail"
          />
          <q-input
            v-model="password"
            label="Senha"
            type="password"
            outlined
            required
            class="q-mb-md"
            @blur="validatePasswords"
            @input="validatePasswords"
            :error="!!passwordError"
            :error-message="passwordError"
          />
          <q-input
            v-model="passwordConfirmation"
            label="Confirme a Senha"
            type="password"
            outlined
            required
            class="q-mb-md"
            @blur="validatePasswords"
            @input="validatePasswords"
            :error="!!passwordConfirmationError"
            :error-message="passwordConfirmationError"
          />
          <q-btn
            label="Registrar"
            type="submit"
            color="primary"
            class="full-width q-mt-md"
            :loading="loading"
          />
        </q-form>

        <q-card-actions align="center" class="q-pt-none">
          <q-btn flat label="Já tenho uma conta" color="primary" @click="goToLogin" />
        </q-card-actions>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import { useStore } from '../stores/store'; // Importando o store principal

const username = ref('');
const email = ref('');
const password = ref('');
const passwordConfirmation = ref('');
const loading = ref(false);
const router = useRouter();
const store = useStore(); // Acessando o store
const errorMessages = ref([]); // Variável para armazenar a lista de erros
const emailError = ref(null);
const passwordError = ref(null);
const passwordConfirmationError = ref(null);
const usernameError = ref(null);

const registerUser = () => {
  errorMessages.value = [];

  if (password.value !== passwordConfirmation.value) {
    passwordConfirmationError.value = "As senhas não coincidem";
    return;
  }

  loading.value = true;

  axios
    .post(`${store.backend_host}/users/register/`, {
      username: username.value,
      email: email.value,
      password: password.value,
      password_confirmation: passwordConfirmation.value,
    })
    .then((response) => {
      console.log(response.data);
      router.push('/signup-success');
    })
    .catch((error) => {
      if (error.response && error.response.data) {
        if (error.response.data.email) {
          errorMessages.value.push("Email informado já está em uso.");
        }
        if (error.response.data.username) {
          errorMessages.value.push("Usuário informado já está em uso.");
        }
        if (!errorMessages.value.length) {
          errorMessages.value.push('Erro desconhecido. Tente novamente mais tarde.');
        }
      } else {
        errorMessages.value = ['Erro de conexão. Verifique sua rede.'];
      }
    })
    .finally(() => {
      loading.value = false; // Finaliza o carregamento
    });
};

// Validação de email
const validateEmail = () => {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email.value)) {
    emailError.value = "O formato do email é inválido";
  } else {
    emailError.value = null;
  }
};

// Validação de senhas
const validatePasswords = () => {
  const strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[\W_]).{8,}$/;

  if (!strongPasswordPattern.test(password.value)) {
    passwordError.value = "A senha deve ter pelo menos 8 caracteres, incluindo letras maiúsculas, minúsculas, números e símbolos.";
  } else {
    passwordError.value = null;
  }

  if (passwordConfirmation.value !== password.value) {
    passwordConfirmationError.value = "As senhas não coincidem";
  } else {
    passwordConfirmationError.value = null;
  }
};

const goToLogin = () => {
  router.push('/login'); // Redireciona para a página de login
};
</script>

<style scoped>
.full-width {
  width: 100%;
}
.text-center {
  text-align: center;
}

.error-message {
  color: red;
}
.error-list {
  list-style-type: disc;
  padding-left: 5px;
  margin: 10px;
}
</style>
