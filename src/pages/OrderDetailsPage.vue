<template>
  <q-page class="bg-grey-1">
    <div class="q-pa-md">
      <q-card flat bordered class="bg-white">
        <q-card-section class="bg-primary text-white">
          <div class="row items-center justify-between q-col-gutter-md">
            <div class="col-grow row items-center">
              <img
                src="https://logospng.org/wp-content/uploads/mercado-livre.jpg"
                alt="MercadoLivre Logo"
                style="width: 50px; height: 50px; object-fit: contain"
                class="q-mr-md"
              />
              <div>
                <div class="text-subtitle2">Detalhes da Venda</div>
                <div class="text-h6 text-weight-bold">Análise de Ordens</div>
              </div>
            </div>
          </div>
        </q-card-section>

        <q-card-section>
          <!-- Formulário para input do ID da conta e ID da ordem -->
          <div class="q-pa-md">
            <q-input
              filled
              v-model="accountId"
              label="ID da Conta"
              hint="Informe o ID da conta do Mercado Livre"
              class="q-mb-md"
            />
            <q-input
              filled
              v-model="orderId"
              label="ID da Ordem"
              hint="Informe o ID da ordem"
              class="q-mb-md"
            />
            <q-btn
              label="Buscar Detalhes da Ordem"
              color="primary"
              @click="fetchOrderDetails"
              :loading="loading"
              unelevated
            />
          </div>
        </q-card-section>

        <q-card-section>
          <!-- Spinner de carregamento -->
          <div v-if="loading" class="flex flex-center q-pa-xl">
            <q-spinner color="primary" size="3em" />
          </div>

          <!-- Exibição dos detalhes da ordem -->
          <div v-else>
            <vue-json-pretty :data="orderDetails" :deep="3"></vue-json-pretty>
          </div>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup>
import { ref } from "vue";
import { api } from "src/boot/axios";
import { useQuasar } from "quasar";
import VueJsonPretty from "vue-json-pretty";
import "vue-json-pretty/lib/styles.css";

const $q = useQuasar();
const loading = ref(false);
const orderId = ref("");
const accountId = ref("");
const orderDetails = ref("");

// Função para buscar detalhes da order
const fetchOrderDetails = async () => {
  loading.value = true;
  orderDetails.value = "";

  try {
    // Realiza a chamada para a API do backend
    const response = await api.get(`/mercadolivre/order-detail/`, {
      params: {
        order_id: orderId.value,
        account_id: accountId.value,
      },
    });

    // Define os detalhes da order no frontend a partir da resposta do backend
    orderDetails.value = response.data;
  } catch (error) {
    // Notifica o usuário em caso de erro
    $q.notify({
      message: "Erro ao buscar detalhes da ordem. Por favor, tente novamente.",
      color: "negative",
      position: "top",
      timeout: 2000,
    });
  } finally {
    loading.value = false;
  }
};
</script>
