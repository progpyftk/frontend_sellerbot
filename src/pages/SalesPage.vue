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
              <q-list bordered class="rounded-borders">
                <q-item-label header class="text-h6">Selecione uma Conta</q-item-label>
                <q-separator />
                <q-item
                  v-for="account in accounts"
                  :key="account.account_id"
                  clickable
                  v-ripple
                >
                  <q-item-section>
                    <q-item-label>{{ account.account_nickname }}</q-item-label>
                    <q-item-label caption>
                      <q-badge
                        :color="account.is_connected ? 'positive' : 'negative'"
                        :label="account.is_connected ? 'Conectado' : 'Desconectado'"
                      />
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
                      rounded
                    />
                  </q-item-section>
                </q-item>
              </q-list>
            </div>

            <div v-if="sales && sales.length > 0" class="q-mt-lg">
              <q-input
                v-model="search"
                debounce="300"
                placeholder="Buscar por Venda ID"
                outlined
                class="q-mb-md"
                dense
              >
                <template v-slot:append>
                  <q-icon name="search" />
                </template>
              </q-input>
              <q-table
                :rows="filteredSales"
                :columns="salesColumns"
                row-key="sale_id"
                flat
                bordered
                :pagination="{ rowsPerPage: 10 }"
                :loading="loading"
              >
                <template v-slot:header="props">
                  <q-tr :props="props">
                    <q-th
                      v-for="col in props.cols"
                      :key="col.name"
                      :props="props"
                      class="text-weight-bold"
                    >
                      {{ col.label }}
                    </q-th>
                    <q-th class="text-weight-bold">Ações</q-th>
                  </q-tr>
                </template>

                <template v-slot:body="props">
                  <q-tr :props="props">
                    <q-td v-for="col in salesColumns" :key="col.name" :props="props">
                      <div class="vertical-align-top">
                        <template v-if="col.name === 'order_items'">
                          <div v-for="(item, idx) in getOrderItems(props.row)" :key="idx">
                            {{ item.title }}
                          </div>
                        </template>

                        <template v-else-if="col.name === 'quantity'">
                          <div
                            v-for="(quantity, idx) in getTotalQuantity(props.row)"
                            :key="idx"
                          >
                            {{ quantity }}
                          </div>
                        </template>

                        <template v-else-if="col.name === 'unit_price'">
                          <div
                            v-for="(price, idx) in getUnitPrices(props.row)"
                            :key="idx"
                          >
                            {{ formatCurrency(price) }}
                          </div>
                        </template>

                        <template v-else-if="col.name === 'total_amount'">
                          {{ formatCurrency(getTotalAmount(props.row)) }}
                        </template>

                        <template v-else-if="col.name === 'categoria_especial'">
                          <q-chip
                            v-for="(value, idx) in getCategoriaEspecial(props.row)"
                            :key="idx"
                            :color="value === 'Sim' ? 'positive' : 'grey'"
                            text-color="white"
                            size="sm"
                          >
                            {{ value }}
                          </q-chip>
                        </template>

                        <template
                          v-else-if="
                            [
                              'lead_time_cost',
                              'lead_time_cost_type',
                              'list_cost',
                              'logistic_type',
                            ].includes(col.name)
                          "
                        >
                          <div
                            v-for="(value, idx) in getShippingDetail(props.row, col.name)"
                            :key="idx"
                          >
                            {{ value }}
                          </div>
                        </template>

                        <template v-else>
                          {{
                            col.format
                              ? col.format(props.row[col.field])
                              : props.row[col.field]
                          }}
                        </template>
                      </div>
                    </q-td>

                    <q-td>
                      <q-btn-group spread flat>
                        <q-btn
                          flat
                          dense
                          icon="visibility"
                          color="primary"
                          @click="openSaleDetails(props.row)"
                        >
                          <q-tooltip>Ver Detalhes</q-tooltip>
                        </q-btn>
                        <q-btn
                          flat
                          dense
                          icon="code"
                          color="secondary"
                          @click="openSaleJSON(props.row)"
                        >
                          <q-tooltip>Ver JSON</q-tooltip>
                        </q-btn>
                      </q-btn-group>
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

    <q-dialog
      v-model="isSaleDetailsDialogOpen"
      maximized
      transition-show="slide-up"
      transition-hide="slide-down"
    >
      <q-card class="column full-height">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">
            Detalhes da
            {{ selectedSale?.sale_type === "pack" ? "Pack" : "Venda Única" }} - ID:
            {{ selectedSale?.sale_id }}
          </div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="col q-pt-none scroll">
          <q-list v-if="selectedSale" bordered separator>
            <q-item v-for="(value, key) in selectedSale" :key="key">
              <q-item-section>
                <q-item-label overline>{{ key }}</q-item-label>
                <q-item-label>
                  <pre class="text-wrap">{{ JSON.stringify(value, null, 2) }}</pre>
                </q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-dialog
      v-model="isSaleJSONDialogOpen"
      maximized
      transition-show="slide-up"
      transition-hide="slide-down"
    >
      <q-card class="column full-height">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Dados da API - ID: {{ selectedSale?.sale_id }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="col q-pt-none scroll">
          <pre class="text-wrap">{{ JSON.stringify(selectedSale, null, 2) }}</pre>
        </q-card-section>
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

const isSaleDetailsDialogOpen = ref(false);
const isSaleJSONDialogOpen = ref(false);
const selectedSale = ref(null);

const search = ref("");

const filteredSales = computed(() => {
  if (!search.value) return sales.value;
  return sales.value.filter((sale) => sale.sale_id.toString().includes(search.value));
});

const getOrderItems = (sale) => {
  if (sale.sale_type === "pack") {
    return sale.orders.flatMap((order) => order.order_items.map((item) => item.item));
  } else {
    return sale.orders[0].order_items.map((item) => item.item);
  }
};

const getTotalQuantity = (sale) => {
  if (sale.sale_type === "pack") {
    return sale.orders.map((order) =>
      order.order_items.reduce((total, item) => total + item.quantity, 0)
    );
  } else {
    return [sale.orders[0].order_items.reduce((total, item) => total + item.quantity, 0)];
  }
};

const getUnitPrices = (sale) => {
  if (sale.sale_type === "pack") {
    return sale.orders.flatMap((order) =>
      order.order_items.map((item) => item.unit_price)
    );
  } else {
    return sale.orders[0].order_items.map((item) => item.unit_price);
  }
};

const getTotalAmount = (sale) => {
  if (sale.sale_type === "pack") {
    return sale.orders.reduce(
      (total, order) =>
        total +
        order.order_items.reduce(
          (orderTotal, item) => orderTotal + item.unit_price * item.quantity,
          0
        ),
      0
    );
  } else {
    return sale.orders[0].total_amount;
  }
};

const getCategoriaEspecial = (sale) => {
  if (sale.sale_type === "pack") {
    return sale.orders.map((order) =>
      order.order_items.some((item) => item.categoria_especial) ? "Sim" : "Não"
    );
  } else {
    return [
      sale.orders[0].order_items.some((item) => item.categoria_especial) ? "Sim" : "Não",
    ];
  }
};

const getShippingDetail = (sale, detail) => {
  const getDetail = (order) => {
    switch (detail) {
      case "lead_time_cost":
        return order.shipping_details?.lead_time?.cost;
      case "lead_time_cost_type":
        return order.shipping_details?.lead_time?.cost_type;
      case "list_cost":
        return order.shipping_details?.lead_time?.list_cost;
      case "logistic_type":
        return order.shipping_details?.logistic?.type;
      default:
        return "N/A";
    }
  };

  if (sale.sale_type === "pack") {
    return sale.orders.map((order) => getDetail(order) || "N/A");
  } else {
    return [getDetail(sale.orders[0]) || "N/A"];
  }
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    value
  );
};

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
  { name: "quantity", align: "right", label: "Quantidade Total", field: "quantity" },
  { name: "unit_price", align: "right", label: "Preço Unitário", field: "unit_price" },
  { name: "total_amount", align: "right", label: "Valor Total", field: "total_amount" },
  {
    name: "categoria_especial",
    align: "center",
    label: "Categoria Especial",
    field: "categoria_especial",
  },
  {
    name: "lead_time_cost",
    align: "right",
    label: "Custo Lead Time",
    field: "lead_time_cost",
  },
  {
    name: "lead_time_cost_type",
    align: "left",
    label: "Tipo de Custo Lead Time",
    field: "lead_time_cost_type",
  },
  { name: "list_cost", align: "right", label: "Custo da Lista", field: "list_cost" },
  {
    name: "logistic_type",
    align: "left",
    label: "Tipo de Logística",
    field: "logistic_type",
  },
];

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

const openSaleDetails = (sale) => {
  selectedSale.value = sale;
  isSaleDetailsDialogOpen.value = true;
};

const openSaleJSON = (sale) => {
  selectedSale.value = sale;
  isSaleJSONDialogOpen.value = true;
};

const startOrderUpdate = async (accountId) => {
  const account = accounts.value.find((acc) => acc.account_id === accountId);
  if (account) {
    account.isLoading = true;
  }
  try {
    await updateOrders(accountId);
    await fetchSales(accountId);
  } finally {
    if (account) {
      account.isLoading = false;
    }
  }
};

const updateOrders = async (accountId) => {
  try {
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
  }
};

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

.vertical-align-top > * {
  margin-bottom: 4px;
}

.vertical-align-top > *:last-child {
  margin-bottom: 0;
}
</style>
