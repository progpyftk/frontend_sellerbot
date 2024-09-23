<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page class="bg-gradient flex flex-center">
        <q-card class="auth-card q-pa-lg">
          <q-card-section class="text-center">
            <q-avatar size="80px" class="q-mb-md">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/MercadoLibre.svg/1200px-MercadoLibre.svg.png"
                alt="MercadoLivre Logo"
              />
            </q-avatar>
            <h4 class="text-weight-bold q-mt-none q-mb-md">Autenticação MercadoLivre</h4>
            <transition
              appear
              enter-active-class="animated fadeIn"
              leave-active-class="animated fadeOut"
            >
              <div v-if="code" key="success">
                <q-icon name="check_circle" color="positive" size="3rem" />
                <p class="text-h6 q-mt-md">Autenticação bem-sucedida!</p>
                <p class="q-mb-lg">Você pode fechar esta guia com segurança.</p>
                <q-btn color="primary" label="Fechar" @click="closeTab" />
              </div>
              <div v-else key="loading">
                <q-spinner-dots color="primary" size="3rem" />
                <p class="text-h6 q-mt-md">Processando sua solicitação</p>
                <p>Por favor, aguarde um momento...</p>
              </div>
            </transition>
          </q-card-section>
        </q-card>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useQuasar } from "quasar";

const $q = useQuasar();
const code = ref(null);

const closeTab = () => {
  window.close();
};

onMounted(() => {
  const urlParams = new URLSearchParams(window.location.search);
  code.value = urlParams.get("code");

  if (code.value) {
    window.opener.postMessage({ type: "ML_AUTH_SUCCESS", code: code.value }, "*");
    $q.notify({
      type: "positive",
      message: "Autenticação concluída com sucesso!",
      position: "top",
      timeout: 2000,
    });
  } else {
    console.log("Nenhum código de autorização encontrado.");
    $q.notify({
      type: "negative",
      message: "Falha na autenticação. Tente novamente.",
      position: "top",
      timeout: 2000,
    });
  }
});
</script>

<style lang="scss" scoped>
.bg-gradient {
  background: linear-gradient(135deg, #4a00e0 0%, #8e2de2 100%);
  min-height: 100vh;
}

.auth-card {
  width: 100%;
  max-width: 400px;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08);
}
</style>
