<template>
  <q-page class="bg-grey-1">
    <div class="q-pa-md">
      <q-card flat bordered class="bg-white">
        <!-- Cabeçalho da Página -->
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
                <div class="text-subtitle2">Gerenciamento de</div>
                <div class="text-h6 text-weight-bold">Vendas do MercadoLivre</div>
              </div>
            </div>
          </div>
        </q-card-section>

        <q-card-section>
          <!-- Loader de Carregamento -->
          <div v-if="loading" class="flex flex-center q-pa-xl">
            <q-spinner color="primary" size="3em" />
          </div>

          <template v-else>
            <!-- Lista de Contas -->
            <div v-if="accounts.length > 0">
              <q-list bordered>
                <q-item-label class="q-mb-md text-h6">Selecione uma Conta</q-item-label>
                <q-item v-for="account in accounts" :key="account.account_id" clickable>
                  <q-item-section>
                    <q-item-label>{{ account.account_nickname }}</q-item-label>
                    <q-item-label caption>
                      Situação: {{ account.is_connected ? "Conectado" : "Desconectado" }}
                    </q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-btn
                      label="Atualizar Vendas"
                      color="primary"
                      :loading="account.isLoading"
                      :disable="account.isLoading"
                      @click="startOrderUpdate(account.account_id)"
                      unelevated
                    />
                  </q-item-section>
                </q-item>
              </q-list>
            </div>

            <!-- Tabela de Vendas -->
            <div v-if="sales && sales.length > 0" class="q-mt-md">
              <q-table
                :rows="sales"
                :columns="salesColumns"
                row-key="order_id"
                flat
                bordered
                separator="cell"
                :pagination="{ rowsPerPage: 10 }"
              >
                <template v-slot:body="props">
                  <q-tr :props="props">
                    <q-td v-for="col in salesColumns" :key="col.name" :props="props">
                      {{
                        col.format
                          ? col.format(props.row[col.field])
                          : props.row[col.field]
                      }}
                    </q-td>
                    <!-- Botão para Ver Detalhes -->
                    <q-td>
                      <q-btn
                        flat
                        icon="visibility"
                        color="primary"
                        @click="openSaleDetails(props.row)"
                      />
                    </q-td>
                    <!-- Botão para Ver JSON Completo -->
                    <q-td>
                      <q-btn
                        flat
                        icon="code"
                        color="primary"
                        @click="openSaleJSON(props.row)"
                      />
                    </q-td>
                  </q-tr>
                </template>
              </q-table>
            </div>

            <!-- Mensagem de Nenhuma Venda Encontrada -->
            <div v-else-if="salesFetched" class="text-center q-pa-xl">
              <q-icon name="shopping_cart" size="6em" color="grey-5" />
              <p class="text-h6 q-mt-md">Nenhuma venda encontrada.</p>
            </div>
          </template>
        </q-card-section>
      </q-card>
    </div>

    <!-- QDialog para Exibir os Detalhes da Venda -->
    <q-dialog v-model="isSaleDetailsDialogOpen" max-width="800px">
      <q-card flat bordered>
        <q-card-section>
          <div class="text-h6">
            Detalhes da {{ selectedSale?.type === "pack" ? "Pack" : "Venda Única" }} - ID:
            {{ selectedSale?.order_id }}
          </div>
        </q-card-section>
        <q-card-section>
          <div v-if="selectedSale">
            <!-- Campos para venda única -->
            <div v-if="selectedSale.type === 'single_order'">
              <p><strong>Data Criada:</strong> {{ selectedSale.date_created }}</p>
              <p><strong>Status:</strong> {{ selectedSale.status }}</p>
              <p><strong>Valor Total:</strong> {{ selectedSale.total_amount }}</p>
              <p><strong>Itens:</strong> {{ formatItems(selectedSale.order_items) }}</p>
              <p>
                <strong>Descontos:</strong>
                {{ formatDiscounts(selectedSale.discount_details) }}
              </p>
              <p>
                <strong>Detalhes do Envio:</strong> {{ selectedSale.shipping_details }}
              </p>
            </div>

            <!-- Campos para pack -->
            <div v-else-if="selectedSale.type === 'pack'">
              <p><strong>Data Criada:</strong> {{ selectedSale.date_created }}</p>
              <p><strong>Status:</strong> {{ selectedSale.status }}</p>
              <!-- Itera sobre as orders dentro do pack -->
              <q-list bordered class="q-mt-md">
                <q-item-label class="q-mb-md text-h6">Pedidos no Pack</q-item-label>
                <q-item v-for="order in selectedSale.orders" :key="order.order_id">
                  <q-item-section>
                    <q-item-label>Order ID: {{ order.order_id }}</q-item-label>
                    <p><strong>Data Criada:</strong> {{ order.date_created }}</p>
                    <p><strong>Status:</strong> {{ order.status }}</p>
                    <p><strong>Valor Total:</strong> {{ order.total_amount }}</p>
                    <p><strong>Itens:</strong> {{ formatItems(order.order_items) }}</p>
                    <p>
                      <strong>Descontos:</strong>
                      {{ formatDiscounts(order.discount_details) }}
                    </p>
                    <!-- Exibe detalhes do envio de cada order dentro do pack -->
                    <p>
                      <strong>Detalhes do Envio:</strong> {{ order.shipping_details }}
                    </p>
                  </q-item-section>
                </q-item>
              </q-list>
            </div>
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn
            flat
            label="Fechar"
            color="primary"
            @click="isSaleDetailsDialogOpen = false"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- QDialog para Exibir o JSON Completo da Venda -->
    <q-dialog v-model="isSaleJSONDialogOpen" max-width="800px">
      <q-card flat bordered>
        <q-card-section>
          <div class="text-h6">Dados da API - ID: {{ selectedSale?.order_id }}</div>
        </q-card-section>
        <q-card-section>
          <q-markup-table>
            <pre>{{ JSON.stringify(selectedSale, null, 2) }}</pre>
          </q-markup-table>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn
            flat
            label="Fechar"
            color="primary"
            @click="isSaleJSONDialogOpen = false"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref } from "vue";
import { api } from "src/boot/axios";
import { useQuasar } from "quasar";
import { format } from "date-fns";

const $q = useQuasar();
const loading = ref(false);
const accounts = ref([]);
const sales = ref([]);
const salesFetched = ref(false);

// Controle para o Dialog de Detalhes e JSON Completo
const isSaleDetailsDialogOpen = ref(false);
const isSaleJSONDialogOpen = ref(false);
const selectedSale = ref(null);

const salesColumns = [
  { name: "order_id", align: "left", label: "Venda ID", field: "order_id" },
  { name: "type", align: "left", label: "Tipo", field: "type" },
  {
    name: "date_created",
    align: "left",
    label: "Data Criada",
    field: "date_created",
    format: (val) => format(new Date(val), "dd/MM/yyyy HH:mm"),
  },
  { name: "status", align: "left", label: "Status", field: "status" },
  { name: "total_amount", align: "left", label: "Valor Total", field: "total_amount" },
  {
    name: "item_titles",
    align: "left",
    label: "Itens",
    field: "order_items",
    format: (items) => items?.map((item) => item.item.title).join(", ") || "N/A",
  },
  { name: "api_access", align: "left", label: "API", field: "order_id" },
];

// Busca Contas ao Carregar a Página
const getAccounts = async () => {
  loading.value = true;
  try {
    const response = await api.get("/mercadolivre/accounts/");
    accounts.value = Array.isArray(response.data)
      ? response.data.map((acc) => ({ ...acc, isLoading: false }))
      : [];
  } catch (error) {
    accounts.value = [];
    $q.notify({
      message: "Erro ao buscar contas. Por favor, tente novamente.",
      color: "negative",
      position: "top",
      timeout: 2000,
    });
  } finally {
    loading.value = false;
  }
};

// Abre o Dialog com os Detalhes da Venda
const openSaleDetails = (sale) => {
  selectedSale.value = sale;
  isSaleDetailsDialogOpen.value = true;
};

// Abre o Dialog com o JSON Completo da Venda
const openSaleJSON = (sale) => {
  selectedSale.value = sale;
  isSaleJSONDialogOpen.value = true;
};

// Formatação dos Itens
const formatItems = (items) => {
  if (!Array.isArray(items)) {
    return "Nenhum item encontrado";
  }
  return items
    .map((item) =>
      item?.item?.title
        ? `${item.item.title} (x${item.quantity || 0})`
        : "Item desconhecido"
    )
    .join(", ");
};

// Formatação dos Descontos
const formatDiscounts = (discounts) => {
  if (!Array.isArray(discounts)) return "Nenhum";
  return discounts.length > 0 ? discounts.map((d) => d.type).join(", ") : "Nenhum";
};

const startOrderUpdate = async (accountId) => {
  await updateOrders(accountId);
  await fetchSales(accountId);
};

// Atualiza Vendas
const updateOrders = async (accountId) => {
  try {
    loading.value = true;
    await api.post("/mercadolivre/update-orders/", {
      account_id: accountId,
    });
    $q.notify({
      message: "Atualização de vendas iniciada com sucesso!",
      color: "positive",
      position: "top",
      timeout: 2000,
    });
  } catch (error) {
    $q.notify({
      message: `Erro ao atualizar vendas: ${error.message}`,
      color: "negative",
      position: "top",
      timeout: 2000,
    });
  } finally {
    loading.value = false;
  }
};

// Busca Vendas (Unificando Orders e Packs)
const fetchSales = async (accountId) => {
  try {
    loading.value = true;
    const response = await api.get("/mercadolivre/sales/", {
      params: {
        account_id: accountId,
      },
    });

    sales.value = response.data.sales || [];
    salesFetched.value = true;
  } catch (error) {
    $q.notify({
      message: `Erro ao buscar vendas: ${error.message}`,
      color: "negative",
      position: "top",
      timeout: 2000,
    });
  } finally {
    loading.value = false;
  }
};

// Inicializa ao carregar a página
getAccounts();
</script>
