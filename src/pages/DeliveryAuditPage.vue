<template>
  <q-page class="q-pa-lg">
    <div class="row items-center justify-between q-mb-lg"><div><div class="text-overline text-teal-8">Logística</div><div class="text-h5 text-weight-bold">Auditoria de entregas</div><div class="text-grey-7">Compare o repasse do marketplace com o custo teórico.</div></div></div>
    <q-card flat bordered class="q-mb-md"><q-card-section><div class="row q-col-gutter-md items-end"><q-input v-model="filters.start_date" type="date" label="Início" outlined dense class="col-12 col-sm-3" /><q-input v-model="filters.end_date" type="date" label="Fim" outlined dense class="col-12 col-sm-3" /><q-select v-model="filters.marketplace" :options="marketplaceOptions" emit-value map-options clearable label="Marketplace" outlined dense class="col-12 col-sm-3" /><q-btn color="teal-7" label="Consultar" icon="search" :loading="loading" @click="load" /></div></q-card-section></q-card>
    <div class="row q-col-gutter-md q-mb-md"><q-card v-for="kpi in kpis" :key="kpi.label" flat bordered class="col-12 col-sm-4"><q-card-section><div class="text-caption text-grey-7">{{ kpi.label }}</div><div class="text-h5 text-weight-bold">{{ kpi.value }}</div></q-card-section></q-card></div>
    <q-banner v-if="audit.missing_dimensions_count || audit.missing_repass_count" class="bg-amber-1 text-amber-10 q-mb-md"><q-icon name="warning" class="q-mr-sm" />{{ audit.missing_dimensions_count }} sem dimensões e {{ audit.missing_repass_count }} sem repasse; pendências foram excluídas dos KPIs.</q-banner>
    <q-card flat bordered><q-table :rows="audit.entries" :columns="columns" row-key="id" :loading="loading" no-data-label="Nenhuma entrega encontrada"><template #body-cell-divergence="props"><q-td :props="props" :class="props.value >= 0 ? 'text-positive' : 'text-negative'">{{ money(props.value) }}</q-td></template><template #body-cell-repassed_amount="props"><q-td :props="props">{{ money(props.value) }}</q-td></template><template #body-cell-theoretical_cost="props"><q-td :props="props">{{ money(props.value) }}</q-td></template><template #body-cell-audit_status="props"><q-td :props="props"><q-badge :color="props.value === 'calculated' ? 'positive' : 'warning'">{{ statusLabel(props.value) }}</q-badge></q-td></template></q-table></q-card>
  </q-page>
</template>
<script setup>
import { computed, onMounted, ref } from 'vue'
import DeliveryAuditService from 'src/services/DeliveryAuditService'
const today = new Date().toISOString().slice(0, 10)
const filters = ref({ start_date: today.slice(0, 8) + '01', end_date: today, marketplace: null })
const loading = ref(false); const audit = ref({ total_repassed: 0, total_theoretical: 0, divergence: 0, entries: [], missing_dimensions_count: 0, missing_repass_count: 0 })
const marketplaceOptions = [{ label: 'Mercado Livre', value: 'ml' }, { label: 'Shopee', value: 'shopee' }]
const columns = [{ name: 'order_ref', label: 'Pedido', field: 'order_ref', align: 'left' }, { name: 'marketplace', label: 'Marketplace', field: 'marketplace' }, { name: 'audit_status', label: 'Status', field: 'audit_status' }, { name: 'repassed_amount', label: 'Repassado', field: 'repassed_amount' }, { name: 'theoretical_cost', label: 'Teórico', field: 'theoretical_cost' }, { name: 'divergence', label: 'Divergência', field: 'divergence' }]
const money = value => `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`
const statusLabel = value => ({ calculated: 'Calculado', missing_dimensions: 'Sem dimensões', missing_repass: 'Sem repasse' }[value] || value)
const kpis = computed(() => [{ label: 'Repassado', value: money(audit.value.total_repassed) }, { label: 'Custo teórico', value: money(audit.value.total_theoretical) }, { label: 'Divergência', value: money(audit.value.divergence) }])
async function load() { loading.value = true; try { const response = await DeliveryAuditService.getAudit(filters.value); audit.value = response.data } finally { loading.value = false } }
onMounted(load)
</script>
