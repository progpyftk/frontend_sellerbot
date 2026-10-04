<template>
  <div class="sb-table-wrap" :class="{ 'sb-table-wrap--scroll': scrollX }">
    <table class="sb-table">
      <slot />
    </table>
  </div>
</template>

<script setup>
defineProps({
  scrollX: { type: Boolean, default: true },
});
</script>

<style lang="scss" scoped>
.sb-table-wrap {
  width: 100%;
  overflow-x: auto;
  border-radius: 14px;
  border: 1px solid #b8cbd6;
  background: #ffffff;
}

.sb-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  color: #152d43;

  :deep(thead) {
    background: #edf4f7;
  }
  :deep(thead th) {
    font-size: 11px;
    font-weight: 600;
    color: #4c6272;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 12px 16px;
    text-align: left;
    border-bottom: 1px solid #b8cbd6;
    white-space: nowrap;
  }
  :deep(tbody td) {
    padding: 14px 16px;
    border-bottom: 1px solid #dfe9ef;
    vertical-align: middle;
  }
  :deep(tbody tr:last-child td) {
    border-bottom: none;
  }
  :deep(tbody tr:hover) {
    background: #edf4f7;
  }
  :deep(tfoot td) {
    padding: 12px 16px;
    background: #edf4f7;
    font-weight: 600;
    color: #101e2b;
    border-top: 1px solid #b8cbd6;
  }

  /* helpers consumidos pelos consumidores */
  :deep(.text-right) { text-align: right; }
  :deep(.text-center) { text-align: center; }
  :deep(.row--pos) { color: #16a34a; font-weight: 600; }
  :deep(.row--neg) { color: #dc2626; font-weight: 600; }
  :deep(.row--warn) { color: #d97706; font-weight: 500; }
  :deep(.row--muted) { color: #6b8498; }
  :deep(.row--bold) { font-weight: 600; color: #101e2b; }
}
</style>
