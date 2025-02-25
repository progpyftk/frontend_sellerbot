<template>
  <div>
    <h1>Processando autorização Tiny...</h1>
    <p v-if="error" class="text-negative">{{ error }}</p>
    <p v-else-if="success" class="text-positive">Autorizado com sucesso!</p>
    <p v-else>Por favor, aguarde...</p>
  </div>
</template>

<script>
import { api } from "src/boot/axios";

export default {
  name: "TinyCallback",
  data() {
    return {
      error: null,
      success: false,
    };
  },
  async created() {
    console.info("[TinyCallback] Componente criado. Iniciando fluxo de autorização Tiny...");

    try {
      // 1) Captura o "code" da query string: ?code=...
      const code = this.$route.query.code;
      console.debug("[TinyCallback] Código recebido nos query params:", code);

      if (!code) {
        console.warn("[TinyCallback] Nenhum 'code' encontrado na URL.");
        this.error = "Nenhum code recebido do Tiny.";
        return;
      }

      // 2) Envia esse code para o backend, que trocará pelo access_token
      console.info("[TinyCallback] Enviando 'code' para o backend em /api/tiny/exchange-code...");
      const response = await api.post("/api/tiny/exchange-code", {
        code: code,
      });

      // Checamos se houve sucesso na resposta
      if (response.data && response.data.success) {
        console.info("[TinyCallback] Resposta de sucesso do backend:", response.data);
        this.success = true;
      } else {
        const backendError = response.data?.error || "Erro desconhecido";
        console.error("[TinyCallback] O backend retornou erro:", backendError);
        this.error = backendError;
      }
    } catch (err) {
      // Captura erros de rede ou exceções
      console.error("[TinyCallback] Exceção ao processar code do Tiny:", err);
      this.error = err.message || "Erro ao processar code do Tiny";
    }
  },
};
</script>

<style scoped>
.text-negative {
  color: red;
}

.text-positive {
  color: green;
}
</style>
