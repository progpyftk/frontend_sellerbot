<template>
  <q-page class="q-pa-md flex flex-center">
    <div class="text-center">
      <q-spinner size="40px" color="primary" />
      <div class="q-mt-md text-subtitle1">Processando autorização com o Tiny...</div>
    </div>
  </q-page>
</template>

<script setup>
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { api } from "src/boot/axios";
import { useQuasar } from "quasar";

const $q = useQuasar();
const router = useRouter();

onMounted(async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get("code");
  const state = urlParams.get("state");

  console.log("🔁 [TinyCallback] Iniciado com:", { code, state });

  if (!code || !state) {
    $q.notify({ message: "Erro: código ou estado ausente na URL", color: "negative" });
    router.push("/app/accounts");
    return;
  }

  try {
    console.log("📤 [TinyCallback] Enviando para backend /exchange-code...");
    console.log("📤 [TinyCallback] baseURL:", api.defaults.baseURL)
    console.log("🌐 Enviando para:", api.defaults.baseURL + "/tiny/exchange-code/");
    const response = await api.post("/api/erps/tiny/exchange-code/", {
      code,
      state
    });

    console.log("✅ [TinyCallback] Sucesso:", response.data);

    if (response.data?.success !== false) {
      $q.notify({
        message: response.data.message || "Conta Tiny vinculada com sucesso!",
        color: "positive",
        position: "top"
      });
      // ✅ Protege contra recarregamento com o code
      window.history.replaceState({}, document.title, "/app/accounts");
    } else {
      throw new Error(response.data?.error || "Erro desconhecido");
    }

  } catch (error) {
    const message = error?.response?.data?.error || error?.message || "Erro inesperado na vinculação";
    console.error("❌ [TinyCallback] Erro:", message, error);

    $q.notify({
      message,
      color: "negative",
      position: "top"
    });
  } finally {
    setTimeout(() => {
      router.push("/app/accounts"); // caminho corrigido para página de contas
    }, 1500);
  }
});
</script>
