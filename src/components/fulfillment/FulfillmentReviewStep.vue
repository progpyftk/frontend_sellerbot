<template>
  <section class="full-panel" aria-labelledby="full-review-title">
    <div class="full-panel__header">
      <div>
        <span class="full-kicker">ETAPA 3 · DECISÃO</span>
        <h2 id="full-review-title">Compare antes de confirmar</h2>
        <p>Sugestão oficial, cálculo SellerBot e decisão humana nunca são misturados.</p>
      </div>
      <div v-if="draft" class="full-version-chip"><q-icon name="history" /> Versão {{ draft.version }} · {{ draft.status === 'draft' ? 'não revisada' : draft.status }}</div>
    </div>

    <div class="full-review-guidance">
      <q-icon name="info" size="20px" />
      <div><strong>Ajustes criam uma nova versão.</strong><span>A quantidade anterior, o motivo, o usuário e a data permanecem no histórico.</span></div>
    </div>

    <div v-if="loading && !lines.length" class="full-state" role="status"><q-spinner-dots color="primary" size="36px" /><span>Carregando rascunho...</span></div>
    <div v-else-if="!lines.length" class="full-state"><q-icon name="fact_check" size="36px" /><strong>Rascunho sem linhas</strong></div>
    <template v-else>
      <div class="full-table-wrap">
        <table class="full-table full-table--review">
          <thead><tr><th>Produto</th><th>Oficial ML</th><th>SellerBot</th><th>Decisão atual</th><th>Desempenho</th><th>Situação</th><th></th></tr></thead>
          <tbody>
            <tr v-for="line in lines" :key="line.id">
              <td><div class="full-product"><span class="full-product__icon"><q-icon name="inventory_2" /></span><span><strong>{{ line.title || line.inventory_id }}</strong><small>{{ line.sku || 'Sem SKU' }} · {{ line.inventory_id }}</small></span></div></td>
              <td><strong class="full-quantity">{{ line.official_suggested_units ?? '—' }}</strong><FulfillmentSourceBadge :source="line.sources.planning" /></td>
              <td><strong class="full-quantity">{{ line.calculated_quantity ?? '—' }}</strong><FulfillmentSourceBadge source="sellerbot_proxy" /><small>{{ demandText(line) }}</small></td>
              <td><strong class="full-quantity" :class="line.adjusted_quantity != null && 'full-quantity--adjusted'">{{ line.effective_quantity ?? '—' }}</strong><FulfillmentSourceBadge :source="line.adjusted_quantity != null ? 'manual' : 'sellerbot_proxy'" /><small v-if="line.adjusted_quantity != null">Ajustado de {{ line.calculated_quantity }}</small></td>
              <td><strong>{{ line.stock_age_days ?? '—' }} dias</strong><small>Rotatividade {{ formatDecimal(line.turnover, 2) }}</small></td>
              <td><span class="full-status" :class="`full-status--${decisionMeta(line.decision_status).tone}`"><q-icon :name="decisionMeta(line.decision_status).icon" /> {{ decisionMeta(line.decision_status).label }}</span><small class="full-reason">{{ primaryReason(line) }}</small></td>
              <td><q-btn flat round dense icon="edit" aria-label="Ajustar quantidade" :disable="!canWrite || line.decision_status === 'blocked' || line.calculated_quantity == null" @click="openAdjustment(line)" /></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="full-mobile-cards">
        <article v-for="line in lines" :key="`review-${line.id}`" class="full-line-card">
          <div class="full-line-card__head"><span><strong>{{ line.title }}</strong><small>{{ line.sku || line.inventory_id }}</small></span><span class="full-status" :class="`full-status--${decisionMeta(line.decision_status).tone}`">{{ decisionMeta(line.decision_status).label }}</span></div>
          <div class="full-compare-grid"><span>Oficial ML<strong>{{ line.official_suggested_units ?? '—' }}</strong></span><span>SellerBot<strong>{{ line.calculated_quantity ?? '—' }}</strong></span><span>Decisão<strong>{{ line.effective_quantity ?? '—' }}</strong></span></div>
          <small class="full-reason">{{ primaryReason(line) }}</small>
          <q-btn v-if="line.decision_status !== 'blocked' && line.calculated_quantity != null" outline color="primary" no-caps icon="edit" label="Ajustar com motivo" :disable="!canWrite" @click="openAdjustment(line)" />
        </article>
      </div>

      <div v-if="adjustments.length" class="full-audit-list">
        <span class="full-kicker">ALTERAÇÕES DESTA VERSÃO</span>
        <article v-for="adjustment in adjustments" :key="adjustment.id">
          <q-icon name="edit_note" /><span><strong>{{ adjustment.previous_quantity ?? '—' }} → {{ adjustment.new_quantity }} unidades</strong><small>{{ adjustment.reason }} · {{ adjustment.actor || 'usuário removido' }}</small></span>
        </article>
      </div>
    </template>

    <div class="full-actions">
      <q-btn flat no-caps icon="arrow_back" label="Voltar aos parâmetros" @click="$emit('back')" />
      <div class="full-actions__right">
        <span v-if="!canReview" class="full-action-warning"><q-icon name="block" /> Nenhuma linha revisável com quantidade positiva.</span>
        <q-btn unelevated color="primary" no-caps icon="verified" label="Confirmar revisão" :loading="reviewing" :disable="!canWrite || !canReview || draft?.status !== 'draft'" @click="$emit('review')" />
      </div>
    </div>

    <q-dialog v-model="adjustOpen">
      <q-card class="full-dialog">
        <q-card-section><span class="full-kicker">NOVA VERSÃO</span><h3>Ajustar quantidade</h3><p>{{ selectedLine?.title }}</p></q-card-section>
        <q-card-section>
          <div class="full-adjust-summary"><span>Calculado<strong>{{ selectedLine?.calculated_quantity ?? '—' }}</strong></span><span>Atual<strong>{{ selectedLine?.effective_quantity ?? '—' }}</strong></span><span>Caixa<strong>{{ selectedLine?.case_pack || 1 }}</strong></span></div>
          <q-input v-model.number="adjustForm.quantity" type="number" min="0" :step="selectedLine?.case_pack || 1" outlined label="Nova quantidade" class="q-mt-md" />
          <q-input v-model="adjustForm.reason" type="textarea" autogrow outlined label="Por que você está ajustando?" hint="Obrigatório · mínimo de 5 caracteres" class="q-mt-md" />
        </q-card-section>
        <q-card-actions align="right"><q-btn flat no-caps label="Cancelar" v-close-popup /><q-btn unelevated color="primary" no-caps label="Criar nova versão" :loading="adjusting" :disable="!adjustValid" @click="submitAdjustment" /></q-card-actions>
      </q-card>
    </q-dialog>
  </section>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import FulfillmentSourceBadge from './FulfillmentSourceBadge.vue'
import { decisionMeta, formatDecimal, primaryDecisionReason, reasonLabel } from 'src/utils/fulfillmentDraft'

const props = defineProps({
  draft: { type: Object, default: null },
  lines: { type: Array, default: () => [] },
  adjustments: { type: Array, default: () => [] },
  loading: Boolean,
  adjusting: Boolean,
  reviewing: Boolean,
  canReview: Boolean,
  canWrite: Boolean,
})
const emit = defineEmits(['adjust', 'review', 'back'])
const adjustOpen = ref(false)
const selectedLine = ref(null)
const adjustForm = reactive({ quantity: null, reason: '' })
const adjustValid = computed(() => Number.isInteger(Number(adjustForm.quantity)) && Number(adjustForm.quantity) >= 0 && adjustForm.reason.trim().length >= 5 && Number(adjustForm.quantity) % (selectedLine.value?.case_pack || 1) === 0)

function demandText(line) { return `${formatDecimal(line.weighted_demand, 2)} un./dia · 7d ${formatDecimal(line.demand_7, 2)} · 30d ${formatDecimal(line.demand_30, 2)}` }
function primaryReason(line) { return reasonLabel(primaryDecisionReason(line)) }
function openAdjustment(line) { selectedLine.value = line; adjustForm.quantity = line.effective_quantity; adjustForm.reason = ''; adjustOpen.value = true }
function submitAdjustment() { emit('adjust', { lineId: selectedLine.value.id, quantity: Number(adjustForm.quantity), reason: adjustForm.reason.trim() }); adjustOpen.value = false }
</script>
