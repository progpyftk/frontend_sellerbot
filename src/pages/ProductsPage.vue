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
          unelevated color="teal-7" icon="sync" label="Sincronizar do Tiny"
           :loading="syncing" :disable="!canWrite || !selectedCnpj" size="sm"
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
                <q-item-label>{{ formatCNPJ(scope.opt.cnpj) }}</q-item-label>
                <q-item-label caption :class="scope.opt.is_connected ? 'text-teal-7' : 'text-grey-5'">
                  {{ scope.opt.is_connected ? 'Conectado' : 'Desconectado' }}
                </q-item-label>
              </q-item-section>
            </q-item>
          </template>
          <template v-slot:no-option>
            <q-item>
              <q-item-section class="text-grey-5">Nenhuma conta Tiny cadastrada</q-item-section>
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

      <!-- Legenda -->
      <div class="legend-row">
           <span v-if="canWrite" class="legend-item">
          <q-icon name="edit" size="12px" class="q-mr-xs text-teal-6" />
          Clique no custo para editar
        </span>
        <span class="legend-item">
          <q-icon name="lock" size="12px" class="q-mr-xs text-amber-7" />
          Travar impede o Tiny de sobrescrever o valor
        </span>
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

          <!-- SKU -->
          <template v-slot:body-cell-sku="props">
            <q-td :props="props">
              <span class="text-mono text-weight-medium" style="color:#1a1f36">{{ props.row.sku }}</span>
            </q-td>
          </template>

          <!-- Nome -->
          <template v-slot:body-cell-name="props">
            <q-td :props="props">
              <span style="color:#4b5263">{{ props.row.name || '—' }}</span>
            </q-td>
          </template>

          <!-- Custo Cadastrado (editável) -->
          <template v-slot:body-cell-cost_price="props">
            <q-td :props="props" class="text-right">
               <div class="editable-cell" @click="canWrite && startEdit(props.row, 'cost_price')">
                <template v-if="editingCell?.id === props.row.id && editingCell?.field === 'cost_price'">
                  <input
                    ref="editInput"
                    v-model="editingValue"
                    type="number"
                    step="0.01"
                    class="cost-input"
                    @blur="saveEdit(props.row)"
                    @keydown.enter="saveEdit(props.row)"
                    @keydown.escape="cancelEdit"
                  />
                </template>
                <template v-else>
                  <span :class="props.row.cost_price > 0 ? 'cost-val' : 'cost-zero'">
                    {{ formatCurrency(props.row.cost_price) }}
                  </span>
                   <q-icon v-if="canWrite" name="edit" size="11px" class="edit-icon" />
                </template>
              </div>
            </q-td>
          </template>

          <!-- Custo Médio (editável) -->
          <template v-slot:body-cell-avg_cost_price="props">
            <q-td :props="props" class="text-right">
               <div class="editable-cell" @click="canWrite && startEdit(props.row, 'avg_cost_price')">
                <template v-if="editingCell?.id === props.row.id && editingCell?.field === 'avg_cost_price'">
                  <input
                    ref="editInput"
                    v-model="editingValue"
                    type="number"
                    step="0.01"
                    class="cost-input"
                    @blur="saveEdit(props.row)"
                    @keydown.enter="saveEdit(props.row)"
                    @keydown.escape="cancelEdit"
                  />
                </template>
                <template v-else>
                  <span v-if="props.row.avg_cost_price !== null" class="avg-cost-val" :class="props.row.avg_cost_price > 0 ? '' : 'cost-zero'">
                    {{ formatCurrency(props.row.avg_cost_price) }}
                  </span>
                  <span v-else class="cost-empty">—</span>
                  <q-icon name="edit" size="11px" class="edit-icon" />
                </template>
              </div>
            </q-td>
          </template>

          <!-- Lock from Tiny -->
          <template v-slot:body-cell-lock_from_tiny="props">
            <q-td :props="props" class="text-center">
              <q-checkbox
                :model-value="props.row.lock_from_tiny"
                color="amber-7"
                size="sm"
                 :loading="savingId === props.row.id"
                 :disable="!canWrite"
                @update:model-value="toggleLock(props.row, $event)"
              >
                <q-tooltip class="bg-grey-9" style="max-width:220px">
                  {{ props.row.lock_from_tiny
                    ? 'Travado — o Tiny não sobrescreve este custo'
                    : 'Livre — o Tiny pode atualizar este custo' }}
                </q-tooltip>
              </q-checkbox>
            </q-td>
          </template>

          <!-- Última Sync -->
          <template v-slot:body-cell-last_synced_at="props">
            <q-td :props="props">
              <span style="color:#9aa0ac; font-size:12px">{{ formatDate(props.row.last_synced_at) }}</span>
              <q-badge v-if="props.row.lock_from_tiny" color="amber-2" text-color="amber-9" class="q-ml-xs" style="font-size:9px">
                <q-icon name="lock" size="9px" class="q-mr-xs" />travado
              </q-badge>
            </q-td>
          </template>

          <template v-slot:no-data>
            <div class="empty-state">
              <q-icon name="inventory_2" size="40px" style="color:#9aa0ac" />
              <div v-if="!selectedCnpj">Selecione uma conta para ver os produtos</div>
              <div v-else-if="search">Nenhum produto encontrado para "{{ search }}"</div>
              <div v-else>Nenhum produto. Clique em "Sincronizar do Tiny" para importar.</div>
            </div>
          </template>
        </q-table>
      </div>

    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { api } from 'src/boot/axios'
import { useQuasar } from 'quasar'
import { DateTime } from 'luxon'
import { useStore } from 'src/stores/store'

const $q = useQuasar()
const authStore = useStore()
const canWrite = computed(() => authStore.canWrite)

// --- Estado ---
const products        = ref([])
const loading         = ref(false)
const loadingAccounts = ref(true)
const syncing         = ref(false)
const totalCount      = ref(null)
const search          = ref('')
const selectedAccount = ref(null)
const accountOptions  = ref([])

// Edição inline
const editingCell  = ref(null)   // { id, field }
const editingValue = ref('')
const editInput    = ref(null)
const savingId     = ref(null)

const selectedCnpj = computed(() => selectedAccount.value?.cnpj || null)

// --- Colunas ---
const columns = [
  { name: 'sku',            label: 'SKU',               field: 'sku',            align: 'left',   sortable: false },
  { name: 'name',           label: 'Nome do Produto',   field: 'name',           align: 'left',   sortable: false },
  { name: 'cost_price',     label: 'Custo Cadastrado',  field: 'cost_price',     align: 'right',  sortable: false },
  { name: 'avg_cost_price', label: 'Custo Médio ★',     field: 'avg_cost_price', align: 'right',  sortable: false },
  { name: 'lock_from_tiny', label: 'Travar',            field: 'lock_from_tiny', align: 'center', sortable: false },
  { name: 'last_synced_at', label: 'Última Sync',       field: 'last_synced_at', align: 'left',   sortable: false },
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

// --- Edição inline ---
function startEdit(row, field) {
  editingCell.value  = { id: row.id, field }
  editingValue.value = row[field] != null ? String(row[field]) : ''
  nextTick(() => editInput.value?.focus())
}

function cancelEdit() {
  editingCell.value = null
  editingValue.value = ''
}

async function saveEdit(row) {
  if (!editingCell.value) return
  const { id, field } = editingCell.value
  const newVal = editingValue.value === '' ? null : parseFloat(editingValue.value)
  editingCell.value = null

  // Sem mudança
  if (newVal === (row[field] != null ? Number(row[field]) : null)) return

  const prevVal = row[field]
  // Atualização otimista
  const product = products.value.find(p => p.id === id)
  if (product) product[field] = newVal

  try {
    savingId.value = id
    await api.patch(`/api/erps/products/${id}/`, { [field]: newVal })
    $q.notify({ message: 'Custo atualizado.', color: 'positive', position: 'top', timeout: 2000 })
  } catch (e) {
    // Reverte em caso de erro
    if (product) product[field] = prevVal
    $q.notify({ message: 'Erro ao salvar custo.', color: 'negative', position: 'top' })
  } finally {
    savingId.value = null
  }
}

async function toggleLock(row, value) {
  const prev = row.lock_from_tiny
  row.lock_from_tiny = value  // Otimista

  try {
    savingId.value = row.id
    await api.patch(`/api/erps/products/${row.id}/`, { lock_from_tiny: value })
  } catch (e) {
    row.lock_from_tiny = prev
    $q.notify({ message: 'Erro ao atualizar lock.', color: 'negative', position: 'top' })
  } finally {
    savingId.value = null
  }
}

// --- API ---
const loadMlAccounts = async () => {
  loadingAccounts.value = true
  try {
    const { data } = await api.get('/api/erps/tiny/accounts/')
    const list = Array.isArray(data) ? data : []

    accountOptions.value = list.map(a => ({
      cnpj:     a.cnpj,
      nickname: formatCNPJ(a.cnpj),
      label:    formatCNPJ(a.cnpj),
      is_connected: a.is_connected,
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
  margin-bottom: 10px;
}
.count-badge {
  font-size: 12px; font-weight: 600; color: #0d9488;
  background: #e0f2f1; border-radius: 12px; padding: 3px 12px;
  white-space: nowrap;
}

.legend-row {
  display: flex; align-items: center; gap: 20px;
  margin-bottom: 14px; font-size: 11.5px; color: #9aa0ac;
}
.legend-item { display: flex; align-items: center; }

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

/* ── Edição inline ── */
.editable-cell {
  display: inline-flex; align-items: center; gap: 4px;
  cursor: pointer; border-radius: 4px; padding: 2px 4px;
  transition: background .15s;
}
.editable-cell:hover { background: #f0fdf9; }
.editable-cell:hover .edit-icon { opacity: 1; }

.edit-icon { color: #0d9488; opacity: 0; transition: opacity .15s; }

.cost-input {
  width: 90px; border: 1.5px solid #0d9488; border-radius: 5px;
  padding: 2px 6px; font-size: 13px; text-align: right;
  font-family: inherit; outline: none; background: #f0fdf9;
  color: #1a1f36;
}

.cost-val   { color: #4b5263; font-size: 13px; }
.cost-zero  { color: #ef4444; font-size: 13px; }
.cost-empty { color: #9aa0ac; }
.avg-cost-val { font-weight: 700; color: #0d9488; font-size: 13px; }

.empty-state {
  text-align: center; padding: 60px 24px; color: #9aa0ac;
  font-size: 14px; display: flex; flex-direction: column;
  align-items: center; gap: 10px;
}

.text-mono { font-family: monospace; }

@media (max-width: 600px) {
  .page-header { padding: 10px 12px; }
  .content-body { padding: 12px; }
  .filter-row { flex-wrap: wrap; }
}
</style>
