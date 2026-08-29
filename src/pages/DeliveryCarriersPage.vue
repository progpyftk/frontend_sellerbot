<template>
  <q-page class="q-pa-lg">
    <SbPageHeader
      eyebrow="Logística"
      title="Transportadoras"
      subtitle="Configure tabelas de custo para Flex (Mercado Livre) e Entrega Direta (Shopee)."
      icon="local_shipping"
    >
      <template #actions>
        <q-btn color="teal-7" icon="add" label="Nova transportadora" @click="openCarrier()" />
      </template>
    </SbPageHeader>

    <q-tabs v-model="tab" dense active-color="teal-8" indicator-color="teal-7" class="q-mb-md">
      <q-tab name="carriers" label="Transportadoras" icon="local_shipping" />
      <q-tab name="dimensions" label="Dimensões de produtos" icon="straighten" />
    </q-tabs>

    <q-tab-panels v-model="tab" animated>
      <q-tab-panel name="carriers" class="q-pa-none">
        <SbCard :padded="false">
          <template #header>
            <div class="text-subtitle1 text-weight-medium">Transportadoras configuradas</div>
          </template>
          <template #actions>
            <q-btn flat dense color="teal-7" icon="refresh" aria-label="Recarregar" @click="load">
              <q-tooltip>Recarregar</q-tooltip>
            </q-btn>
          </template>

          <SbEmptyState v-if="loading" variant="loading" title="Carregando transportadoras..." />
          <SbEmptyState
            v-else-if="loadError"
            variant="error"
            title="Não foi possível carregar"
            :message="loadError"
          >
            <template #action>
              <q-btn color="teal-7" label="Tentar novamente" @click="load" />
            </template>
          </SbEmptyState>
          <SbEmptyState
            v-else-if="!carriers.length"
            title="Nenhuma transportadora configurada"
            message="Cadastre uma transportadora para calcular o custo teórico das entregas."
          >
            <template #action>
              <q-btn color="teal-7" label="Nova transportadora" @click="openCarrier()" />
            </template>
          </SbEmptyState>
          <SbTable v-else>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Marketplace</th>
                <th>Conta</th>
                <th>Região</th>
                <th class="text-right">Faixas</th>
                <th class="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="carrier in carriers" :key="carrier.id">
                <td class="text-weight-medium">{{ carrier.name }}</td>
                <td>
                  <SbBadge :variant="carrier.marketplace === 'ml' ? 'ml' : 'shopee'">
                    {{ marketplaceLabel(carrier.marketplace) }}
                  </SbBadge>
                </td>
                <td>{{ accountLabel(carrier) }}</td>
                <td>{{ regionLabel(carrier.region) }}</td>
                <td class="text-right">{{ carrier.rate_tiers?.length || 0 }}</td>
                <td class="text-right no-wrap">
                  <q-btn flat dense round icon="tune" color="teal-8" aria-label="Editar faixas" @click="openTiers(carrier)">
                    <q-tooltip>Editar faixas de preço</q-tooltip>
                  </q-btn>
                  <q-btn flat dense round icon="edit" color="teal-8" aria-label="Editar transportadora" @click="openCarrier(carrier)">
                    <q-tooltip>Editar</q-tooltip>
                  </q-btn>
                  <q-btn flat dense round icon="delete" color="negative" aria-label="Excluir transportadora" @click="removeCarrier(carrier)">
                    <q-tooltip>Excluir</q-tooltip>
                  </q-btn>
                </td>
              </tr>
            </tbody>
          </SbTable>
        </SbCard>
      </q-tab-panel>

      <q-tab-panel name="dimensions" class="q-pa-none">
        <SbCard :padded="false">
          <template #header>
            <div class="text-subtitle1 text-weight-medium">Dimensões por SKU</div>
          </template>
          <template #actions>
            <q-input v-model="skuFilter" dense outlined placeholder="Buscar SKU" clearable style="min-width: 180px">
              <template #prepend><q-icon name="search" /></template>
            </q-input>
            <q-btn outline color="teal-8" icon="add" label="Adicionar SKU" @click="openDimension()" />
          </template>

          <SbEmptyState v-if="loading" variant="loading" title="Carregando dimensões..." />
          <SbEmptyState
            v-else-if="!dimensions.length"
            title="Nenhuma dimensão cadastrada"
            message="Sem dimensões, o pedido entra na auditoria como pendência e fica fora dos totais."
          >
            <template #action>
              <q-btn color="teal-7" label="Adicionar SKU" @click="openDimension()" />
            </template>
          </SbEmptyState>
          <SbEmptyState
            v-else-if="!filteredDimensions.length"
            title="Nenhum SKU encontrado"
            message="Ajuste a busca para ver outros resultados."
          />
          <SbTable v-else>
            <thead>
              <tr>
                <th>SKU</th>
                <th class="text-right">Peso real</th>
                <th class="text-right">C x A x L (cm)</th>
                <th class="text-right">Peso cubado</th>
                <th class="text-right">Faturável</th>
                <th>Origem</th>
                <th class="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="dimension in filteredDimensions" :key="dimension.id">
                <td class="text-weight-medium">{{ dimension.sku }}</td>
                <td class="text-right">{{ formatKg(dimension.weight_kg) }}</td>
                <td class="text-right">{{ dimension.length_cm }} x {{ dimension.height_cm }} x {{ dimension.width_cm }}</td>
                <td class="text-right">{{ formatKg(cubedWeight(dimension)) }}</td>
                <td class="text-right text-weight-medium">{{ formatKg(billableWeight(dimension)) }}</td>
                <td>{{ dimension.source }}</td>
                <td class="text-right no-wrap">
                  <q-btn flat dense round icon="edit" color="teal-8" aria-label="Editar dimensões" @click="openDimension(dimension)">
                    <q-tooltip>Editar</q-tooltip>
                  </q-btn>
                  <q-btn flat dense round icon="delete" color="negative" aria-label="Excluir dimensões" @click="removeDimension(dimension)">
                    <q-tooltip>Excluir</q-tooltip>
                  </q-btn>
                </td>
              </tr>
            </tbody>
          </SbTable>
        </SbCard>
      </q-tab-panel>
    </q-tab-panels>

    <q-dialog v-model="carrierDialog" persistent>
      <q-card style="width: min(560px, 95vw)">
        <q-card-section class="text-h6">{{ editingCarrier ? 'Editar' : 'Nova' }} transportadora</q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input v-model="carrierForm.name" label="Nome" outlined dense />
          <div class="row q-col-gutter-sm">
            <q-select
              v-model="carrierForm.marketplace" :options="marketplaceOptions" emit-value map-options
              label="Marketplace" outlined dense class="col-12 col-sm-6"
            />
            <q-select
              v-model="carrierForm.region" :options="regionOptions" emit-value map-options
              label="Região" outlined dense class="col-12 col-sm-6"
            />
          </div>
          <q-select
            v-model="accountId" :options="accountOptions" emit-value map-options
            :label="carrierForm.marketplace === 'ml' ? 'Conta Mercado Livre' : 'Conta Shopee'"
            outlined dense clearable
            hint="Sem conta selecionada, a tabela vale para todas as contas do marketplace."
          />
          <div class="text-caption text-grey-7">Limite máximo do pacote (cm)</div>
          <div class="row q-col-gutter-sm">
            <q-input v-model="carrierForm.max_package_length_cm" class="col-12 col-sm-4" label="Comprimento" type="number" outlined dense />
            <q-input v-model="carrierForm.max_package_width_cm" class="col-12 col-sm-4" label="Largura" type="number" outlined dense />
            <q-input v-model="carrierForm.max_package_height_cm" class="col-12 col-sm-4" label="Altura" type="number" outlined dense />
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" :disable="saving" v-close-popup />
          <q-btn color="teal-7" label="Salvar" :loading="saving" @click="saveCarrier" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="dimensionDialog" persistent>
      <q-card style="width: min(560px, 95vw)">
        <q-card-section class="text-h6">Dimensões do produto</q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input v-model="dimensionForm.sku" label="SKU" outlined dense />
          <q-input v-model="dimensionForm.weight_kg" label="Peso real (kg)" type="number" step="0.001" outlined dense />
          <div class="row q-col-gutter-sm">
            <q-input
              v-for="field in dimensionFields" :key="field.key" v-model="dimensionForm[field.key]"
              class="col-12 col-sm-4" :label="`${field.label} (cm)`" type="number" step="0.01" outlined dense
            />
          </div>
          <div class="row q-col-gutter-md">
            <div class="col-12 col-sm-6">
              <div class="text-caption text-grey-7">Peso cubado (C × A × L ÷ 6000)</div>
              <div class="text-h6">{{ formatKg(preview.cubed) }}</div>
            </div>
            <div class="col-12 col-sm-6">
              <div class="text-caption text-grey-7">Peso faturável (maior entre real e cubado)</div>
              <div class="text-h6 text-teal-8">{{ formatKg(preview.billable) }}</div>
            </div>
          </div>
          <div class="text-caption text-grey-7">
            O peso faturável define a faixa da tabela usada no cálculo do frete.
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" :disable="saving" v-close-popup />
          <q-btn color="teal-7" label="Salvar" :loading="saving" @click="saveDimension" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <DeliveryRateTierDialog v-model="tierDialog" :carrier="editingTierCarrier" @saved="onTiersSaved" />
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute } from 'vue-router'
import { api } from 'src/boot/axios'
import SbBadge from 'src/components/common/SbBadge.vue'
import SbCard from 'src/components/common/SbCard.vue'
import SbEmptyState from 'src/components/common/SbEmptyState.vue'
import SbPageHeader from 'src/components/common/SbPageHeader.vue'
import SbTable from 'src/components/common/SbTable.vue'
import DeliveryRateTierDialog from 'src/components/logistics/DeliveryRateTierDialog.vue'
import DeliveryCarrierService from 'src/services/DeliveryCarrierService'
import ProductDimensionsService from 'src/services/ProductDimensionsService'

const $q = useQuasar()
const route = useRoute()

// A auditoria aponta para cá com ?tab=dimensions quando faltam dimensões.
const tab = ref(route.query.tab === 'dimensions' ? 'dimensions' : 'carriers')
const loading = ref(false)
const saving = ref(false)
const loadError = ref('')
const carriers = ref([])
const dimensions = ref([])
const mlAccounts = ref([])
const shopeeAccounts = ref([])
const skuFilter = ref('')

const carrierDialog = ref(false)
const dimensionDialog = ref(false)
const tierDialog = ref(false)
const editingCarrier = ref(null)
const editingDimension = ref(null)
const editingTierCarrier = ref(null)
const accountId = ref(null)

const marketplaceOptions = [
  { label: 'Mercado Livre', value: 'ml' },
  { label: 'Shopee', value: 'shopee' },
]
const regionOptions = [
  { label: 'Capital SP', value: 'capital_sp' },
  { label: 'Grande SP', value: 'grande_sp' },
  { label: 'Grande SP Extremo', value: 'grande_sp_extremo' },
]
const dimensionFields = [
  { key: 'length_cm', label: 'Comprimento' },
  { key: 'height_cm', label: 'Altura' },
  { key: 'width_cm', label: 'Largura' },
]

const blankCarrier = () => ({
  name: '', marketplace: 'ml', region: 'grande_sp',
  max_package_length_cm: 60, max_package_width_cm: 60, max_package_height_cm: 40,
})
const blankDimension = () => ({ sku: '', weight_kg: '', length_cm: '', height_cm: '', width_cm: '' })

const carrierForm = ref(blankCarrier())
const dimensionForm = ref(blankDimension())

const accountOptions = computed(() => {
  const source = carrierForm.value.marketplace === 'ml' ? mlAccounts.value : shopeeAccounts.value
  return [
    { label: 'Todas as contas', value: null },
    ...source.map((account) => ({
      label: account.account_nickname || account.shop_name || `#${account.id}`,
      value: account.id,
    })),
  ]
})

const filteredDimensions = computed(() => {
  const term = (skuFilter.value || '').trim().toLowerCase()
  if (!term) return dimensions.value
  return dimensions.value.filter((dimension) => (dimension.sku || '').toLowerCase().includes(term))
})

const preview = computed(() => {
  const length = Number(dimensionForm.value.length_cm)
  const height = Number(dimensionForm.value.height_cm)
  const width = Number(dimensionForm.value.width_cm)
  const weight = Number(dimensionForm.value.weight_kg)
  if (![length, height, width].every(Number.isFinite) || !length || !height || !width) {
    return { cubed: null, billable: Number.isFinite(weight) ? weight : null }
  }
  const cubed = (length * height * width) / 6000
  return { cubed, billable: Number.isFinite(weight) ? Math.max(weight, cubed) : cubed }
})

const toNumber = (value) => (value === '' || value === null || value === undefined ? null : Number(value))

const cubedWeight = (dimension) => {
  const length = Number(dimension.length_cm) || 0
  const height = Number(dimension.height_cm) || 0
  const width = Number(dimension.width_cm) || 0
  return (length * height * width) / 6000
}

const billableWeight = (dimension) => Math.max(Number(dimension.weight_kg) || 0, cubedWeight(dimension))

function formatKg(value) {
  if (value === null || value === undefined || value === '' || !Number.isFinite(Number(value))) return '—'
  return `${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`
}

const marketplaceLabel = (value) => (value === 'ml' ? 'Mercado Livre' : 'Shopee')
const regionLabel = (value) => regionOptions.find((option) => option.value === value)?.label || value || '—'

function accountLabel(carrier) {
  const linked = carrier.ml_account || carrier.shopee_account
  if (!linked) return 'Todas as contas'
  const source = carrier.marketplace === 'ml' ? mlAccounts.value : shopeeAccounts.value
  const account = source.find((item) => item.id === linked)
  return account ? (account.account_nickname || account.shop_name) : `#${linked}`
}

function errorMessage(error, fallback) {
  const data = error?.response?.data
  if (!data) return fallback
  if (typeof data === 'string') return data
  if (data.detail) return data.detail
  const first = Object.values(data)[0]
  if (Array.isArray(first)) return String(first[0])
  return fallback
}

const list = (value) => value?.results || value || []

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const [carriersResponse, dimensionsResponse] = await Promise.all([
      DeliveryCarrierService.list(),
      ProductDimensionsService.list(),
    ])
    carriers.value = list(carriersResponse.data)
    dimensions.value = list(dimensionsResponse.data)
  } catch (error) {
    loadError.value = errorMessage(error, 'Falha ao carregar as configurações de logística.')
    carriers.value = []
    dimensions.value = []
  } finally {
    loading.value = false
  }
}

async function loadAccounts() {
  try {
    const [mlResponse, shopeeResponse] = await Promise.all([
      api.get('/mercadolivre/accounts/'),
      api.get('/shopee/accounts/'),
    ])
    mlAccounts.value = list(mlResponse.data)
    shopeeAccounts.value = list(shopeeResponse.data)
  } catch {
    // Sem contas carregadas o seletor simplesmente não oferece opções.
    mlAccounts.value = []
    shopeeAccounts.value = []
  }
}

function openCarrier(row = null) {
  editingCarrier.value = row
  carrierForm.value = row ? { ...row } : blankCarrier()
  accountId.value = row ? (row.ml_account || row.shopee_account || null) : null
  carrierDialog.value = true
}

async function saveCarrier() {
  saving.value = true
  try {
    const isMl = carrierForm.value.marketplace === 'ml'
    const payload = {
      name: carrierForm.value.name,
      marketplace: carrierForm.value.marketplace,
      region: carrierForm.value.region,
      max_package_length_cm: toNumber(carrierForm.value.max_package_length_cm),
      max_package_width_cm: toNumber(carrierForm.value.max_package_width_cm),
      max_package_height_cm: toNumber(carrierForm.value.max_package_height_cm),
      ml_account: isMl ? accountId.value : null,
      shopee_account: isMl ? null : accountId.value,
    }
    if (editingCarrier.value) {
      await DeliveryCarrierService.update(editingCarrier.value.id, payload)
    } else {
      await DeliveryCarrierService.create(payload)
    }
    $q.notify({ type: 'positive', message: 'Transportadora salva.' })
    carrierDialog.value = false
    await load()
  } catch (error) {
    $q.notify({ type: 'negative', message: errorMessage(error, 'Não foi possível salvar a transportadora.') })
  } finally {
    saving.value = false
  }
}

function openTiers(row) {
  editingTierCarrier.value = row
  tierDialog.value = true
}

async function onTiersSaved() {
  await load()
}

function openDimension(row = null) {
  editingDimension.value = row
  dimensionForm.value = row ? { ...row } : blankDimension()
  dimensionDialog.value = true
}

async function saveDimension() {
  saving.value = true
  try {
    const payload = {
      sku: dimensionForm.value.sku,
      weight_kg: toNumber(dimensionForm.value.weight_kg),
      length_cm: toNumber(dimensionForm.value.length_cm),
      height_cm: toNumber(dimensionForm.value.height_cm),
      width_cm: toNumber(dimensionForm.value.width_cm),
    }
    if (editingDimension.value) {
      await ProductDimensionsService.update(editingDimension.value.id, payload)
    } else {
      await ProductDimensionsService.create(payload)
    }
    $q.notify({ type: 'positive', message: 'Dimensões salvas.' })
    dimensionDialog.value = false
    await load()
  } catch (error) {
    $q.notify({ type: 'negative', message: errorMessage(error, 'Não foi possível salvar as dimensões.') })
  } finally {
    saving.value = false
  }
}

function removeCarrier(row) {
  $q.dialog({ title: 'Excluir transportadora?', message: row.name, cancel: true, persistent: true }).onOk(async () => {
    try {
      await DeliveryCarrierService.remove(row.id)
      $q.notify({ type: 'positive', message: 'Transportadora excluída.' })
      await load()
    } catch (error) {
      $q.notify({
        type: 'negative',
        message: errorMessage(error, 'Não foi possível excluir. Há auditorias vinculadas a esta transportadora.'),
      })
    }
  })
}

function removeDimension(row) {
  $q.dialog({ title: 'Excluir dimensões?', message: row.sku, cancel: true, persistent: true }).onOk(async () => {
    try {
      await ProductDimensionsService.remove(row.id)
      $q.notify({ type: 'positive', message: 'Dimensões excluídas.' })
      await load()
    } catch (error) {
      $q.notify({ type: 'negative', message: errorMessage(error, 'Não foi possível excluir as dimensões.') })
    }
  })
}

// Trocar o marketplace invalida a conta selecionada: ML e Shopee têm contas distintas.
watch(() => carrierForm.value.marketplace, () => { accountId.value = null })

onMounted(async () => {
  await Promise.all([load(), loadAccounts()])
})
</script>
