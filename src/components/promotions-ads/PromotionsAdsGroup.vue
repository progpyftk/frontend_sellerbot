<template>
  <div class="pa-group">
    <!-- Cabeçalho da conta -->
    <button class="pa-group__account" type="button" @click="accountOpen = !accountOpen">
      <q-icon :name="accountOpen ? 'expand_more' : 'chevron_right'" size="20px" class="pa-group__chev" />
      <q-icon name="storefront" size="18px" class="pa-group__store" />
      <span class="pa-group__name">{{ group.account_nickname }}</span>
      <span class="pa-group__meta">{{ adTotal }} anúncio(s)</span>
      <span class="pa-group__stats">
        <span v-if="accountStats.active" class="pa-tag pa-tag--active">
          <i class="pa-dot" /> {{ accountStats.active }} ativa(s)
        </span>
        <span v-if="accountStats.available" class="pa-tag pa-tag--available">
          <i class="pa-dot" /> {{ accountStats.available }} a ativar
        </span>
        <span v-if="accountStats.processing" class="pa-tag pa-tag--processing">
          <i class="pa-dot" /> {{ accountStats.processing }} proc.
        </span>
      </span>
      <span v-if="chosenInGroup" class="pa-tag pa-tag--pick">{{ chosenInGroup }} escolhida(s)</span>
    </button>

    <div v-if="accountOpen" class="pa-table-wrap">
      <table class="pa-table">
        <thead>
          <tr>
            <th class="pa-col-chev"></th>
            <th>SKU</th>
            <th>Anúncio</th>
            <th class="num">Promoções</th>
            <th class="num">Melhor margem</th>
            <th>{{ actionMode === 'remove' ? 'Seleção' : 'Estado / escolha' }}</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="item in displayRows" :key="item.key">
            <!-- Linha-resumo do anúncio/variação -->
            <tr
              class="pa-ad"
              :class="{
                'pa-ad--open': expandedAds.has(item.ad._key),
                'pa-ad--picked': actionMode === 'activate' && item.chosenKey,
                'pa-ad--removing': actionMode === 'remove' && item.removalCount,
                'pa-ad--skubreak': item.skuBreak,
              }"
              :data-accent="item.dominant"
              role="button"
              tabindex="0"
              :aria-expanded="expandedAds.has(item.ad._key)"
              @click="toggleAd(item.ad._key)"
              @keydown="onRowKey($event, () => toggleAd(item.ad._key))"
            >
              <td class="pa-col-chev">
                <q-icon :name="expandedAds.has(item.ad._key) ? 'expand_more' : 'chevron_right'" size="18px" />
              </td>
              <td class="pa-ad__sku">
                <span :class="{ 'pa-ad__sku-amb': item.ad.sku_ambiguous }">{{ item.ad.sku || '—' }}</span>
              </td>
              <td class="pa-ad__title">
                <img v-if="item.ad.thumbnail" :src="item.ad.thumbnail" alt="" class="pa-ad__thumb" loading="lazy" />
                <span class="pa-ad__title-box">
                  <span class="pa-ad__title-main">{{ item.ad.title }}</span>
                  <span class="pa-ad__title-sub">
                    {{ item.ad.item_id }}<template v-if="item.ad.variation_name"> · {{ item.ad.variation_name }}</template>
                  </span>
                </span>
              </td>
              <td class="pa-ad__promocount">
                <span v-if="item.split.active.length" class="pa-tag pa-tag--active">
                  <i class="pa-dot" /> {{ item.split.active.length }}
                </span>
                <span v-if="item.split.available.length" class="pa-tag pa-tag--available">
                  <i class="pa-dot" /> {{ item.split.available.length }}
                </span>
                <span v-if="item.split.processing.length" class="pa-tag pa-tag--processing">
                  <i class="pa-dot" /> {{ item.split.processing.length }}
                </span>
                <span v-if="!item.ad.promotions.length" class="is-muted">—</span>
              </td>
              <td class="num">
                <span class="pa-chip" :class="marginChipClass(item.bestMargin)">
                  {{ item.bestMargin === null ? '—' : pct(item.bestMargin) }}
                </span>
              </td>
              <td class="pa-ad__state">
                <span v-if="actionMode === 'remove' && item.removalCount" class="pa-pill pa-pill--danger">
                  {{ item.removalCount }} p/ remover
                </span>
                <template v-else-if="actionMode === 'activate' && item.chosenPromo">
                  <span class="pa-pill pa-pill--active">
                    {{ item.chosenPromo.typeLabel || item.chosenPromo.promotion_type }}
                    · {{ brl(item.chosenPromo.financials.proposed_price) }}
                    · {{ item.chosenPromo.financials.estimated_margin_pct === null
                      ? 'margem n/d' : pct(item.chosenPromo.financials.estimated_margin_pct) }}
                  </span>
                </template>
                <span v-else class="pa-pill" :class="`pa-pill--${item.state.variant}`">{{ item.state.label }}</span>
              </td>
            </tr>

            <!-- Detalhe: propostas da linha, agrupadas por estado -->
            <tr v-if="expandedAds.has(item.ad._key)" class="pa-detail">
              <td :colspan="colCount">
                <div class="pa-proposals-wrap">
                  <table class="pa-proposals">
                    <thead>
                      <tr>
                        <th class="pa-col-pick">{{ actionMode === 'remove' ? 'Remover' : 'Ativar' }}</th>
                        <th>Promoção</th>
                        <th class="num">Preço atual</th>
                        <th class="num">Preço proposto</th>
                        <th class="num">Desconto</th>
                        <th class="num pa-hide-md pa-sec">Receita</th>
                        <th class="num pa-hide-md pa-sec">Tarifa</th>
                        <th class="num pa-hide-md pa-sec">Frete</th>
                        <th class="num pa-hide-md pa-sec">CMV</th>
                        <th class="num">Lucro</th>
                        <th class="num">Margem</th>
                        <th>Situação</th>
                      </tr>
                    </thead>
                    <tbody>
                      <template v-for="sec in item.sections" :key="sec.key">
                        <tr class="pa-band" :class="`pa-band--${sec.key}`">
                          <td :colspan="colCount + 6">
                            <q-icon :name="sec.icon" size="15px" />
                            <span class="pa-band__label">{{ sec.label }}</span>
                            <span class="pa-band__count">{{ sec.promos.length }}</span>
                            <span v-if="actionMode === 'remove' && sec.key === 'active'" class="pa-band__hint">
                              marque abaixo para remover
                            </span>
                          </td>
                        </tr>
                        <tr
                          v-for="promo in sec.promos"
                          :key="promo._key"
                          class="pa-prow"
                          :class="[
                            `pa-prow--${sec.key}`,
                            {
                              'is-chosen': actionMode === 'activate' && item.chosenKey === promo._key,
                              'is-removing': actionMode === 'remove' && isRemovalSelected(removal, item.ad, promo),
                              'is-disabled': actionMode === 'remove' && !isRemovable(promo),
                            },
                          ]"
                          @click="onProwClick(item.ad, promo)"
                        >
                          <td class="pa-col-pick" @click.stop>
                            <q-checkbox
                              v-if="actionMode === 'remove'"
                              :model-value="isRemovalSelected(removal, item.ad, promo)"
                              :disable="!isRemovable(promo)"
                              dense size="sm" color="negative"
                              :aria-label="`Remover ${promo.typeLabel || promo.promotion_type} de ${item.ad.title}`"
                              @update:model-value="isRemovable(promo) && $emit('toggle-removal', { row: item.ad, promo })"
                            />
                            <q-radio
                              v-else
                              :model-value="item.chosenKey"
                              :val="promo._key"
                              dense
                              size="sm"
                              color="primary"
                              :aria-label="`Escolher ${promo.typeLabel || promo.promotion_type} para ${item.ad.title}`"
                              @update:model-value="$emit('choose', { row: item.ad, promo })"
                            />
                          </td>
                          <td class="pa-prow__type">{{ promo.typeLabel || promo.promotion_type }}</td>
                          <td class="num pa-dim">{{ brl(promo.financials.reference_price) }}</td>
                          <td class="num pa-strong">{{ brl(promo.financials.proposed_price) }}</td>
                          <td class="num pa-strong">
                            {{ promo.financials.discount_pct === null ? '—' : pct(promo.financials.discount_pct) }}
                          </td>
                          <td class="num pa-hide-md pa-dim">{{ brl(promo.financials.seller_revenue) }}</td>
                          <td class="num pa-hide-md pa-dim">{{ brl(promo.financials.estimated_sale_fee) }}</td>
                          <td class="num pa-hide-md pa-dim">{{ brl(promo.financials.estimated_shipping_cost) }}</td>
                          <td class="num pa-hide-md pa-dim">{{ brl(promo.financials.cmv_unit) }}</td>
                          <td class="num" :class="moneyClass(promo.financials.estimated_profit_unit)">
                            {{ brl(promo.financials.estimated_profit_unit) }}
                          </td>
                          <td class="num">
                            <span class="pa-chip" :class="marginChipClass(promo.financials.estimated_margin_pct)">
                              {{ promo.financials.estimated_margin_pct === null ? '—' : pct(promo.financials.estimated_margin_pct) }}
                            </span>
                          </td>
                          <td>
                            <span v-if="reasonsFor(promo).length === 0" class="pa-pill pa-pill--available">Apta</span>
                            <template v-else>
                              <span
                                v-for="reason in reasonsFor(promo)"
                                :key="reason"
                                class="pa-pill pa-pill--warn pa-reason"
                              >{{ reason }}</span>
                            </template>
                          </td>
                        </tr>
                      </template>
                      <tr v-if="actionMode === 'activate'" class="pa-none">
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
                        <td :colspan="colCount + 5" class="is-muted">Não ativar nenhuma proposta deste anúncio</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import {
  bestMarginPct,
  blockingReasons,
  formatBRL,
  formatPct,
  isRemovable,
  isRemovalSelected,
  rowState,
  selectedPromotionKey,
  splitPromotions,
} from 'src/utils/promotionsAdsView'

const props = defineProps({
  group: { type: Object, required: true },
  mode: { type: String, default: 'ads' }, // 'ads' | 'sku' — muda só a ordenação
  actionMode: { type: String, default: 'activate' }, // 'activate' | 'remove'
  selection: { type: Object, default: () => ({}) },
  removal: { type: Object, default: () => ({}) },
  thresholds: { type: Object, default: () => ({}) },
  // Sinais de "expandir tudo" / "recolher tudo" vindos da página.
  expandTick: { type: Number, default: 0 },
  collapseTick: { type: Number, default: 0 },
})

const emit = defineEmits(['choose', 'clear', 'toggle-removal'])

function onProwClick (ad, promo) {
  if (props.actionMode === 'remove') {
    if (isRemovable(promo)) emit('toggle-removal', { row: ad, promo })
  } else {
    emit('choose', { row: ad, promo })
  }
}

const accountOpen = ref(true)
const expandedAds = ref(new Set())

const colCount = 6

const allAds = computed(() => props.group.ads || [])
const adTotal = computed(() => allAds.value.length)
const chosenInGroup = computed(
  () => allAds.value.filter((ad) => selectedPromotionKey(props.selection, ad)).length,
)

const accountStats = computed(() => {
  const acc = { active: 0, available: 0, processing: 0 }
  for (const ad of allAds.value) {
    const s = splitPromotions(ad.promotions)
    acc.active += s.active.length
    acc.available += s.available.length
    acc.processing += s.processing.length
  }
  return acc
})

const SECTION_META = [
  { key: 'active', label: 'Ativas agora', icon: 'check_circle', pick: (s) => s.active },
  { key: 'available', label: 'Disponíveis para ativar', icon: 'bolt', pick: (s) => s.available },
  { key: 'processing', label: 'Processando no ML', icon: 'hourglass_empty', pick: (s) => s.processing },
]

const displayRows = computed(() => {
  const ads = props.group.ads || []
  let prevSku
  return ads.map((ad) => {
    const chosenKey = selectedPromotionKey(props.selection, ad)
    const split = splitPromotions(ad.promotions)
    const sections = SECTION_META
      .map((m) => ({ key: m.key, label: m.label, icon: m.icon, promos: m.pick(split) }))
      .filter((s) => s.promos.length)
    const dominant = split.active.length ? 'active'
      : split.available.length ? 'available'
        : split.processing.length ? 'processing' : 'none'
    const skuBreak = props.mode === 'sku' && prevSku !== undefined && (ad.sku || null) !== prevSku
    prevSku = ad.sku || null
    return {
      kind: 'ad',
      key: `ad:${ad._key}`,
      ad,
      split,
      sections,
      dominant,
      skuBreak,
      bestMargin: bestMarginPct(ad),
      state: rowState(ad, props.thresholds),
      chosenKey,
      chosenPromo: chosenKey ? ad.promotions.find((p) => p._key === chosenKey) || null : null,
      removalCount: ad.promotions.filter((p) => isRemovalSelected(props.removal, ad, p)).length,
    }
  })
})

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
  expandedAds.value = new Set(allAds.value.map((ad) => ad._key))
})
watch(() => props.collapseTick, () => {
  accountOpen.value = false
  expandedAds.value = new Set()
})

const reasonsFor = (promo) => blockingReasons(promo, props.thresholds)

const brl = formatBRL
const pct = (v) => formatPct(v)

function marginChipClass (value) {
  if (value === null || value === undefined) return 'pa-chip--muted'
  if (value < 0) return 'pa-chip--neg'
  const target = props.thresholds?.minMarginPct
  if (target != null && target !== '') return value < Number(target) ? 'pa-chip--warn' : 'pa-chip--pos'
  if (value < 8) return 'pa-chip--warn'
  return 'pa-chip--pos'
}
function moneyClass (value) {
  if (value === null || value === undefined) return 'is-muted'
  return value >= 0 ? 'is-pos' : 'is-neg'
}
</script>

<style lang="scss" scoped>
/* Paleta de estado — usada em pills, bandas e acentos de linha */
$c-active: #0d9488;
$c-available: #0284c7;
$c-processing: #d97706;
$c-danger: #dc2626;

.pa-group {
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #fff;
  overflow: hidden;
  margin-bottom: 14px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

/* ---------- cabeçalho da conta ---------- */
.pa-group__account {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: linear-gradient(180deg, #f8fafc, #f1f5f9);
  border: none;
  border-bottom: 1px solid #e2e8f0;
  cursor: pointer;
  text-align: left;
  &:hover { background: #eef2f7; }
}
.pa-group__chev { color: #64748b; }
.pa-group__store { color: #0d9488; }
.pa-group__name { font-size: 14px; font-weight: 700; color: #0f172a; letter-spacing: -0.1px; }
.pa-group__meta { font-size: 12px; color: #64748b; }
.pa-group__stats { display: flex; gap: 6px; margin-left: 8px; flex-wrap: wrap; }

/* ---------- tags/pills de estado ---------- */
.pa-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 9px;
  border-radius: 999px;
  white-space: nowrap;
}
.pa-tag .pa-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex: none; }
.pa-tag--active     { background: #ccfbf1; color: #0f766e; }
.pa-tag--available  { background: #e0f2fe; color: #075985; }
.pa-tag--processing { background: #fef3c7; color: #92400e; }
.pa-tag--pick       { background: #0d9488; color: #fff; margin-left: auto; }

.pa-pill {
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 6px;
  line-height: 1.4;
  white-space: nowrap;
}
.pa-pill--active    { background: $c-active; color: #fff; }
.pa-pill--available { background: #e0f2fe; color: #075985; }
.pa-pill--sky       { background: #e0f2fe; color: #075985; }
.pa-pill--green     { background: #dcfce7; color: #166534; }
.pa-pill--warn,
.pa-pill--amber     { background: #fef3c7; color: #92400e; }
.pa-pill--danger    { background: $c-danger; color: #fff; }
.pa-pill--slate     { background: #f1f5f9; color: #475569; }
.pa-reason { margin: 0 3px 3px 0; }

/* ---------- chip de valor (margem) ---------- */
.pa-chip {
  display: inline-block;
  font-size: 12.5px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 6px;
  font-variant-numeric: tabular-nums;
  min-width: 54px;
  text-align: center;
}
.pa-chip--pos   { background: #dcfce7; color: #15803d; }
.pa-chip--warn  { background: #fef3c7; color: #b45309; }
.pa-chip--neg   { background: #fee2e2; color: #b91c1c; }
.pa-chip--muted { background: #f1f5f9; color: #94a3b8; }

/* ---------- tabela de anúncios ---------- */
.pa-table-wrap { width: 100%; overflow-x: auto; }
.pa-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  color: #334155;

  thead th {
    font-size: 10.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #64748b;
    padding: 9px 12px;
    text-align: left;
    white-space: nowrap;
    border-bottom: 1px solid #e2e8f0;
    background: #fff;
  }
  .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .pa-col-chev { width: 34px; }

  .pa-ad { cursor: pointer; }
  .pa-ad > td {
    padding: 10px 12px;
    border-bottom: 1px solid #eef2f6;
    vertical-align: middle;
    position: relative;
  }
  .pa-ad:hover > td { background: #f8fafc; }
  .pa-ad--open > td { background: #f0fdfa; }
  /* acento colorido à esquerda por estado dominante */
  .pa-ad[data-accent="active"]     > td:first-child { box-shadow: inset 3px 0 0 #{$c-active}; }
  .pa-ad[data-accent="available"]  > td:first-child { box-shadow: inset 3px 0 0 #{$c-available}; }
  .pa-ad[data-accent="processing"] > td:first-child { box-shadow: inset 3px 0 0 #{$c-processing}; }
  .pa-ad--picked  > td:first-child { box-shadow: inset 4px 0 0 #{$c-active} !important; }
  .pa-ad--removing > td { background: #fef2f2 !important; }
  .pa-ad--removing > td:first-child { box-shadow: inset 4px 0 0 #{$c-danger} !important; }
  .pa-ad--skubreak > td { border-top: 2px solid #cbd5e1; }

  .pa-col-chev { color: #64748b; }
  .pa-ad__sku { font-size: 12px; color: #475569; font-weight: 600; }
  .pa-ad__sku-amb { color: #b45309; text-decoration: underline dotted; }

  .pa-ad__title { min-width: 220px; }
  .pa-ad__title > * { vertical-align: middle; }
  .pa-ad__thumb {
    width: 34px; height: 34px; border-radius: 7px; object-fit: cover;
    border: 1px solid #e2e8f0; margin-right: 10px; background: #f8fafc;
  }
  .pa-ad__title-box { display: inline-flex; flex-direction: column; }
  .pa-ad__title-main { font-weight: 600; color: #0f172a; }
  .pa-ad__title-sub { font-size: 11px; color: #94a3b8; }

  .pa-ad__promocount { white-space: nowrap; }
  .pa-ad__promocount .pa-tag { margin-right: 4px; }
  .pa-ad__state { max-width: 340px; white-space: normal; }
}

.is-muted { color: #94a3b8; }
.is-pos { color: #15803d; font-weight: 700; }
.is-neg { color: #b91c1c; font-weight: 700; }
.is-warn { color: #b45309; font-weight: 700; }

/* ---------- sub-tabela de propostas ---------- */
.pa-detail > td { padding: 0 12px 16px 40px; background: #f0fdfa; }
.pa-proposals-wrap { width: 100%; overflow-x: auto; border-radius: 12px; }
.pa-proposals {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  color: #334155;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;

  thead th {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #64748b;
    background: #f8fafc;
    padding: 8px 10px;
    text-align: left;
    white-space: nowrap;
    border-bottom: 1px solid #e2e8f0;
  }
  thead th.pa-sec { color: #a3adba; font-weight: 600; }
  .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .pa-col-pick { width: 64px; text-align: center; }

  tbody td {
    padding: 9px 10px;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: middle;
  }
  tbody tr:last-child td { border-bottom: none; }

  /* banda de seção */
  .pa-band td {
    padding: 7px 10px;
    border-bottom: 1px solid #e2e8f0;
    font-weight: 700;
    color: #334155;
  }
  .pa-band .q-icon { vertical-align: -2px; margin-right: 6px; }
  .pa-band__label { font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.04em; }
  .pa-band__count {
    display: inline-block; margin-left: 8px; padding: 0 7px;
    border-radius: 999px; font-size: 11px; background: rgba(15, 23, 42, 0.08);
  }
  .pa-band__hint { margin-left: 10px; font-size: 11px; font-weight: 600; color: #b91c1c; text-transform: none; letter-spacing: 0; }
  .pa-band--active     td { background: #ecfdf5; border-left: 4px solid #{$c-active}; color: #0f766e; }
  .pa-band--available  td { background: #eff6ff; border-left: 4px solid #{$c-available}; color: #075985; }
  .pa-band--processing td { background: #fffbeb; border-left: 4px solid #{$c-processing}; color: #92400e; }

  .pa-prow { cursor: pointer; }
  .pa-prow > td:first-child { border-left: 3px solid transparent; }
  .pa-prow--active     > td:first-child { border-left-color: #{$c-active}; }
  .pa-prow--available  > td:first-child { border-left-color: #{$c-available}; }
  .pa-prow--processing > td:first-child { border-left-color: #{$c-processing}; }
  .pa-prow:hover td { background: #f8fafc; }

  .pa-prow__type { font-weight: 600; color: #0f172a; }
  .pa-strong { font-weight: 600; color: #0f172a; }
  .pa-dim { color: #94a3b8; font-size: 12px; }

  tbody tr.is-chosen td { background: #ecfdf5 !important; }
  tbody tr.is-chosen > td:first-child { border-left-color: #{$c-active}; border-left-width: 4px; }
  tbody tr.is-removing td { background: #fef2f2 !important; }
  tbody tr.is-removing > td:first-child { border-left-color: #{$c-danger}; border-left-width: 4px; }
  tbody tr.is-disabled { opacity: 0.45; }
  tbody tr.is-disabled.pa-prow { cursor: default; }

  .pa-none td { color: #94a3b8; }
  .pa-none:hover td { background: transparent; }
}

@media (max-width: 1100px) {
  .pa-hide-md { display: none; }
}
</style>
