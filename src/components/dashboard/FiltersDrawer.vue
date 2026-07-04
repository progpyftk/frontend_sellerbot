<template>
  <q-drawer
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    side="right"
    bordered
    :width="320"
    :breakpoint="768"
    class="filters-drawer"
  >
    <div class="fd-inner">
      <!-- Header -->
      <div class="fd-header">
        <div class="fd-header-title">
          <q-icon name="tune" size="18px" />
          Filtros Avançados
        </div>
        <q-btn flat round icon="close" size="sm" @click="$emit('update:modelValue', false)" />
      </div>

      <!-- Período -->
      <div class="fd-section">
        <div class="fd-section-title">
          <q-icon name="calendar_today" size="14px" />
          Período
        </div>

        <!-- Presets -->
        <div class="fd-presets">
          <button
            v-for="p in datePresets"
            :key="p.key"
            :class="['fd-preset-btn', activeDatePreset === p.key && 'fd-preset-btn--on']"
            @click="$emit('update:preset', p.key)"
          >
            {{ p.label }}
          </button>
        </div>

        <!-- Datas customizadas -->
        <div class="fd-dates">
          <div class="fd-date-row">
            <span class="fd-date-label">De</span>
            <q-input
              :model-value="dateFrom"
              @update:model-value="$emit('update:dateFrom', $event)"
              type="date"
              dense
              borderless
              class="fd-date-input"
            />
          </div>
          <div class="fd-date-row">
            <span class="fd-date-label">Até</span>
            <q-input
              :model-value="dateTo"
              @update:model-value="$emit('update:dateTo', $event)"
              type="date"
              dense
              borderless
              class="fd-date-input"
            />
          </div>
        </div>
      </div>

      <!-- Contas -->
      <div class="fd-section">
        <div class="fd-section-title">
          <q-icon name="store" size="14px" />
          Contas
        </div>

        <!-- Mercado Livre -->
        <div v-if="mlAccounts.length" class="fd-mkt-group">
          <label class="fd-mkt-header" @click="toggleAllMl">
            <q-checkbox
              :model-value="allMlSelected"
              :indeterminate="someMlSelected && !allMlSelected"
              dense
              size="sm"
              @update:model-value="toggleAllMl"
            />
            <span class="fd-mkt-badge fd-mkt-badge--ml">ML</span>
            <span class="fd-mkt-name">Mercado Livre</span>
          </label>
          <label
            v-for="a in mlAccounts"
            :key="a.key"
            class="fd-acct-item"
            :class="{ 'fd-acct-item--on': selectedKeys.includes(a.key) }"
          >
            <q-checkbox
              :model-value="selectedKeys.includes(a.key)"
              @update:model-value="toggleAccount(a.key)"
              dense
              size="sm"
            />
            <span class="fd-acct-dot" :style="{ background: a.color }"></span>
            <span class="fd-acct-label">{{ a.label }}</span>
          </label>
        </div>

        <!-- Shopee -->
        <div v-if="shopeeAccounts.length" class="fd-mkt-group">
          <label class="fd-mkt-header" @click="toggleAllShopee">
            <q-checkbox
              :model-value="allShopeeSelected"
              :indeterminate="someShopeeSelected && !allShopeeSelected"
              dense
              size="sm"
              @update:model-value="toggleAllShopee"
            />
            <span class="fd-mkt-badge fd-mkt-badge--shopee">SH</span>
            <span class="fd-mkt-name">Shopee</span>
          </label>
          <label
            v-for="a in shopeeAccounts"
            :key="a.key"
            class="fd-acct-item"
            :class="{ 'fd-acct-item--on': selectedKeys.includes(a.key) }"
          >
            <q-checkbox
              :model-value="selectedKeys.includes(a.key)"
              @update:model-value="toggleAccount(a.key)"
              dense
              size="sm"
            />
            <span class="fd-acct-dot" :style="{ background: a.color }"></span>
            <span class="fd-acct-label">{{ a.label }}</span>
          </label>
        </div>

        <!-- Hint -->
        <div v-if="selectedKeys.length > 1" class="fd-comparative-hint">
          <q-icon name="compare_arrows" size="14px" />
          {{ selectedKeys.length }} contas selecionadas
        </div>
      </div>

      <!-- Métricas do Gráfico -->
      <div class="fd-section">
        <div class="fd-section-title">
          <q-icon name="show_chart" size="14px" />
          Métricas do Gráfico
        </div>
        <div class="fd-metrics-list">
          <label
            v-for="m in chartMetrics"
            :key="m.key"
            class="fd-metric-item"
            :class="{ 'fd-metric-item--on': activeMetrics.includes(m.key) }"
          >
            <span class="fd-metric-pip" :style="{ background: activeMetrics.includes(m.key) ? m.color : '#e2e8f0' }"></span>
            <input
              type="checkbox"
              :checked="activeMetrics.includes(m.key)"
              @change="$emit('toggle-metric', m.key)"
              style="display:none"
            />
            {{ m.label }}
          </label>
        </div>
      </div>

      <!-- Ações -->
      <div class="fd-actions">
        <q-btn flat label="Limpar" icon="restart_alt" @click="$emit('clear')" />
        <q-btn flat label="Aplicar" icon="check" color="primary" @click="$emit('apply')" />
      </div>
    </div>
  </q-drawer>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  activeDatePreset: { type: String, default: null },
  dateFrom: { type: String, required: true },
  dateTo: { type: String, required: true },
  datePresets: { type: Array, required: true },
  mlAccounts: { type: Array, default: () => [] },
  shopeeAccounts: { type: Array, default: () => [] },
  selectedKeys: { type: Array, default: () => [] },
  allKeys: { type: Array, default: () => [] },
  chartMetrics: { type: Array, default: () => [] },
  activeMetrics: { type: Array, default: () => [] },
});

const emit = defineEmits([
  'update:modelValue',
  'update:preset',
  'update:dateFrom',
  'update:dateTo',
  'update:selectedKeys',
  'toggle-metric',
  'clear',
  'apply',
]);

// Computed para seleção de contas
const allMlSelected = computed(() =>
  props.mlAccounts.length > 0 && props.mlAccounts.every(a => props.selectedKeys.includes(a.key))
);
const someMlSelected = computed(() =>
  props.mlAccounts.some(a => props.selectedKeys.includes(a.key))
);
const allShopeeSelected = computed(() =>
  props.shopeeAccounts.length > 0 && props.shopeeAccounts.every(a => props.selectedKeys.includes(a.key))
);
const someShopeeSelected = computed(() =>
  props.shopeeAccounts.some(a => props.selectedKeys.includes(a.key))
);

function toggleAccount(key) {
  const current = [...props.selectedKeys];
  const idx = current.indexOf(key);
  if (idx >= 0) {
    current.splice(idx, 1);
  } else {
    current.push(key);
  }
  emit('update:selectedKeys', current);
}

function toggleAllMl() {
  const current = [...props.selectedKeys];
  const mlKeys = props.mlAccounts.map(a => a.key);
  if (allMlSelected.value) {
    // Remover todas ML
    emit('update:selectedKeys', current.filter(k => !mlKeys.includes(k)));
  } else {
    // Adicionar todas ML
    const newKeys = [...new Set([...current, ...mlKeys])];
    emit('update:selectedKeys', newKeys);
  }
}

function toggleAllShopee() {
  const current = [...props.selectedKeys];
  const shopeeKeys = props.shopeeAccounts.map(a => a.key);
  if (allShopeeSelected.value) {
    emit('update:selectedKeys', current.filter(k => !shopeeKeys.includes(k)));
  } else {
    const newKeys = [...new Set([...current, ...shopeeKeys])];
    emit('update:selectedKeys', newKeys);
  }
}
</script>

<style lang="scss" scoped>
@import 'src/css/tokens';

.filters-drawer {
  background: $surface;
}

.fd-inner {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: $space-4;
}

.fd-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $space-5;
  padding-bottom: $space-3;
  border-bottom: 1px solid $border;
}

.fd-header-title {
  display: flex;
  align-items: center;
  gap: $space-2;
  font-size: $text-h3;
  font-weight: $font-semibold;
  color: $text-primary;
}

.fd-section {
  margin-bottom: $space-5;
}

.fd-section-title {
  display: flex;
  align-items: center;
  gap: $space-2;
  font-size: $text-small;
  font-weight: $font-semibold;
  color: $text-muted;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: $space-3;
}

// Presets
.fd-presets {
  display: flex;
  flex-wrap: wrap;
  gap: $space-1;
  margin-bottom: $space-3;
}

.fd-preset-btn {
  padding: $space-1 $space-3;
  font-size: $text-xs;
  font-weight: $font-medium;
  color: $text-body;
  background: $surface-2;
  border: 1px solid transparent;
  border-radius: $radius-sm;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    background: $border;
  }

  &--on {
    background: $tint-teal-bg;
    color: $tint-teal-text;
    border-color: $primary;
    font-weight: $font-semibold;
  }
}

// Datas
.fd-dates {
  display: flex;
  flex-direction: column;
  gap: $space-2;
}

.fd-date-row {
  display: flex;
  align-items: center;
  gap: $space-2;
}

.fd-date-label {
  font-size: $text-xs;
  font-weight: $font-medium;
  color: $text-muted;
  width: 24px;
}

.fd-date-input {
  flex: 1;
  :deep(input) {
    font-size: $text-small;
    padding: $space-1 $space-2;
  }
}

// Contas
.fd-mkt-group {
  margin-bottom: $space-3;
}

.fd-mkt-header {
  display: flex;
  align-items: center;
  gap: $space-2;
  cursor: pointer;
  padding: $space-1 0;
}

.fd-mkt-badge {
  font-size: 10px;
  font-weight: $font-bold;
  padding: 1px 4px;
  border-radius: 3px;

  &--ml {
    background: $ml-amber-bg;
    color: #78350f;
  }
  &--shopee {
    background: $shopee-orange-bg;
    color: #991b1b;
  }
}

.fd-mkt-name {
  font-size: $text-small;
  font-weight: $font-semibold;
  color: $text-body;
}

.fd-acct-item {
  display: flex;
  align-items: center;
  gap: $space-2;
  padding: $space-1 $space-2;
  border-radius: $radius-sm;
  cursor: pointer;
  transition: background $transition-fast;

  &:hover {
    background: $surface-2;
  }

  &--on {
    background: $tint-teal-bg;
  }
}

.fd-acct-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.fd-acct-label {
  font-size: $text-small;
  color: $text-body;
}

.fd-comparative-hint {
  display: flex;
  align-items: center;
  gap: $space-1;
  font-size: $text-xs;
  color: $text-muted;
  margin-top: $space-2;
  padding: $space-2;
  background: $surface-2;
  border-radius: $radius-sm;
}

// Métricas
.fd-metrics-list {
  display: flex;
  flex-direction: column;
  gap: $space-1;
}

.fd-metric-item {
  display: flex;
  align-items: center;
  gap: $space-2;
  padding: $space-2;
  border-radius: $radius-sm;
  cursor: pointer;
  font-size: $text-small;
  color: $text-body;
  transition: background $transition-fast;

  &:hover {
    background: $surface-2;
  }

  &--on {
    background: $tint-teal-bg;
    font-weight: $font-medium;
  }
}

.fd-metric-pip {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

// Ações
.fd-actions {
  display: flex;
  gap: $space-2;
  margin-top: auto;
  padding-top: $space-4;
  border-top: 1px solid $border;
}
</style>
