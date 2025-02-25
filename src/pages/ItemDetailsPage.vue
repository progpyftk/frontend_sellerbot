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
                <div class="text-subtitle2">Detalhes do Anúncio</div>
                <div class="text-h6 text-weight-bold">Análise do Item</div>
              </div>
            </div>
          </div>
        </q-card-section>

        <q-card-section>
          <!-- Formulário para input do ID da conta e ID do item -->
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
              v-model="itemId"
              label="ID do Anúncio"
              hint="Informe o ID do item"
              class="q-mb-md"
            />
            <q-btn
              label="Buscar Detalhes do Anúncio"
              color="primary"
              @click="fetchItemDetails"
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

          <!-- Exibição dos detalhes do item -->
          <div v-else>
            <vue-json-pretty :data="itemDetails" :deep="10"></vue-json-pretty>
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
const itemId = ref("");
const accountId = ref("");
const itemDetails = ref("");

// Função para buscar detalhes do item
const fetchItemDetails = async () => {
  loading.value = true;
  itemDetails.value = "";

  try {
    // Realiza a chamada para a API do backend
    const response = await api.get(`/mercadolivre/item-details/`, {
      params: {
        item_id: itemId.value,
        account_id: accountId.value,
      },
    });

    // Define os detalhes do item no frontend a partir da resposta do backend
    itemDetails.value = response.data;
  } catch (error) {
    // Notifica o usuário em caso de erro
    $q.notify({
      message: "Erro ao buscar detalhes do item. Por favor, tente novamente.",
      color: "negative",
      position: "top",
      timeout: 2000,
    });
  } finally {
    loading.value = false;
  }
};
</script>
