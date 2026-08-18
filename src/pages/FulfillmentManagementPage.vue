<template>
  <q-page class="full-page">
    <header class="full-page-header">
      <div>
        <span class="full-kicker">MERCADO LIVRE · REPOSIÇÃO INTELIGENTE</span>
        <h1>Sugestões de envio Full</h1>
        <p>Veja por conta o que enviar agora, o que preparar e o que não precisa ocupar espaço.</p>
      </div>
      <div class="full-page-header__actions">
        <span v-if="!canWrite" class="full-readonly"><q-icon name="visibility" /> Modo consulta</span>
        <q-btn outline color="primary" no-caps icon="refresh" label="Recalcular" :loading="loading.account" @click="refresh" />
      </div>
    </header>

    <FulfillmentStepRail :current="step" :max-step="maxStep" @select="selectStep" />

    <div v-if="error" class="full-global-error" role="alert">
      <q-icon name="error_outline" size="21px" />
      <span><strong>Não foi possível concluir a ação</strong>{{ error }}</span>
      <q-btn flat round dense icon="close" aria-label="Fechar aviso" @click="error = ''" />
    </div>

    <FulfillmentSuggestionsStep
      v-if="step === 'suggestions'"
      :account-id="accountId"
      :account-options="accountOptions"
      :health="accountHealth"
      :preview="preview"
      :lines="previewLines"
      :selected-ids="selectedInventoryIds"
      :drafts="drafts"
      :parameters="parameters"
      :loading="loading.initialize || loading.account || loading.preview"
      :saving="loading.draft"
      :can-write="canWrite"
      @account="selectAccount"
      @selection="selectedInventoryIds = $event"
      @parameter="updateParameter"
      @refresh="recalculate"
      @create="saveDraft"
      @open-draft="openDraft"
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
      @back="flow.reopenSuggestions"
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
import FulfillmentReviewStep from 'src/components/fulfillment/FulfillmentReviewStep.vue'
import FulfillmentSuggestionsStep from 'src/components/fulfillment/FulfillmentSuggestionsStep.vue'
import FulfillmentStepRail from 'src/components/fulfillment/FulfillmentStepRail.vue'

const MERCADO_LIVRE_FULL_URL = 'https://www.mercadolivre.com.br/anuncios/lista/space_management?filters=with-fulfillment'
const $q = useQuasar()
const store = useStore()
const { canWrite } = storeToRefs(store)
const flow = useFulfillmentDraft()
const {
  step, accountId, accountOptions, accountHealth, drafts, selectedInventoryIds,
  preview, previewLines, draftDetail, draft, draftLines, canReview, parameters,
  loading, error, exportNotice,
} = flow

const maxStep = computed(() => {
  if (draft.value?.status && ['reviewed', 'exported', 'submitted_manually'].includes(draft.value.status)) return 'execution'
  if (draft.value) return 'review'
  return 'suggestions'
})

function selectStep(nextStep) {
  const target = STEP_OPTIONS.findIndex(option => option.name === nextStep)
  const allowed = STEP_OPTIONS.findIndex(option => option.name === maxStep.value)
  if (target <= allowed) step.value = nextStep
}
function updateParameter({ key, value }) { parameters[key] = value }
async function refresh() {
  const loaded = await flow.loadAccountContext()
  if (loaded) $q.notify({ type: 'positive', message: 'Sugestões recalculadas com os dados sincronizados.' })
}
async function selectAccount(value) {
  await flow.selectAccount(value)
}
async function recalculate() {
  try { await flow.calculatePreview(); $q.notify({ type: 'positive', message: 'Sugestões recalculadas com os critérios atuais.' }) } catch { /* Banner global. */ }
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
onMounted(flow.initialize)
</script>

<style lang="scss">
@import 'src/css/fulfillment-v2.scss';
</style>
