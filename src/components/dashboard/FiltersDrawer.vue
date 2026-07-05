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
            :class="['fd-preset-btn', preset === p.key && 'fd-preset-btn--on']"
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
          <label class="fd-mkt-header">
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
          <label class="fd-mkt-header">
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

        <!-- Hint com breakdown -->
        <div v-if="selectedKeys.length > 0 && selectedKeys.length < allKeys.length" class="fd-comparative-hint">
          <q-icon name="compare_arrows" size="14px" />
          <span>{{ selectedKeys.length }} de {{ allKeys.length }} contas</span>
          <span class="fd-hint-breakdown">
            (<template v-if="mlSelectedCount > 0">{{ mlSelectedCount }} ML</template>
            <template v-if="mlSelectedCount > 0 && shopeeSelectedCount > 0">, </template>
            <template v-if="shopeeSelectedCount > 0">{{ shopeeSelectedCount }} Shopee</template>)
          </span>
        </div>
      </div>

      <!-- Status do Pedido -->
      <div class="fd-section">
        <div class="fd-section-title">
          <q-icon name="local_shipping" size="14px" />
          Status do Pedido
        </div>
        <div class="fd-status-list">
          <label
            v-for="s in orderStatuses"
            :key="s.key"
            class="fd-status-item"
            :class="{ 'fd-status-item--on': activeStatuses.includes(s.key) }"
          >
            <q-checkbox
              :model-value="activeStatuses.includes(s.key)"
              @update:model-value="$emit('toggle-status', s.key)"
              dense
              size="sm"
            />
            <span class="fd-status-dot" :style="{ background: s.color }"></span>
            <span class="fd-status-label">{{ s.label }}</span>
          </label>
        </div>
      </div>

      <!-- Métricas do Gráfico -->
      <div class="fd-section">
        <div class="fd-section-title">
          <q-icon name="show_chart" size="14px" />
          Métricas do Gráfico
          <span v-if="chartMode !== 'metrics'" class="fd-mode-hint">
            modo Agregado
            <q-icon name="info_outline" size="12px">
              <q-tooltip max-width="180px" anchor="top right" self="bottom right">
                A seleção de métricas só funciona no modo <strong>Agregado</strong>.<br>
                No modo <em>Por Conta</em>, use as pílulas no cabeçalho do gráfico.
              </q-tooltip>
            </q-icon>
          </span>
        </div>
        <div class="fd-metrics-list" :class="{ 'fd-metrics-list--disabled': chartMode !== 'metrics' }">
          <label
            v-for="m in chartMetrics"
            :key="m.key"
            class="fd-metric-item"
            :class="{ 'fd-metric-item--on': activeMetrics.includes(m.key) && chartMode === 'metrics' }"
          >
            <span class="fd-metric-pip" :style="{ background: activeMetrics.includes(m.key) && chartMode === 'metrics' ? m.color : '#e2e8f0' }"></span>
            <span class="fd-metric-label">{{ m.label }}</span>
            <q-icon
              v-if="activeMetrics.includes(m.key) && chartMode === 'metrics'"
              name="check"
              size="14px"
              class="fd-metric-check"
            />
            <input
              type="checkbox"
              :checked="activeMetrics.includes(m.key)"
              @change="chartMode === 'metrics' && $emit('toggle-metric', m.key)"
              style="display:none"
            />
          </label>
        </div>

        <!-- Toggle: média por dia da semana -->
        <label
          class="fd-weekday-toggle"
          :class="{ 'fd-weekday-toggle--on': chartMode === 'weekday' }"
          @click="$emit('update:chartMode', chartMode === 'weekday' ? 'metrics' : 'weekday')"
        >
          <span class="fd-weekday-icon"><q-icon name="event_note" size="14px" /></span>
          <span class="fd-weekday-label">Média por dia da semana</span>
          <span class="fd-weekday-switch" :class="{ 'fd-weekday-switch--on': chartMode === 'weekday' }"></span>
        </label>
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
  preset: { type: String, default: null },
  dateFrom: { type: String, required: true },
  dateTo: { type: String, required: true },
  datePresets: { type: Array, required: true },
  mlAccounts: { type: Array, default: () => [] },
  shopeeAccounts: { type: Array, default: () => [] },
  selectedKeys: { type: Array, default: () => [] },
  allKeys: { type: Array, default: () => [] },
  chartMetrics: { type: Array, default: () => [] },
  activeMetrics: { type: Array, default: () => [] },
  chartMode: { type: String, default: 'metrics' },
  activeStatuses: { type: Array, default: () => [] },
});

const emit = defineEmits([
  'update:modelValue',
  'update:preset',
  'update:dateFrom',
  'update:dateTo',
  'update:selectedKeys',
  'update:chartMode',
  'toggle-metric',
  'toggle-status',
  'clear',
  'apply',
]);

// Status de pedido disponíveis
const orderStatuses = [
  { key: 'paid', label: 'Pago', color: '#16a34a' },
  { key: 'pending', label: 'Pagamento Pendente', color: '#f59e0b' },
  { key: 'preparing', label: 'Em Preparação', color: '#0284c7' },
  { key: 'shipped', label: 'Enviado', color: '#6366f1' },
  { key: 'delivered', label: 'Entregue', color: '#0f766e' },
  { key: 'canceled', label: 'Cancelado', color: '#dc2626' },
];

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

// Contadores por marketplace
const mlSelectedCount = computed(() =>
  props.mlAccounts.filter(a => props.selectedKeys.includes(a.key)).length
);
const shopeeSelectedCount = computed(() =>
  props.shopeeAccounts.filter(a => props.selectedKeys.includes(a.key)).length
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
  font-size: $text-h3-size;
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
  font-size: $text-small-size;
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
  font-size: $text-xs-size;
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
  font-size: $text-xs-size;
  font-weight: $font-medium;
  color: $text-muted;
  width: 24px;
}

.fd-date-input {
  flex: 1;
  :deep(input) {
    font-size: $text-small-size;
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
  font-size: $text-small-size;
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
  font-size: $text-small-size;
  color: $text-body;
}

.fd-comparative-hint {
  display: flex;
  align-items: center;
  gap: $space-1;
  font-size: $text-xs-size;
  color: $text-muted;
  margin-top: $space-2;
  padding: $space-2;
  background: $surface-2;
  border-radius: $radius-sm;
}

.fd-hint-breakdown {
  font-weight: $font-medium;
  color: $text-body;
}

// Status do Pedido
.fd-status-list {
  display: flex;
  flex-direction: column;
  gap: $space-1;
}

.fd-status-item {
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

.fd-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.fd-status-label {
  font-size: $text-small-size;
  color: $text-body;
}

// Métricas
.fd-mode-hint {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-left: auto;
  font-size: 10px;
  font-weight: $font-medium;
  color: $warning;
  text-transform: none;
  letter-spacing: 0;
}

.fd-metrics-list {
  display: flex;
  flex-direction: column;
  gap: $space-1;

  &--disabled {
    opacity: 0.45;

    .fd-metric-item {
      cursor: not-allowed;
    }
  }
}

.fd-metric-item {
  display: flex;
  align-items: center;
  gap: $space-2;
  padding: $space-2;
  border-radius: $radius-sm;
  cursor: pointer;
  font-size: $text-small-size;
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

.fd-metric-label {
  flex: 1;
}

.fd-metric-check {
  color: $primary;
  flex-shrink: 0;
}

.fd-metric-pip {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

// Toggle weekday
.fd-weekday-toggle {
  display: flex;
  align-items: center;
  gap: $space-2;
  padding: $space-2 $space-3;
  border-radius: $radius-md;
  cursor: pointer;
  margin-top: $space-3;
  background: $surface-2;
  border: 1px solid transparent;
  transition: all $transition-base;

  &:hover {
    border-color: $primary;
  }

  &--on {
    background: $tint-teal-bg;
    border-color: $primary;

    .fd-weekday-label {
      color: $tint-teal-text;
      font-weight: $font-semibold;
    }
  }
}

.fd-weekday-icon {
  color: $primary;
  display: flex;
}

.fd-weekday-label {
  flex: 1;
  font-size: $text-xs-size;
  font-weight: $font-medium;
  color: $text-body;
}

.fd-weekday-switch {
  width: 28px;
  height: 16px;
  border-radius: 8px;
  background: $border-strong;
  position: relative;
  flex-shrink: 0;
  transition: background $transition-base;

  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #fff;
    transition: transform $transition-base;
  }

  &--on {
    background: $primary;

    &::after {
      transform: translateX(12px);
    }
  }
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
