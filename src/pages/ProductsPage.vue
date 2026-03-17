<template>
  <q-page class="products-page">

    <!-- ══════════════════════════════════════════════════════ HEADER -->
    <div class="page-header">
      <div class="header-left">
        <div class="header-icon"><q-icon name="inventory_2" size="20px" /></div>
        <div>
          <div class="header-eyebrow">Custos de Mercadoria</div>
          <div class="header-title">Produtos — Custo Médio</div>
        </div>
      </div>
      <div class="header-right">
        <q-btn
          unelevated
          color="teal-7"
          icon="sync"
          label="Sincronizar Custo Médio"
          :loading="syncing"
          :disable="!selectedCnpj"
          size="sm"
          @click="syncProducts"
        >
          <q-tooltip v-if="!selectedCnpj">Selecione uma conta primeiro</q-tooltip>
        </q-btn>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════ CONTENT -->
    <div class="content-wrap">

      <!-- Filtros -->
      <div class="filter-row">
        <q-select
          v-model="selectedAccount"
          :options="accountOptions"
          option-label="label"
          label="Conta (CNPJ)"
          outlined dense clearable
          :loading="loadingAccounts"
          :disable="loadingAccounts"
          style="min-width: 260px"
          @update:model-value="onAccountChange"
        >
          <template v-slot:prepend><q-icon name="business" color="teal-7" /></template>
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
              <q-item-section class="text-grey-5">Nenhuma conta com Tiny conectado</q-item-section>
            </q-item>
          </template>
        </q-select>

        <q-input
          v-model="search"
          label="Buscar por SKU ou Nome"
          outlined dense clearable debounce="400"
          style="min-width: 240px; flex: 1"
          @update:model-value="loadProducts()"
        >
          <template v-slot:prepend><q-icon name="search" color="teal-7" /></template>
        </q-input>

        <div v-if="totalCount !== null" class="count-badge">
          {{ totalCount.toLocaleString('pt-BR') }} produto(s)
        </div>
      </div>

      <!-- Tabela -->
      <div class="table-wrap">
        <q-table
          :rows="products"
          :columns="columns"
          row-key="id"
          flat
          :loading="loading"
          :rows-per-page-options="[0]"
          class="products-table"
        >
          <template v-slot:header-cell="props">
            <q-th :props="props" class="th-cell">{{ props.col.label }}</q-th>
          </template>

          <template v-slot:body-cell-sku="props">
            <q-td :props="props">
              <span class="text-mono text-weight-medium" style="color:#1a1f36">{{ props.row.sku }}</span>
            </q-td>
          </template>

          <template v-slot:body-cell-name="props">
            <q-td :props="props">
              <span style="color:#4b5263">{{ props.row.name || '—' }}</span>
            </q-td>
          </template>

          <template v-slot:body-cell-cost_price="props">
            <q-td :props="props" class="text-right">
              <span :style="props.row.cost_price > 0 ? 'color:#4b5263' : 'color:#ef4444'">
                {{ formatCurrency(props.row.cost_price) }}
              </span>
            </q-td>
          </template>

          <template v-slot:body-cell-avg_cost_price="props">
            <q-td :props="props" class="text-right">
              <span
                v-if="props.row.avg_cost_price !== null"
                class="text-weight-bold"
                :style="props.row.avg_cost_price > 0 ? 'color:#0d9488' : 'color:#ef4444'"
              >
                {{ formatCurrency(props.row.avg_cost_price) }}
              </span>
              <span v-else style="color:#9aa0ac">—</span>
            </q-td>
          </template>

          <template v-slot:body-cell-last_synced_at="props">
            <q-td :props="props" style="color:#9aa0ac; font-size:12px">
              {{ formatDate(props.row.last_synced_at) }}
            </q-td>
          </template>

          <template v-slot:no-data>
            <div class="empty-state">
              <q-icon name="inventory_2" size="40px" style="color:#9aa0ac" />
              <div v-if="!selectedCnpj">Selecione uma conta para ver os produtos</div>
              <div v-else-if="search">Nenhum produto encontrado para "{{ search }}"</div>
              <div v-else>Nenhum produto. Clique em "Sincronizar Custo Médio" para importar.</div>
            </div>
          </template>
        </q-table>
      </div>

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
  { name: 'avg_cost_price', label: 'Custo Médio do Produto', field: 'avg_cost_price', align: 'right', sortable: false },
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
.products-page { background: #f5f7fa; min-height: 100vh; }

.page-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 24px 16px; background: #fff;
  border-bottom: 1.5px solid #e8edf3; gap: 16px; flex-wrap: wrap;
}
.header-left  { display: flex; align-items: center; gap: 12px; }
.header-right { display: flex; align-items: center; gap: 10px; }
.header-icon  {
  width: 36px; height: 36px; border-radius: 10px; display: flex;
  align-items: center; justify-content: center;
  background: linear-gradient(135deg, #0d9488, #2dd4bf); color: #fff;
}
.header-eyebrow { font-size: 10px; color: #9aa0ac; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; }
.header-title   { font-size: 17px; font-weight: 700; color: #1a1f36; }

.content-wrap { padding: 20px 24px; }

.filter-row {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  margin-bottom: 16px;
}
.count-badge {
  font-size: 12px; font-weight: 600; color: #0d9488;
  background: #e0f2f1; border-radius: 12px; padding: 3px 12px;
  white-space: nowrap;
}

.table-wrap {
  background: #fff; border-radius: 10px;
  border: 1.5px solid #e8edf3; overflow: hidden;
}
.products-table { background: transparent; }
.th-cell {
  font-size: 10px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .5px; color: #9aa0ac; white-space: nowrap;
  border-bottom: 1.5px solid #e8edf3;
}

.empty-state {
  text-align: center; padding: 60px 24px; color: #9aa0ac;
  font-size: 14px; display: flex; flex-direction: column;
  align-items: center; gap: 10px;
}

.text-mono { font-family: monospace; }
</style>
