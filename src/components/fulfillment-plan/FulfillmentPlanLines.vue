<template>
  <section class="fp-lines">
    <div v-if="loading" class="fp-loading-inline"><q-spinner-dots color="primary" size="34px" /> Atualizando a lista...</div>
    <div v-else-if="!lines.length" class="fp-empty-inline">
      <q-icon name="filter_alt_off" size="34px" />
      <strong>Nenhum anúncio neste filtro</strong>
      <span>Altere a ação ou a busca para consultar o restante do catálogo.</span>
    </div>
    <template v-else>
      <div class="fp-table-wrap">
        <table class="fp-table">
          <thead><tr><th>Produto</th><th>Ação</th><th>Quantidade</th><th>Prazo</th><th>Demanda</th><th>Estoques</th><th>Economia</th><th>Motivo</th><th></th></tr></thead>
          <tbody>
            <tr v-for="line in lines" :key="line.id" tabindex="0" @click="$emit('select', line)" @keydown.enter="$emit('select', line)">
              <td>
                <div class="fp-product">
                  <img v-if="line.thumbnail" :src="line.thumbnail" alt="" />
                  <span v-else class="fp-product__fallback"><q-icon name="inventory_2" /></span>
                  <span><strong>{{ line.title }}</strong><small>{{ line.variation_name || 'Sem variação' }} · {{ line.sku || 'Sem SKU' }}</small><small>{{ line.item_id_ml }}</small></span>
                </div>
              </td>
              <td><span class="fp-action" :class="`fp-action--${meta(line).tone}`"><q-icon :name="meta(line).icon" />{{ meta(line).short }}</span></td>
              <td>
                <strong class="fp-quantity">{{ quantity(line) }}</strong>
                <small v-if="!isSend(line)">sem separação</small>
                <small v-else-if="line.recommended_quantity == null && line.need_quantity">necessidade {{ line.need_quantity }} · confirmar ERP</small>
                <small v-else-if="line.adjusted_quantity != null">ajustado pelo operador</small>
                <small v-else>unidades sugeridas</small>
              </td>
              <td><strong>{{ formatDate(line.dispatch_by) }}</strong><small>{{ deadlineCaption(line) }}</small></td>
              <td><strong>{{ formatNumber(line.forecast?.daily_units, 2) }} un./dia</strong><small>{{ trend(line.forecast?.trend) }} · {{ confidence(line.forecast?.confidence) }}</small></td>
              <td><strong>Full {{ line.inventory?.full_sellable ?? '—' }}</strong><small>ERP {{ line.inventory?.erp_available ?? '—' }} · cobertura {{ formatNumber(line.inventory?.coverage_before_days, 0) }}d</small></td>
              <td><strong>{{ margin(line.economics?.contribution_margin_rate) }}</strong><small>ticket {{ formatMoney(line.economics?.average_ticket) }}</small></td>
              <td><strong class="fp-reason">{{ reasonText(line.decision?.reasons?.[0]) }}</strong><small v-if="line.decision?.warnings?.length">{{ reasonText(line.decision.warnings[0]) }}</small></td>
              <td><q-icon name="chevron_right" color="grey-5" /></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="fp-mobile-lines">
        <article v-for="line in lines" :key="`mobile-${line.id}`" class="fp-line-card" @click="$emit('select', line)">
          <div class="fp-line-card__head"><span><strong>{{ line.title }}</strong><small>{{ line.variation_name || line.sku }}</small></span><span class="fp-action" :class="`fp-action--${meta(line).tone}`">{{ meta(line).short }}</span></div>
          <div class="fp-line-card__quantity"><span>Quantidade<strong>{{ isSend(line) ? quantity(line) : 'Sem envio' }}</strong></span><span>{{ deadlineCaption(line) }}<strong>{{ formatDate(line.dispatch_by) }}</strong></span></div>
          <div class="fp-line-card__metrics"><span>Venda/dia<strong>{{ formatNumber(line.forecast?.daily_units, 2) }}</strong></span><span>Full<strong>{{ line.inventory?.full_sellable ?? '—' }}</strong></span><span>ERP<strong>{{ line.inventory?.erp_available ?? '—' }}</strong></span><span>Margem<strong>{{ margin(line.economics?.contribution_margin_rate) }}</strong></span></div>
          <p>{{ reasonText(line.decision?.reasons?.[0]) }}</p>
        </article>
      </div>
    </template>

    <div v-if="pagination.total > pagination.pageSize" class="fp-pagination">
      <span>{{ pagination.total.toLocaleString('pt-BR') }} anúncios neste filtro</span>
      <q-pagination :model-value="pagination.page" :max="Math.ceil(pagination.total / pagination.pageSize)" :max-pages="7" boundary-numbers direction-links @update:model-value="$emit('page', $event)" />
    </div>
  </section>
</template>

<script setup>
import { actionMeta, formatDate, formatMoney, formatNumber, reasonText } from 'src/utils/fulfillmentPlan'

defineProps({
  lines: { type: Array, default: () => [] },
  pagination: { type: Object, required: true },
  loading: Boolean,
})
defineEmits(['select', 'page'])

function meta(line) { return actionMeta(line.action) }
function quantity(line) { return isSend(line) ? (line.effective_quantity ?? line.recommended_quantity ?? '—') : '—' }
function isSend(line) { return ['replenish_full', 'start_full', 'next_cycle'].includes(line.action) && Number(line.effective_quantity ?? line.recommended_quantity ?? 0) > 0 }
function deadlineCaption(line) {
  if (!line.dispatch_by) return 'sem despacho'
  const cycle = Number(line.decision?.formula?.cycle_index || 0)
  return cycle > 0 ? `onda ${cycle + 1}` : 'despachar até'
}
function margin(value) { return value == null ? '—' : Number(value).toLocaleString('pt-BR', { style: 'percent', maximumFractionDigits: 1 }) }
function trend(value) {
  if (value == null || Math.abs(Number(value)) < 0.05) return 'estável'
  return `${Number(value) > 0 ? 'alta' : 'queda'} ${Math.abs(Number(value)).toLocaleString('pt-BR', { style: 'percent', maximumFractionDigits: 0 })}`
}
function confidence(value) { return { high: 'confiança alta', medium: 'confiança média', low: 'confiança baixa' }[value] || 'confiança não medida' }
</script>
