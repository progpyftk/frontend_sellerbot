<template>
  <q-page class="analytics-page">
    <SbPageHeader
      title="Análise de anúncios"
      eyebrow="SellerBot · Mercado Livre"
      :subtitle="subtitle"
      icon="insights"
    >
      <template #actions>
        <div class="period-toggle" aria-label="Período de análise">
          <button v-for="period in periods" :key="period.days" :class="{ active: filters.days === period.days }" @click="setDays(period.days)">
            {{ period.label }}
          </button>
        </div>
        <q-btn outline color="teal-8" icon="refresh" label="Atualizar" :loading="loading.list || loading.overview" @click="refresh" />
      </template>
    </SbPageHeader>

    <div class="mobile-toolbar">
      <q-btn outline color="teal-8" icon="list" label="Ver anúncios" @click="mobileListOpen = true" />
      <span v-if="selectedItem">{{ selectedItem.title }}</span>
    </div>

    <div class="analytics-layout">
      <ItemAnalyticsItemList
        :items="items"
        :accounts="accounts"
        :filters="filters"
        :pagination="pagination"
        :selected-item-id="selectedItemId"
        :loading="loading.list"
        :error="errors.list"
        :open="!isMobile || mobileListOpen"
        :mobile="isMobile"
        @filter="setFilter"
        @page="setPage"
        @retry="refresh"
        @select="selectItem"
        @close="mobileListOpen = false"
      />

      <main class="detail-panel">
        <div v-if="!selectedItemId" class="detail-placeholder">
          <SbEmptyState title="Escolha um anúncio" message="Use a busca e os filtros para começar a análise." />
        </div>
        <template v-else>
          <ItemAnalyticsOverview :overview="overview" :loading="loading.overview" :error="errors.overview" @copied="notifyCopied" />
          <ItemAnalyticsTimeline :timeline="timeline" :loading="loading.timeline" :error="errors.timeline" :mode="filters.mode" :metrics="filters.metrics" @update:mode="setMode" @update:metrics="setMetrics" @retry="reloadDetail" />
          <ItemAnalyticsInsights :causal="causal" :timeline="timeline" :loading="loading.causal" :error="errors.causal" @retry="reloadDetail" />
        </template>
      </main>
    </div>
  </q-page>
</template>

<script setup>
import { computed } from 'vue'
import { useQuasar } from 'quasar'
import SbEmptyState from 'src/components/common/SbEmptyState.vue'
import SbPageHeader from 'src/components/common/SbPageHeader.vue'
import ItemAnalyticsInsights from 'src/components/item-analytics/ItemAnalyticsInsights.vue'
import ItemAnalyticsItemList from 'src/components/item-analytics/ItemAnalyticsItemList.vue'
import ItemAnalyticsOverview from 'src/components/item-analytics/ItemAnalyticsOverview.vue'
import ItemAnalyticsTimeline from 'src/components/item-analytics/ItemAnalyticsTimeline.vue'
import { useItemAnalytics } from 'src/composables/useItemAnalytics'

const $q = useQuasar()
const {
  accounts, causal, errors, filters, items, loading, mobileListOpen, overview, pagination,
  selectedItem, selectedItemId, setDays, setFilter, setMode, setMetrics, setPage, selectItem, refresh, timeline,
} = useItemAnalytics()

const isMobile = computed(() => $q.screen.lt.md)
const periods = [{ days: 14, label: '14 dias' }, { days: 30, label: '30 dias' }, { days: 60, label: '60 dias' }, { days: 90, label: '90 dias' }]
const subtitle = computed(() => selectedItem.value ? `${selectedItem.value.title} · últimos ${filters.days} dias` : `Métricas e histórico dos últimos ${filters.days} dias`)

function reloadDetail() {
  if (selectedItemId.value) selectItem(selectedItemId.value, false)
}

function notifyCopied() {
  $q.notify({ type: 'positive', message: 'Item ID copiado', timeout: 1400 })
}
</script>

<style lang="scss" scoped>
.analytics-page { min-height: calc(100vh - 64px); }
.period-toggle { display: flex; gap: 3px; padding: 3px; border: 1px solid #e2e8f0; border-radius: 9px; background: #fff; }
.period-toggle button { border: 0; border-radius: 6px; background: transparent; color: #64748b; cursor: pointer; font: inherit; font-size: 12px; padding: 7px 10px; }
.period-toggle button:hover, .period-toggle button.active { background: #ccfbf1; color: #0f766e; font-weight: 700; }
.analytics-layout { display: flex; align-items: stretch; gap: 16px; min-height: calc(100vh - 200px); }
.detail-panel { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 12px; }
.detail-placeholder { flex: 1; min-height: 400px; display: grid; place-items: center; border: 1px dashed #cbd5e1; border-radius: 14px; background: rgba(255, 255, 255, .5); }
.mobile-toolbar { display: none; }
@media (max-width: 767px) {
  .analytics-page { padding-bottom: 24px; }
  .analytics-layout { min-height: calc(100vh - 180px); }
  .mobile-toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
  .mobile-toolbar span { overflow: hidden; color: #475569; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
  :deep(.sb-page-header-actions) { width: 100%; justify-content: space-between; }
  .period-toggle { flex: 1; }
  .period-toggle button { flex: 1; padding-left: 5px; padding-right: 5px; }
  :deep(.sb-page-header-actions .q-btn) { flex: 0 0 auto; }
}
@media (max-width: 520px) { :deep(.sb-page-header-actions) { align-items: stretch; flex-direction: column; } .period-toggle { width: 100%; } :deep(.sb-page-header-actions .q-btn) { width: 100%; } }
</style>
