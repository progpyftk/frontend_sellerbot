<template>
  <div :class="['sb-card', { 'sb-card--padded': padded, 'sb-card--hover': hover }]">
    <div v-if="$slots.header || title" class="sb-card-header">
      <slot name="header">
        <div>
          <div v-if="eyebrow" class="sb-eyebrow">{{ eyebrow }}</div>
          <div class="sb-card-title">{{ title }}</div>
        </div>
      </slot>
      <div v-if="$slots.actions" class="sb-card-actions">
        <slot name="actions" />
      </div>
    </div>
    <div class="sb-card-body">
      <slot />
    </div>
    <div v-if="$slots.footer" class="sb-card-footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, default: '' },
  eyebrow: { type: String, default: '' },
  padded: { type: Boolean, default: true },
  hover: { type: Boolean, default: false },
});
</script>

<style lang="scss" scoped>
.sb-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  overflow: hidden;
  transition: box-shadow 200ms ease, transform 200ms ease, border-color 200ms ease;

  &--padded .sb-card-body { padding: 20px; }
  &--padded .sb-card-header { padding: 16px 20px; }
  &--padded .sb-card-footer { padding: 12px 20px; }

  &--hover:hover {
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
    transform: translateY(-1px);
    border-color: #cbd5e1;
  }
}

.sb-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid #f1f5f9;
}

.sb-card-title {
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
}

.sb-card-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.sb-card-footer {
  border-top: 1px solid #f1f5f9;
  background: #f8fafc;
}
</style>
