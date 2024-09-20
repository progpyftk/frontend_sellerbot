<template>
  <q-page class="q-pa-md flex flex-center">
    <q-card class="q-pa-lg" style="width: 400px">
      <q-card-section>
        <div class="text-h6 text-center">Configurações do Usuário</div>
      </q-card-section>

      <q-separator />

      <q-card-section>
        <q-form @submit="updateUser">
          <!-- Campo do nome de usuário -->
          <q-input
            v-model="form.username"
            label="Nome de usuário"
            outlined
            dense
            class="q-mb-md"
            :error="!!errors.username"
            :error-message="errors.username"
          />

          <!-- Campo de email -->
          <q-input
            v-model="form.email"
            label="Email"
            outlined
            dense
            class="q-mb-md"
            :error="!!errors.email"
            :error-message="errors.email"
          />

          <!-- Botão para salvar as alterações -->
          <q-btn
            label="Salvar alterações"
            type="submit"
            color="primary"
            unelevated
            class="q-mt-md full-width"
            :loading="loading"
          />

          <!-- Link para alterar a senha, opcional -->
          <q-btn
            label="Alterar senha"
            flat
            color="secondary"
            class="q-mt-sm full-width"
            @click="showPasswordFields = !showPasswordFields"
          />

          <!-- Campos para alterar a senha, mostrados apenas quando o botão é clicado -->
          <div v-if="showPasswordFields" class="q-mt-md">
            <q-input
              v-model="form.password"
              label="Nova senha"
              type="password"
              outlined
              dense
              class="q-mb-md"
              :error="!!errors.password"
              :error-message="errors.password"
            />
            <q-input
              v-model="form.password_confirmation"
              label="Confirmar nova senha"
              type="password"
              outlined
              dense
              class="q-mb-md"
              :error="!!errors.password_confirmation"
              :error-message="errors.password_confirmation"
            />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue";
import { useStore } from "src/stores/store"; // Pega o store para acessar currentUser

// Acessa o store para buscar o usuário autenticado
const store = useStore();

// Formulário de dados do usuário
const form = reactive({
  username: store.currentUser?.username || "", // Preenche com o valor do currentUser
  email: store.currentUser?.email || "", // Preenche com o valor do currentUser
  password: "",
  password_confirmation: "",
});

// Estado de erros
const errors = reactive({
  username: null,
  email: null,
  password: null,
  password_confirmation: null,
});

// Estado para exibir ou ocultar os campos de senha
const showPasswordFields = ref(false);
const loading = ref(false);

// Função para atualizar os dados do usuário
const updateUser = async () => {
  loading.value = true;
  clearErrors();

  try {
    const response = await api.put("/users/me/", {
      username: form.username,
      email: form.email,
      password: form.password || undefined, // Só envia a senha se ela foi alterada
      password_confirmation: form.password_confirmation || undefined,
    });

    console.log("Dados atualizados com sucesso:", response.data);
    alert("Dados atualizados com sucesso");
  } catch (error) {
    if (error.response && error.response.data) {
      handleValidationErrors(error.response.data);
    } else {
      console.error("Erro ao atualizar dados do usuário:", error);
    }
  } finally {
    loading.value = false;
  }
};

// Limpa os erros antes de uma nova requisição
const clearErrors = () => {
  errors.username = null;
  errors.email = null;
  errors.password = null;
  errors.password_confirmation = null;
};

// Lida com os erros de validação recebidos do backend
const handleValidationErrors = (data) => {
  if (data.username) errors.username = data.username[0];
  if (data.email) errors.email = data.email[0];
  if (data.password) errors.password = data.password[0];
  if (data.password_confirmation)
    errors.password_confirmation = data.password_confirmation[0];
};

onMounted(() => {
  // Popula o formulário com os dados do currentUser se estiver disponível
  if (store.currentUser) {
    form.username = store.currentUser.username;
    form.email = store.currentUser.email;
  }
});
</script>

<style scoped>
/* Ajuste para o formulário */
.full-width {
  width: 100%;
}

.q-input,
.q-btn {
  width: 100%; /* Garante que os inputs e botões ocupem toda a largura do card */
}

.q-card {
  max-width: 400px; /* Define a largura máxima do formulário */
  margin: auto; /* Centraliza o card */
}
</style>
