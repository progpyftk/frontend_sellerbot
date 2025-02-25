<template>
  <q-page class="bg-grey-1">
    <div class="q-pa-md">
      <q-card flat bordered class="bg-white">
        <!-- CABEÇALHO -->
        <q-card-section class="bg-primary text-white">
          <div class="row items-center justify-between q-col-gutter-md">
            <div class="col-grow row items-center">
              <img src="https://logospng.org/wp-content/uploads/mercado-livre.jpg" alt="MercadoLivre Logo"
                style="width: 50px; height: 50px; object-fit: contain" class="q-mr-md" />
              <div>
                <div class="text-subtitle2">Anúncios Fulfillment Sem Estoque</div>
                <div class="text-h6 text-weight-bold">
                  Remover do Full
                </div>
              </div>
            </div>
          </div>
        </q-card-section>

        <!-- CORPO -->
        <q-card-section>
          <!-- Spinner de carregamento -->
          <div v-if="loading" class="flex flex-center q-pa-xl">
            <q-spinner color="primary" size="3em" />
          </div>

          <!-- Conteúdo da tabela -->
          <template v-else>
            <!-- Se existem itens -->
            <div v-if="items.length > 0">
              <q-table :rows="items" :columns="columns" row-key="item_id" flat bordered separator="cell"
                :pagination="{ rowsPerPage: 10 }">
                <!-- Exemplo de customizar célula do 'title' -->
                <template v-slot:body-cell-title="props">
                  <q-td :props="props">
                    <a :href="props.row.permalink" target="_blank" rel="noopener noreferrer" class="text-primary">
                      {{ props.row.title }}
                    </a>
                  </q-td>
                </template>

                <!-- Coluna do botão "Retirar do Full" -->
                <template v-slot:body-cell-retirar="props">
                  <q-td :props="props">
                    <q-btn color="negative" label="Retirar do Full" @click="openRemoveFull(props.row)" />
                  </q-td>
                </template>
              </q-table>
            </div>

            <!-- Se não existem itens -->
            <div v-else class="text-center q-pa-xl">
              <q-icon name="inventory_2" size="6em" color="grey-5" />
              <p class="text-h6 q-mt-md">
                Nenhum anúncio Fulfillment sem estoque encontrado.
              </p>
              <p class="text-subtitle1 q-mt-sm">
                Verifique se suas contas do Mercado Livre estão conectadas e se há itens no Full sem estoque.
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

// Definindo as colunas do QTable
const columns = [
  { name: "account_nickname", align: "left", label: "Conta", field: "account_nickname" },
  { name: "item_id", align: "left", label: "Item ID", field: "item_id" },
  {
    name: "title",
    align: "left",
    label: "Título",
    field: "title",
  },
  {
    name: "sold_quantity",
    align: "center",
    label: "Vendas",
    field: "sold_quantity",
  },
  {
    name: "price",
    align: "right",
    label: "Preço (R$)",
    field: "price",
    format: (val) =>
      val != null
        ? val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
        : "---",
  },
  {
    name: "available_quantity",
    align: "center",
    label: "Qtd",
    field: "available_quantity",
  },
  {
    name: "retirar",
    align: "center",
    label: "Retirar do Full",
    field: "retirar",
  },
];

/**
 * Obtém a lista de anúncios fulfillment sem estoque do backend
 */
const fetchFulfillmentNoStockItems = async () => {
  loading.value = true;
  try {
    // Supondo que o backend retorna { items: [...] }
    const response = await api.get("/mercadolivre/fulfillment-no-stock/");
    items.value = response.data.items || [];
  } catch (error) {
    items.value = [];
    $q.notify({
      message: "Erro ao buscar anúncios Fulfillment sem estoque.",
      color: "negative",
      position: "top",
      timeout: 2000,
    });
  } finally {
    loading.value = false;
  }
};

/**
 * Abre a página do Mercado Livre que permite retirar o item do Full manualmente.
 * Precisamos remover o prefixo "MLB" do item_id, caso exista.
 */
const openRemoveFull = (row) => {
  let numericId = row.item_id || "";
  if (numericId.startsWith("MLB")) {
    numericId = numericId.slice(3);
  }
  const url = `https://www.mercadolivre.com.br/anuncios/lista/space_management?filters=with-fulfillment-with-empty-stock&search=${numericId}`;
  window.open(url, "_blank");
};

// Ao montar o componente, chama a função de busca
onMounted(() => {
  fetchFulfillmentNoStockItems();
});
</script>

<style scoped>
.text-wrap {
  white-space: pre-wrap;
  word-wrap: break-word;
}

.q-td {
  vertical-align: top;
}

.q-table td {
  white-space: nowrap;
  vertical-align: middle;
}

.vertical-align-top {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  height: 100%;
}

.vertical-align-top>* {
  margin-bottom: 4px;
}

.vertical-align-top>*:last-child {
  margin-bottom: 0;
}
</style>
