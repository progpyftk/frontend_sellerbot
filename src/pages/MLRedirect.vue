<!-- src/pages/MLRedirect.vue -->
<template>
  <div class="flex flex-center" style="height: 100vh">
    <q-card class="text-center">
      <q-card-section>
        <h5 class="q-mt-none">Autenticação MercadoLivre</h5>
        <p v-if="code">
          Código de autorização recebido: <strong>{{ code }}</strong>
        </p>
        <p v-else>Processando... Por favor, feche esta janela.</p>
      </q-card-section>
      <q-card-actions align="center">
        <q-btn color="primary" label="Fechar Janela" @click="closeWindow" />
      </q-card-actions>
    </q-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";

const code = ref(null);

onMounted(() => {
  const urlParams = new URLSearchParams(window.location.search);
  code.value = urlParams.get("code");
  if (code.value) {
    console.log("Código de autorização recebido:", code.value); // Exibe o code no console
    window.opener.postMessage({ type: "ML_AUTH_SUCCESS", code: code.value }, "*");
  } else {
    console.log("Nenhum código de autorização encontrado.");
  }
});

const closeWindow = () => {
  if (code.value) {
    alert("Por favor, feche esta janela.");
  }
  setTimeout(() => window.close(), 3000); // Fecha a janela após 3 segundos
};
</script>
