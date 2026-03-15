<template>
  <q-page class="bg-grey-1">
    <div class="q-pa-md">
      <q-card flat bordered class="bg-white">

        <!-- Header -->
        <q-card-section class="bg-teal text-white">
          <div class="row items-center justify-between">
            <div class="row items-center">
              <q-icon name="inventory_2" size="40px" class="q-mr-md" />
              <div>
                <div class="text-subtitle2">Custos de Mercadoria</div>
                <div class="text-h6 text-weight-bold">Produtos (CMV)</div>
              </div>
            </div>
            <q-btn
              color="white"
              text-color="teal"
              icon="sync"
              label="Sincronizar CMV"
              unelevated
              :loading="syncing"
              :disable="!selectedCnpj"
              @click="syncProducts"
            >
              <q-tooltip v-if="!selectedCnpj">Selecione uma conta primeiro</q-tooltip>
            </q-btn>
          </div>
        </q-card-section>

        <!-- Filtros -->
        <q-card-section class="q-pb-none">
          <div class="row q-col-gutter-md items-end">

            <!-- Seletor de conta -->
            <div class="col-12 col-sm-4">
              <q-select
                v-model="selectedAccount"
                :options="accountOptions"
                option-label="label"
                label="Conta (CNPJ)"
                outlined
                dense
                clearable
                :loading="loadingAccounts"
                :disable="loadingAccounts"
                @update:model-value="onAccountChange"
              >
                <template v-slot:prepend>
                  <q-icon name="business" />
                </template>
                <template v-slot:option="scope">
                  <q-item v-bind="scope.itemProps">
                    <q-item-section>
                      <q-item-label>{{ scope.opt.nickname }}</q-item-label>
                      <q-item-label caption>{{ formatCNPJ(scope.opt.cnpj) }}</q-item-label>
                    </q-item-section>
                  </q-item>
                </template>
                <template v-slot:no-option>
                  <q-item>
                    <q-item-section class="text-grey-5">
                      Nenhuma conta com Tiny conectado
                    </q-item-section>
                  </q-item>
                </template>
              </q-select>
            </div>

            <!-- Busca -->
            <div class="col-12 col-sm-5">
              <q-input
                v-model="search"
                label="Buscar por SKU ou Nome"
                outlined
                dense
                clearable
                debounce="400"
                @update:model-value="loadProducts()"
              >
                <template v-slot:prepend><q-icon name="search" /></template>
              </q-input>
            </div>

            <!-- Contador -->
            <div class="col-12 col-sm-3 text-right text-grey-7 text-caption q-pb-sm">
              <span v-if="totalCount !== null">
                {{ totalCount.toLocaleString('pt-BR') }} produto(s) encontrado(s)
              </span>
            </div>

          </div>
        </q-card-section>

        <!-- Tabela -->
        <q-card-section>
          <q-table
            :rows="products"
            :columns="columns"
            row-key="id"
            flat
            bordered
            separator="cell"
            :loading="loading"
            :rows-per-page-options="[0]"
          >
            <!-- SKU -->
            <template v-slot:body-cell-sku="props">
              <q-td :props="props">
                <span class="text-weight-medium text-mono">{{ props.row.sku }}</span>
              </q-td>
            </template>

            <!-- Nome -->
            <template v-slot:body-cell-name="props">
              <q-td :props="props">
                <span class="text-grey-8">{{ props.row.name || '—' }}</span>
              </q-td>
            </template>

            <!-- Custo cadastrado -->
            <template v-slot:body-cell-cost_price="props">
              <q-td :props="props" class="text-right">
                <span :class="props.row.cost_price > 0 ? 'text-grey-8' : 'text-negative'">
                  {{ formatCurrency(props.row.cost_price) }}
                </span>
              </q-td>
            </template>

            <!-- Custo médio (CMV real) -->
            <template v-slot:body-cell-avg_cost_price="props">
              <q-td :props="props" class="text-right">
                <span
                  v-if="props.row.avg_cost_price !== null"
                  class="text-weight-bold"
                  :class="props.row.avg_cost_price > 0 ? 'text-teal-8' : 'text-negative'"
                >
                  {{ formatCurrency(props.row.avg_cost_price) }}
                </span>
                <span v-else class="text-grey-4">—</span>
              </q-td>
            </template>

            <!-- Última sync -->
            <template v-slot:body-cell-last_synced_at="props">
              <q-td :props="props" class="text-caption text-grey-6">
                {{ formatDate(props.row.last_synced_at) }}
              </q-td>
            </template>

            <!-- Estado vazio -->
            <template v-slot:no-data>
              <div class="full-width column flex-center q-pa-xl text-grey-5">
                <q-icon name="inventory_2" size="4em" class="q-mb-md" />
                <div class="text-h6" v-if="!selectedCnpj">Selecione uma conta para ver os produtos</div>
                <div class="text-h6" v-else-if="search">Nenhum produto encontrado para "{{ search }}"</div>
                <div class="text-h6" v-else>Nenhum produto. Clique em "Sincronizar CMV" para importar.</div>
              </div>
            </template>

          </q-table>
        </q-card-section>

      </q-card>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from 'src/boot/axios'
import { useQuasar } from 'quasar'
import { DateTime } from 'luxon'

const $q = useQuasar()

// --- Estado ---
const products        = ref([])
const loading         = ref(false)
const loadingAccounts = ref(true)
const syncing         = ref(false)
const totalCount      = ref(null)
const search          = ref('')
const selectedAccount = ref(null)
const accountOptions  = ref([])

const selectedCnpj = computed(() => selectedAccount.value?.cnpj || null)

// --- Colunas ---
const columns = [
  { name: 'sku',            label: 'SKU',               field: 'sku',            align: 'left',  sortable: false },
  { name: 'name',           label: 'Nome do Produto',   field: 'name',           align: 'left',  sortable: false },
  { name: 'cost_price',     label: 'Custo Cadastrado',  field: 'cost_price',     align: 'right', sortable: false },
  { name: 'avg_cost_price', label: 'CMV (Custo Médio)', field: 'avg_cost_price', align: 'right', sortable: false },
  { name: 'last_synced_at', label: 'Última Sync',       field: 'last_synced_at', align: 'left',  sortable: false },
]

// --- Helpers ---
const formatCNPJ = (v) =>
  v ? v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : ''

const formatCurrency = (v) =>
  v != null
    ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : '—'

const formatDate = (v) =>
  v ? DateTime.fromISO(v).setZone('America/Sao_Paulo').toFormat('dd/MM/yy HH:mm') : '—'

// --- API ---
const loadMlAccounts = async () => {
  loadingAccounts.value = true
  try {
    const { data } = await api.get('/mercadolivre/accounts/')
    const list = Array.isArray(data) ? data : (data.results || [])

    accountOptions.value = list
      .filter(a => a.is_tiny_connected && a.cnpj)
      .map(a => ({
        cnpj:     a.cnpj,
        nickname: a.account_nickname,
        label:    `${a.account_nickname} — ${formatCNPJ(a.cnpj)}`,
      }))

    if (accountOptions.value.length > 0) {
      selectedAccount.value = accountOptions.value[0]
      loadProducts()
    }
  } catch (e) {
    console.error('Erro ao carregar contas:', e)
    $q.notify({ message: 'Erro ao carregar contas.', color: 'negative', position: 'top' })
  } finally {
    loadingAccounts.value = false
  }
}

const loadProducts = async () => {
  if (!selectedCnpj.value) {
    products.value = []
    totalCount.value = null
    return
  }

  loading.value = true
  try {
    const params = { cnpj: selectedCnpj.value }
    if (search.value) params.search = search.value

    const { data } = await api.get('/api/erps/products/', { params })
    products.value   = Array.isArray(data) ? data : (data.results || [])
    totalCount.value = products.value.length
  } catch (e) {
    console.error('Erro ao carregar produtos:', e)
    $q.notify({ message: 'Erro ao carregar produtos.', color: 'negative', position: 'top' })
  } finally {
    loading.value = false
  }
}

const onAccountChange = () => loadProducts()

const syncProducts = async () => {
  if (!selectedCnpj.value) return
  syncing.value = true
  try {
    const { data } = await api.post('/api/erps/tiny/sync-products/', { cnpj: selectedCnpj.value })
    $q.notify({
      message: `Sync concluído: ${data.synced} atualizados, ${data.skipped} sem SKU, ${data.errors} erros.`,
      color: data.errors > 0 ? 'warning' : 'positive',
      position: 'top',
      timeout: 5000,
    })
    loadProducts()
  } catch (e) {
    console.error('Erro no sync:', e)
    $q.notify({ message: 'Erro ao sincronizar com o Tiny.', color: 'negative', position: 'top' })
  } finally {
    syncing.value = false
  }
}

onMounted(loadMlAccounts)
</script>

<style scoped>
.text-mono {
  font-family: monospace;
}
</style>
