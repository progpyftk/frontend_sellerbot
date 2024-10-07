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
                <!-- Cabeçalhos das colunas -->
                <template v-slot:header="props">
                  <q-tr :props="props">
                    <q-th v-for="col in props.cols" :key="col.name" :props="props">
                      {{ col.label }}
                    </q-th>
                    <!-- Cabeçalhos das colunas Detalhes e API JSON -->
                    <q-th>Detalhes</q-th>
                    <q-th>API JSON</q-th>
                  </q-tr>
                </template>

                <!-- Corpo da tabela -->
                <template v-slot:body="props">
                  <q-tr :props="props">
                    <!-- Iterar sobre as colunas definidas -->
                    <q-td v-for="col in salesColumns" :key="col.name" :props="props">
                      <!-- Coluna de Itens com Verificação de Tipo -->
                      <div v-if="col.name === 'order_items'">
                        <!-- Caso seja um pack, mostrar todos os títulos dos itens -->
                        <div v-if="props.row.sale_type === 'pack'">
                          <ul>
                            <li v-for="(order, index) in props.row.orders" :key="index">
                              <div v-for="(item, idx) in order.order_items" :key="idx">
                                {{ item.item.title }}
                              </div>
                            </li>
                          </ul>
                        </div>
                        <!-- Caso seja uma venda única, mostrar apenas o título do item -->
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
                      <!-- Ajuste para Coluna de Valor Total -->
                      <div v-else-if="col.name === 'total_amount'">
                        <!-- Caso seja um pack, calcular a soma do total dos itens -->
                        <div v-if="props.row.sale_type === 'pack'">
                          R$
                          {{ calculatePackTotal(props.row.orders).toFixed(2) }}
                        </div>
                        <!-- Caso seja uma venda única, mostrar o valor total -->
                        <div v-else>
                          R$ {{ props.row.orders[0].total_amount.toFixed(2) }}
                        </div>
                      </div>
                      <!-- Coluna para Quantidade -->
                      <div v-else-if="col.name === 'quantity'">
                        <!-- Caso seja um pack, mostrar todas as quantidades -->
                        <div v-if="props.row.sale_type === 'pack'">
                          <ul>
                            <li v-for="(order, index) in props.row.orders" :key="index">
                              <div v-for="(item, idx) in order.order_items" :key="idx">
                                {{ item.quantity }}
                              </div>
                            </li>
                          </ul>
                        </div>
                        <!-- Caso seja uma venda única, mostrar a quantidade -->
                        <div v-else>
                          {{ props.row.orders[0].order_items[0].quantity }}
                        </div>
                      </div>
                      <!-- Coluna para Categoria Especial -->
                      <div v-else-if="col.name === 'categoria_especial'">
                        <!-- Caso seja um pack, mostrar se a categoria é especial -->
                        <div v-if="props.row.sale_type === 'pack'">
                          <ul>
                            <li v-for="(order, index) in props.row.orders" :key="index">
                              <div v-for="(item, idx) in order.order_items" :key="idx">
                                {{ item.categoria_especial ? "Sim" : "Não" }}
                              </div>
                            </li>
                          </ul>
                        </div>
                        <!-- Caso seja uma venda única, mostrar se a categoria é especial -->
                        <div v-else>
                          {{
                            props.row.orders[0].order_items[0].categoria_especial
                              ? "Sim"
                              : "Não"
                          }}
                        </div>
                      </div>
                      <!-- Coluna para Nome da Categoria -->
                      <div v-else-if="col.name === 'nome_categoria'">
                        <!-- Caso seja um pack, mostrar todos os nomes das categorias -->
                        <div v-if="props.row.sale_type === 'pack'">
                          <ul>
                            <li v-for="(order, index) in props.row.orders" :key="index">
                              <div v-for="(item, idx) in order.order_items" :key="idx">
                                {{ item.nome_categoria || "Não Informado" }}
                              </div>
                            </li>
                          </ul>
                        </div>
                        <!-- Caso seja uma venda única, mostrar o nome da categoria -->
                        <div v-else>
                          {{
                            props.row.orders[0].order_items[0].nome_categoria ||
                            "Não Informado"
                          }}
                        </div>
                      </div>
                      <!-- Coluna para Preço Unitário -->
                      <div v-else-if="col.name === 'unit_price'">
                        <!-- Caso seja um pack, mostrar todos os preços unitários -->
                        <div v-if="props.row.sale_type === 'pack'">
                          <ul>
                            <li v-for="(order, index) in props.row.orders" :key="index">
                              <div v-for="(item, idx) in order.order_items" :key="idx">
                                R$ {{ item.unit_price.toFixed(2) }}
                              </div>
                            </li>
                          </ul>
                        </div>
                        <!-- Caso seja uma venda única, mostrar o preço unitário -->
                        <div v-else>
                          R$
                          {{ props.row.orders[0].order_items[0].unit_price.toFixed(2) }}
                        </div>
                      </div>
                      <!-- Outras Colunas -->
                      <div v-else>
                        {{
                          col.format
                            ? col.format(props.row[col.field])
                            : props.row[col.field]
                        }}
                      </div>
                    </q-td>
                    <!-- Botão para Ver Detalhes -->
                    <q-td>
                      <q-btn
                        flat
                        icon="visibility"
                        color="primary"
                        label="Detalhes"
                        @click="openSaleDetails(props.row)"
                      />
                    </q-td>
                    <!-- Botão para Ver JSON Completo -->
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
            Detalhes da
            {{ selectedSale?.sale_type === "pack" ? "Pack" : "Venda Única" }} - ID:
            {{ selectedSale?.sale_id }}
          </div>
        </q-card-section>
        <q-card-section>
          <div v-if="selectedSale">
            <!-- Exibe os detalhes completos como JSON -->
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

    <!-- QDialog para Exibir o JSON Completo da Venda -->
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
  { name: "total_amount", align: "left", label: "Valor Total", field: "total_amount" },
  { name: "order_items", align: "left", label: "Itens", field: "order_items" },
  { name: "quantity", align: "left", label: "Quantidade", field: "quantity" },
  { name: "unit_price", align: "left", label: "Preço Unitário", field: "unit_price" },
  {
    name: "categoria_especial",
    align: "left",
    label: "Categoria Especial",
    field: "categoria_especial",
  },
];

// Calcula o total de packs
const calculatePackTotal = (orders) => {
  let total = 0;
  orders.forEach((order) => {
    order.order_items.forEach((item) => {
      total += item.quantity * item.unit_price;
    });
  });
  return total;
};

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

getAccounts();
</script>
