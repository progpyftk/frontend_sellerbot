<template>
  <div :class="['sb-page-header', { 'sb-page-header--with-actions': $slots.actions }]">
    <div class="sb-page-header-left">
      <div v-if="icon" class="sb-page-header-icon">
        <q-icon :name="icon" size="20px" />
      </div>
      <div>
        <div v-if="eyebrow" class="sb-eyebrow">{{ eyebrow }}</div>
        <h1 class="sb-page-title">{{ title }}</h1>
        <div v-if="subtitle" class="sb-page-subtitle">{{ subtitle }}</div>
      </div>
    </div>
    <div v-if="$slots.actions" class="sb-page-header-actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  eyebrow: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  icon: { type: String, default: '' },
});
</script>

<style lang="scss" scoped>
.sb-page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 8px 0 24px;
  flex-wrap: wrap;
}

.sb-page-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sb-page-header-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: #f0fdf9;
  color: #0d9488;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.sb-page-title {
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.4px;
  line-height: 1.2;
  margin: 0;
}

.sb-page-subtitle {
  font-size: 13px;
  color: #64748b;
  margin-top: 4px;
}

.sb-page-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
</style>
