<template>
  <section class="full-panel" aria-labelledby="full-parameters-title">
    <div class="full-panel__header">
      <div>
        <span class="full-kicker">ETAPA 2 · PREMISSAS</span>
        <h2 id="full-parameters-title">Quando este estoque pode chegar ao Full?</h2>
        <p>Datas e estoque local mudam a quantidade. Nada é enviado nesta etapa.</p>
      </div>
      <div v-if="preview?.summary" class="full-summary-pills" aria-label="Resumo da prévia">
        <span class="full-status full-status--ready">{{ preview.summary.ready }} prontos</span>
        <span class="full-status full-status--review">{{ preview.summary.review }} revisar</span>
        <span class="full-status full-status--blocked">{{ preview.summary.blocked }} bloqueados</span>
      </div>
    </div>

    <div class="full-parameter-grid">
      <q-input :model-value="parameters.dispatchDate" type="date" outlined dense stack-label label="Data prevista de despacho" @update:model-value="updateParameter('dispatchDate', $event)" />
      <q-input :model-value="parameters.receiptDate" type="date" outlined dense stack-label label="Chegada prevista ao Full" @update:model-value="updateParameter('receiptDate', $event)" />
      <q-input :model-value="parameters.targetDays" type="number" min="1" max="120" outlined dense label="Cobertura alvo (dias)" @update:model-value="updateParameter('targetDays', $event)" />
      <q-input :model-value="parameters.safetyStockDays" type="number" min="0" max="60" outlined dense label="Estoque de segurança (dias)" @update:model-value="updateParameter('safetyStockDays', $event)" />
    </div>
    <div class="full-source-legend">
      <FulfillmentSourceBadge source="official_ml_inventory" />
      <FulfillmentSourceBadge source="sellerbot_observed_sales" />
      <FulfillmentSourceBadge source="manual" />
      <span>Cada valor abaixo informa sua origem.</span>
    </div>

    <div v-if="loading && !lines.length" class="full-state" role="status">
      <q-spinner-dots color="primary" size="36px" />
      <span>Montando a prévia por inventory ID...</span>
    </div>
    <div v-else-if="!lines.length" class="full-state">
      <q-icon name="inventory_2" size="36px" />
      <strong>Nenhum inventário Full observado</strong>
      <span>Volte à Saúde e atualize a fonte de inventário desta conta.</span>
    </div>
    <template v-else>
      <div class="full-table-wrap">
        <table class="full-table full-table--inputs">
          <thead>
            <tr><th>Produto</th><th>Full agora</th><th>Estoque local</th><th>Caixa</th><th>Limite de espaço</th><th>Prévia</th><th>Situação</th></tr>
          </thead>
          <tbody>
            <tr v-for="line in lines" :key="line.identity.inventory_id">
              <td>
                <div class="full-product">
                  <span class="full-product__icon"><q-icon name="inventory_2" /></span>
                  <span><strong>{{ line.identity.title || line.identity.inventory_id }}</strong><small>{{ line.identity.sku || 'Sem SKU' }} · {{ line.identity.inventory_id }}</small></span>
                </div>
              </td>
              <td><strong>{{ line.inventory.available_quantity ?? '—' }}</strong><FulfillmentSourceBadge :source="line.sources.inventory" /></td>
              <td>
                <q-input :model-value="inputValue(line, 'localAvailable')" type="number" min="0" outlined dense aria-label="Estoque local" @update:model-value="updateLine(line, 'localAvailable', $event)" />
                <FulfillmentSourceBadge source="manual" />
              </td>
              <td><q-input :model-value="inputValue(line, 'casePack')" type="number" min="1" outlined dense aria-label="Múltiplo da caixa" @update:model-value="updateLine(line, 'casePack', $event)" /></td>
              <td><q-input :model-value="inputValue(line, 'spaceLimit')" type="number" min="0" outlined dense clearable aria-label="Limite de espaço em unidades" @update:model-value="updateLine(line, 'spaceLimit', $event)" /></td>
              <td><strong class="full-quantity">{{ line.calculated_quantity ?? '—' }}</strong><FulfillmentSourceBadge source="sellerbot_proxy" /></td>
              <td>
                <span class="full-status" :class="`full-status--${decisionMeta(line.decision_status).tone}`"><q-icon :name="decisionMeta(line.decision_status).icon" /> {{ decisionMeta(line.decision_status).label }}</span>
                <button v-if="needsPackage(line)" type="button" class="full-text-action" @click="openPackage(line)">Completar embalagem</button>
                <small v-else-if="primaryDecisionReason(line)" class="full-reason">{{ reasonLabel(primaryDecisionReason(line)) }}</small>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="full-mobile-cards">
        <article v-for="line in lines" :key="`mobile-${line.identity.inventory_id}`" class="full-line-card">
          <div class="full-line-card__head">
            <span><strong>{{ line.identity.title }}</strong><small>{{ line.identity.sku || line.identity.inventory_id }}</small></span>
            <span class="full-status" :class="`full-status--${decisionMeta(line.decision_status).tone}`">{{ decisionMeta(line.decision_status).label }}</span>
          </div>
          <div class="full-line-card__metrics"><span>Full <strong>{{ line.inventory.available_quantity ?? '—' }}</strong></span><span>Prévia <strong>{{ line.calculated_quantity ?? '—' }}</strong></span></div>
          <div class="full-line-card__inputs">
            <q-input :model-value="inputValue(line, 'localAvailable')" type="number" min="0" outlined dense label="Estoque local" @update:model-value="updateLine(line, 'localAvailable', $event)" />
            <q-input :model-value="inputValue(line, 'casePack')" type="number" min="1" outlined dense label="Múltiplo caixa" @update:model-value="updateLine(line, 'casePack', $event)" />
          </div>
          <button v-if="needsPackage(line)" type="button" class="full-text-action" @click="openPackage(line)">Completar peso e dimensões</button>
          <small v-else-if="primaryDecisionReason(line)" class="full-reason">{{ reasonLabel(primaryDecisionReason(line)) }}</small>
        </article>
      </div>
    </template>

    <div class="full-actions">
      <q-btn flat no-caps icon="arrow_back" label="Voltar à saúde" @click="$emit('back')" />
      <div class="full-actions__right">
        <q-btn outline color="primary" no-caps icon="calculate" label="Recalcular prévia" :loading="loading" :disable="!lines.length" @click="$emit('recalculate')" />
        <q-btn unelevated color="primary" no-caps icon-right="arrow_forward" label="Salvar rascunho e revisar" :loading="saving" :disable="!canWrite || !lines.length" @click="$emit('create')" />
      </div>
    </div>
    <p v-if="!canWrite" class="full-inline-note"><q-icon name="visibility" /> Você pode simular parâmetros, mas seu perfil não pode salvar rascunhos.</p>

    <q-dialog v-model="packageOpen">
      <q-card class="full-dialog">
        <q-card-section>
          <span class="full-kicker">EMBALAGEM · ENTRADA MANUAL</span>
          <h3>Complete peso e dimensões</h3>
          <p>{{ packageLine?.identity?.title }}</p>
        </q-card-section>
        <q-card-section class="full-dialog-grid">
          <q-input v-model.number="packageForm.weight_kg" type="number" min="0.001" step="0.001" outlined dense label="Peso (kg)" />
          <q-input v-model.number="packageForm.height_cm" type="number" min="0.01" step="0.01" outlined dense label="Altura (cm)" />
          <q-input v-model.number="packageForm.width_cm" type="number" min="0.01" step="0.01" outlined dense label="Largura (cm)" />
          <q-input v-model.number="packageForm.length_cm" type="number" min="0.01" step="0.01" outlined dense label="Comprimento (cm)" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps label="Cancelar" v-close-popup />
          <q-btn unelevated color="primary" no-caps label="Salvar e recalcular" :loading="packageSaving" :disable="!packageValid" @click="savePackage" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </section>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import FulfillmentSourceBadge from './FulfillmentSourceBadge.vue'
import { decisionMeta, primaryDecisionReason, reasonLabel } from 'src/utils/fulfillmentDraft'

const props = defineProps({
  preview: { type: Object, default: null },
  lines: { type: Array, default: () => [] },
  lineInputs: { type: Object, default: () => ({}) },
  parameters: { type: Object, required: true },
  loading: Boolean,
  saving: Boolean,
  packageSaving: Boolean,
  canWrite: Boolean,
})
const emit = defineEmits(['parameter', 'line', 'recalculate', 'create', 'back', 'save-package'])
const packageOpen = ref(false)
const packageLine = ref(null)
const packageForm = reactive({ weight_kg: null, height_cm: null, width_cm: null, length_cm: null })
const packageValid = computed(() => Object.values(packageForm).every(value => Number(value) > 0))

function updateParameter(key, value) { emit('parameter', { key, value }) }
function updateLine(line, key, value) { emit('line', { inventoryId: line.identity.inventory_id, key, value: value === '' ? null : value }) }
function inputValue(line, key) { return props.lineInputs[line.identity.inventory_id]?.[key] ?? null }
function needsPackage(line) { return line.blockers?.includes('blocked_identity_package') }
function openPackage(line) {
  packageLine.value = line
  Object.keys(packageForm).forEach(key => { packageForm[key] = null })
  packageOpen.value = true
}
function savePackage() {
  emit('save-package', { line: packageLine.value, packageData: { ...packageForm, source: 'manual', confidence: 'high', manual_override: true } })
  packageOpen.value = false
}
</script>
