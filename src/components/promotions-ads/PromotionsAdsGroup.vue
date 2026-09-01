<template>
  <div class="pa-group">
    <!-- Cabeçalho da conta -->
    <button class="pa-group__account" type="button" @click="accountOpen = !accountOpen">
      <q-icon :name="accountOpen ? 'expand_more' : 'chevron_right'" size="20px" class="pa-group__chev" />
      <q-icon name="storefront" size="18px" class="pa-group__store" />
      <span class="pa-group__name">{{ group.account_nickname }}</span>
      <span class="pa-group__meta">{{ allAds.length }} anúncio(s)</span>
      <span class="pa-group__stats">
        <span v-if="accountStats.active" class="pa-tag pa-tag--active"><i class="pa-dot" /> {{ accountStats.active }} ativa(s)</span>
        <span v-if="accountStats.available" class="pa-tag pa-tag--available"><i class="pa-dot" /> {{ accountStats.available }} a ativar</span>
        <span v-if="accountStats.processing" class="pa-tag pa-tag--processing"><i class="pa-dot" /> {{ accountStats.processing }} proc.</span>
      </span>
      <span v-if="selectedInGroup" class="pa-tag pa-tag--pick">{{ selectedInGroup }} selecionada(s)</span>
    </button>

    <div v-if="accountOpen" class="pa-list">
      <div
        v-for="ad in decoratedAds"
        :key="ad.row._key"
        class="pa-ad"
        :class="{ 'pa-ad--skubreak': ad.skuBreak }"
        :data-accent="ad.dominant"
      >
        <!-- linha do anúncio -->
        <div class="pa-ad__head">
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
          <span class="pa-chip" :class="marginChipClass(ad.bestMargin)">{{ ad.bestMargin === null ? '—' : pct(ad.bestMargin) }}</span>
          <q-btn
            v-if="actionMode === 'activate' && ad.selectableCount"
            flat dense no-caps size="sm"
            :label="ad.selectedCount === ad.selectableCount ? 'Limpar' : `Marcar ${ad.selectableCount}`"
            @click="ad.selectedCount === ad.selectableCount ? clearAd(ad.row) : selectAllAvailable(ad.row)"
          />
        </div>

        <!-- promoções, agrupadas por estado, sempre visíveis -->
        <table class="pa-promos">
          <colgroup>
            <col style="width:42px" /><col /><col style="width:132px" />
            <col style="width:96px" /><col style="width:86px" />
            <col style="width:76px" /><col style="width:76px" />
            <col style="width:92px" /><col style="width:82px" /><col style="width:172px" />
          </colgroup>
          <thead>
            <tr class="pa-hrow">
              <th></th>
              <th title="Tipo de campanha do Mercado Livre">Promoção</th>
              <th title="% de desconto sobre o preço atual do anúncio. 'ML min' = o menor desconto que essa campanha aceita. Digite outro valor para simular.">Desconto</th>
              <th class="num" title="Preço que o comprador vê depois do desconto">Preço final</th>
              <th class="num pa-hide-md" title="Comissão do Mercado Livre sobre o preço final">Tarifa ML</th>
              <th class="num pa-hide-md" title="Frete pago pelo vendedor (estimado do histórico de envios)">Frete</th>
              <th class="num pa-hide-md" title="Custo da mercadoria vendida (vem do ERP)">CMV</th>
              <th class="num" title="Preço final − tarifa − frete − CMV, por unidade">Lucro/un</th>
              <th class="num" title="Lucro ÷ preço final. Alvo típico: 20–40%">Margem</th>
              <th title="Apta = passa nos pisos de margem/lucro. Ativa/Processando = estado atual no ML.">Situação</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="sec in ad.sections" :key="sec.key">
              <tr class="pa-band" :class="`pa-band--${sec.key}`">
                <td :colspan="10">
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
                <td class="pa-c-pick">
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
                <td class="pa-c-type">
                  {{ p.typeLabel || p.promotion_type }}
                  <span v-if="entry(ad.row, p) && entry(ad.row, p)._touched" class="pa-sim" title="Valores simulados no navegador com o % que você digitou. O servidor revalida na ativação.">simulado</span>
                </td>
                <td class="pa-c-disc">
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
                <td class="num pa-strong">{{ brl(view(ad.row, p).proposed_price) }}</td>
                <td class="num pa-hide-md pa-dim">{{ brl(view(ad.row, p).estimated_sale_fee) }}</td>
                <td class="num pa-hide-md pa-dim">{{ brl(view(ad.row, p).estimated_shipping_cost) }}</td>
                <td class="num pa-hide-md pa-dim">{{ brl(view(ad.row, p).cmv_unit) }}</td>
                <td class="num" :class="moneyClass(view(ad.row, p).estimated_profit_unit)">{{ brl(view(ad.row, p).estimated_profit_unit) }}</td>
                <td class="num">
                  <span class="pa-chip" :class="marginChipClass(view(ad.row, p).estimated_margin_pct)">
                    {{ view(ad.row, p).estimated_margin_pct === null ? '—' : pct(view(ad.row, p).estimated_margin_pct) }}
                  </span>
                </td>
                <td class="pa-c-sit">
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
        </table>
      </div>
    </div>
  </div>
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
function moneyClass (value) {
  if (value === null || value === undefined) return 'is-muted'
  return value >= 0 ? 'is-pos' : 'is-neg'
}
</script>

<style lang="scss" scoped>
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

.pa-group__account {
  width: 100%;
  display: flex; align-items: center; gap: 10px;
  padding: 12px 16px;
  background: linear-gradient(180deg, #f8fafc, #f1f5f9);
  border: none; border-bottom: 1px solid #e2e8f0;
  cursor: pointer; text-align: left;
  &:hover { background: #eef2f7; }
}
.pa-group__chev { color: #64748b; }
.pa-group__store { color: #0d9488; }
.pa-group__name { font-size: 14px; font-weight: 700; color: #0f172a; }
.pa-group__meta { font-size: 12px; color: #64748b; }
.pa-group__stats { display: flex; gap: 6px; margin-left: 8px; flex-wrap: wrap; }

.pa-tag {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 11px; font-weight: 700; padding: 2px 9px;
  border-radius: 999px; white-space: nowrap;
}
.pa-tag .pa-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex: none; }
.pa-tag--active     { background: #ccfbf1; color: #0f766e; }
.pa-tag--available  { background: #e0f2fe; color: #075985; }
.pa-tag--processing { background: #fef3c7; color: #92400e; }
.pa-tag--pick       { background: #0d9488; color: #fff; margin-left: auto; }

.pa-pill {
  display: inline-flex; align-items: center;
  font-size: 11px; font-weight: 700; padding: 3px 9px;
  border-radius: 6px; line-height: 1.4; white-space: nowrap;
}
.pa-pill--active   { background: $c-active; color: #fff; }
.pa-pill--available{ background: #e0f2fe; color: #075985; }
.pa-pill--amber    { background: #fef3c7; color: #92400e; }
.pa-pill--warn     { background: #fef3c7; color: #92400e; }
.pa-pill--slate    { background: #f1f5f9; color: #475569; }
.pa-reason { margin: 0 3px 3px 0; }

.pa-chip {
  display: inline-block; font-size: 12.5px; font-weight: 700;
  padding: 2px 8px; border-radius: 6px;
  font-variant-numeric: tabular-nums; min-width: 54px; text-align: center;
}
.pa-chip--pos   { background: #dcfce7; color: #15803d; }
.pa-chip--warn  { background: #fef3c7; color: #b45309; }
.pa-chip--neg   { background: #fee2e2; color: #b91c1c; }
.pa-chip--muted { background: #f1f5f9; color: #94a3b8; }

/* ---------- lista de anúncios (sempre expandida) ---------- */
.pa-list { padding: 6px; }
.pa-ad {
  border: 1px solid #eef2f6;
  border-radius: 10px;
  margin: 6px;
  overflow: hidden;
  border-left: 3px solid #e2e8f0;
}
.pa-ad[data-accent="active"]     { border-left-color: $c-active; }
.pa-ad[data-accent="available"]  { border-left-color: $c-available; }
.pa-ad[data-accent="processing"] { border-left-color: $c-processing; }
.pa-ad--skubreak { margin-top: 16px; }

.pa-ad__head {
  display: flex; align-items: center; gap: 12px;
  padding: 8px 12px; background: #f8fafc; border-bottom: 1px solid #eef2f6;
}
.pa-ad__thumb {
  width: 36px; height: 36px; border-radius: 7px; object-fit: cover;
  border: 1px solid #e2e8f0; background: #fff; flex: none;
}
.pa-ad__id { min-width: 0; flex: 1; display: flex; flex-direction: column; }
.pa-ad__title { font-weight: 600; color: #0f172a; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pa-ad__sub { font-size: 11px; color: #94a3b8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; strong { color: #475569; } }
.pa-ad__sku-amb { color: #b45309; text-decoration: underline dotted; }
.pa-ad__counts { display: flex; gap: 4px; flex: none; }

.pa-promos { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 13px; color: #334155; }
.pa-promos .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
.pa-promos tbody td { padding: 7px 10px; border-bottom: 1px solid #f4f6f8; vertical-align: middle; overflow: hidden; text-overflow: ellipsis; }
.pa-promos tbody tr:last-child td { border-bottom: none; }
.pa-hrow th {
  padding: 6px 10px; text-align: left; font-size: 9.5px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.04em; color: #94a3b8;
  background: #fff; border-bottom: 1px solid #eef2f6; cursor: help; white-space: nowrap;
}
.pa-hrow th.num { text-align: right; }
.pa-sim {
  margin-left: 6px; font-size: 9.5px; font-weight: 700; text-transform: uppercase;
  color: #b45309; background: #fef3c7; padding: 1px 5px; border-radius: 4px;
}
.pa-removebtn { margin-left: 6px; }

.pa-band td {
  padding: 6px 10px; background: #f8fafc; border-bottom: 1px solid #e2e8f0;
  font-weight: 700; color: #334155;
}
.pa-band .q-icon { vertical-align: -2px; margin-right: 6px; }
.pa-band__label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
.pa-band__count {
  display: inline-block; margin-left: 8px; padding: 0 7px;
  border-radius: 999px; font-size: 11px; background: rgba(15, 23, 42, 0.08);
}
.pa-band__hint { margin-left: 10px; font-size: 11px; font-weight: 600; color: #b91c1c; text-transform: none; letter-spacing: 0; }
.pa-band__hint--muted { color: #94a3b8; }
.pa-band--active     td { background: #ecfdf5; border-left: 4px solid $c-active; color: #0f766e; }
.pa-band--available  td { background: #eff6ff; border-left: 4px solid $c-available; color: #075985; }
.pa-band--processing td { background: #fffbeb; border-left: 4px solid $c-processing; color: #92400e; }

.pa-prow > td:first-child { border-left: 3px solid transparent; }
.pa-prow--active     > td:first-child { border-left-color: $c-active; }
.pa-prow--available  > td:first-child { border-left-color: $c-available; }
.pa-prow--processing > td:first-child { border-left-color: $c-processing; }
.pa-prow:hover td { background: #f8fafc; }
.pa-prow.is-chosen td { background: #ecfdf5 !important; }
.pa-prow.is-chosen > td:first-child { border-left-color: $c-active; border-left-width: 4px; }
.pa-prow.is-removing td { background: #fef2f2 !important; }
.pa-prow.is-removing > td:first-child { border-left-color: $c-danger; border-left-width: 4px; }
.pa-prow.is-disabled { opacity: 0.6; }

.pa-c-pick { width: 44px; text-align: center; }
.pa-c-type { font-weight: 600; color: #0f172a; white-space: nowrap; }
.pa-c-disc { white-space: nowrap; }
.pa-c-sit { white-space: normal; }
.pa-min { font-size: 11px; color: #94a3b8; margin-right: 6px; }
.pa-fixed { font-size: 11px; font-weight: 700; color: #075985; }
.pa-discinput {
  width: 62px; padding: 3px 6px; border: 1px solid #cbd5e1; border-radius: 6px;
  font-size: 12.5px; font-weight: 700; text-align: right; color: #0f172a;
  font-variant-numeric: tabular-nums;
}
.pa-discinput:focus { outline: 2px solid #99f6e4; border-color: $c-active; }
.pa-strong { font-weight: 600; color: #0f172a; }
.pa-dim { color: #94a3b8; font-size: 12px; }
.is-muted { color: #94a3b8; }
.is-pos { color: #15803d; font-weight: 700; }
.is-neg { color: #b91c1c; font-weight: 700; }

@media (max-width: 1100px) {
  .pa-hide-md { display: none; }
}
</style>
