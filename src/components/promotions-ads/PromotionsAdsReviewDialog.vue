<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)">
    <q-card class="review-dialog">
      <q-card-section class="review-dialog__head">
        <div>
          <div class="sb-eyebrow">Promoções por anúncios</div>
          <div class="review-dialog__title">{{ mode === 'remove' ? 'Revisar remoção' : 'Revisar ativação' }}</div>
          <div class="review-dialog__subtitle">
            {{ mode === 'remove'
              ? 'Estas promoções ativas entram na fila de remoção. O Mercado Livre confirma em alguns minutos.'
              : 'Confira cada proposta antes de confirmar. Só as aptas são enviadas ao Mercado Livre.' }}
          </div>
        </div>
        <q-btn flat round dense icon="close" @click="$emit('update:modelValue', false)" />
      </q-card-section>

      <q-separator />

      <!-- corpo: remoção -->
      <q-card-section v-if="mode === 'remove'" class="review-dialog__body">
        <div class="review-dialog__section-title">
          <SbBadge variant="red">Serão removidas</SbBadge>
          <span>{{ removalSummary.total }} promoção(ões) · {{ removalSummary.ads }} anúncios · {{ removalSummary.accounts }} contas</span>
        </div>
        <div v-if="sortedRemoval.length" class="review-dialog__table-wrap">
          <table class="review-dialog__table">
            <thead>
              <tr>
                <th>Conta</th><th>SKU</th><th>Anúncio</th><th>Variação</th>
                <th>Promoção</th><th>Status</th><th class="num">Desconto</th><th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="e in sortedRemoval" :key="e.key">
                <td>{{ e.account_nickname }}</td>
                <td>{{ e.sku || '—' }}</td>
                <td class="review-dialog__ad">
                  <span>{{ e.title }}</span><span class="review-dialog__muted">{{ e.item_id }}</span>
                </td>
                <td>{{ e.variation_name || '—' }}</td>
                <td>{{ e.promotion_name }} <span class="review-dialog__muted">{{ e.promotion_type }}</span></td>
                <td>{{ e.status }}</td>
                <td class="num">{{ e.discount_pct == null ? '—' : pct(e.discount_pct) }}</td>
                <td class="num">
                  <q-btn flat dense round size="sm" icon="close"
                    :aria-label="`Tirar ${e.title} da remoção`"
                    @click="$emit('remove-removal', e.key)" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="review-dialog__empty">Nenhuma promoção selecionada.</p>
      </q-card-section>

      <q-card-section v-if="mode !== 'remove'" class="review-dialog__lock">
        <q-input
          :model-value="maxDiscountPct"
          type="number"
          outlined
          dense
          min="1"
          max="99"
          label="Trava de desconto máximo (%)"
          class="review-dialog__lock-input"
          :rules="[(v) => (v >= 1 && v <= 99) || 'Informe um valor entre 1 e 99%']"
          hide-bottom-space
          @update:model-value="$emit('update:maxDiscountPct', Number($event))"
        />
        <p class="review-dialog__lock-hint">
          Teto de desconto aceito por proposta. O motor parte do desconto sugerido pelo ML e tenta
          preços menos agressivos dentro dessa faixa. Enviado em <code>max_discount_pct</code>.
        </p>
      </q-card-section>

      <q-separator />

      <q-card-section v-if="mode !== 'remove'" class="review-dialog__body">
        <!-- Serão enviados -->
        <div class="review-dialog__section-title">
          <SbBadge variant="green">Serão enviados</SbBadge>
          <span>{{ summary.eligibleCount }} proposta(s)</span>
        </div>
        <div v-if="sortedEligible.length" class="review-dialog__table-wrap">
          <table class="review-dialog__table">
            <thead>
              <tr>
                <th>Conta</th><th>SKU</th><th>Anúncio</th><th>Variação</th><th>Promoção</th>
                <th class="num">Atual</th><th class="num">Proposto</th><th class="num">Receita</th><th class="num">Desc.</th>
                <th class="num">Tarifa</th><th class="num">Frete</th><th class="num">CMV</th>
                <th class="num">Lucro</th><th class="num">Margem</th><th class="num">Markup</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="entry in sortedEligible" :key="entry.key">
                <td>{{ entry.account_nickname }}</td>
                <td>{{ entry.sku || '—' }}</td>
                <td class="review-dialog__ad">
                  <span>{{ entry.title }}</span>
                  <span class="review-dialog__muted">{{ entry.item_id }}</span>
                </td>
                <td>{{ entry.variation_name || '—' }}</td>
                <td>{{ entry.promotion_name }} <span class="review-dialog__muted">{{ entry.promotion_type }}</span></td>
                <td class="num">{{ brl(entry.financials.reference_price) }}</td>
                <td class="num">{{ brl(entry.financials.proposed_price) }}</td>
                <td class="num">{{ brl(entry.financials.seller_revenue) }}</td>
                <td class="num">{{ pct(entry.financials.discount_pct) }}</td>
                <td class="num">{{ brl(entry.financials.estimated_sale_fee) }}</td>
                <td class="num">{{ brl(entry.financials.estimated_shipping_cost) }}</td>
                <td class="num">{{ brl(entry.financials.cmv_unit) }}</td>
                <td class="num" :class="moneyClass(entry.financials.estimated_profit_unit)">
                  {{ brl(entry.financials.estimated_profit_unit) }}
                </td>
                <td class="num" :class="marginClass(entry.financials.estimated_margin_pct)">
                  {{ pct(entry.financials.estimated_margin_pct) }}
                </td>
                <td class="num" :class="marginClass(entry.financials.markup_pct)">
                  {{ pct(entry.financials.markup_pct) }}
                </td>
                <td class="num">
                  <q-btn
                    flat dense round size="sm" icon="close"
                    :aria-label="`Remover ${entry.title} da seleção`"
                    @click="$emit('remove', entry.key)"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="review-dialog__empty">Nenhuma proposta apta na seleção atual.</p>

        <!-- Não serão enviados -->
        <div class="review-dialog__section-title review-dialog__section-title--gap">
          <SbBadge variant="amber">Não serão enviados</SbBadge>
          <span>{{ summary.blockedCount }} proposta(s)</span>
        </div>
        <div v-if="sortedBlocked.length" class="review-dialog__table-wrap">
          <table class="review-dialog__table">
            <thead>
              <tr>
                <th>Conta</th><th>SKU</th><th>Anúncio</th><th>Variação</th><th>Promoção</th>
                <th class="num">Proposto</th><th class="num">Markup</th><th>Motivo(s)</th><th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="entry in sortedBlocked" :key="entry.key">
                <td>{{ entry.account_nickname }}</td>
                <td>{{ entry.sku || '—' }}</td>
                <td class="review-dialog__ad">
                  <span>{{ entry.title }}</span>
                  <span class="review-dialog__muted">{{ entry.item_id }}</span>
                </td>
                <td>{{ entry.variation_name || '—' }}</td>
                <td>{{ entry.promotion_name }} <span class="review-dialog__muted">{{ entry.promotion_type }}</span></td>
                <td class="num">{{ brl(entry.financials.proposed_price) }}</td>
                <td class="num">{{ pct(entry.financials.markup_pct) }}</td>
                <td>
                  <SbBadge v-for="reason in entry.reasons" :key="reason" variant="amber" class="review-dialog__reason">
                    {{ reason }}
                  </SbBadge>
                </td>
                <td class="num">
                  <q-btn
                    flat dense round size="sm" icon="close"
                    :aria-label="`Remover ${entry.title} da seleção`"
                    @click="$emit('remove', entry.key)"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="review-dialog__empty">Nenhuma proposta bloqueada.</p>
      </q-card-section>

      <q-separator />

      <q-card-actions class="review-dialog__actions">
        <div class="review-dialog__actions-note">
          A ação é enviada ao Mercado Livre e não pode ser desfeita automaticamente.
        </div>
        <q-space />
        <q-btn flat no-caps label="Cancelar" @click="$emit('update:modelValue', false)" />
        <q-btn
          v-if="mode === 'remove'"
          no-caps color="negative"
          :disable="!removalSummary.total || activating"
          :loading="activating"
          :label="`Confirmar remoção de ${removalSummary.total} promoções`"
          @click="$emit('confirm')"
        />
        <q-btn
          v-else
          no-caps color="primary"
          :disable="!summary.eligibleCount || activating"
          :loading="activating"
          :label="`Confirmar ativação de ${summary.eligibleCount} propostas`"
          @click="$emit('confirm')"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed } from 'vue'
import SbBadge from 'src/components/common/SbBadge.vue'
import { formatBRL, formatPct } from 'src/utils/promotionsAdsView'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  mode: { type: String, default: 'activate' },
  summary: { type: Object, required: true },
  removalSummary: { type: Object, default: () => ({ total: 0, ads: 0, accounts: 0, entries: [] }) },
  maxDiscountPct: { type: [Number, String], default: 15 },
  activating: { type: Boolean, default: false },
})

defineEmits(['update:modelValue', 'update:maxDiscountPct', 'confirm', 'remove', 'remove-removal'])

// Ordena por conta → SKU → anúncio para agrupar visualmente a hierarquia.
const byHierarchy = (a, b) =>
  String(a.account_nickname).localeCompare(String(b.account_nickname), 'pt-BR')
  || String(a.sku || '').localeCompare(String(b.sku || ''), 'pt-BR')
  || String(a.title).localeCompare(String(b.title), 'pt-BR')

const sortedRemoval = computed(() => [...props.removalSummary.entries].sort(byHierarchy))

const sortedEligible = computed(() => [...props.summary.eligible].sort(byHierarchy))
const sortedBlocked = computed(() => [...props.summary.blocked].sort(byHierarchy))

const brl = formatBRL
const pct = (v) => formatPct(v)

function moneyClass (value) {
  if (value === null || value === undefined) return 'review-dialog__muted'
  return value >= 0 ? 'is-pos' : 'is-neg'
}
function marginClass (value) {
  if (value === null || value === undefined) return 'review-dialog__muted'
  if (value < 0) return 'is-neg'
  if (value < 8) return 'is-warn'
  return 'is-pos'
}
</script>

<style lang="scss" scoped>
.review-dialog {
  width: 1080px;
  max-width: 96vw;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  max-height: 92vh;
}

.review-dialog__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.review-dialog__title {
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.2px;
}

.review-dialog__subtitle {
  font-size: 13px;
  color: #64748b;
  margin-top: 2px;
}

.review-dialog__lock {
  display: flex;
  gap: 20px;
  align-items: flex-start;
  flex-wrap: wrap;
}
.review-dialog__lock-input { width: 260px; }
.review-dialog__lock-hint {
  flex: 1;
  min-width: 240px;
  margin: 0;
  font-size: 12px;
  color: #64748b;
  line-height: 1.5;
  code {
    background: #f1f5f9;
    padding: 1px 5px;
    border-radius: 4px;
    font-size: 11px;
  }
}

.review-dialog__body {
  overflow: auto;
  flex: 1;
}

.review-dialog__section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 8px;
  &--gap { margin-top: 28px; }
}

.review-dialog__table-wrap {
  width: 100%;
  overflow-x: auto;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
}

.review-dialog__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
  color: #334155;

  thead th {
    font-size: 10.5px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #64748b;
    background: #f8fafc;
    padding: 10px 12px;
    text-align: left;
    white-space: nowrap;
    border-bottom: 1px solid #e2e8f0;
  }
  tbody td {
    padding: 10px 12px;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: top;
  }
  tbody tr:last-child td { border-bottom: none; }
  .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .is-pos { color: #16a34a; font-weight: 600; }
  .is-neg { color: #dc2626; font-weight: 600; }
  .is-warn { color: #d97706; font-weight: 600; }
}

.review-dialog__ad {
  display: flex;
  flex-direction: column;
  min-width: 150px;
}
.review-dialog__muted { color: #94a3b8; font-size: 11px; }
.review-dialog__reason { margin: 0 4px 4px 0; }

.review-dialog__empty {
  font-size: 13px;
  color: #94a3b8;
  padding: 12px 4px;
  margin: 0;
}

.review-dialog__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
}
.review-dialog__actions-note {
  font-size: 12px;
  color: #64748b;
  max-width: 420px;
}
</style>
