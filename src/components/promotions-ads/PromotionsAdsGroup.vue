<template>
  <!--
    Fragment root: uma <tbody> para a conta e uma <tbody> por anúncio, todas
    dentro da <table> única renderizada pela página. Fazer isso (em vez de uma
    tabela por anúncio) é o que permite um único <thead> fixo — antes cada
    anúncio repetia o mesmo cabeçalho de 10 colunas.
  -->
  <tbody class="pa-acct">
    <tr class="pa-acctrow">
      <td :colspan="COLSPAN">
        <button class="pa-acct__btn" type="button" @click="accountOpen = !accountOpen">
          <q-icon :name="accountOpen ? 'expand_more' : 'chevron_right'" size="18px" class="pa-acct__chev" />
          <q-icon name="storefront" size="16px" class="pa-acct__store" />
          <span class="pa-acct__name">{{ group.account_nickname }}</span>
          <span class="pa-acct__meta">{{ allAds.length }} anúncio(s)</span>
          <span class="pa-acct__stats">
            <span v-if="accountStats.active" class="pa-tag pa-tag--active"><i class="pa-dot" /> {{ accountStats.active }} ativa(s)</span>
            <span v-if="accountStats.available" class="pa-tag pa-tag--available"><i class="pa-dot" /> {{ accountStats.available }} a ativar</span>
            <span v-if="accountStats.processing" class="pa-tag pa-tag--processing"><i class="pa-dot" /> {{ accountStats.processing }} proc.</span>
          </span>
          <span v-if="selectedInGroup" class="pa-tag pa-tag--pick">{{ selectedInGroup }} selecionada(s)</span>
        </button>
      </td>
    </tr>
  </tbody>

  <template v-if="accountOpen">
    <tbody
      v-for="ad in decoratedAds"
      :key="ad.row._key"
      class="pa-ad"
      :class="{ 'pa-ad--skubreak': ad.skuBreak }"
    >
      <!-- linha do anúncio -->
      <tr class="pa-adhead" :data-accent="ad.dominant">
        <td :colspan="COLSPAN">
          <div class="pa-adhead__in">
            <img v-if="ad.row.thumbnail" :src="ad.row.thumbnail" alt="" class="pa-ad__thumb" loading="lazy" />
            <div class="pa-ad__id">
              <span class="pa-ad__title">{{ ad.row.title }}</span>
              <span class="pa-ad__sub">
                <span :class="{ 'pa-ad__sku-amb': ad.row.sku_ambiguous }">{{ ad.row.sku || 'SKU —' }}</span>
                · {{ ad.row.item_id }}<template v-if="ad.row.variation_name"> · {{ ad.row.variation_name }}</template>
                · atual <strong>{{ brl(ad.row.current_price) }}</strong>
              </span>
            </div>
            <span class="pa-ad__counts">
              <span v-if="ad.split.active.length" class="pa-tag pa-tag--active"><i class="pa-dot" /> {{ ad.split.active.length }}</span>
              <span v-if="ad.split.available.length" class="pa-tag pa-tag--available"><i class="pa-dot" /> {{ ad.split.available.length }}</span>
              <span v-if="ad.split.processing.length" class="pa-tag pa-tag--processing"><i class="pa-dot" /> {{ ad.split.processing.length }}</span>
            </span>
            <span class="pa-chip" :class="marginChipClass(ad.bestMargin)" :title="marginTitle(ad.bestMargin)">
              {{ ad.bestMargin === null ? '—' : pct(ad.bestMargin) }}
            </span>
            <q-btn
              v-if="actionMode === 'activate' && ad.selectableCount"
              flat dense no-caps size="sm"
              :label="ad.selectedCount === ad.selectableCount ? 'Limpar' : `Marcar ${ad.selectableCount}`"
              @click="ad.selectedCount === ad.selectableCount ? clearAd(ad.row) : selectAllAvailable(ad.row)"
            />
          </div>
        </td>
      </tr>

      <!-- promoções, agrupadas por estado -->
      <template v-for="sec in ad.sections" :key="sec.key">
        <tr class="pa-band" :class="`pa-band--${sec.key}`">
          <td :colspan="COLSPAN">
            <q-icon :name="sec.icon" size="14px" />
            <span class="pa-band__label">{{ sec.label }}</span>
            <span class="pa-band__count">{{ sec.promos.length }}</span>
            <span v-if="actionMode === 'remove' && sec.key === 'active'" class="pa-band__hint">marque para remover</span>
            <span v-else-if="actionMode === 'activate' && sec.key === 'active'" class="pa-band__hint pa-band__hint--muted">use o botão vermelho para remover</span>
            <span v-else-if="actionMode === 'activate' && sec.key === 'available'" class="pa-band__hint pa-band__hint--muted">marque e ajuste o % de cada uma</span>
          </td>
        </tr>
        <tr
          v-for="p in sec.promos"
          :key="p._key"
          class="pa-prow"
          :class="[`pa-prow--${sec.key}`, {
            'is-chosen': actionMode === 'activate' && isSelected(selection, ad.row, p),
            'is-removing': actionMode === 'remove' && isRemovalSelected(removal, ad.row, p),
            'is-disabled': (actionMode === 'remove' && !isRemovable(p))
              || (actionMode === 'activate' && sec.key === 'processing')
              || (actionMode === 'activate' && sec.key === 'available' && p.can_manual_activate === false),
          }]"
        >
          <td class="c-pick">
            <q-checkbox
              v-if="actionMode === 'remove'"
              :model-value="isRemovalSelected(removal, ad.row, p)"
              :disable="!isRemovable(p)"
              dense size="sm" color="negative"
              @update:model-value="isRemovable(p) && emit('toggle-removal', { row: ad.row, promo: p })"
            />
            <q-checkbox
              v-else-if="sec.key === 'available' && p.can_manual_activate !== false"
              :model-value="isSelected(selection, ad.row, p)"
              dense size="sm" color="primary"
              @update:model-value="emit('toggle', { row: ad.row, promo: p })"
            />
            <q-icon
              v-else-if="sec.key === 'available'"
              name="lock" size="15px" color="grey-5"
              :title="p.activation_block_reason || 'Este tipo de promoção não é ativável por aqui'"
            />
          </td>
          <td class="c-type">
            {{ p.typeLabel || p.promotion_type }}
            <span v-if="entry(ad.row, p) && entry(ad.row, p)._touched" class="pa-sim" title="Valores simulados no navegador com o % que você digitou. O servidor revalida na ativação.">simulado</span>
          </td>
          <td class="c-disc">
            <template v-if="actionMode === 'activate' && sec.key === 'available'">
              <span class="pa-min" title="Menor desconto que o Mercado Livre aceita nessa promoção">ML min {{ minPctLabel(p) }}</span>
              <template v-if="isSelected(selection, ad.row, p)">
                <span v-if="!entry(ad.row, p).discountEditable" class="pa-fixed" title="Esse tipo de promoção não deixa negociar o preço — o desconto é fixado pelo ML">ML fixa {{ minPctLabel(p) }}</span>
                <input
                  v-else
                  class="pa-discinput"
                  type="number" min="1" max="99" step="0.5"
                  :value="entry(ad.row, p).chosenDiscountPct"
                  title="% de desconto que você quer aplicar. Digite o mínimo do ML ou mais."
                  @click.stop
                  @change="onDisc(ad.row, p, $event.target.value)"
                />
                <span v-if="p.promotion_type === 'PRICE_DISCOUNT'" class="pa-min" title="O Mercado Livre limita o desconto individual a 14 dias. Depois disso ele volta a ficar disponível para reativar.">· 14 dias</span>
              </template>
            </template>
            <span v-else class="pa-dim">{{ p.financials.discount_pct === null ? '—' : pct(p.financials.discount_pct) }}</span>
          </td>
          <td class="num c-price pa-strong">{{ brl(view(ad.row, p).proposed_price) }}</td>
          <td class="num c-fee pa-dim">{{ brl(view(ad.row, p).estimated_sale_fee) }}</td>
          <td class="num c-ship pa-dim">{{ brl(view(ad.row, p).estimated_shipping_cost) }}</td>
          <td class="num c-cmv pa-dim">{{ brl(view(ad.row, p).cmv_unit) }}</td>
          <td class="num c-profit" :class="moneyClass(view(ad.row, p).estimated_profit_unit)">{{ brl(view(ad.row, p).estimated_profit_unit) }}</td>
          <td class="num c-margin">
            <span class="pa-chip" :class="marginChipClass(view(ad.row, p).estimated_margin_pct)" :title="marginTitle(view(ad.row, p).estimated_margin_pct)">
              {{ view(ad.row, p).estimated_margin_pct === null ? '—' : pct(view(ad.row, p).estimated_margin_pct) }}
            </span>
          </td>
          <td class="c-sit">
            <template v-if="actionMode === 'activate' && sec.key === 'available'">
              <span
                v-if="p.can_manual_activate === false"
                class="pa-pill pa-pill--slate"
                :title="p.activation_block_reason || ''"
              >Somente leitura</span>
              <template v-else>
                <span v-if="reasonsFor(ad.row, p).length === 0" class="pa-pill pa-pill--available">Apta</span>
                <span
                  v-for="r in reasonsFor(ad.row, p)" :key="r"
                  class="pa-pill pa-pill--warn pa-reason"
                >{{ r }}</span>
              </template>
            </template>
            <template v-else-if="actionMode === 'activate' && sec.key === 'active'">
              <span class="pa-pill pa-pill--active">Ativa</span>
              <q-btn
                v-if="canEditActiveDiscount(p)"
                dense flat no-caps size="sm" color="primary" icon="edit" label="Editar %"
                class="pa-removebtn"
                :loading="editingBusyKey === selectionKey(ad.row, p)"
                :disable="!!editingBusyKey && editingBusyKey !== selectionKey(ad.row, p)"
                title="Aumentar ou reduzir o desconto desta promoção já ativa"
                @click="emit('edit-active', { row: ad.row, promo: p })"
              />
              <q-icon
                v-else name="info_outline" size="14px" color="grey-5" class="pa-removebtn"
                title="Este tipo de promoção não pode ser editado — o Mercado Livre dita o preço ou só aceita/recusa a oferta. Remova e aguarde uma nova oferta."
              />
              <q-btn
                dense flat no-caps size="sm" color="negative" icon="delete_outline" label="Remover"
                class="pa-removebtn"
                :disable="!!editingBusyKey && editingBusyKey === selectionKey(ad.row, p)"
                @click="emit('remove-one', { row: ad.row, promo: p })"
              />
            </template>
            <span v-else class="pa-pill" :class="`pa-pill--${sec.key === 'processing' ? 'amber' : 'slate'}`">
              {{ statusLabel(p.status) }}
            </span>
          </td>
        </tr>
      </template>
    </tbody>
  </template>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import {
  bestMarginPct,
  blockingReasons,
  canEditActiveDiscount,
  formatBRL,
  formatPct,
  isRemovable,
  isRemovalSelected,
  isSelected,
  promotionMinDiscountPct,
  selectionKey,
  splitPromotions,
  statusLabel,
} from 'src/utils/promotionsAdsView'

const props = defineProps({
  group: { type: Object, required: true },
  mode: { type: String, default: 'ads' }, // 'ads' | 'sku' — muda só a ordenação
  actionMode: { type: String, default: 'activate' }, // 'activate' | 'remove'
  selection: { type: Object, default: () => ({}) },
  removal: { type: Object, default: () => ({}) },
  thresholds: { type: Object, default: () => ({}) },
  expandTick: { type: Number, default: 0 },
  collapseTick: { type: Number, default: 0 },
  editingBusyKey: { type: String, default: null }, // promotionKey da linha em edição (desabilita ações nela)
})

const emit = defineEmits(['toggle', 'set-discount', 'select-many', 'clear-ad', 'toggle-removal', 'remove-one', 'edit-active'])

// mantido em sincronia com o <thead> da página
const COLSPAN = 10

const accountOpen = ref(true)
watch(() => props.expandTick, () => { accountOpen.value = true })
watch(() => props.collapseTick, () => { accountOpen.value = false })

const allAds = computed(() => props.group.ads || [])
const selectedInGroup = computed(() => {
  const prefixes = allAds.value.map((a) => `${a._key}##`)
  return Object.keys(props.selection).filter((k) => prefixes.some((p) => k.startsWith(p))).length
})

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

const decoratedAds = computed(() => {
  let prevSku
  return allAds.value.map((row) => {
    const split = splitPromotions(row.promotions)
    const sections = SECTION_META
      .map((m) => ({ key: m.key, label: m.label, icon: m.icon, promos: m.pick(split) }))
      .filter((s) => s.promos.length)
    const dominant = split.active.length ? 'active'
      : split.available.length ? 'available'
        : split.processing.length ? 'processing' : 'none'
    const skuBreak = props.mode === 'sku' && prevSku !== undefined && (row.sku || null) !== prevSku
    prevSku = row.sku || null
    const selectable = split.available.filter((p) => p.can_manual_activate !== false)
    const selectableCount = selectable.length
    const selectedCount = selectable.filter((p) => isSelected(props.selection, row, p)).length
    return { row, split, sections, dominant, skuBreak, selectable, selectableCount, selectedCount, bestMargin: bestMarginPct(row) }
  })
})

const entry = (row, p) => props.selection[selectionKey(row, p)] || null
const view = (row, p) => {
  const e = entry(row, p)
  return (e && e.financials) || p.financials
}
const reasonsFor = (row, p) => {
  const e = entry(row, p)
  const subject = e ? { ...e, financials: e.financials } : p
  const reasons = blockingReasons(subject, props.thresholds)
  if (e && e.discountEditable && Number(e.chosenDiscountPct) < Number(e.minDiscountPct || 0)) {
    reasons.unshift('abaixo do mínimo do ML')
  }
  return reasons
}

const minPctLabel = (p) => {
  const m = promotionMinDiscountPct(p)
  return m == null ? '—' : `${Number(m).toFixed(1).replace('.', ',')}%`
}

function onDisc (row, p, val) {
  emit('set-discount', { key: selectionKey(row, p), pct: val })
}
function selectAllAvailable (row) {
  const promos = splitPromotions(row.promotions).available.filter((p) => p.can_manual_activate !== false)
  emit('select-many', { row, promos })
}
function clearAd (row) {
  emit('clear-ad', { row })
}

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
// A caixa de legenda saiu da página — o significado do chip agora vem no tooltip.
function marginTitle (value) {
  if (value === null || value === undefined) return 'Sem dados de CMV, tarifa ou preço para calcular a margem'
  const target = props.thresholds?.minMarginPct
  if (value < 0) return 'Margem negativa: a venda dá prejuízo'
  if (target != null && target !== '') {
    return value < Number(target)
      ? `Abaixo do alvo de ${target}%`
      : `Acima do alvo de ${target}%`
  }
  return value < 8 ? 'Margem baixa (abaixo de 8%)' : 'Margem saudável'
}
function moneyClass (value) {
  if (value === null || value === undefined) return 'is-muted'
  return value >= 0 ? 'is-pos' : 'is-neg'
}
</script>

<style lang="scss" scoped>
@import 'src/css/tokens';

/* ---------- linha da conta (sticky abaixo do cabeçalho) ---------- */
.pa-acctrow td {
  position: sticky;
  top: calc(var(--pa-bar-h) + var(--pa-head-h));
  z-index: 2;
  background: $surface-2;
  border-top: 1px solid $border-strong;
  border-bottom: 1px solid $border-strong;
  padding: 0;
}
.pa-acct__btn {
  width: 100%;
  display: flex; align-items: center; gap: $space-2;
  padding: $space-2 $space-4;
  background: none; border: none; cursor: pointer; text-align: left;
  &:hover { background: rgba($primary, 0.06); }
  &:focus-visible { outline: 2px solid $primary; outline-offset: -2px; }
}
.pa-acct__chev { color: $text-muted; }
.pa-acct__store { color: $primary; }
.pa-acct__name { font-size: $text-body-size; font-weight: $font-bold; color: $text-primary; }
.pa-acct__meta { font-size: $text-xs-size; color: $text-muted; }
.pa-acct__stats { display: flex; gap: 6px; margin-left: $space-2; flex-wrap: wrap; }

/* ---------- linha do anúncio ---------- */
.pa-ad--skubreak .pa-adhead td { border-top-width: 2px; }
.pa-adhead td {
  padding: 0;
  background: $surface;
  border-top: 1px solid $border-strong;
  border-bottom: 1px solid $border;
  border-left: 3px solid $border-strong;
}
.pa-adhead[data-accent="active"]     td { border-left-color: $primary; }
.pa-adhead[data-accent="available"]  td { border-left-color: $info; }
.pa-adhead[data-accent="processing"] td { border-left-color: $warning; }

.pa-adhead__in {
  display: flex; align-items: center; gap: $space-3;
  padding: $space-2 $space-3;
}
.pa-ad__thumb {
  width: 32px; height: 32px; border-radius: $radius-sm; object-fit: cover;
  border: 1px solid $border; background: $surface; flex: none;
}
.pa-ad__id { min-width: 0; flex: 1; display: flex; flex-direction: column; }
.pa-ad__title {
  font-weight: $font-semibold; color: $text-primary; font-size: $text-small-size;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.pa-ad__sub {
  font-size: $text-xs-size; color: $text-muted;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  strong { color: $text-body; font-weight: $font-semibold; }
}
.pa-ad__sku-amb { color: $tint-amber-text; text-decoration: underline dotted; }
.pa-ad__counts { display: flex; gap: 4px; flex: none; }

/* ---------- faixas de estado ---------- */
.pa-band td {
  padding: 4px $space-3 4px $space-4;
  background: $surface-2;
  border-bottom: 1px solid $border;
  font-weight: $font-bold; color: $text-body;
}
.pa-band .q-icon { vertical-align: -2px; margin-right: 6px; }
.pa-band__label { font-size: $text-xs-size; text-transform: uppercase; letter-spacing: 0.03em; }
.pa-band__count {
  display: inline-block; margin-left: 8px; padding: 0 7px;
  border-radius: 999px; font-size: $text-xs-size; background: rgba($text-primary, 0.08);
}
.pa-band__hint {
  margin-left: 10px; font-size: $text-xs-size; font-weight: $font-semibold;
  color: $tint-red-text; text-transform: none; letter-spacing: 0;
}
.pa-band__hint--muted { color: $text-muted; }
.pa-band--active     td { border-left: 3px solid $primary; color: $tint-green-text; }
.pa-band--available  td { border-left: 3px solid $info; color: $tint-sky-text; }
.pa-band--processing td { border-left: 3px solid $warning; color: $tint-amber-text; }

/* ---------- linhas de promoção ---------- */
.pa-prow td {
  padding: 6px $space-2;
  border-bottom: 1px solid $border;
  vertical-align: middle;
  overflow: hidden; text-overflow: ellipsis;
}
/* :not() evita que o hover apague o tint de seleção — sem isso a
   especificidade de `.pa-ad:hover .pa-prow td` ganharia de `.is-chosen`. */
.pa-ad:hover .pa-prow:not(.is-chosen):not(.is-removing) td { background: $surface-2; }
.pa-prow.is-chosen td { background: $tint-green-bg; }
.pa-prow.is-removing td { background: $tint-red-bg; }
.pa-prow.is-disabled td { opacity: 0.55; }

/* ---------- átomos ---------- */
.pa-tag {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: $text-xs-size; font-weight: $font-bold; padding: 2px 9px;
  border-radius: 999px; white-space: nowrap;
}
.pa-tag .pa-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex: none; }
.pa-tag--active     { background: $tint-teal-bg; color: $tint-teal-text; }
.pa-tag--available  { background: $tint-sky-bg; color: $tint-sky-text; }
.pa-tag--processing { background: $tint-amber-bg; color: $tint-amber-text; }
.pa-tag--pick       { background: $primary; color: #fff; margin-left: auto; }

.pa-pill {
  display: inline-flex; align-items: center;
  font-size: $text-xs-size; font-weight: $font-bold; padding: 3px 9px;
  border-radius: $radius-sm; line-height: 1.4; white-space: nowrap;
}
.pa-pill--active   { background: $primary; color: #fff; }
.pa-pill--available{ background: $tint-sky-bg; color: $tint-sky-text; }
.pa-pill--amber    { background: $tint-amber-bg; color: $tint-amber-text; }
.pa-pill--warn     { background: $tint-amber-bg; color: $tint-amber-text; }
.pa-pill--slate    { background: $surface-2; color: $text-muted; }
.pa-reason { margin: 0 3px 3px 0; }

.pa-chip {
  display: inline-block; font-size: $text-xs-size; font-weight: $font-bold;
  padding: 2px 8px; border-radius: $radius-sm;
  font-variant-numeric: tabular-nums; min-width: 52px; text-align: center; cursor: help;
}
.pa-chip--pos   { background: $tint-green-bg; color: $tint-green-text; }
.pa-chip--warn  { background: $tint-amber-bg; color: $tint-amber-text; }
.pa-chip--neg   { background: $tint-red-bg; color: $tint-red-text; }
.pa-chip--muted { background: $surface-2; color: $text-muted; }

.pa-sim {
  margin-left: 6px; font-size: $text-xs-size; font-weight: $font-bold; text-transform: uppercase;
  color: $tint-amber-text; background: $tint-amber-bg; padding: 1px 5px; border-radius: $radius-sm;
}
.pa-removebtn { margin-left: 6px; }
.pa-min { font-size: $text-xs-size; color: $text-muted; margin-right: 6px; }
.pa-fixed { font-size: $text-xs-size; font-weight: $font-bold; color: $tint-sky-text; }
.pa-discinput {
  width: 58px; padding: $space-1 $space-2; border: 1px solid $border-strong; border-radius: $radius-sm;
  font-size: $text-xs-size; font-weight: $font-bold; text-align: right; color: $text-primary;
  font-variant-numeric: tabular-nums;
}
.pa-discinput:focus { outline: 2px solid $primary; border-color: $primary; }
.pa-strong { font-weight: $font-semibold; color: $text-primary; }
.pa-dim { color: $text-muted; font-size: $text-xs-size; }
.is-muted { color: $text-muted; }
.is-pos { color: $tint-green-text; font-weight: $font-bold; }
.is-neg { color: $tint-red-text; font-weight: $font-bold; }

.c-type { font-weight: $font-semibold; color: $text-primary; white-space: nowrap; }
.c-disc { white-space: nowrap; }
.c-sit { white-space: normal; }
</style>
