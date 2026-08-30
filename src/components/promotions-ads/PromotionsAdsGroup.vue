<template>
  <div class="pa-group">
    <!-- Cabeçalho da conta -->
    <button class="pa-group__account" type="button" @click="accountOpen = !accountOpen">
      <q-icon :name="accountOpen ? 'expand_more' : 'chevron_right'" size="20px" />
      <SbBadge variant="ml" icon="store">{{ group.account_nickname }}</SbBadge>
      <span class="pa-group__meta">{{ adTotal }} anúncio(s) · {{ promoTotal }} promoção(ões)</span>
      <span v-if="chosenInGroup" class="pa-group__meta pa-group__meta--pick">
        {{ chosenInGroup }} escolhida(s)
      </span>
    </button>

    <div v-if="accountOpen" class="pa-table-wrap">
      <table class="pa-table">
        <thead>
          <tr>
            <th class="pa-col-chev"></th>
            <th v-if="mode === 'ads'">SKU</th>
            <th>Anúncio</th>
            <th>Variação</th>
            <th class="num">Promoções</th>
            <th class="num">Melhor margem</th>
            <th>Estado / escolha</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="item in displayRows" :key="item.key">
            <!-- Sub-cabeçalho de SKU (modo Por SKU) -->
            <tr
              v-if="item.kind === 'sku'"
              class="pa-skurow"
              role="button"
              tabindex="0"
              :aria-expanded="skuOpen.has(item.key)"
              @click="toggleSku(item.key)"
              @keydown="onRowKey($event, () => toggleSku(item.key))"
            >
              <td :colspan="colCount">
                <q-icon :name="skuOpen.has(item.key) ? 'expand_more' : 'chevron_right'" size="16px" />
                <SbBadge variant="indigo">{{ item.skuLabel }}</SbBadge>
                <span class="pa-group__meta">{{ item.adCount }} anúncio(s)</span>
              </td>
            </tr>

            <!-- Linha-resumo do anúncio/variação -->
            <template v-else-if="item.visible">
              <tr
                class="pa-ad"
                :class="{ 'pa-ad--open': expandedAds.has(item.ad._key), 'pa-ad--picked': item.chosenKey }"
                role="button"
                tabindex="0"
                :aria-expanded="expandedAds.has(item.ad._key)"
                @click="toggleAd(item.ad._key)"
                @keydown="onRowKey($event, () => toggleAd(item.ad._key))"
              >
                <td class="pa-col-chev">
                  <q-icon :name="expandedAds.has(item.ad._key) ? 'expand_more' : 'chevron_right'" size="18px" />
                </td>
                <td v-if="mode === 'ads'">{{ item.ad.sku || '—' }}</td>
                <td class="pa-ad__title">
                  <span>{{ item.ad.title }}</span>
                  <span class="is-muted">{{ item.ad.item_id }}</span>
                </td>
                <td>{{ item.ad.variation_name || '—' }}</td>
                <td class="num">{{ item.ad.promotions.length }}</td>
                <td class="num" :class="marginClass(item.best)">
                  {{ item.best === null ? '—' : pct(item.best) }}
                </td>
                <td class="pa-ad__state">
                  <template v-if="item.chosenPromo">
                    <SbBadge variant="teal">
                      {{ item.chosenPromo.typeLabel || item.chosenPromo.promotion_type }}
                      · {{ brl(item.chosenPromo.financials.proposed_price) }}
                      · {{ item.chosenPromo.financials.estimated_margin_pct === null
                        ? 'margem n/d' : pct(item.chosenPromo.financials.estimated_margin_pct) }}
                    </SbBadge>
                  </template>
                  <SbBadge v-else :variant="item.state.variant">{{ item.state.label }}</SbBadge>
                </td>
              </tr>

              <!-- Detalhe: propostas da linha, com seleção exclusiva -->
              <tr v-if="expandedAds.has(item.ad._key)" class="pa-detail">
                <td :colspan="colCount">
                  <div class="pa-proposals-wrap">
                    <table class="pa-proposals">
                      <thead>
                        <tr>
                          <th class="pa-col-pick">Escolher</th>
                          <th>Tipo</th>
                          <th>Status</th>
                          <th class="num">Preço atual</th>
                          <th class="num">Preço proposto</th>
                          <th class="num">Desconto</th>
                          <th class="num pa-hide-md">Frete</th>
                          <th class="num pa-hide-md">CMV</th>
                          <th class="num">Lucro</th>
                          <th class="num">Margem</th>
                          <th>Situação</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="promo in item.ad.promotions"
                          :key="promo._key"
                          class="pa-prow"
                          :class="{ 'is-chosen': item.chosenKey === promo._key }"
                          @click="$emit('choose', { row: item.ad, promo })"
                        >
                          <td class="pa-col-pick" @click.stop>
                            <q-radio
                              :model-value="item.chosenKey"
                              :val="promo._key"
                              dense
                              size="sm"
                              color="primary"
                              :aria-label="`Escolher ${promo.typeLabel || promo.promotion_type} para ${item.ad.title}`"
                              @update:model-value="$emit('choose', { row: item.ad, promo })"
                            />
                          </td>
                          <td>{{ promo.typeLabel || promo.promotion_type }}</td>
                          <td>{{ statusLabel(promo.status) }}</td>
                          <td class="num">{{ brl(promo.financials.reference_price) }}</td>
                          <td class="num">{{ brl(promo.financials.proposed_price) }}</td>
                          <td class="num">{{ promo.financials.discount_pct === null ? '—' : pct(promo.financials.discount_pct) }}</td>
                          <td class="num pa-hide-md">{{ brl(promo.financials.estimated_shipping_cost) }}</td>
                          <td class="num pa-hide-md">{{ brl(promo.financials.cmv_unit) }}</td>
                          <td class="num" :class="moneyClass(promo.financials.estimated_profit_unit)">
                            {{ brl(promo.financials.estimated_profit_unit) }}
                          </td>
                          <td class="num" :class="marginClass(promo.financials.estimated_margin_pct)">
                            {{ promo.financials.estimated_margin_pct === null ? '—' : pct(promo.financials.estimated_margin_pct) }}
                          </td>
                          <td>
                            <SbBadge v-if="reasonsFor(promo).length === 0" variant="green">Apta</SbBadge>
                            <template v-else>
                              <SbBadge
                                v-for="reason in reasonsFor(promo)"
                                :key="reason"
                                variant="amber"
                                class="pa-reason"
                              >{{ reason }}</SbBadge>
                            </template>
                          </td>
                        </tr>
                        <tr class="pa-none">
                          <td class="pa-col-pick" @click.stop>
                            <q-radio
                              :model-value="item.chosenKey"
                              val="__none__"
                              dense
                              size="sm"
                              :aria-label="`Não ativar nenhuma proposta de ${item.ad.title}`"
                              @update:model-value="$emit('clear', { row: item.ad })"
                            />
                          </td>
                          <td colspan="99" class="is-muted">Não ativar nenhuma proposta deste anúncio</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </td>
              </tr>
            </template>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import SbBadge from 'src/components/common/SbBadge.vue'
import {
  bestMarginPct,
  blockingReasons,
  formatBRL,
  formatPct,
  rowState,
  selectedPromotionKey,
  statusLabel,
} from 'src/utils/promotionsAdsView'

const props = defineProps({
  group: { type: Object, required: true },
  mode: { type: String, default: 'ads' }, // 'ads' | 'sku'
  selection: { type: Object, default: () => ({}) },
  thresholds: { type: Object, default: () => ({}) },
  // Sinais de "expandir tudo" / "recolher tudo" vindos da página.
  expandTick: { type: Number, default: 0 },
  collapseTick: { type: Number, default: 0 },
})

defineEmits(['choose', 'clear'])

const accountOpen = ref(true)
const skuOpen = ref(new Set()) // SKUs começam recolhidos
const expandedAds = ref(new Set())

const colCount = computed(() => (props.mode === 'ads' ? 7 : 6))

const allAds = computed(() =>
  props.mode === 'sku'
    ? (props.group.skus || []).flatMap((s) => s.ads)
    : (props.group.ads || []),
)
const adTotal = computed(() => allAds.value.length)
const promoTotal = computed(() => allAds.value.reduce((acc, ad) => acc + ad.promotions.length, 0))
const chosenInGroup = computed(
  () => allAds.value.filter((ad) => selectedPromotionKey(props.selection, ad)).length,
)

// Lista plana de linhas exibidas: no modo SKU intercala sub-cabeçalhos.
const displayRows = computed(() => {
  const decorate = (ad, visible) => {
    const chosenKey = selectedPromotionKey(props.selection, ad)
    return {
      kind: 'ad',
      key: `ad:${ad._key}`,
      ad,
      visible,
      best: bestMarginPct(ad),
      state: rowState(ad, props.thresholds),
      chosenKey,
      chosenPromo: chosenKey ? ad.promotions.find((p) => p._key === chosenKey) || null : null,
    }
  }

  if (props.mode !== 'sku') {
    return (props.group.ads || []).map((ad) => decorate(ad, true))
  }

  const out = []
  for (const sku of props.group.skus || []) {
    out.push({ kind: 'sku', key: sku.key, skuLabel: sku.skuLabel, adCount: sku.adCount })
    const open = skuOpen.value.has(sku.key)
    for (const ad of sku.ads) out.push(decorate(ad, open))
  }
  return out
})

function toggleSku (key) {
  const next = new Set(skuOpen.value)
  next.has(key) ? next.delete(key) : next.add(key)
  skuOpen.value = next
}
function onRowKey (event, fn) {
  if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
    event.preventDefault()
    fn()
  }
}
function toggleAd (key) {
  const next = new Set(expandedAds.value)
  next.has(key) ? next.delete(key) : next.add(key)
  expandedAds.value = next
}

watch(() => props.expandTick, () => {
  accountOpen.value = true
  skuOpen.value = new Set((props.group.skus || []).map((s) => s.key))
  expandedAds.value = new Set(allAds.value.map((ad) => ad._key))
})
watch(() => props.collapseTick, () => {
  accountOpen.value = false
  skuOpen.value = new Set()
  expandedAds.value = new Set()
})

const reasonsFor = (promo) => blockingReasons(promo, props.thresholds)

const brl = formatBRL
const pct = (v) => formatPct(v)

function marginClass (value) {
  if (value === null || value === undefined) return 'is-muted'
  if (value < 0) return 'is-neg'
  if (value < 8) return 'is-warn'
  return 'is-pos'
}
function moneyClass (value) {
  if (value === null || value === undefined) return 'is-muted'
  return value >= 0 ? 'is-pos' : 'is-neg'
}
</script>

<style lang="scss" scoped>
.pa-group {
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #fff;
  overflow: hidden;
  margin-bottom: 12px;
}

.pa-group__account {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: #f8fafc;
  border: none;
  border-bottom: 1px solid #e2e8f0;
  cursor: pointer;
  text-align: left;
  color: #0f172a;
  &:hover { background: #f1f5f9; }
}

.pa-group__meta { font-size: 12px; color: #64748b; margin-left: 4px; }
.pa-group__meta--pick { color: #0f766e; font-weight: 600; margin-left: auto; }

.pa-table-wrap { width: 100%; overflow-x: auto; }

.pa-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  color: #334155;

  thead th {
    font-size: 10.5px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #64748b;
    padding: 8px 12px;
    text-align: left;
    white-space: nowrap;
    border-bottom: 1px solid #e2e8f0;
  }
  .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .pa-col-chev { width: 34px; }

  .pa-skurow {
    cursor: pointer;
    td {
      padding: 8px 12px 8px 24px;
      background: #fff;
      border-bottom: 1px solid #f1f5f9;
    }
    &:hover td { background: #f8fafc; }
  }

  .pa-ad { cursor: pointer; }
  .pa-ad > td {
    padding: 10px 12px;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: middle;
  }
  .pa-ad:hover > td { background: #f8fafc; }
  .pa-ad--open > td { background: #f0fdf9; }
  .pa-ad--picked > td:first-child { box-shadow: inset 3px 0 0 #0d9488; }
  .pa-col-chev { color: #64748b; }
  .pa-ad__title {
    display: flex;
    flex-direction: column;
    min-width: 160px;
    .is-muted { font-size: 11px; }
  }
  .pa-ad__state { max-width: 320px; white-space: normal; }

  .pa-detail > td { padding: 0 12px 14px 34px; background: #f0fdf9; }
}

.is-muted { color: #94a3b8; }
.is-pos { color: #16a34a; font-weight: 600; }
.is-neg { color: #dc2626; font-weight: 600; }
.is-warn { color: #d97706; font-weight: 600; }

.pa-proposals-wrap { width: 100%; overflow-x: auto; }
.pa-proposals {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
  color: #334155;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;

  thead th {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #64748b;
    background: #f8fafc;
    padding: 8px 10px;
    text-align: left;
    white-space: nowrap;
    border-bottom: 1px solid #e2e8f0;
  }
  .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .pa-col-pick { width: 68px; text-align: center; }

  tbody td {
    padding: 8px 10px;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: middle;
  }
  tbody tr:last-child td { border-bottom: none; }
  .pa-prow { cursor: pointer; }
  .pa-prow:hover td { background: #f8fafc; }
  tbody tr.is-chosen td { background: #ecfdf5; }
  .pa-reason { margin: 0 3px 3px 0; }
  .pa-none td { color: #94a3b8; }
  .pa-none:hover td { background: transparent; }
}

@media (max-width: 1100px) {
  .pa-hide-md { display: none; }
}
</style>
