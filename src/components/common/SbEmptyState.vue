<template>
  <div class="sb-empty">
    <div v-if="variant === 'loading'" class="sb-empty-icon">
      <q-spinner-dots :color="spinnerColor" size="48px" />
    </div>
    <div v-else class="sb-empty-icon">
      <q-icon :name="iconName" size="48px" :color="iconColor" />
    </div>
    <div v-if="title" class="sb-empty-title">{{ title }}</div>
    <div v-if="message" class="sb-empty-message">{{ message }}</div>
    <div v-if="$slots.action" class="sb-empty-action">
      <slot name="action" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  variant: { type: String, default: 'empty', validator: (v) => ['empty', 'loading', 'error'].includes(v) },
  title: { type: String, default: '' },
  message: { type: String, default: '' },
});

const iconName = computed(() => {
  if (props.variant === 'error') return 'error_outline';
  if (props.variant === 'loading') return 'hourglass_empty';
  return 'inbox';
});

const iconColor = computed(() => {
  if (props.variant === 'error') return 'negative';
  return 'grey-5';
});

const spinnerColor = computed(() => (props.variant === 'error' ? 'negative' : 'primary'));
</script>

<style lang="scss" scoped>
.sb-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
  color: #64748b;
}

.sb-empty-icon {
  margin-bottom: 16px;
  opacity: 0.8;
}

.sb-empty-title {
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 4px;
}

.sb-empty-message {
  font-size: 14px;
  color: #64748b;
  max-width: 400px;
  line-height: 1.5;
}

.sb-empty-action {
  margin-top: 20px;
}
</style>
