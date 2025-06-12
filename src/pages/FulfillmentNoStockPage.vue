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
                  Gerenciar Anúncios
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
            <div v-if="items.length > 0">
              <q-table :rows="items" :columns="columns" row-key="item_id" flat bordered separator="cell"
                :pagination="{ rowsPerPage: 10 }">
                <!-- Célula com link do título -->
                <template v-slot:body-cell-title="props">
                  <q-td :props="props">
                    <a :href="props.row.permalink" target="_blank" rel="noopener noreferrer" class="text-primary">
                      {{ props.row.title }}
                    </a>
                  </q-td>
                </template>

                <!-- Célula com ação dinâmica -->
                <template v-slot:body-cell-acao="props">
                  <q-td :props="props">
                    <div class="text-center">
                      <q-btn v-if="!props.row.is_removed_from_fulfillment" color="negative" label="Retirar do Full"
                        @click="openRemoveFull(props.row)" />
                      <q-btn v-else color="primary" label="Sincronizar Estoque" @click="syncWithTiny(props.row)" />
                    </div>
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

// Definindo as colunas da tabela
const columns = [
  { name: "account_nickname", align: "left", label: "Conta", field: "account_nickname" },
  { name: "item_id", align: "left", label: "Item ID", field: "item_id" },
  { name: "title", align: "left", label: "Título", field: "title" },
  { name: "sold_quantity", align: "center", label: "Vendas", field: "sold_quantity" },
  {
    name: "price",
    align: "right",
    label: "Preço (R$)",
    field: "price",
    format: val =>
      val != null
        ? val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
        : "---",
  },
  { name: "available_quantity", align: "center", label: "Qtd", field: "available_quantity" },
  { name: "acao", align: "center", label: "Ação", field: "acao" },
];

/**
 * Ação ao clicar em "Retirar do Full"
 */
const openRemoveFull = (row) => {
  let numericId = row.item_id || "";
  if (numericId.startsWith("MLB")) {
    numericId = numericId.slice(3);
  }
  const url = `https://www.mercadolivre.com.br/anuncios/lista/space_management?filters=with-fulfillment-with-empty-stock&search=${numericId}`;
  window.open(url, "_blank");
};

/**
 * Ação ao clicar em "Sincronizar Estoque"
 */
const syncWithTiny = async (row) => {
  try {
    const { item_id, account_id } = row;
    $q.notify({
      message: `🔄 Sincronizando com o Tiny...`,
      caption: `Item: ${item_id}`,
      color: "info",
      position: "top",
      timeout: 3000,
    });

    const response = await api.post("/mercadolivre/sync-tiny/", {
      item_id,
      account_id,
    });

    $q.notify({
      message: "✅ Estoque sincronizado com sucesso!",
      caption: `SKU: ${response.data.sku}`,
      color: "positive",
      position: "top",
    });

    // Atualiza a tabela para refletir a mudança
    fetchFulfillmentNoStockItems();
  } catch (error) {
    const msg = error.response?.data?.error || "Erro inesperado na sincronização.";
    $q.notify({
      message: "❌ Falha ao sincronizar com o Tiny",
      caption: msg,
      color: "negative",
      position: "top",
      timeout: 4000,
    });
  }
};

/**
 * Busca os anúncios fulfillment sem estoque e atualiza os removidos do Full
 */
const fetchFulfillmentNoStockItems = async () => {
  loading.value = true;
  try {
    // Busca a lista atualizada
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

// Executa ao carregar a página
onMounted(() => {
  fetchFulfillmentNoStockItems();
});
</script>

<style scoped>
.q-td {
  vertical-align: middle;
}

.q-table td {
  white-space: nowrap;
  vertical-align: middle;
}
</style>
