<template>
  <span class="full-source" :class="`full-source--${meta.tone}`">
    <q-icon :name="meta.icon" size="14px" aria-hidden="true" />
    {{ meta.label }}
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { sourceMeta } from 'src/utils/fulfillmentDraft'

const props = defineProps({ source: { type: String, default: null } })
const meta = computed(() => sourceMeta(props.source))
</script>
