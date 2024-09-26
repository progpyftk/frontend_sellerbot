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
                <div class="text-subtitle2">Anúncios com Frete Grátis</div>
                <div class="text-h6 text-weight-bold">Gerenciamento de Itens</div>
              </div>
            </div>
          </div>
        </q-card-section>

        <q-card-section>
          <div v-if="loading" class="flex flex-center q-pa-xl">
            <q-spinner color="primary" size="3em" />
          </div>

          <template v-else>
            <div v-if="items.length > 0">
              <q-table
                :rows="items"
                :columns="columns"
                row-key="id"
                flat
                bordered
                separator="cell"
                :pagination="{ rowsPerPage: 10 }"
              >
                <template v-slot:body-cell-title="props">
                  <q-td :props="props">
                    <a
                      :href="props.row.permalink"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-primary"
                    >
                      {{ props.row.title }}
                    </a>
                  </q-td>
                </template>

                <!-- Template for the remove button -->
                <template v-slot:body-cell-remove_free_shipping="props">
                  <q-td :props="props">
                    <q-btn
                      color="negative"
                      label="Remover Frete Grátis"
                      @click="removeFreeShipping(props.row.account_id, props.row.id)"
                    />
                  </q-td>
                </template>
              </q-table>
            </div>

            <div v-else class="text-center q-pa-xl">
              <q-icon name="shopping_cart" size="6em" color="grey-5" />
              <p class="text-h6 q-mt-md">Nenhum item encontrado com frete grátis.</p>
              <p class="text-subtitle1 q-mt-sm">
                Verifique suas contas do MercadoLivre ou adicione novas.
              </p>
            </div>
          </template>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { api } from "src/boot/axios";
import { useQuasar } from "quasar";

const $q = useQuasar();
const loading = ref(true);
const items = ref([]);

// Define as colunas da tabela com nomes significativos, incluindo a nova coluna de ação
const columns = [
  { name: "account_id", align: "left", label: "Conta (ID)", field: "account_id" },
  {
    name: "seller_nickname",
    align: "left",
    label: "Nome da Conta",
    field: "seller_nickname",
  },
  { name: "id", align: "left", label: "ID do Anúncio", field: "id" },
  {
    name: "title",
    align: "left",
    label: "Título",
    field: "title",
  },
  {
    name: "price",
    align: "left",
    label: "Preço Atual (R$)",
    field: "price",
    format: (val) => `R$ ${val.toFixed(2)}`,
  },
  {
    name: "original_price",
    align: "left",
    label: "Preço Original (R$)",
    field: "original_price",
    format: (val) => (val ? `R$ ${val.toFixed(2)}` : "-"),
  },
  {
    name: "available_quantity",
    align: "left",
    label: "Quantidade Disponível",
    field: "available_quantity",
  },
  {
    name: "free_shipping",
    align: "left",
    label: "Frete Grátis",
    field: "free_shipping",
    format: (val) => (val ? "Sim" : "Não"),
  },
  {
    name: "logistic_type",
    align: "left",
    label: "Tipo de Logística",
    field: "logistic_type",
  },
  {
    name: "remove_free_shipping",
    align: "center",
    label: "Remover Frete Grátis",
    field: "remove_free_shipping",
  },
];

// Função para buscar os itens com frete grátis do backend
const getItemsWithFreeShipping = async () => {
  loading.value = true;
  try {
    // Realiza a chamada para o endpoint que retorna os itens com frete grátis
    const response = await api.get("/mercadolivre/free-shipping/");
    // Define a lista de itens no frontend a partir da resposta do backend
    items.value = Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    // Notifica o usuário em caso de erro
    items.value = [];
    $q.notify({
      message: "Erro ao buscar itens com frete grátis. Por favor, tente novamente.",
      color: "negative",
      position: "top",
      timeout: 2000,
    });
  } finally {
    loading.value = false;
  }
};

// Função para remover o frete grátis
const removeFreeShipping = async (accountId, itemId) => {
  loading.value = true;
  try {
    await api.post("/mercadolivre/remove-free-shipping/", {
      account_id: accountId,
      item_id: itemId,
    });

    // Notifica o usuário sobre a alteração bem-sucedida
    $q.notify({
      message: "Frete grátis removido com sucesso!",
      color: "positive",
      position: "top",
      timeout: 2000,
    });

    // Recarrega os itens para atualizar a tabela
    await getItemsWithFreeShipping();
  } catch (error) {
    $q.notify({
      message: "Erro ao remover frete grátis. Por favor, tente novamente.",
      color: "negative",
      position: "top",
      timeout: 2000,
    });
  } finally {
    loading.value = false;
  }
};

// Ao montar a página, buscamos os itens com frete grátis
onMounted
(() => {
  getItemsWithFreeShipping();
});
</script>
