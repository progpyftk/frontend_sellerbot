<template>
  <span :class="['sb-badge', `sb-badge--${variant}`]">
    <q-icon v-if="icon" :name="icon" size="11px" class="q-mr-xs" />
    <slot />
  </span>
</template>

<script setup>
defineProps({
  variant: {
    type: String,
    default: 'slate',
    validator: (v) => ['teal', 'green', 'red', 'amber', 'sky', 'indigo', 'slate', 'ml', 'shopee'].includes(v),
  },
  icon: { type: String, default: '' },
});
</script>

<style lang="scss" scoped>
.sb-badge {
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
  padding: 2px 8px;
  border-radius: 6px;
  line-height: 1.5;
  white-space: nowrap;
}

.sb-badge--teal   { background: #ccfbf1; color: #0f766e; }
.sb-badge--green  { background: #dcfce7; color: #166534; }
.sb-badge--red    { background: #fee2e2; color: #991b1b; }
.sb-badge--amber  { background: #fef3c7; color: #92400e; }
.sb-badge--sky    { background: #e0f2fe; color: #075985; }
.sb-badge--indigo { background: #e0e7ff; color: #3730a3; }
.sb-badge--slate  { background: #f1f5f9; color: #475569; }

.sb-badge--ml     { background: rgba(255, 230, 0, 0.18); color: #854d0e; }
.sb-badge--shopee { background: rgba(238, 77, 45, 0.12); color: #c2410c; }
</style>
