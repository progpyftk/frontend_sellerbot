<template>
  <q-page class="full-page">
    <header class="full-page-header">
      <div>
        <span class="full-kicker">MERCADO LIVRE · CRIAÇÃO ASSISTIDA</span>
        <h1>Planejar envio ao Full</h1>
        <p>Da saúde dos dados a um checklist revisável, sem fingir que o SellerBot cria a remessa pela API.</p>
      </div>
      <div class="full-page-header__actions">
        <span v-if="!canWrite" class="full-readonly"><q-icon name="visibility" /> Modo consulta</span>
        <q-btn outline color="primary" no-caps icon="refresh" label="Atualizar fontes" :loading="loading.account" @click="refresh" />
      </div>
    </header>

    <FulfillmentStepRail :current="step" :max-step="maxStep" @select="selectStep" />

    <div v-if="error" class="full-global-error" role="alert">
      <q-icon name="error_outline" size="21px" />
      <span><strong>Não foi possível concluir a ação</strong>{{ error }}</span>
      <q-btn flat round dense icon="close" aria-label="Fechar aviso" @click="error = ''" />
    </div>

    <FulfillmentHealthStep
      v-if="step === 'health'"
      :account-id="accountId"
      :account-options="accountOptions"
      :health="accountHealth"
      :imports="imports"
      :selected-import-id="selectedImportId"
      :drafts="drafts"
      :loading="loading.initialize || loading.account"
      :importing="loading.import"
      :can-write="canWrite"
      @account="selectAccount"
      @import-id="selectedImportId = $event"
      @upload="uploadReport"
      @continue="goToParameters"
      @open-draft="openDraft"
    />

    <FulfillmentParametersStep
      v-else-if="step === 'parameters'"
      :preview="preview"
      :lines="previewLines"
      :line-inputs="lineInputs"
      :parameters="parameters"
      :loading="loading.preview"
      :saving="loading.draft"
      :package-saving="loading.package"
      :can-write="canWrite"
      @parameter="updateParameter"
      @line="updateLineInput"
      @recalculate="recalculate"
      @create="saveDraft"
      @save-package="savePackageProfile"
      @back="step = 'health'"
    />

    <FulfillmentReviewStep
      v-else-if="step === 'review'"
      :draft="draft"
      :lines="draftLines"
      :adjustments="draftDetail?.adjustments || []"
      :loading="loading.draft"
      :adjusting="loading.adjust"
      :reviewing="loading.review"
      :can-review="canReview"
      :can-write="canWrite"
      @adjust="adjustQuantity"
      @review="confirmReview"
      @back="flow.reopenParameters"
    />

    <FulfillmentExecutionStep
      v-else
      :draft="draft"
      :lines="draftLines"
      :exports="draftDetail?.exports || []"
      :notice="exportNotice"
      :exporting="loading.export"
      :submitting="loading.submit"
      :can-write="canWrite"
      :panel-url="MERCADO_LIVRE_FULL_URL"
      @export="downloadExport"
      @submit="registerSubmission"
      @back="step = 'review'"
    />
  </q-page>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useQuasar } from 'quasar'
import { useStore } from 'src/stores/store'
import { useFulfillmentDraft } from 'src/composables/useFulfillmentDraft'
import { STEP_OPTIONS, downloadCsv } from 'src/utils/fulfillmentDraft'
import FulfillmentExecutionStep from 'src/components/fulfillment/FulfillmentExecutionStep.vue'
import FulfillmentHealthStep from 'src/components/fulfillment/FulfillmentHealthStep.vue'
import FulfillmentParametersStep from 'src/components/fulfillment/FulfillmentParametersStep.vue'
import FulfillmentReviewStep from 'src/components/fulfillment/FulfillmentReviewStep.vue'
import FulfillmentStepRail from 'src/components/fulfillment/FulfillmentStepRail.vue'

const MERCADO_LIVRE_FULL_URL = 'https://www.mercadolivre.com.br/anuncios/lista/space_management?filters=with-fulfillment'
const $q = useQuasar()
const store = useStore()
const { canWrite } = storeToRefs(store)
const flow = useFulfillmentDraft()
const {
  step, accountId, accountOptions, accountHealth, imports, drafts, selectedImportId,
  preview, previewLines, draftDetail, draft, draftLines, canReview, parameters,
  lineInputs, loading, error, exportNotice,
} = flow

const maxStep = computed(() => {
  if (draft.value?.status && ['reviewed', 'exported', 'submitted_manually'].includes(draft.value.status)) return 'execution'
  if (draft.value) return 'review'
  if (preview.value) return 'parameters'
  return 'health'
})

function selectStep(nextStep) {
  const target = STEP_OPTIONS.findIndex(option => option.name === nextStep)
  const allowed = STEP_OPTIONS.findIndex(option => option.name === maxStep.value)
  if (target <= allowed) step.value = nextStep
}
function updateParameter({ key, value }) { parameters[key] = value }
function updateLineInput({ inventoryId, key, value }) {
  if (!lineInputs[inventoryId]) lineInputs[inventoryId] = {}
  lineInputs[inventoryId][key] = value == null ? null : Number(value)
}
async function refresh() {
  const loaded = await flow.loadAccountContext()
  if (loaded) $q.notify({ type: 'positive', message: 'Fontes atualizadas.' })
}
async function selectAccount(value) {
  await flow.selectAccount(value)
}
async function uploadReport({ file, reportType }) {
  try {
    const result = await flow.uploadImport(file, reportType)
    $q.notify({ type: result?.duplicate ? 'info' : 'positive', message: result?.duplicate ? 'Este arquivo já estava importado.' : 'Relatório validado e importado.' })
  } catch { /* O banner global já explica. */ }
}
async function goToParameters() {
  try { await flow.openParameters() } catch { /* Banner global. */ }
}
async function recalculate() {
  try { await flow.calculatePreview(); $q.notify({ type: 'positive', message: 'Prévia recalculada.' }) } catch { /* Banner global. */ }
}
async function saveDraft() {
  try { await flow.createDraft(); $q.notify({ type: 'positive', message: 'Rascunho versionado salvo.' }) } catch { /* Banner global. */ }
}
async function openDraft(draftId) {
  try { await flow.loadDraft(draftId) } catch { /* Banner global. */ }
}
async function adjustQuantity(payload) {
  try { await flow.adjustLine(payload.lineId, payload.quantity, payload.reason); $q.notify({ type: 'positive', message: 'Nova versão criada com o ajuste.' }) } catch { /* Banner global. */ }
}
async function confirmReview() {
  try { await flow.reviewDraft(); $q.notify({ type: 'positive', message: 'Versão confirmada para execução.' }) } catch { /* Banner global. */ }
}
async function downloadExport() {
  try {
    const result = await flow.exportDraft()
    downloadCsv(result.content, result.export.filename)
    await flow.loadDraft(draft.value.id)
    $q.notify({ type: 'positive', message: 'Checklist versionado baixado.' })
  } catch { /* Shadow mode aparece dentro da etapa. */ }
}
async function registerSubmission(reference) {
  try { await flow.markSubmitted(reference); $q.notify({ type: 'positive', message: 'Envio manual registrado.' }) } catch { /* Banner global. */ }
}
async function savePackageProfile({ line, packageData }) {
  try { await flow.savePackage(line, packageData); $q.notify({ type: 'positive', message: 'Embalagem salva e prévia recalculada.' }) } catch { /* Banner global. */ }
}

onMounted(flow.initialize)
</script>

<style lang="scss">
@import 'src/css/fulfillment-v2.scss';
</style>
