<template>
  <div class="dash-header">
    <div class="header-left">
      <div class="header-icon"><q-icon name="dashboard" size="20px" /></div>
      <div>
        <div class="header-eyebrow">SellerBot</div>
        <div class="header-title">Dashboard da Operação</div>
      </div>
    </div>

    <div class="header-right">
      <!-- Filtro de período rápido -->
      <div class="header-filter-group">
        <q-btn-dropdown
          flat
          dense
          no-caps
          class="header-period-btn"
          :label="periodLabel"
          icon="calendar_today"
          size="sm"
        >
          <q-list dense>
            <q-item
              v-for="p in datePresets"
              :key="p.key"
              clickable
              v-close-popup
              :active="preset === p.key"
              @click="$emit('update:preset', p.key)"
            >
              <q-item-section>{{ p.label }}</q-item-section>
            </q-item>
            <q-separator />
            <q-item clickable v-close-popup @click="$emit('open-filters')">
              <q-item-section avatar><q-icon name="date_range" size="16px" /></q-item-section>
              <q-item-section>Período personalizado...</q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
      </div>

      <!-- Filtro de contas rápido -->
      <div class="header-filter-group">
        <q-btn-dropdown
          flat
          dense
          no-caps
          class="header-accounts-btn"
          :label="accountsLabel"
          icon="store"
          size="sm"
        >
          <q-list dense>
            <!-- Mercado Livre -->
            <q-item-label header class="text-weight-bold">
              <span class="mkt-badge mkt-badge--ml q-mr-xs">ML</span>
              Mercado Livre
            </q-item-label>
            <q-item
              v-for="a in mlAccounts"
              :key="a.key"
              tag="label"
              dense
            >
              <q-item-section avatar>
                <q-checkbox
                  :model-value="selectedKeys.includes(a.key)"
                  @update:model-value="toggleAccount(a.key)"
                  dense
                  size="sm"
                />
              </q-item-section>
              <q-item-section>
                <div class="row items-center no-wrap">
                  <span class="acct-dot q-mr-sm" :style="{ background: a.color }"></span>
                  {{ a.label }}
                </div>
              </q-item-section>
            </q-item>

            <!-- Shopee -->
            <q-item-label v-if="shopeeAccounts.length" header class="text-weight-bold q-mt-sm">
              <span class="mkt-badge mkt-badge--shopee q-mr-xs">SH</span>
              Shopee
            </q-item-label>
            <q-item
              v-for="a in shopeeAccounts"
              :key="a.key"
              tag="label"
              dense
            >
              <q-item-section avatar>
                <q-checkbox
                  :model-value="selectedKeys.includes(a.key)"
                  @update:model-value="toggleAccount(a.key)"
                  dense
                  size="sm"
                />
              </q-item-section>
              <q-item-section>
                <div class="row items-center no-wrap">
                  <span class="acct-dot q-mr-sm" :style="{ background: a.color }"></span>
                  {{ a.label }}
                </div>
              </q-item-section>
            </q-item>

            <q-separator />
            <q-item clickable v-close-popup @click="selectAll">
              <q-item-section avatar><q-icon name="select_all" size="16px" /></q-item-section>
              <q-item-section>Todas as contas</q-item-section>
            </q-item>
            <q-item clickable v-close-popup @click="clearSelection">
              <q-item-section avatar><q-icon name="deselect" size="16px" /></q-item-section>
              <q-item-section>Limpar seleção</q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
      </div>

      <!-- Botão refresh -->
      <q-btn flat round icon="refresh" color="teal-7" :loading="loading" @click="$emit('refresh')" size="sm">
        <q-tooltip>Atualizar</q-tooltip>
      </q-btn>

      <!-- Botão filtros avançados -->
      <q-btn flat round icon="tune" size="sm" @click="$emit('open-filters')">
        <q-tooltip>Filtros avançados</q-tooltip>
      </q-btn>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  preset: { type: String, default: null },
  dateFrom: { type: String, required: true },
  dateTo: { type: String, required: true },
  datePresets: { type: Array, required: true },
  mlAccounts: { type: Array, default: () => [] },
  shopeeAccounts: { type: Array, default: () => [] },
  selectedKeys: { type: Array, default: () => [] },
  allKeys: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
});

const emit = defineEmits([
  'update:preset',
  'update:selectedKeys',
  'refresh',
  'open-filters',
]);

const periodLabel = computed(() => {
  const preset = props.datePresets.find(p => p.key === props.preset);
  if (preset) return preset.label;
  return `${formatDate(props.dateFrom)} → ${formatDate(props.dateTo)}`;
});

// Formatar data ISO para pt-BR (dd/mm)
function formatDate(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}`;
}

const accountsLabel = computed(() => {
  const total = props.allKeys.length;
  const selected = props.selectedKeys.length;
  if (selected === total || selected === 0) return 'Todas contas';
  return `${selected} de ${total} contas`;
});

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

function selectAll() {
  emit('update:selectedKeys', [...props.allKeys]);
}

function clearSelection() {
  emit('update:selectedKeys', []);
}
</script>

<style lang="scss" scoped>
@import 'src/css/tokens';

.dash-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: $space-3;
  margin-bottom: $space-5;
}

.header-left {
  display: flex;
  align-items: center;
  gap: $space-3;
}

.header-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: $tint-teal-bg;
  color: $tint-teal-text;
  border-radius: $radius-md;
}

.header-eyebrow {
  font-size: $text-xs-size;
  font-weight: $font-medium;
  color: $text-muted;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.header-title {
  font-size: $text-h2-size;
  font-weight: $font-bold;
  color: $text-primary;
  line-height: 1.2;
}

.header-right {
  display: flex;
  align-items: center;
  gap: $space-2;
}

.header-filter-group {
  :deep(.q-btn-dropdown) {
    background: $surface;
    border: 1px solid $border;
    border-radius: $radius-sm;
    font-size: $text-small-size;
    font-weight: $font-medium;
    color: $text-body;
    padding: $space-1 $space-3;
    transition: all $transition-fast;

    &:hover {
      border-color: $border-strong;
      background: $surface-2;
    }

    .q-icon {
      font-size: 16px;
      color: $text-muted;
    }
  }
}

.acct-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.mkt-badge {
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
    color: #991b1b;  // tom escuro legível sobre fundo translúcido
  }
}

// Responsivo
@media (max-width: 768px) {
  .dash-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-right {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
