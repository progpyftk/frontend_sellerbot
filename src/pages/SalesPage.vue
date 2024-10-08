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
                <div class="text-subtitle2">Gerenciamento de</div>
                <div class="text-h6 text-weight-bold">Vendas do MercadoLivre</div>
              </div>
            </div>
          </div>
        </q-card-section>

        <q-card-section>
          <div v-if="loading" class="flex flex-center q-pa-xl">
            <q-spinner color="primary" size="3em" />
          </div>

          <template v-else>
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

            <div v-if="sales && sales.length > 0" class="q-mt-md">
              <q-input
                debounce="300"
                v-model="search"
                placeholder="Buscar por Venda ID"
                outlined
                class="q-mb-md"
              />
              <q-table
                :rows="filteredSales"
                :columns="salesColumns"
                row-key="sale_id"
                flat
                bordered
                separator="cell"
                :pagination="{ rowsPerPage: 10 }"
              >
                <template v-slot:header="props">
                  <q-tr :props="props">
                    <q-th v-for="col in props.cols" :key="col.name" :props="props">
                      {{ col.label }}
                    </q-th>
                    <q-th>Detalhes</q-th>
                    <q-th>API JSON</q-th>
                  </q-tr>
                </template>

                <template v-slot:body="props">
                  <q-tr :props="props">
                    <q-td v-for="col in salesColumns" :key="col.name" :props="props">
                      <div v-if="col.name === 'order_items'">
                        <div v-if="props.row.sale_type === 'pack'">
                          <ul>
                            <li v-for="(order, index) in props.row.orders" :key="index">
                              <div v-for="(item, idx) in order.order_items" :key="idx">
                                {{ item.item.title }}
                              </div>
                            </li>
                          </ul>
                        </div>
                        <div v-else>
                          <ul>
                            <li
                              v-for="(item, idx) in props.row.orders[0].order_items"
                              :key="idx"
                            >
                              {{ item.item.title }}
                            </li>
                          </ul>
                        </div>
                      </div>

                      <div v-else-if="col.name === 'quantity'">
                        <div v-if="props.row.sale_type === 'pack'">
                          <ul>
                            <li
                              v-for="(quantity, index) in getTotalQuantity(props.row)"
                              :key="index"
                            >
                              {{ quantity }}
                            </li>
                          </ul>
                        </div>
                        <div v-else>
                          {{ getTotalQuantity(props.row) }}
                        </div>
                      </div>

                      <div v-else-if="col.name === 'unit_price'">
                        <div v-if="props.row.sale_type === 'pack'">
                          <ul>
                            <li
                              v-for="(prices, orderIndex) in getUnitPrices(props.row)"
                              :key="orderIndex"
                            >
                              <ul>
                                <li v-for="(price, itemIndex) in prices" :key="itemIndex">
                                  {{ price.toFixed(2) }}
                                </li>
                              </ul>
                            </li>
                          </ul>
                        </div>
                        <div v-else>
                          <ul>
                            <li
                              v-for="(price, index) in getUnitPrices(props.row)"
                              :key="index"
                            >
                              {{ price.toFixed(2) }}
                            </li>
                          </ul>
                        </div>
                      </div>

                      <div v-else-if="col.name === 'total_amount'">
                        {{ getTotalAmount(props.row) }}
                      </div>

                      <div v-else-if="col.name === 'categoria_especial'">
                        {{ getCategoriaEspecial(props.row) }}
                      </div>

                      <div v-else-if="col.name === 'lead_time_cost'">
                        <div v-if="props.row.sale_type === 'pack'">
                          <ul>
                            <li v-for="(order, index) in props.row.orders" :key="index">
                              {{ order.shipping_details?.lead_time?.cost || "N/A" }}
                            </li>
                          </ul>
                        </div>
                        <div v-else>
                          {{
                            props.row.orders[0].shipping_details?.lead_time?.cost || "N/A"
                          }}
                        </div>
                      </div>

                      <div v-else-if="col.name === 'lead_time_cost_type'">
                        <div v-if="props.row.sale_type === 'pack'">
                          <ul>
                            <li v-for="(order, index) in props.row.orders" :key="index">
                              {{ order.shipping_details?.lead_time?.cost_type || "N/A" }}
                            </li>
                          </ul>
                        </div>
                        <div v-else>
                          {{
                            props.row.orders[0].shipping_details?.lead_time?.cost_type ||
                            "N/A"
                          }}
                        </div>
                      </div>

                      <div v-else-if="col.name === 'list_cost'">
                        <div v-if="props.row.sale_type === 'pack'">
                          <ul>
                            <li v-for="(order, index) in props.row.orders" :key="index">
                              {{ order.shipping_details?.lead_time?.list_cost || "N/A" }}
                            </li>
                          </ul>
                        </div>
                        <div v-else>
                          {{
                            props.row.orders[0].shipping_details?.lead_time?.list_cost ||
                            "N/A"
                          }}
                        </div>
                      </div>

                      <div v-else-if="col.name === 'logistic_type'">
                        <div v-if="props.row.sale_type === 'pack'">
                          <ul>
                            <li v-for="(order, index) in props.row.orders" :key="index">
                              {{ order.shipping_details?.logistic?.type || "N/A" }}
                            </li>
                          </ul>
                        </div>
                        <div v-else>
                          {{
                            props.row.orders[0].shipping_details?.logistic?.type || "N/A"
                          }}
                        </div>
                      </div>

                      <div v-else>
                        {{
                          col.format
                            ? col.format(props.row[col.field])
                            : props.row[col.field]
                        }}
                      </div>
                    </q-td>

                    <q-td>
                      <q-btn
                        flat
                        icon="visibility"
                        color="primary"
                        label="Detalhes"
                        @click="openSaleDetails(props.row)"
                      />
                    </q-td>
                    <q-td>
                      <q-btn
                        flat
                        icon="code"
                        color="primary"
                        label="API JSON"
                        @click="openSaleJSON(props.row)"
                      />
                    </q-td>
                  </q-tr>
                </template>
              </q-table>
            </div>

            <div v-else-if="salesFetched" class="text-center q-pa-xl">
              <q-icon name="shopping_cart" size="6em" color="grey-5" />
              <p class="text-h6 q-mt-md">Nenhuma venda encontrada.</p>
            </div>
          </template>
        </q-card-section>
      </q-card>
    </div>

    <q-dialog v-model="isSaleDetailsDialogOpen" max-width="800px">
      <q-card flat bordered>
        <q-card-section>
          <div class="text-h6">
            Detalhes da
            {{ selectedSale?.sale_type === "pack" ? "Pack" : "Venda Única" }} - ID:
            {{ selectedSale?.sale_id }}
          </div>
        </q-card-section>
        <q-card-section>
          <div v-if="selectedSale">
            <q-markup-table>
              <pre>{{ JSON.stringify(selectedSale, null, 2) }}</pre>
            </q-markup-table>
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

    <q-dialog v-model="isSaleJSONDialogOpen" max-width="800px">
      <q-card flat bordered class="q-pa-md shadow-2">
        <q-card-section class="q-mb-md">
          <div class="text-h6 text-primary">
            Dados da API - ID: {{ selectedSale?.sale_id }}
          </div>
        </q-card-section>
        <q-card-section>
          <q-markup-table class="q-pa-md bg-grey-2 q-border-radius-md">
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
import { ref, computed } from "vue";
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

const search = ref("");

// Computed para filtragem de vendas
const filteredSales = computed(() => {
  if (!search.value) return sales.value;
  return sales.value.filter((sale) => sale.sale_id.toString().includes(search.value));
});

// Funções auxiliares para calcular os valores
const getTotalQuantity = (sale) => {
  if (sale.sale_type === "pack") {
    return sale.orders.map((order) =>
      order.order_items.reduce((total, item) => total + item.quantity, 0)
    );
  } else {
    return sale.orders[0].order_items.reduce((total, item) => total + item.quantity, 0);
  }
};

const getUnitPrices = (sale) => {
  if (sale.sale_type === "pack") {
    return sale.orders.map((order) => order.order_items.map((item) => item.unit_price));
  } else {
    return sale.orders[0].order_items.map((item) => item.unit_price);
  }
};

const getTotalAmount = (sale) => {
  if (sale.sale_type === "pack") {
    // Calcular o total para packs somando todos os itens de todas as orders
    return sale.orders
      .reduce((total, order) => {
        return (
          total +
          order.order_items.reduce((orderTotal, item) => {
            return orderTotal + item.unit_price * item.quantity;
          }, 0)
        );
      }, 0)
      .toFixed(2);
  } else {
    // Para single_order, continuar usando o total_amount da primeira (e única) order
    return sale.orders[0].total_amount.toFixed(2);
  }
};

const getCategoriaEspecial = (sale) => {
  if (sale.sale_type === "pack") {
    return sale.orders.some((order) =>
      order.order_items.some((item) => item.categoria_especial)
    )
      ? "Sim"
      : "Não";
  } else {
    return sale.orders[0].order_items.some((item) => item.categoria_especial)
      ? "Sim"
      : "Não";
  }
};

// Colunas da tabela de vendas
const salesColumns = [
  { name: "sale_id", align: "left", label: "Venda ID", field: "sale_id" },
  { name: "sale_type", align: "left", label: "Tipo", field: "sale_type" },
  {
    name: "date_created",
    align: "left",
    label: "Data Criada",
    field: "date_created",
    format: (val) => format(new Date(val), "dd/MM/yyyy HH:mm"),
  },
  { name: "status", align: "left", label: "Status", field: "status" },
  { name: "order_items", align: "left", label: "Itens", field: "order_items" },
  { name: "quantity", align: "left", label: "Quantidade Total", field: "quantity" },
  {
    name: "unit_price",
    align: "left",
    label: "Preço Unitário Médio",
    field: "unit_price",
  },
  { name: "total_amount", align: "left", label: "Valor Total", field: "total_amount" },
  {
    name: "categoria_especial",
    align: "left",
    label: "Categoria Especial",
    field: "categoria_especial",
  },
  {
    name: "lead_time_cost",
    align: "left",
    label: "Custo Lead Time",
    field: "lead_time_cost",
  },
  {
    name: "lead_time_cost_type",
    align: "left",
    label: "Tipo de Custo Lead Time",
    field: "lead_time_cost_type",
  },
  { name: "list_cost", align: "left", label: "Custo da Lista", field: "list_cost" },
  {
    name: "logistic_type",
    align: "left",
    label: "Tipo de Logística",
    field: "logistic_type",
  },
];

// Inicializa ao carregar a página
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
    $q.notify;
    ({
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

getAccounts();
</script>
