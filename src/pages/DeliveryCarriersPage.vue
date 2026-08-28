<template>
  <q-page class="q-pa-lg">
    <div class="row items-center justify-between q-mb-lg">
      <div>
        <div class="text-overline text-teal-8">Logística</div>
        <div class="text-h5 text-weight-bold">Transportadoras</div>
        <div class="text-grey-7">Configure tabelas de custo para Flex e Entrega Direta.</div>
      </div>
      <q-btn color="teal-7" icon="add" label="Nova transportadora" @click="openCarrier()" />
    </div>

    <q-tabs v-model="tab" dense active-color="teal-8" indicator-color="teal-7" class="q-mb-md">
      <q-tab name="carriers" label="Transportadoras" icon="local_shipping" />
      <q-tab name="dimensions" label="Dimensões de produtos" icon="straighten" />
    </q-tabs>

    <q-tab-panels v-model="tab" animated>
      <q-tab-panel name="carriers" class="q-pa-none">
        <q-card flat bordered>
          <q-table :rows="carriers" :columns="carrierColumns" row-key="id" :loading="loading">
            <template #body-cell-marketplace="props">
              <q-td :props="props"><q-badge :color="props.value === 'ml' ? 'amber-8' : 'deep-orange'">
                {{ props.value === 'ml' ? 'Mercado Livre' : 'Shopee' }}
              </q-badge></q-td>
            </template>
            <template #body-cell-rate_tiers="props">
              <q-td :props="props">{{ props.row.rate_tiers?.length || 0 }} faixas</q-td>
            </template>
            <template #body-cell-actions="props">
              <q-td :props="props" class="q-gutter-xs">
                <q-btn flat round dense icon="edit" color="teal-8" @click="openCarrier(props.row)" />
                <q-btn flat round dense icon="delete" color="negative" @click="removeCarrier(props.row)" />
              </q-td>
            </template>
          </q-table>
          <q-banner v-if="!loading && !carriers.length" class="bg-grey-1">Nenhuma transportadora configurada.</q-banner>
        </q-card>
      </q-tab-panel>

      <q-tab-panel name="dimensions" class="q-pa-none">
        <q-card flat bordered>
          <q-card-section class="row justify-between items-center">
            <div class="text-subtitle1 text-weight-medium">Dimensões por SKU</div>
            <q-btn outline color="teal-8" icon="add" label="Adicionar SKU" @click="openDimension()" />
          </q-card-section>
          <q-table :rows="dimensions" :columns="dimensionColumns" row-key="id" :loading="loadingDimensions">
            <template #body-cell-actions="props"><q-td :props="props" class="q-gutter-xs">
              <q-btn flat round dense icon="edit" color="teal-8" @click="openDimension(props.row)" />
              <q-btn flat round dense icon="delete" color="negative" @click="removeDimension(props.row)" />
            </q-td></template>
          </q-table>
        </q-card>
      </q-tab-panel>
    </q-tab-panels>

    <q-dialog v-model="carrierDialog"><q-card style="min-width:360px;max-width:520px;width:90vw">
      <q-card-section class="text-h6">{{ editingCarrier ? 'Editar' : 'Nova' }} transportadora</q-card-section>
      <q-card-section class="q-gutter-md">
        <q-input v-model="carrierForm.name" label="Nome" outlined dense />
        <q-select v-model="carrierForm.marketplace" :options="marketplaceOptions" emit-value map-options label="Marketplace" outlined dense />
        <q-select v-model="carrierForm.region" :options="regionOptions" emit-value map-options label="Região" outlined dense />
        <div class="text-caption text-grey-7">Limite máximo do pacote (cm)</div>
        <div class="row q-col-gutter-sm"><q-input v-model="carrierForm.max_package_length_cm" class="col" label="Comprimento" type="number" outlined dense /><q-input v-model="carrierForm.max_package_width_cm" class="col" label="Largura" type="number" outlined dense /><q-input v-model="carrierForm.max_package_height_cm" class="col" label="Altura" type="number" outlined dense /></div>
      </q-card-section>
      <q-card-actions align="right"><q-btn flat label="Cancelar" v-close-popup /><q-btn color="teal-7" label="Salvar" :loading="saving" @click="saveCarrier" /></q-card-actions>
    </q-card></q-dialog>

    <q-dialog v-model="dimensionDialog"><q-card style="min-width:360px;max-width:520px;width:90vw">
      <q-card-section class="text-h6">Dimensões do produto</q-card-section>
      <q-card-section class="q-gutter-md"><q-input v-model="dimensionForm.sku" label="SKU" outlined dense /><q-input v-model="dimensionForm.weight_kg" label="Peso real (kg)" type="number" step="0.001" outlined dense /><div class="row q-col-gutter-sm"><q-input v-for="field in dimensionFields" :key="field.key" v-model="dimensionForm[field.key]" class="col" :label="field.label + ' (cm)'" type="number" step="0.01" outlined dense /></div></q-card-section>
      <q-card-actions align="right"><q-btn flat label="Cancelar" v-close-popup /><q-btn color="teal-7" label="Salvar" :loading="saving" @click="saveDimension" /></q-card-actions>
    </q-card></q-dialog>
  </q-page>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import DeliveryCarrierService from 'src/services/DeliveryCarrierService'
import ProductDimensionsService from 'src/services/ProductDimensionsService'

const $q = useQuasar()
const tab = ref('carriers'); const loading = ref(false); const loadingDimensions = ref(false); const saving = ref(false)
const carriers = ref([]); const dimensions = ref([]); const carrierDialog = ref(false); const dimensionDialog = ref(false)
const editingCarrier = ref(null); const editingDimension = ref(null)
const marketplaceOptions = [{ label: 'Mercado Livre', value: 'ml' }, { label: 'Shopee', value: 'shopee' }]
const regionOptions = [{ label: 'Capital SP', value: 'capital_sp' }, { label: 'Grande SP', value: 'grande_sp' }, { label: 'Grande SP Extremo', value: 'grande_sp_extremo' }]
const dimensionFields = [{ key: 'length_cm', label: 'Comprimento' }, { key: 'height_cm', label: 'Altura' }, { key: 'width_cm', label: 'Largura' }]
const carrierColumns = [{ name: 'name', label: 'Nome', field: 'name', align: 'left' }, { name: 'marketplace', label: 'Marketplace', field: 'marketplace' }, { name: 'region', label: 'Região', field: 'region' }, { name: 'rate_tiers', label: 'Tabela', field: 'rate_tiers' }, { name: 'actions', label: '', field: 'actions' }]
const dimensionColumns = [{ name: 'sku', label: 'SKU', field: 'sku', align: 'left' }, { name: 'weight_kg', label: 'Peso (kg)', field: 'weight_kg' }, { name: 'length_cm', label: 'Comprimento', field: 'length_cm' }, { name: 'height_cm', label: 'Altura', field: 'height_cm' }, { name: 'width_cm', label: 'Largura', field: 'width_cm' }, { name: 'actions', label: '', field: 'actions' }]
const carrierForm = ref({ name: '', marketplace: 'ml', region: 'grande_sp', max_package_length_cm: 60, max_package_width_cm: 60, max_package_height_cm: 40 })
const dimensionForm = ref({ sku: '', weight_kg: '', length_cm: '', height_cm: '', width_cm: '' })
const list = value => value?.results || value || []
async function load() { loading.value = true; loadingDimensions.value = true; try { const [c, d] = await Promise.all([DeliveryCarrierService.list(), ProductDimensionsService.list()]); carriers.value = list(c.data); dimensions.value = list(d.data) } finally { loading.value = false; loadingDimensions.value = false } }
function openCarrier(row = null) { editingCarrier.value = row; carrierForm.value = row ? { ...row } : { name: '', marketplace: 'ml', region: 'grande_sp', max_package_length_cm: 60, max_package_width_cm: 60, max_package_height_cm: 40 }; carrierDialog.value = true }
async function saveCarrier() { saving.value = true; try { if (editingCarrier.value) await DeliveryCarrierService.update(editingCarrier.value.id, carrierForm.value); else await DeliveryCarrierService.create(carrierForm.value); carrierDialog.value = false; await load() } finally { saving.value = false } }
function openDimension(row = null) { editingDimension.value = row; dimensionForm.value = row ? { ...row } : { sku: '', weight_kg: '', length_cm: '', height_cm: '', width_cm: '' }; dimensionDialog.value = true }
async function saveDimension() { saving.value = true; try { if (editingDimension.value) await ProductDimensionsService.update(editingDimension.value.id, dimensionForm.value); else await ProductDimensionsService.create(dimensionForm.value); dimensionDialog.value = false; await load() } finally { saving.value = false } }
function removeCarrier(row) { $q.dialog({ title: 'Excluir transportadora?', message: row.name, cancel: true, persistent: true }).onOk(async () => { await DeliveryCarrierService.remove(row.id); load() }) }
function removeDimension(row) { $q.dialog({ title: 'Excluir dimensões?', message: row.sku, cancel: true, persistent: true }).onOk(async () => { await ProductDimensionsService.remove(row.id); load() }) }
onMounted(load)
</script>
